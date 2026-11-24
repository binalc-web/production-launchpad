/**
 * Client-side helpers for optional multi-repo JSON (v1) in gitRepoPath / developmentRepoUrl.
 * Must stay aligned with backend `projectMultiRepoConfig.util.js`.
 */

const DIRECTORY_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/;

function normalizeDevRepoPathForCompare(path) {
  return String(path || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\.git$/i, "")
    .toLowerCase();
}

/** Max optional notes length per development repo row (matches backend). */
export const DEV_REPO_DETAILS_MAX_CHARS = 4000;

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
export function tryParseStoredMultiRepo(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s.startsWith("{")) return null;
  try {
    const j = JSON.parse(s);
    if (
      !j ||
      typeof j !== "object" ||
      j.v !== 1 ||
      !Array.isArray(j.repos) ||
      j.repos.length === 0
    ) {
      return null;
    }
    return j;
  } catch {
    return null;
  }
}

/**
 * @param {string} raw
 * @returns {Array<{ path: string, ref: string, directory: string, push: boolean }>|null}
 */
export function launchpadRowsFromStored(raw) {
  const j = tryParseStoredMultiRepo(raw);
  if (!j || !Array.isArray(j.pushDirectories) || j.pushDirectories.length === 0) return null;
  const pushSet = new Set(j.pushDirectories.map((d) => String(d).trim()).filter(Boolean));
  return j.repos.map((r) => ({
    path: String(r.path || "").trim(),
    ref: String(r.ref || "").trim(),
    directory: String(r.directory || "").trim(),
    push: pushSet.has(String(r.directory || "").trim()),
  }));
}

/**
 * Launchpad GitHub repo paths in `github.com/owner/repo` form (legacy or multi JSON).
 * @param {unknown} gitRepoPathRaw
 * @returns {string[]}
 */
export function listLaunchpadGithubHostPaths(gitRepoPathRaw) {
  const rows = launchpadRowsFromStored(typeof gitRepoPathRaw === "string" ? gitRepoPathRaw : "");
  if (rows?.length) {
    return rows.map((r) => String(r.path || "").trim()).filter((p) => p.startsWith("github.com/"));
  }
  const legacy = typeof gitRepoPathRaw === "string" ? gitRepoPathRaw.trim() : "";
  return legacy.startsWith("github.com/") ? [legacy] : [];
}

/** @param {string} path @returns {'github'|'bitbucket'|null} */
export function scmHostFromRepoPath(path) {
  const s = String(path || "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s.includes("bitbucket.org")) return "bitbucket";
  if (s.includes("github.com")) return "github";
  return null;
}

/**
 * @param {string} raw
 * @returns {Array<{ path: string, ref: string, directory: string, details: string, inputMode: DevRepoInputMode, scmHost: 'github'|'bitbucket' }>|null}
 */
export function devRowsFromStored(raw) {
  const j = tryParseStoredMultiRepo(raw);
  if (!j || (Array.isArray(j.pushDirectories) && j.pushDirectories.length > 0)) return null;
  return j.repos.map((r) => {
    const inputModeRaw = String(r.inputMode || "manual")
      .trim()
      .toLowerCase();
    const inputMode = inputModeRaw === "pick" || inputModeRaw === "auto" ? inputModeRaw : "manual";
    const path = String(r.path || "").trim();
    const hostFromPath = scmHostFromRepoPath(path);
    const hostRaw = String(r.scmHost || "")
      .trim()
      .toLowerCase();
    const scmHost =
      hostRaw === "bitbucket" || hostRaw === "github" ? hostRaw : hostFromPath || "github";
    return {
      path,
      ref: String(r.ref || "").trim(),
      directory: String(r.directory || "").trim(),
      details: String(r.details || "").trim(),
      inputMode,
      scmHost,
    };
  });
}

/** Starter launchpad row so the form has sensible defaults for first-time setup. */
export function defaultLaunchpadMultiRow() {
  return { path: "", ref: "main", directory: "launchpad-1", push: true };
}

/** @typedef {'pick'|'manual'|'auto'} DevRepoInputMode */

/** Filter branch names by typed query (case-insensitive substring), exact matches first. */
export function filterDevBranchOptions(branches, query) {
  if (!Array.isArray(branches) || branches.length === 0) return [];
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return branches;

  const matches = branches.filter((name) => String(name).toLowerCase().includes(q));
  return sortBranchMatches(matches, q);
}

/** Sort branch names so exact matches appear first, then prefix matches, then substring matches. */
export function sortBranchMatches(branches, query) {
  if (!Array.isArray(branches) || branches.length === 0) return [];
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return branches;

  return [...branches].sort((a, b) => {
    const rankA = branchMatchRank(a, q);
    const rankB = branchMatchRank(b, q);
    if (rankA !== rankB) return rankA - rankB;
    return String(a).localeCompare(String(b));
  });
}

/** @param {string} name @param {string} queryLower */
function branchMatchRank(name, queryLower) {
  const normalized = String(name).toLowerCase();
  if (normalized === queryLower) return 0;
  if (normalized.startsWith(queryLower)) return 1;
  return 2;
}

/** Starter development row used when enabling multi-repo editing UI. */
export function defaultDevMultiRow(scmHost = "github") {
  return {
    path: "",
    ref: "",
    directory: "development-1",
    inputMode: "pick",
    details: "",
    scmHost: scmHost === "bitbucket" ? "bitbucket" : "github",
  };
}

/** @param {unknown} row */
export function isDevRowAutoProvision(row) {
  return (row?.inputMode ?? "pick") === "auto";
}

/**
 * True when the form has at least one real App (development) repository: a picked or typed
 * path, or a row set to auto-create one. A blank default row does not count.
 * @param {unknown} rows
 */
export function hasAppRepositories(rows) {
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => isDevRowAutoProvision(row) || String(row?.path ?? "").trim() !== "");
}

/** Default branch for auto-provisioned development repos (matches platform git branch). */
export const DEV_REPO_AUTO_PROVISION_DEFAULT_REF = "main";

/**
 * Branch ref for save/API: auto-provision rows default to main when empty.
 * @param {{ ref?: string, inputMode?: DevRepoInputMode }} row
 * @returns {string}
 */
export function resolveDevRowRefForSave(row) {
  const ref = String(row?.ref || "").trim();
  if (ref) return ref;
  if (isDevRowAutoProvision(row)) return DEV_REPO_AUTO_PROVISION_DEFAULT_REF;
  return "";
}

/**
 * @param {Array<{ path: string, ref: string, directory: string, push: boolean }>} rows
 * @returns {string} JSON string for gitRepoPath
 */
export function serializeLaunchpadMulti(rows) {
  const repos = rows.map((r) => ({
    path: String(r.path || "").trim(),
    ref: String(r.ref || "").trim(),
    directory: String(r.directory || "").trim(),
  }));
  const pushDirectories = rows
    .filter((r) => r.push)
    .map((r) => String(r.directory || "").trim())
    .filter(Boolean);
  return JSON.stringify({ v: 1, repos, pushDirectories });
}

/**
 * @param {Array<{ path: string, ref: string, directory: string }>} rows
 * @returns {string} JSON string for developmentRepoUrl
 */
export function serializeDevMulti(rows) {
  const repos = rows.map((r) => {
    const entry = {
      path: String(r.path || "").trim(),
      ref: String(r.ref || "").trim(),
      directory: String(r.directory || "").trim(),
    };
    const details = String(r.details || "").trim();
    if (details) entry.details = details;
    return entry;
  });
  return JSON.stringify({ v: 1, repos });
}

/**
 * Serialize development rows for API save; auto rows use provision flag (no path yet).
 * @param {Array<{ path?: string, ref: string, directory: string, inputMode?: DevRepoInputMode }>} rows
 * @returns {string}
 */
export function serializeDevMultiForSave(rows) {
  const repos = rows.map((r) => {
    const ref = resolveDevRowRefForSave(r);
    const directory = String(r.directory || "").trim();
    const details = String(r.details || "").trim();
    const rowHost =
      r.scmHost === "bitbucket" || r.scmHost === "github"
        ? r.scmHost
        : scmHostFromRepoPath(r.path) || null;
    if (isDevRowAutoProvision(r)) {
      const entry = { ref, directory, provision: true };
      if (rowHost) entry.scmHost = rowHost;
      if (details) entry.details = details;
      return entry;
    }
    const entry = {
      path: String(r.path || "").trim(),
      ref,
      directory,
    };
    if (rowHost) entry.scmHost = rowHost;
    if (details) entry.details = details;
    return entry;
  });
  return JSON.stringify({ v: 1, repos });
}

/** @returns {boolean} */
export function devMultiRowsNeedProvision(rows) {
  return rows.some((r) => isDevRowAutoProvision(r));
}

/**
 * @param {Array<{ path: string, ref: string, directory: string, push?: boolean }>} rows
 * @param {'github'|'bitbucket'} scmHost
 * @param {RegExp} pathRe
 * @returns {string|null} error message or null if ok
 */
export function validateLaunchpadMultiRows(rows, scmHost, pathRe) {
  if (!rows.length) return "Add at least one launchpad repository.";
  const dirs = new Set();
  let pushCount = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const path = String(r.path || "").trim();
    const ref = String(r.ref || "").trim();
    const directory = String(r.directory || "").trim();
    if (!path || !ref || !directory) {
      return `Launchpad row ${i + 1}: path, branch/ref, and directory are required.`;
    }
    if (!pathRe.test(path)) {
      return scmHost === "github"
        ? `Launchpad row ${i + 1}: use a path like github.com/org/repo`
        : `Launchpad row ${i + 1}: use a path like bitbucket.org/workspace/repo`;
    }
    if (!DIRECTORY_RE.test(directory)) {
      return `Launchpad row ${i + 1}: directory must be letters, numbers, or hyphen (e.g. launchpad-1).`;
    }
    if (dirs.has(directory)) return `Duplicate directory name: ${directory}`;
    dirs.add(directory);
    if (r.push) pushCount += 1;
  }
  if (pushCount === 0)
    return "Select at least one launchpad row to push (automation uses the first push in list order).";
  return null;
}

/** @param {string} branch @param {string[] | undefined} cachedBranches */
export function isDevBranchListedLocally(branch, cachedBranches) {
  const name = String(branch || "").trim();
  if (!name || !Array.isArray(cachedBranches) || cachedBranches.length === 0) return false;
  return cachedBranches.includes(name);
}

/**
 * @param {Array<{ path: string, ref: string, directory: string, scmHost?: 'github'|'bitbucket' }>} rows
 * @param {'github'|'bitbucket'} scmHost — default host when a row has no scmHost
 * @param {RegExp} pathRe — default path regex when a row has no scmHost
 * @param {{ githubPathRe?: RegExp, bitbucketPathRe?: RegExp }} [pathRes]
 * @returns {string|null}
 */
export function validateDevMultiRows(rows, scmHost, pathRe, pathRes = {}) {
  if (!rows.length) return "Add at least one development repository.";
  const dirs = new Set();
  const ghRe = pathRes.githubPathRe || pathRe;
  const bbRe = pathRes.bitbucketPathRe || pathRe;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const path = String(r.path || "").trim();
    const ref = String(r.ref || "").trim();
    const directory = String(r.directory || "").trim();
    const auto = isDevRowAutoProvision(r);
    const rowHost =
      r.scmHost === "bitbucket" || r.scmHost === "github"
        ? r.scmHost
        : scmHostFromRepoPath(path) || scmHost;
    const rowPathRe = rowHost === "bitbucket" ? bbRe : ghRe;
    if (!auto && !ref) {
      return `Development row ${i + 1}: Branch is required.`;
    }
    if (!directory) {
      return `Development row ${i + 1}: directory is required.`;
    }
    if (!auto && !path) {
      return `Development row ${i + 1}: repository path is required.`;
    }
    if (!auto && !rowPathRe.test(path)) {
      return rowHost === "github"
        ? `Development row ${i + 1}: use a path like github.com/org/repo`
        : `Development row ${i + 1}: use a path like bitbucket.org/workspace/repo`;
    }
    if (!DIRECTORY_RE.test(directory)) {
      return `Development row ${i + 1}: directory must be letters, numbers, or hyphen.`;
    }
    if (dirs.has(directory)) return `Duplicate directory name: ${directory}`;
    dirs.add(directory);
    const details = String(r.details || "").trim();
    if (details.length > DEV_REPO_DETAILS_MAX_CHARS) {
      return "Repo details is too long (max 4000 characters).";
    }
  }
  const pathSet = new Set();
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (isDevRowAutoProvision(r)) continue;
    const norm = normalizeDevRepoPathForCompare(r.path);
    if (!norm) continue;
    if (pathSet.has(norm)) {
      return `Development row ${i + 1}: duplicate repository path. Each row must use a different repository.`;
    }
    pathSet.add(norm);
  }
  return null;
}
