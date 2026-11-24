import test from "node:test";
import assert from "node:assert/strict";
import {
  isReloadDevServerDisabled,
  resolvePreviewReloadAction,
} from "../src/pages/ClientLink/clientLinkPreviewReload.util.js";

test("resolvePreviewReloadAction boots when iframe src is missing", () => {
  assert.equal(
    resolvePreviewReloadAction({
      iframeSrc: null,
      previewBootFailed: false,
      showDevEmbedReloadOverlay: true,
      devEmbedGateOpen: true,
      previewIframeReady: false,
    }),
    "boot",
  );
});

test("resolvePreviewReloadAction boots when preview boot failed", () => {
  assert.equal(
    resolvePreviewReloadAction({
      iframeSrc: "http://localhost:5173/embedded/4001/",
      previewBootFailed: true,
      showDevEmbedReloadOverlay: false,
      devEmbedGateOpen: false,
      previewIframeReady: false,
    }),
    "boot",
  );
});

test("resolvePreviewReloadAction remounts when dev embed reload overlay is stuck", () => {
  assert.equal(
    resolvePreviewReloadAction({
      iframeSrc: "http://localhost:5173/embedded/4001/",
      previewBootFailed: false,
      showDevEmbedReloadOverlay: true,
      devEmbedGateOpen: true,
      previewIframeReady: false,
    }),
    "remount",
  );
});

test("resolvePreviewReloadAction remounts when gate is open but iframe is not ready", () => {
  assert.equal(
    resolvePreviewReloadAction({
      iframeSrc: "http://localhost:5173/embedded/4001/",
      previewBootFailed: false,
      showDevEmbedReloadOverlay: false,
      devEmbedGateOpen: true,
      previewIframeReady: false,
    }),
    "remount",
  );
});

test("resolvePreviewReloadAction soft reloads when preview iframe is ready", () => {
  assert.equal(
    resolvePreviewReloadAction({
      iframeSrc: "http://localhost:5173/embedded/4001/",
      previewBootFailed: false,
      showDevEmbedReloadOverlay: false,
      devEmbedGateOpen: true,
      previewIframeReady: true,
    }),
    "soft",
  );
});

test("isReloadDevServerDisabled enables reload when stuck recovery hint is available", () => {
  assert.equal(
    isReloadDevServerDisabled({
      previewAwaitingLoad: true,
      previewIframeReady: false,
      previewLoadStuckRecoveryAvailable: true,
      previewReloadActionEnabled: false,
      previewBootFailed: false,
    }),
    false,
  );
});

test("isReloadDevServerDisabled stays disabled before stuck hint or fallback timer", () => {
  assert.equal(
    isReloadDevServerDisabled({
      previewAwaitingLoad: true,
      previewIframeReady: false,
      previewLoadStuckRecoveryAvailable: false,
      previewReloadActionEnabled: false,
      previewBootFailed: false,
    }),
    true,
  );
});

test("isReloadDevServerDisabled enables reload after fallback timer", () => {
  assert.equal(
    isReloadDevServerDisabled({
      previewAwaitingLoad: true,
      previewIframeReady: false,
      previewLoadStuckRecoveryAvailable: false,
      previewReloadActionEnabled: true,
      previewBootFailed: false,
    }),
    false,
  );
});

test("isReloadDevServerDisabled enables reload when preview boot failed", () => {
  assert.equal(
    isReloadDevServerDisabled({
      previewAwaitingLoad: true,
      previewIframeReady: false,
      previewLoadStuckRecoveryAvailable: false,
      previewReloadActionEnabled: false,
      previewBootFailed: true,
    }),
    false,
  );
});
