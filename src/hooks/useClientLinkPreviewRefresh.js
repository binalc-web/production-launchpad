/**
 * React hook wrapper for post-turn preview refresh.
 */

import { useCallback } from "react";
import { refreshPreviewAfterAgentTurn } from "@/lib/clientLinkPreviewRefreshAfterTurn.util.js";

export { refreshPreviewAfterAgentTurn } from "@/lib/clientLinkPreviewRefreshAfterTurn.util.js";

/**
 * @param {object} deps — same shape as refreshPreviewAfterAgentTurn
 */
export function useClientLinkPreviewRefresh(deps) {
  const {
    iframeSrc,
    previewPort,
    previewIframeRef,
    previewRefreshBusyRef,
    devPreviewEmbedHmr,
    embedHmrWsState,
    syncAndRefreshPreview,
    softReloadPreviewIframe,
    openDevEmbedGate,
    setPreviewIframeReady,
    setPreviewIframeLoadMessage,
    setDevEmbedSessionLive,
  } = deps;

  return useCallback(
    (opts = {}) =>
      refreshPreviewAfterAgentTurn({
        iframeSrc,
        previewPort,
        previewIframeRef,
        previewRefreshBusyRef,
        devPreviewEmbedHmr,
        embedHmrWsState,
        syncAndRefreshPreview,
        softReloadPreviewIframe,
        openDevEmbedGate,
        setPreviewIframeReady,
        setPreviewIframeLoadMessage,
        setDevEmbedSessionLive,
        ...opts,
      }),
    [
      iframeSrc,
      previewPort,
      previewIframeRef,
      previewRefreshBusyRef,
      devPreviewEmbedHmr,
      embedHmrWsState,
      syncAndRefreshPreview,
      softReloadPreviewIframe,
      openDevEmbedGate,
      setPreviewIframeReady,
      setPreviewIframeLoadMessage,
      setDevEmbedSessionLive,
    ],
  );
}
