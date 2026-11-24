/** Query param on the iframe entry URL — stripped before React Router boots. */
export const EMBED_FRAME_PARAM = "embed_frame";

/** URL prefix pattern: /embedded/<port> */
export const EMBEDDED_PATH_PREFIX = "/embedded";

/**
 * Infrastructure prefixes that must never be orphan-proxied to a project preview.
 * Not a product-route denylist — apps may use /login, /projects, /settings, etc.
 */
export function isEmbedInfrastructurePath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/")) return false;
  if (p === "/api" || p.startsWith("/api/")) return true;
  if (p === "/embedded" || p.startsWith("/embedded/")) return true;
  if (p === "/iframe-preview" || p.startsWith("/iframe-preview/")) return true;
  return false;
}
