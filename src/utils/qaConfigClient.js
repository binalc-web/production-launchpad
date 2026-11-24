export const AUTH_TYPES = [
  { value: "credentials", label: "Email & password" },
  { value: "google", label: "Google" },
];

export const QA_PERSONA_LOGIN_METHOD_SAVED_SESSION = "saved_session";
export const QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN = "credential_login";

/** Env var on Playwright runs when persona uses credential login. */
export const QA_LOGIN_METHOD_ENV = "QA_LOGIN_METHOD";

export const PERSONA_LOGIN_METHODS = [
  { value: QA_PERSONA_LOGIN_METHOD_SAVED_SESSION, label: "Saved session" },
  { value: QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN, label: "Credential login" },
];

/** @param {string} [loginMethod] @param {string} [authType] */
export function formatPersonaLoginMethodLabel(loginMethod, authType) {
  const method = normalizePersonaLoginMethod(authType, loginMethod);
  return method === QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN ? "Credential login" : "Saved session";
}

/**
 * @param {string} [authType]
 * @param {unknown} [rawLoginMethod]
 */
export function normalizePersonaLoginMethod(authType, rawLoginMethod) {
  const type = String(authType || "credentials")
    .trim()
    .toLowerCase();
  if (type === "google") return QA_PERSONA_LOGIN_METHOD_SAVED_SESSION;
  const method = String(rawLoginMethod || "")
    .trim()
    .toLowerCase();
  if (method === QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN) {
    return QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN;
  }
  return QA_PERSONA_LOGIN_METHOD_SAVED_SESSION;
}

export function formatEnvironmentLabel(key) {
  const k = String(key || "").trim();
  if (!k) return "";
  return k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, " ");
}

const ID_RE = /^[a-z][a-z0-9_-]{0,31}$/i;

export function slugifyQaId(value, fallback = "item") {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  if (s && ID_RE.test(s)) return s;
  return fallback;
}

function uniqueSlug(base, used) {
  let id = base;
  let n = 2;
  while (used.has(id)) {
    const suffix = `_${n}`;
    id = `${base.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/** Assign environment and persona ids from display names before save. */
export function assignIdsFromNames(environments) {
  if (!Array.isArray(environments)) return environments;
  const usedEnvIds = new Set();
  return environments.map((env, envIndex) => {
    const name = String(env?.name || "").trim() || `Environment ${envIndex + 1}`;
    const envId = uniqueSlug(slugifyQaId(name, `env_${envIndex + 1}`), usedEnvIds);
    const usedPersonaIds = new Set();
    const personas = (env?.personas ?? []).map((persona, pIndex) => {
      const personaName = String(persona?.name || "").trim() || `Persona ${pIndex + 1}`;
      const personaId = uniqueSlug(
        slugifyQaId(personaName, `persona_${pIndex + 1}`),
        usedPersonaIds,
      );
      return { ...persona, name: personaName, id: personaId };
    });
    return { ...env, name, id: envId, personas };
  });
}

export function defaultPersona(name = "Default User") {
  return {
    id: slugifyQaId(name, "default_user"),
    name,
    authentication: {
      type: "credentials",
      loginMethod: QA_PERSONA_LOGIN_METHOD_SAVED_SESSION,
      fields: {},
    },
    urls: [{ name: "App", value: "" }],
    variables: {},
  };
}

/**
 * @param {unknown} rows
 * @returns {Array<{ path: string, branch: string }>}
 */
export function normalizeRepoBranches(rows) {
  if (!Array.isArray(rows)) return [];
  /** @type {Array<{ path: string, branch: string }>} */
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const path = String(row.path ?? "").trim();
    if (!path || seen.has(path.toLowerCase())) continue;
    seen.add(path.toLowerCase());
    out.push({ path, branch: String(row.branch ?? "").trim() });
  }
  return out;
}

/**
 * Hydrate repoBranches from legacy `branch` and/or configured development repo paths.
 * @param {{ branch?: string, repoBranches?: unknown }} env
 * @param {string[]} [devRepoPaths]
 * @returns {Array<{ path: string, branch: string }>}
 */
export function hydrateRepoBranches(env, devRepoPaths = []) {
  const existing = normalizeRepoBranches(env?.repoBranches);
  const legacyBranch = String(env?.branch ?? "").trim();
  const paths = Array.isArray(devRepoPaths)
    ? [...new Set(devRepoPaths.map((p) => String(p || "").trim()).filter(Boolean))]
    : [];

  if (paths.length === 0) {
    if (existing.length) return existing;
    if (legacyBranch) return [{ path: "", branch: legacyBranch }];
    return [];
  }

  const byPath = new Map(existing.map((r) => [r.path.toLowerCase(), r]));
  return paths.map((path, index) => {
    const hit = byPath.get(path.toLowerCase());
    if (hit) return { path, branch: hit.branch };
    // Back-compat: seed every configured path from the legacy single branch so
    // existing single-branch QA configs stay ready after multi-repo projects upgrade.
    return { path, branch: index === 0 || legacyBranch ? legacyBranch : "" };
  });
}

/**
 * Primary branch for message API / labels (first entry, or legacy branch).
 * @param {{ branch?: string, repoBranches?: unknown } | null | undefined} env
 * @param {string} [primaryPath]
 */
export function primaryRepoBranch(env, primaryPath = "") {
  const rows = normalizeRepoBranches(env?.repoBranches);
  const primary = String(primaryPath || "")
    .trim()
    .toLowerCase();
  if (primary && rows.length) {
    const hit = rows.find((r) => r.path.toLowerCase() === primary);
    if (hit?.branch) return hit.branch;
  }
  if (rows[0]?.branch) return rows[0].branch;
  return String(env?.branch ?? "").trim();
}

/**
 * Compact label for environment accordion subtitle (e.g. "stage · develop").
 * @param {{ branch?: string, repoBranches?: unknown } | null | undefined} env
 */
export function formatRepoBranchesLabel(env) {
  const rows = normalizeRepoBranches(env?.repoBranches);
  const branches = rows.map((r) => r.branch).filter(Boolean);
  if (branches.length) return [...new Set(branches)].join(" · ");
  return String(env?.branch ?? "").trim();
}

/**
 * True when every configured repoBranches row has a non-empty branch
 * (falls back to legacy single branch when repoBranches is empty).
 * @param {{ name?: string, branch?: string, repoBranches?: unknown } | null | undefined} env
 * @param {string[]} [devRepoPaths]
 */
export function isEnvironmentBranchesReady(env, devRepoPaths = []) {
  const name = String(env?.name ?? "").trim();
  if (!name) return false;
  const rows = hydrateRepoBranches(env, devRepoPaths);
  if (rows.length === 0) {
    return Boolean(String(env?.branch ?? "").trim());
  }
  return rows.every((r) => Boolean(r.branch));
}

export function defaultEnvironment(name = "Development", defaultBranch = "", devRepoPaths = []) {
  const id = slugifyQaId(name, "development");
  const branch = String(defaultBranch ?? "").trim();
  const paths = Array.isArray(devRepoPaths)
    ? [...new Set(devRepoPaths.map((p) => String(p || "").trim()).filter(Boolean))]
    : [];
  const repoBranches =
    paths.length > 0
      ? paths.map((path) => ({ path, branch }))
      : branch
        ? [{ path: "", branch }]
        : [];
  return {
    id,
    name,
    branch,
    repoBranches,
    metadata: {},
    personas: [],
  };
}

export function emptyEnvironmentDraft(devRepoPaths = []) {
  const paths = Array.isArray(devRepoPaths)
    ? [...new Set(devRepoPaths.map((p) => String(p || "").trim()).filter(Boolean))]
    : [];
  return {
    id: "",
    name: "",
    branch: "",
    repoBranches: paths.map((path) => ({ path, branch: "" })),
    metadata: {},
    personas: [],
  };
}

export const PLAYWRIGHT_SLOW_MO_DEFAULT_MS = 400;
/** Default upper bound for the settings slider; expands when the saved value is higher. */
export const PLAYWRIGHT_SLOW_MO_SLIDER_BASE_MAX_MS = 2000;

/**
 * Normalize Playwright launch slowMo (ms). Missing/invalid → default 400; explicit 0 kept.
 * @param {unknown} value
 * @returns {number}
 */
export function normalizePlaywrightSlowMoMs(value) {
  if (value === null || value === undefined || value === "") {
    return PLAYWRIGHT_SLOW_MO_DEFAULT_MS;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return PLAYWRIGHT_SLOW_MO_DEFAULT_MS;
  return Math.max(0, Math.round(n));
}

/**
 * Parse raw delay typed in project settings. Empty/invalid → null (caller keeps prior value).
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parsePlaywrightSlowMoInput(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === "") return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function defaultQaConfigurations() {
  return { environments: [], playwrightSlowMoMs: PLAYWRIGHT_SLOW_MO_DEFAULT_MS };
}

/**
 * @param {unknown} config
 * @param {string[]} [devRepoPaths]
 * @returns {boolean}
 */
export function isQaEnvironmentReady(config, devRepoPaths = []) {
  const envs = config?.environments;
  if (!Array.isArray(envs)) return false;
  return envs.some((env) => isEnvironmentBranchesReady(env, devRepoPaths));
}

function migrateLegacy(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = { ...raw };
  const envs = obj.environments;
  const loginCredentials =
    obj.loginCredentials && typeof obj.loginCredentials === "object"
      ? obj.loginCredentials
      : { username: "", password: "" };

  if (envs && typeof envs === "object" && !Array.isArray(envs)) {
    obj.environments = Object.entries(envs).map(([key, entry]) => {
      const e = entry && typeof entry === "object" ? entry : {};
      const id = String(key).trim();
      const url = typeof e.url === "string" ? e.url.trim() : "";
      return {
        id,
        name: formatEnvironmentLabel(id),
        branch: typeof e.branch === "string" ? e.branch.trim() : "",
        metadata: {},
        personas: [
          {
            id: `${id}_default`,
            name: "Default User",
            authentication: {
              type: "credentials",
              fields: { ...loginCredentials },
            },
            urls: url ? [{ name: "App", value: url }] : [],
            variables: {},
          },
        ],
      };
    });
    delete obj.loginCredentials;
  }
  return obj;
}

/**
 * @param {unknown} raw
 * @param {string[]} [devRepoPaths]
 */
export function normalizeQaConfig(raw, devRepoPaths = []) {
  const migrated = migrateLegacy(raw);
  if (!migrated || typeof migrated !== "object" || Array.isArray(migrated)) {
    return { environments: [], playwrightSlowMoMs: PLAYWRIGHT_SLOW_MO_DEFAULT_MS };
  }
  const envs = Array.isArray(migrated.environments)
    ? migrated.environments.map((env, i) => normalizeEnvironment(env, i, devRepoPaths))
    : [];
  return {
    ...migrated,
    environments: envs,
    playwrightSlowMoMs: normalizePlaywrightSlowMoMs(
      Object.prototype.hasOwnProperty.call(migrated, "playwrightSlowMoMs")
        ? migrated.playwrightSlowMoMs
        : undefined,
    ),
  };
}

/**
 * @param {unknown} env
 * @param {number} index
 * @param {string[]} [devRepoPaths]
 */
function normalizeEnvironment(env, index, devRepoPaths = []) {
  if (!env || typeof env !== "object") {
    return emptyEnvironmentDraft(devRepoPaths);
  }
  const name = String(
    env.name || formatEnvironmentLabel(env.id) || `Environment ${index + 1}`,
  ).trim();
  const id = String(env.id || slugifyQaId(name, `env_${index + 1}`)).trim();
  const personas = Array.isArray(env.personas)
    ? env.personas.map((p, i) => normalizePersona(p, i))
    : [];
  const repoBranches = hydrateRepoBranches(env, devRepoPaths);
  const branch = primaryRepoBranch({ ...env, repoBranches }, devRepoPaths[0] || "");
  return {
    id,
    name,
    branch,
    repoBranches,
    metadata:
      env.metadata && typeof env.metadata === "object" && !Array.isArray(env.metadata)
        ? { ...env.metadata }
        : {},
    personas,
  };
}

function normalizePersona(persona, index) {
  if (!persona || typeof persona !== "object") {
    return defaultPersona(`Persona ${index + 1}`);
  }
  const name = String(persona.name || `Persona ${index + 1}`).trim();
  const id = String(persona.id || slugifyQaId(name, `persona_${index + 1}`)).trim();
  const auth =
    persona.authentication && typeof persona.authentication === "object"
      ? persona.authentication
      : {};
  const fields = auth.fields && typeof auth.fields === "object" ? { ...auth.fields } : {};
  const urls = Array.isArray(persona.urls)
    ? persona.urls.map((u) => ({
        name: String(u?.name || "App").trim(),
        value: String(u?.value ?? "").trim(),
      }))
    : [{ name: "App", value: "" }];
  const variables =
    persona.variables && typeof persona.variables === "object" && !Array.isArray(persona.variables)
      ? { ...persona.variables }
      : {};
  const authType = String(auth.type || "credentials").trim();
  return {
    id,
    name,
    authentication: {
      type: authType,
      loginMethod: normalizePersonaLoginMethod(authType, auth.loginMethod),
      fields,
    },
    urls: urls.length ? urls : [{ name: "App", value: "" }],
    variables,
  };
}

/**
 * Convert slim GET …/qa-context payload into normalized qaConfigurations for workspace UI.
 * @param {unknown} qaContext
 * @param {string[]} [devRepoPaths]
 */
export function qaContextToConfigurations(qaContext, devRepoPaths = []) {
  if (!qaContext || typeof qaContext !== "object") {
    return { environments: [] };
  }
  const envs = Array.isArray(qaContext.environments) ? qaContext.environments : [];
  if (envs.length === 0) {
    return { environments: [] };
  }
  return {
    environments: envs.map((env, i) =>
      normalizeEnvironment(
        {
          id: env.id,
          name: env.name,
          branch: env.branch,
          repoBranches: env.repoBranches,
          metadata: {},
          personas: (Array.isArray(env.personas) ? env.personas : []).map((p) => ({
            id: p.id,
            name: p.name,
            authentication: {
              type: String(p.authenticationType ?? p.authentication?.type ?? "credentials").trim(),
              loginMethod: normalizePersonaLoginMethod(
                p.authenticationType ?? p.authentication?.type,
                p.loginMethod ?? p.authentication?.loginMethod,
              ),
              fields: {},
            },
            urls: (Array.isArray(p.urls) ? p.urls : []).map((u) => ({
              name: String(u?.name || "App").trim(),
              value: "",
            })),
            variables: {},
          })),
        },
        i,
        devRepoPaths,
      ),
    ),
  };
}

export function getEnvironmentOptions(qaConfigurations) {
  const envs = qaConfigurations?.environments;
  if (!Array.isArray(envs)) return [];
  return envs.map((env) => ({
    id: env.id,
    key: env.id,
    name: env.name,
    label: env.name || formatEnvironmentLabel(env.id),
    branch: primaryRepoBranch(env),
    repoBranches: normalizeRepoBranches(env.repoBranches),
    personaCount: Array.isArray(env.personas) ? env.personas.length : 0,
  }));
}

export function getPersonaOptions(qaConfigurations, environmentId) {
  const envs = qaConfigurations?.environments;
  if (!Array.isArray(envs)) return [];
  const env = envs.find((e) => e.id === environmentId);
  if (!env || !Array.isArray(env.personas)) return [];
  return env.personas.map((p) => {
    const authenticationType = p.authentication?.type ?? "credentials";
    const loginMethod = normalizePersonaLoginMethod(
      authenticationType,
      p.authentication?.loginMethod,
    );
    return {
      id: p.id,
      name: p.name,
      label: p.name,
      authenticationType,
      loginMethod,
      loginMethodLabel: formatPersonaLoginMethodLabel(loginMethod, authenticationType),
      urls: Array.isArray(p.urls) ? p.urls : [],
    };
  });
}

/** Metadata keys checked for a target app URL when no persona is configured. */
const ENV_URL_METADATA_KEYS = ["BASE_URL", "baseUrl", "url", "appUrl", "APP_URL"];

/**
 * Read app URL from environment metadata (for runs without a user persona).
 * @param {object | null | undefined} environment
 */
export function resolveEnvironmentMetadataUrl(environment) {
  const metadata =
    environment?.metadata && typeof environment.metadata === "object" ? environment.metadata : {};
  for (const key of ENV_URL_METADATA_KEYS) {
    const value = String(metadata[key] ?? "").trim();
    if (value) return value.replace(/\/$/, "");
  }
  return "";
}

export function resolveEnvironment(config, environmentId) {
  const id = String(environmentId || "").trim();
  if (!id || !Array.isArray(config?.environments)) return null;
  return config.environments.find((e) => e.id === id) ?? null;
}

export function resolvePersona(config, environmentId, personaId) {
  const env = resolveEnvironment(config, environmentId);
  if (!env || !Array.isArray(env.personas)) return null;
  const pid = String(personaId || "").trim();
  return env.personas.find((p) => p.id === pid) ?? null;
}

export function isMaskedSecret(value) {
  return typeof value === "string" && /^\*{2,}/.test(value.trim());
}

/** @deprecated use isMaskedSecret */
export function isMaskedPassword(value) {
  return isMaskedSecret(value);
}

export function stripMaskedAuthFieldsForSave(environments) {
  if (!Array.isArray(environments)) return environments;
  return environments.map((env) => ({
    ...env,
    personas: (env.personas ?? []).map((persona) => {
      const fields = { ...(persona.authentication?.fields ?? {}) };
      for (const [key, val] of Object.entries(fields)) {
        if (isMaskedSecret(val)) delete fields[key];
      }
      return {
        ...persona,
        authentication: {
          ...persona.authentication,
          fields,
        },
      };
    }),
  }));
}

/**
 * Development repositories of the project (`developmentRepoUrl` is JSON: { repos: [{ path, ref }] }).
 * @param {{ developmentRepoUrl?: string | null } | null | undefined} project
 * @returns {Array<{ path: string, ref: string }>}
 */
export function devRepoRowsFromProject(project) {
  const raw = String(project?.developmentRepoUrl ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.repos)) {
      return parsed.repos
        .map((r) => ({ path: String(r?.path ?? "").trim(), ref: String(r?.ref ?? "").trim() }))
        .filter((r) => r.path);
    }
  } catch {
    /* plain URL: no per-repo rows, the single branch field is used */
  }
  return [];
}

/**
 * Every environment needs a Git branch to save: prefill empty ones with the repository's default
 * ref so a first save works, and the user can still change it.
 * @param {object} env
 * @param {Array<{ path: string, ref: string }>} repos
 */
export function withDefaultBranches(env, repos) {
  const refByPath = new Map(repos.map((r) => [r.path.toLowerCase(), r.ref]));
  const rows = (Array.isArray(env?.repoBranches) ? env.repoBranches : []).map((r) => ({
    ...r,
    branch: r.branch || refByPath.get(String(r.path).toLowerCase()) || "",
  }));
  if (!rows.length) return env;
  return { ...env, repoBranches: rows, branch: primaryRepoBranch({ ...env, repoBranches: rows }) };
}
