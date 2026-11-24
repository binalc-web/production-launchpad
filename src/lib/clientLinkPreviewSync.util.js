/**
 * Pure helpers for client-link preview sync / refresh early exits.
 */

/** @param {{ forceRemount?: boolean, skipLiveBuild?: boolean, filesWritten?: number, hmr?: boolean, requireIframeReload?: boolean }} opts */
export function resolveClientLinkPreviewSyncEarlyExit({
  forceRemount = false,
  skipLiveBuild = false,
  filesWritten = 0,
  hmr = true,
  requireIframeReload = false,
} = {}) {
  const wouldNoop =
    !forceRemount &&
    !skipLiveBuild &&
    Number(filesWritten) === 0 &&
    hmr !== false;
  if (wouldNoop && !requireIframeReload) return "noop";
  if (wouldNoop && requireIframeReload) return "needs_soft_reload";
  return null;
}
