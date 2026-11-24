/**
 * Pure helpers for routing Client Link preview reload recovery actions.
 */

/** @typedef {'boot' | 'remount' | 'soft'} PreviewReloadAction */

/**
 * Chooses the lightest reload path for the current preview state.
 * @param {{
 *   iframeSrc?: string | null,
 *   previewBootFailed?: boolean,
 *   showDevEmbedReloadOverlay?: boolean,
 *   devEmbedGateOpen?: boolean,
 *   previewIframeReady?: boolean,
 * }} input
 * @returns {PreviewReloadAction}
 */
export function resolvePreviewReloadAction(input = {}) {
  const {
    iframeSrc = null,
    previewBootFailed = false,
    showDevEmbedReloadOverlay = false,
    devEmbedGateOpen = false,
    previewIframeReady = false,
  } = input;

  const hasIframeSrc = Boolean(
    typeof iframeSrc === "string" && iframeSrc.trim(),
  );

  if (previewBootFailed || !hasIframeSrc) {
    return "boot";
  }

  const gateOpenButNotReady = Boolean(devEmbedGateOpen && !previewIframeReady);
  if (showDevEmbedReloadOverlay || gateOpenButNotReady) {
    return "remount";
  }

  return "soft";
}

/**
 * Whether Reload preview should be disabled while the iframe is still loading.
 * @param {{
 *   revertPreviewSyncActive?: boolean,
 *   previewAwaitingLoad?: boolean,
 *   previewIframeReady?: boolean,
 *   previewLoadStuckRecoveryAvailable?: boolean,
 *   previewReloadActionEnabled?: boolean,
 *   previewBootFailed?: boolean,
 * }} input
 */
export function isReloadDevServerDisabled(input = {}) {
  const {
    revertPreviewSyncActive = false,
    previewAwaitingLoad = false,
    previewIframeReady = false,
    previewLoadStuckRecoveryAvailable = false,
    previewReloadActionEnabled = false,
    previewBootFailed = false,
  } = input;

  if (revertPreviewSyncActive) return false;

  return (
    previewAwaitingLoad &&
    !previewIframeReady &&
    !previewLoadStuckRecoveryAvailable &&
    !previewReloadActionEnabled &&
    !previewBootFailed
  );
}
