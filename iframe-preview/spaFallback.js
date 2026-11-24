/**
 * Hashed Vite files live under /assets/. Missing ones must 404, not SPA HTML —
 * browsers treat a 200 HTML body as a failed ES module load.
 * @param {string} pathname
 */
export function shouldFallbackToIndexHtml(pathname) {
  const pathOnly = String(pathname || "").split("?")[0];
  return !pathOnly.startsWith("/assets/");
}
