import { captureViewportPreviewScreenshot } from "@/lib/previewFullPageScreenshot";
import { isPreviewBridgeFrame } from "@/lib/previewBridge";
import { canAccessIframeDocument } from "@/lib/previewElementAnchor.util";
import {
  captureTargetArea,
  captureViewport,
  hideWidgetChromeForCapture,
} from "./screenshot.service";
import { resolveFeedbackCaptureRoute as resolveRoute } from "./clientLinkPreviewCaptureRoute.util";

export { resolveFeedbackCaptureRoute } from "./clientLinkPreviewCaptureRoute.util";

function feedbackCaptureDeps(overrides = {}) {
  return {
    isPreviewBridgeFrame: overrides.isPreviewBridgeFrame ?? isPreviewBridgeFrame,
    canAccessIframeDocument: overrides.canAccessIframeDocument ?? canAccessIframeDocument,
  };
}

/** @param {Blob} blob */
export function blobToCanvas(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not create capture canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode capture image"));
    };
    img.src = url;
  });
}

/**
 * Screenshot for feedback: preview viewport via bridge or same-origin iframe when possible.
 * @param {{ previewIframe?: HTMLIFrameElement | null, captureTarget?: string | null }} opts
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function captureFeedbackScreenshot({ previewIframe = null, captureTarget = null }) {
  const restore = hideWidgetChromeForCapture();
  try {
    const route =
      previewIframe instanceof HTMLIFrameElement
        ? resolveRoute(previewIframe, feedbackCaptureDeps())
        : captureTarget
          ? "capture-target"
          : "viewport";

    if (route === "preview-viewport") {
      const shot = await captureViewportPreviewScreenshot(previewIframe, { settle: true });
      return await blobToCanvas(shot.blob);
    }
    if (route === "capture-target" && captureTarget) {
      return await captureTargetArea(captureTarget);
    }
    return await captureViewport();
  } finally {
    restore();
  }
}
