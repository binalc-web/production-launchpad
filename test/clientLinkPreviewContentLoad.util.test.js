import test from "node:test";
import assert from "node:assert/strict";
import { isPreviewContentLoadMessage } from "../src/pages/ClientLink/clientLinkPreviewContentLoad.util.js";

test("isPreviewContentLoadMessage matches content poll messages only", () => {
  assert.equal(isPreviewContentLoadMessage("Fetching Website Contents for You"), true);
  assert.equal(isPreviewContentLoadMessage("Compiling preview modules…"), true);
  assert.equal(isPreviewContentLoadMessage("Still loading preview…"), true);
  assert.equal(isPreviewContentLoadMessage("Starting preview…"), false);
  assert.equal(isPreviewContentLoadMessage(""), false);
  assert.equal(isPreviewContentLoadMessage(null), false);
});
