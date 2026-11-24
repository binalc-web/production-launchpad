import test from "node:test";
import assert from "node:assert/strict";
import { shouldFallbackToIndexHtml } from "../iframe-preview/spaFallback.js";

test("shouldFallbackToIndexHtml skips missing hashed Vite assets", () => {
  assert.equal(
    shouldFallbackToIndexHtml("/assets/jspdf.es.min-qLv-qWmd.js"),
    false,
  );
  assert.equal(shouldFallbackToIndexHtml("/assets/index-B-fSWPuU.js"), false);
});

test("shouldFallbackToIndexHtml still covers SPA routes", () => {
  assert.equal(shouldFallbackToIndexHtml("/jobs/abc"), true);
  assert.equal(shouldFallbackToIndexHtml("/"), true);
});
