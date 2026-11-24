import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveClientLinkPreviewSyncEarlyExit } from "../src/lib/clientLinkPreviewSync.util.js";

test("resolveClientLinkPreviewSyncEarlyExit noop when no files written", () => {
  assert.equal(
    resolveClientLinkPreviewSyncEarlyExit({
      filesWritten: 0,
      hmr: true,
    }),
    "noop",
  );
});

test("resolveClientLinkPreviewSyncEarlyExit needs soft reload when requireIframeReload", () => {
  assert.equal(
    resolveClientLinkPreviewSyncEarlyExit({
      filesWritten: 0,
      hmr: true,
      requireIframeReload: true,
    }),
    "needs_soft_reload",
  );
});

test("resolveClientLinkPreviewSyncEarlyExit continues when files were written", () => {
  assert.equal(
    resolveClientLinkPreviewSyncEarlyExit({
      filesWritten: 3,
      requireIframeReload: true,
    }),
    null,
  );
});

test("resolveClientLinkPreviewSyncEarlyExit continues when forceRemount", () => {
  assert.equal(
    resolveClientLinkPreviewSyncEarlyExit({
      filesWritten: 0,
      forceRemount: true,
    }),
    null,
  );
});
