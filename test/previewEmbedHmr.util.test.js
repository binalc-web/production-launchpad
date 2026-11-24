import test from "node:test";
import assert from "node:assert/strict";
import { isPreviewEmbedHmrEnabled } from "../src/lib/previewEmbedHmr.js";

test("isPreviewEmbedHmrEnabled defaults on", () => {
  assert.equal(isPreviewEmbedHmrEnabled(), true);
});
