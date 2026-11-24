import test from "node:test";
import assert from "node:assert/strict";
import {
  appendPreviewDiagnosisToAgentPrompt,
  buildPreviewErrorDocumentHtml,
  extractPlainTextFromPreviewResponse,
} from "../src/pages/ClientLink/clientLinkPreviewDiagnosis.util.js";

test("appendPreviewDiagnosisToAgentPrompt appends kind summary and detail", () => {
  const out = appendPreviewDiagnosisToAgentPrompt("Please fix the preview.", {
    kind: "compile_error",
    summary: "Failed to resolve import",
    detail: "Cannot find module ./Missing.jsx",
  });
  assert.match(out, /Please fix the preview/);
  assert.match(out, /Detected issue \(compile_error\)/);
  assert.match(out, /Failed to resolve import/);
  assert.match(out, /Cannot find module/);
});

test("appendPreviewDiagnosisToAgentPrompt returns base when no diagnosis", () => {
  assert.equal(appendPreviewDiagnosisToAgentPrompt("Hello", null), "Hello");
});

test("appendPreviewDiagnosisToAgentPrompt keeps console lines outside the detail cap", () => {
  const detail = "server ".repeat(200);
  const out = appendPreviewDiagnosisToAgentPrompt("Please fix the preview.", {
    kind: "blank_app",
    summary: "Preview loaded but the app did not render.",
    detail,
    consoleLines: ["error: Uncaught TypeError: boom"],
  });
  assert.match(out, /Browser console:\nerror: Uncaught TypeError: boom/);
  assert.ok(out.length > 800);
  assert.ok(!out.includes(detail));
});

test("appendPreviewDiagnosisToAgentPrompt appends console lines without a diagnosis", () => {
  const out = appendPreviewDiagnosisToAgentPrompt("White screen.", null, [
    "warn: <Router basename> is not able to match the URL",
  ]);
  assert.match(out, /White screen/);
  assert.match(out, /not able to match the URL/);
  assert.doesNotMatch(out, /Detected issue/);
});

test("extractPlainTextFromPreviewResponse strips HTML tags", () => {
  const plain = extractPlainTextFromPreviewResponse(
    "<html><body><h1>Build Error</h1><p>Parsing ecmascript source code failed</p></body></html>",
  );
  assert.match(plain, /Build Error/);
  assert.match(plain, /Parsing ecmascript/);
  assert.doesNotMatch(plain, /<h1>/);
});

test("extractPlainTextFromPreviewResponse ignores embed-guard preamble", () => {
  const plain = extractPlainTextFromPreviewResponse(
    `<!DOCTYPE html><html><head><base href="/embedded/8033/"><script data-embed-guard>(function(){var u=new URL(location.href);if(u.searchParams.has("embed_frame")){u.searchParams.delete("embed_frame")}</script></head><body><div>Build Error Parsing ecmascript source code failed ./lib/mock/data.ts:860:52</div></body></html>`,
  );
  assert.match(plain, /Build Error/);
  assert.match(plain, /data\.ts:860:52/);
  assert.doesNotMatch(plain, /data-embed-guard|embed_frame|DOCTYPE/i);
});

test("buildPreviewErrorDocumentHtml includes exact response text for end users", () => {
  const html = buildPreviewErrorDocumentHtml({
    httpStatus: 500,
    bodyText:
      "<html><body><h1>Build Error</h1><p>Parsing ecmascript source code failed ./lib/mock/data.ts:860:52</p></body></html>",
  });
  assert.match(html, /HTTP 500/);
  assert.match(html, /Build Error/);
  assert.match(html, /Parsing ecmascript source code failed/);
  assert.match(html, /data\.ts:860:52/);
  assert.match(html, /<pre>/);
  assert.match(html, /min-height:\s*100%/);
  assert.match(html, /flex:\s*1\s+1\s+auto/);
});
