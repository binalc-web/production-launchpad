/**
 * @param {string} value
 * @returns {boolean}
 */
export function isLikelyHttpUrl(value) {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (!t) return false;
  try {
    const withProto = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Stable key for de-duplicating URLs (scheme + host + path, lowercased host).
 * @param {string} s
 * @returns {string}
 */
export function urlDedupeKey(s) {
  try {
    const t = String(s).trim();
    const withProto = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    const path = u.pathname.replace(/\/+$/, "") || "";
    return `${u.protocol}//${u.host}${path}`.toLowerCase();
  } catch {
    return String(s).trim().toLowerCase();
  }
}

/**
 * @param {string|null|undefined} raw - stored DB / API value (comma / newline separated)
 * @returns {string[]}
 */
export function storageStringToWebsiteArray(raw) {
  if (raw == null || String(raw).trim() === "") return [];
  const parts = String(raw)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const k = urlDedupeKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/**
 * @param {string[]} urls
 * @returns {string} comma-separated for storage / API
 */
export function websitesArrayToStorageString(urls) {
  if (!urls?.length) return "";
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    const t = String(u).trim();
    if (!t) continue;
    const k = urlDedupeKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.join(", ");
}

/**
 * @param {string[]} urls
 * @param {string} label - field label for error messages
 * @param {number} maxTotalLength - max length of joined storage string
 * @returns {string|null}
 */
export function validateOptionalWebsiteTags(urls, label, maxTotalLength) {
  if (!urls?.length) return null;
  for (const u of urls) {
    const t = String(u).trim();
    if (!isLikelyHttpUrl(t)) {
      return `${label}: invalid URL "${t}"`;
    }
  }
  const joined = websitesArrayToStorageString(urls);
  if (joined.length > maxTotalLength) {
    return `${label}: combined URLs must be at most ${maxTotalLength} characters`;
  }
  return null;
}
