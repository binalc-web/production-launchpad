import test from "node:test";
import assert from "node:assert/strict";
import {
  looksLikeDevCompileErrorHtml,
  looksLikeDevCompileErrorText,
  previewHtmlLooksLikeEmbedAppHtml,
  previewHtmlLooksLikeNextDev,
  isIframePreviewErrorPage,
  isIframePreviewBlankOrBroken,
  isIframePreviewContentReady,
  classifyPreviewFailure,
} from "../src/lib/clientLinkPreviewHealth.js";
import {
  buildPreviewErrorDocumentHtml,
  extractPlainTextFromPreviewResponse,
} from "../src/pages/ClientLink/clientLinkPreviewDiagnosis.util.js";

function mockQuerySelector(map) {
  return (sel) => {
    const key = String(sel || "");
    for (const [name, el] of Object.entries(map)) {
      if (key === name || key.split(",").some((p) => p.trim() === name)) return el;
    }
    return null;
  };
}

test("T6: Next Build Error HTTP 500 surfaces real error text (not Bootstrap Reboot)", () => {
  const body = `<!DOCTYPE html><html><head><base href="/embedded/8033/">
<script data-embed-guard>(function(){var u=new URL(location.href)})()</script>
<style>:host{all:initial}/*! Bootstrap Reboot v4.4.1 */</style>
</head><body>
<div>Build Error Parsing ecmascript source code failed ./lib/mock/data.ts:860:52 Expected ':', got 'ident'</div>
<nextjs-portal></nextjs-portal>
</body></html>`;

  assert.equal(looksLikeDevCompileErrorHtml(body), true);
  const plain = extractPlainTextFromPreviewResponse(body);
  assert.match(plain, /Build Error|Parsing ecmascript/i);
  assert.doesNotMatch(plain, /Bootstrap Reboot|:host\s*\{/i);

  const doc = buildPreviewErrorDocumentHtml({ httpStatus: 500, bodyText: body });
  assert.match(doc, /HTTP 500/);
  assert.match(doc, /Build Error|Parsing ecmascript/);
  assert.doesNotMatch(doc, /Bootstrap Reboot/);

  const diagnosis = classifyPreviewFailure({
    httpStatus: 500,
    bodyText: body,
    source: "probe",
  });
  assert.equal(diagnosis?.kind, "compile_error");
  assert.match(diagnosis.detail || "", /Build Error|Parsing ecmascript/i);
});

test("T7: healthy Next with nextjs-portal badge is not treated as preview error", () => {
  const html = `<!DOCTYPE html><html><body>
    <div id="__next"><main>Fantasy Sports. On-Chain. Fair.</main></div>
    <nextjs-portal></nextjs-portal>
    <script src="/_next/static/chunks/main.js"></script>
  </body></html>`;

  assert.equal(looksLikeDevCompileErrorHtml(html), false);
  assert.equal(
    looksLikeDevCompileErrorText(":host { all: initial; } /*! Bootstrap Reboot v4.4.1 */"),
    false,
  );
  assert.equal(previewHtmlLooksLikeNextDev(html, { allowBoot: true }), true);
  assert.equal(previewHtmlLooksLikeEmbedAppHtml(html), true);

  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: html },
      body: {
        innerHTML: html,
        innerText: "Fantasy Sports. On-Chain. Fair.",
        textContent: "Fantasy Sports. On-Chain. Fair.",
      },
      getElementById: (id) =>
        id === "__next"
          ? { childElementCount: 1, textContent: "Fantasy Sports. On-Chain. Fair." }
          : null,
      querySelector: mockQuerySelector({
        "nextjs-portal": {
          textContent: "",
          shadowRoot: {
            textContent: ":host { all: initial; } /*! Bootstrap Reboot v4.4.1 */",
          },
        },
      }),
    },
  };

  assert.equal(isIframePreviewErrorPage(iframe), false);
  assert.equal(isIframePreviewBlankOrBroken(iframe), false);
  assert.equal(isIframePreviewContentReady(iframe), true);

  const diagnosis = classifyPreviewFailure({
    httpStatus: 200,
    bodyText: html,
    iframe,
    source: "probe",
  });
  assert.equal(diagnosis, null);
});
