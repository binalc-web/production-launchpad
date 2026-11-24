/** Mirrors backend `previewEmbedHmr.util.js` / docker `PREVIEW_EMBED_HMR` (default on). */
export function isPreviewEmbedHmrEnabled() {
  const env = import.meta.env ?? {};
  const flag = String(
    env.VITE_PREVIEW_EMBED_HMR ?? env.PREVIEW_EMBED_HMR ?? "1",
  )
    .trim()
    .toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}
