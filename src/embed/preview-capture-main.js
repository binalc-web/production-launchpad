/**
 * Loaded into cross-origin subdomain previews by the preview bridge (`capture` method) so the
 * Client Link can take full-page screenshots / export screens without reading `contentDocument`.
 */
import {
  captureDocumentFullPage,
  captureDocumentViewport,
  waitForImages,
  waitForPageSettled,
} from "@/lib/previewDocumentCapture";

if (typeof window !== "undefined" && !window.__launchpadPreviewCapture) {
  window.__launchpadPreviewCapture = {
    /** @param {{ settle?: boolean, mode?: "full" | "viewport" }} [opts] */
    async capture({ settle = false, mode = "full" } = {}) {
      if (settle) {
        await waitForPageSettled(document);
        await document.fonts?.ready;
        await waitForImages(document);
      }
      if (mode === "viewport") {
        return captureDocumentViewport(document, window);
      }
      return captureDocumentFullPage(document, window);
    },
  };
}
