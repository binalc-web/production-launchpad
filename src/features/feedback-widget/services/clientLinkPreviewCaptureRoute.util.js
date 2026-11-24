/** @typedef {"preview-viewport" | "capture-target"} FeedbackCaptureRoute */

/**
 * @param {HTMLIFrameElement | null | undefined} previewIframe
 * @param {{ isPreviewBridgeFrame: (iframe: HTMLIFrameElement) => boolean, canAccessIframeDocument: (iframe: HTMLIFrameElement) => boolean }} deps
 * @returns {FeedbackCaptureRoute}
 */
export function resolveFeedbackCaptureRoute(previewIframe, deps) {
  if (!(previewIframe instanceof HTMLIFrameElement)) return "capture-target";
  if (deps.isPreviewBridgeFrame(previewIframe) || deps.canAccessIframeDocument(previewIframe)) {
    return "preview-viewport";
  }
  return "capture-target";
}
