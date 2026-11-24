/** localStorage key prefix for scoped UI preference blobs. */
export const UI_PREFERENCES_KEY_PREFIX = "launchpad:ui:";

/**
 * Build a storage scope id for UI preferences.
 * @param {{ projectId?: string | number | null, clientLinkSlug?: string | null }} [opts]
 * @returns {string}
 */
export function buildUiPreferenceScope(opts = {}) {
  const projectId = opts.projectId != null ? String(opts.projectId).trim() : "";
  if (projectId) return `project:${projectId}`;

  const slug = opts.clientLinkSlug != null ? String(opts.clientLinkSlug).trim() : "";
  if (slug) return `client-link:${slug}`;

  return "global";
}

/**
 * @param {string} scope
 * @returns {string}
 */
export function uiPreferencesStorageKey(scope) {
  const normalized = String(scope ?? "").trim() || "global";
  return `${UI_PREFERENCES_KEY_PREFIX}${normalized}`;
}

/**
 * Validate a stored preference value against schema options.
 * @param {unknown} value
 * @param {{
 *   defaultValue: unknown,
 *   allowed?: readonly unknown[],
 *   type?: "string" | "number" | "boolean",
 *   min?: number,
 *   max?: number,
 * }} schema
 * @returns {unknown}
 */
export function validatePreference(value, schema) {
  const { defaultValue, allowed, type, min, max } = schema;

  if (allowed != null && allowed.length > 0) {
    if (allowed.includes(value)) return value;
    return defaultValue;
  }

  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return defaultValue;
  }

  if (type === "number") {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return defaultValue;
    if (min != null && num < min) return defaultValue;
    if (max != null && num > max) return defaultValue;
    return num;
  }

  if (type === "string") {
    if (typeof value === "string") return value;
    if (value == null) return defaultValue;
    return String(value);
  }

  return value === undefined ? defaultValue : value;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {Record<string, object>} schema
 * @returns {Record<string, unknown>}
 */
export function validatePreferencesBlob(raw, schema) {
  const result = {};
  for (const [fieldKey, fieldSchema] of Object.entries(schema)) {
    result[fieldKey] = validatePreference(raw?.[fieldKey], fieldSchema);
  }
  return result;
}

/**
 * @param {string} scope
 * @returns {Record<string, unknown>}
 */
export function readUiPreferencesRaw(scope) {
  if (typeof window === "undefined" || !window.localStorage) return {};
  const raw = window.localStorage.getItem(uiPreferencesStorageKey(scope));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Read and validate preferences for a scope.
 * @param {string} scope
 * @param {Record<string, object>} schema
 * @returns {Record<string, unknown>}
 */
export function readUiPreferences(scope, schema) {
  const raw = readUiPreferencesRaw(scope);
  return validatePreferencesBlob(raw, schema);
}

/**
 * Merge a patch into stored preferences for a scope.
 * @param {string} scope
 * @param {Record<string, unknown>} patch
 */
export function writeUiPreferences(scope, patch) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const key = uiPreferencesStorageKey(scope);
  const current = readUiPreferencesRaw(scope);
  const next = { ...current, ...patch };
  window.localStorage.setItem(key, JSON.stringify(next));
}

/**
 * Read a single dotted preference key from a scope blob.
 * @param {string} scope
 * @param {string} dottedKey e.g. "projects.sort"
 * @param {object} fieldSchema
 * @returns {unknown}
 */
export function readUiPreference(scope, dottedKey, fieldSchema) {
  const raw = readUiPreferencesRaw(scope);
  return validatePreference(raw[dottedKey], fieldSchema);
}

/**
 * Write a single dotted preference key into a scope blob.
 * @param {string} scope
 * @param {string} dottedKey
 * @param {unknown} value
 */
export function writeUiPreference(scope, dottedKey, value) {
  writeUiPreferences(scope, { [dottedKey]: value });
}
