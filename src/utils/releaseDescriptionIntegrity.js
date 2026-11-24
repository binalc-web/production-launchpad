/**
 * Normalization must match `backend/src/utils/releaseDescriptionIntegrity.js`.
 */

export function normalizeReleaseDescriptionForIntegrity(s) {
  if (s == null) return "";
  return String(s)
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Integrity payload for `releaseDescriptionIntegrity` on create release (matches approved-suggestions apply).
 * @param {string} markdown
 * @returns {Promise<{ algorithm: 'sha256-hex', value: string }>}
 */
export async function computeReleaseDescriptionIntegrity(markdown) {
  const normalized = normalizeReleaseDescriptionForIntegrity(markdown);
  const value = await sha256Hex(normalized);
  return { algorithm: "sha256-hex", value };
}
