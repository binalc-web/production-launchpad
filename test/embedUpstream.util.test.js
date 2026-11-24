import test from "node:test";
import assert from "node:assert/strict";
import { isPreviewEmbedHmrEnabled } from "../iframe-preview/embedUpstream.js";
import { parseEmbeddedPortRequest } from "../iframe-preview/rewritePaths.js";

test("isPreviewEmbedHmrEnabled respects PREVIEW_EMBED_HMR=0", () => {
  const prev = process.env.PREVIEW_EMBED_HMR;
  process.env.PREVIEW_EMBED_HMR = "0";
  assert.equal(isPreviewEmbedHmrEnabled(), false);
  if (prev === undefined) delete process.env.PREVIEW_EMBED_HMR;
  else process.env.PREVIEW_EMBED_HMR = prev;
});

test("parseEmbeddedPortRequest strips embed prefix for upstream WS path", () => {
  const parsed = parseEmbeddedPortRequest(
    "/embedded/8010/@vite/ws?token=abc&embed_frame=1",
  );
  assert.ok(parsed);
  assert.equal(parsed.port, 8010);
  assert.equal(parsed.upstreamPath, "/@vite/ws");
});
