/**
 * Manual Client Link — Report issue screenshot checklist:
 * - Cross-origin subdomain preview: screenshot shows app UI (not blank); annotate + submit works.
 * - Same-origin dev embed preview: same flow works.
 * - Export screenshots still full-page; element picker / AI chat unchanged.
 */
import assert from "node:assert/strict";
import test from "node:test";

if (typeof globalThis.HTMLIFrameElement === "undefined") {
  globalThis.HTMLIFrameElement = class HTMLIFrameElement {};
}

const { resolveFeedbackCaptureRoute } =
  await import("../src/features/feedback-widget/services/clientLinkPreviewCaptureRoute.util.js");

test("resolveFeedbackCaptureRoute prefers preview viewport when bridge or same-origin", () => {
  const iframe = new HTMLIFrameElement();

  const bridgeDeps = {
    isPreviewBridgeFrame: () => true,
    canAccessIframeDocument: () => false,
  };
  assert.equal(resolveFeedbackCaptureRoute(iframe, bridgeDeps), "preview-viewport");

  const sameOriginDeps = {
    isPreviewBridgeFrame: () => false,
    canAccessIframeDocument: () => true,
  };
  assert.equal(resolveFeedbackCaptureRoute(iframe, sameOriginDeps), "preview-viewport");

  const wrapperDeps = {
    isPreviewBridgeFrame: () => false,
    canAccessIframeDocument: () => false,
  };
  assert.equal(resolveFeedbackCaptureRoute(iframe, wrapperDeps), "capture-target");

  assert.equal(resolveFeedbackCaptureRoute(null, wrapperDeps), "capture-target");
});
