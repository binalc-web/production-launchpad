import test from "node:test";
import assert from "node:assert/strict";
import {
  isViteSpecialImportPath,
  shouldKeepRootAbsoluteViteImportPath,
  isModuleScriptRequestPath,
  stripEmbedPortPrefix,
  looksLikeEsmDefaultExport,
  synthesizeViteUrlModule,
  shouldSynthesizeViteUrlModule,
} from "../iframe-preview/viteSpecialImport.util.js";

test("isViteSpecialImportPath detects Vite asset query suffixes", () => {
  assert.equal(isViteSpecialImportPath("/node_modules/foo.mjs?url"), true);
  assert.equal(isViteSpecialImportPath("/node_modules/foo.mjs?raw"), true);
  assert.equal(isViteSpecialImportPath("/node_modules/foo.js?worker"), true);
  assert.equal(isViteSpecialImportPath("/node_modules/foo.js?worker&url"), true);
  assert.equal(isViteSpecialImportPath("/node_modules/foo.js?import"), true);
  assert.equal(isViteSpecialImportPath("/embedded/8030/node_modules/foo.mjs?url"), true);
});

test("isViteSpecialImportPath ignores cache-bust and plain paths", () => {
  assert.equal(isViteSpecialImportPath("/node_modules/react/index.js"), false);
  assert.equal(isViteSpecialImportPath("/src/App.tsx?t=1234567890"), false);
  assert.equal(isViteSpecialImportPath("/src/App.tsx?v=abc"), false);
});

test("shouldKeepRootAbsoluteViteImportPath only for url/worker (not ?import)", () => {
  assert.equal(shouldKeepRootAbsoluteViteImportPath("/node_modules/foo.mjs?url"), true);
  assert.equal(shouldKeepRootAbsoluteViteImportPath("/node_modules/foo.js?worker"), true);
  assert.equal(shouldKeepRootAbsoluteViteImportPath("/node_modules/foo.js?sharedworker"), true);
  assert.equal(shouldKeepRootAbsoluteViteImportPath("/src/assets/mark.svg?import"), false);
  assert.equal(shouldKeepRootAbsoluteViteImportPath("/node_modules/foo.mjs?raw"), false);
  assert.equal(shouldKeepRootAbsoluteViteImportPath("/src/App.tsx"), false);
});

test("stripEmbedPortPrefix removes embedded port segment", () => {
  assert.equal(
    stripEmbedPortPrefix("/embedded/8030/node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
    "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  );
  assert.equal(stripEmbedPortPrefix("/node_modules/foo.js"), "/node_modules/foo.js");
});

test("looksLikeEsmDefaultExport detects virtual URL modules", () => {
  assert.equal(looksLikeEsmDefaultExport('export default "/node_modules/foo.mjs";\n'), true);
  assert.equal(looksLikeEsmDefaultExport("var x=1;function worker(){}"), false);
});

test("synthesizeViteUrlModule builds root-relative URL export", () => {
  assert.equal(
    synthesizeViteUrlModule("/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url"),
    'export default "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs";\n',
  );
  assert.equal(
    synthesizeViteUrlModule("/embedded/8030/node_modules/foo.mjs?url"),
    'export default "/node_modules/foo.mjs";\n',
  );
});

test("shouldSynthesizeViteUrlModule for raw worker responses only", () => {
  const rawWorker = "var e={};function t(){return 1}";
  assert.equal(
    shouldSynthesizeViteUrlModule(
      "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url",
      "application/javascript",
      rawWorker,
    ),
    true,
  );
  assert.equal(
    shouldSynthesizeViteUrlModule(
      "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url",
      "application/octet-stream",
      rawWorker,
    ),
    true,
  );
  assert.equal(
    shouldSynthesizeViteUrlModule(
      "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url",
      "application/javascript",
      'export default "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs";\n',
    ),
    false,
  );
  assert.equal(
    shouldSynthesizeViteUrlModule(
      "/node_modules/foo.mjs?raw",
      "application/octet-stream",
      rawWorker,
    ),
    false,
  );
  assert.equal(
    shouldSynthesizeViteUrlModule(
      "/node_modules/react/index.js",
      "application/javascript",
      rawWorker,
    ),
    false,
  );
});

test("isModuleScriptRequestPath treats project .vue/.svelte as modules", () => {
  assert.equal(isModuleScriptRequestPath("/src/App.vue"), true);
  assert.equal(isModuleScriptRequestPath("/src/App.vue?vue&type=script"), true);
  assert.equal(isModuleScriptRequestPath("/embedded/8030/src/views/LoginView.vue"), true);
  assert.equal(isModuleScriptRequestPath("/src/Widget.svelte"), true);
  assert.equal(isModuleScriptRequestPath("/src/main.js"), true);
  assert.equal(isModuleScriptRequestPath("/assets/logo.png"), false);
});

test("isModuleScriptRequestPath excludes Vue SFC style blocks (CSS, not JS modules)", () => {
  assert.equal(isModuleScriptRequestPath("/src/App.vue?vue&type=style&lang.css"), false);
  assert.equal(
    isModuleScriptRequestPath(
      "/embedded/8012/src/views/LoginView.vue?vue&type=style&index=0&lang.css",
    ),
    false,
  );
});
