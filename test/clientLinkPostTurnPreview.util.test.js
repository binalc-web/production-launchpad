import test from "node:test";
import assert from "node:assert/strict";
import {
  pickNewerPreviewRefreshOutcome,
  readPreviewRefreshMode,
} from "../src/lib/clientLinkPostTurnPreview.util.js";

test("readPreviewRefreshMode passes through known modes", () => {
  assert.equal(readPreviewRefreshMode({ mode: "none" }), "none");
  assert.equal(readPreviewRefreshMode({ mode: "hmr" }), "hmr");
  assert.equal(readPreviewRefreshMode({ mode: "restart" }), "restart");
});

test("readPreviewRefreshMode defaults to full for unknown/empty", () => {
  assert.equal(readPreviewRefreshMode(null), "full");
  assert.equal(readPreviewRefreshMode({}), "full");
  assert.equal(readPreviewRefreshMode({ mode: "weird" }), "full");
});

test("pickNewerPreviewRefreshOutcome keeps latest timestamp", () => {
  const older = { mode: "hmr", at: "2026-01-01T00:00:00.000Z" };
  const newer = { mode: "restart", at: "2026-06-01T00:00:00.000Z" };
  assert.deepEqual(pickNewerPreviewRefreshOutcome(older, newer), newer);
  assert.deepEqual(pickNewerPreviewRefreshOutcome(newer, older), newer);
});

test("pickNewerPreviewRefreshOutcome handles missing timestamps", () => {
  const withAt = { mode: "hmr", at: "2026-01-01T00:00:00.000Z" };
  assert.deepEqual(pickNewerPreviewRefreshOutcome(null, withAt), withAt);
  assert.deepEqual(pickNewerPreviewRefreshOutcome(withAt, null), withAt);
  assert.equal(pickNewerPreviewRefreshOutcome(null, null), null);
});
