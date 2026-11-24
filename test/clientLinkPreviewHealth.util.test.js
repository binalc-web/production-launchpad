import test from "node:test";
import assert from "node:assert/strict";
import {
  previewHtmlLooksLikeViteDev,
  previewHtmlLooksLikeStaticSpa,
  previewHtmlLooksLikeEmbedAppHtml,
  isIframePreviewBlankOrBroken,
  isIframePreviewContentReady,
  isIframePreviewErrorPage,
  isIframePortUnreachablePage,
  isPortUnreachableSignal,
  isClientLinkPreviewLoaderBlocking,
  iframeLooksLikeNextDev,
  shouldMarkNextInAppCompile,
  extractEmbedPreviewErrorFromBody,
  extractIframePreviewFailureMessage,
  classifyPreviewFailure,
  isIframePreviewVisuallyBlank,
  reconcilePreviewConsoleWatch,
  PREVIEW_BLANK_SUSTAIN_MS,
  looksLikeDevCompileErrorHtml,
  looksLikeDevCompileErrorText,
  looksLikeAppAuthGateText,
  formatDevCompileErrorSummary,
  previewHtmlLooksLikeNextDev,
  embedHtmlNeedsViteClientProbe,
  embedPreviewHttpStatusLooksReady,
  pollUntilEmbedViteModulesReady,
} from "../src/lib/clientLinkPreviewHealth.js";

function mockQuerySelector(map) {
  return (sel) => {
    const key = String(sel || "");
    for (const [name, el] of Object.entries(map)) {
      if (key === name || key.split(",").some((p) => p.trim() === name)) return el;
    }
    return null;
  };
}

test("previewHtmlLooksLikeViteDev accepts standard Vite index", () => {
  const html = `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>`;
  assert.equal(previewHtmlLooksLikeViteDev(html), true);
});

test("previewHtmlLooksLikeViteDev accepts Vite client without #root", () => {
  const html = `<script type="module" src="/@vite/client"></script>`;
  assert.equal(previewHtmlLooksLikeViteDev(html), true);
});

test("previewHtmlLooksLikeViteDev rejects pages without the Vite client", () => {
  const html = `<!DOCTYPE html><html><body><div id="root"></div><script src="/main.js"></script></body></html>`;
  assert.equal(previewHtmlLooksLikeViteDev(html), false);
});

test("previewHtmlLooksLikeEmbedAppHtml accepts generic root + script", () => {
  const html = `<!DOCTYPE html><html><body><div id="app"></div><script src="/main.js"></script></body></html>`;
  assert.equal(previewHtmlLooksLikeEmbedAppHtml(html), true);
});

test("isClientLinkPreviewLoaderBlocking hides when iframe content is ready", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML: '<html><body><div id="root"><main>ok</main></div></body></html>',
      },
      body: { innerText: "ok", textContent: "ok" },
      getElementById: (id) => (id === "root" ? { childElementCount: 1, textContent: "ok" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      iframe,
    }),
    false,
  );
});

test("isClientLinkPreviewLoaderBlocking peels when gate open even if Vite root empty", () => {
  const html = `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>`;
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: html },
      body: { innerText: "", textContent: "" },
      getElementById: (id) => (id === "root" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(previewHtmlLooksLikeViteDev(html), true);
  assert.equal(isIframePreviewContentReady(iframe), false);
  // Vite embed shell is "ready enough" — loader must not block clicks.
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      embedReachable: true,
      iframeAccessible: true,
      devEmbedGateOpen: true,
      iframe,
    }),
    false,
  );
  // Gate closed and no iframe yet → still blocking.
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      embedReachable: false,
      iframeAccessible: false,
      devEmbedGateOpen: false,
      iframe: null,
    }),
    true,
  );
  // Gate open + accessible with no document yet → peel blocker (compiling chip path).
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      embedReachable: true,
      iframeAccessible: true,
      devEmbedGateOpen: true,
      iframe: null,
    }),
    false,
  );
});

test("isClientLinkPreviewLoaderBlocking stays covering for Next blank compile", () => {
  const html = `<!DOCTYPE html><html><body><div id="__next"></div><script src="/_next/static/chunks/main.js"></script></body></html>`;
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: html },
      body: { innerText: "", textContent: "" },
      getElementById: (id) => (id === "__next" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(iframeLooksLikeNextDev(iframe), true);
  assert.equal(isIframePreviewBlankOrBroken(iframe), true);
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      embedReachable: true,
      iframeAccessible: true,
      devEmbedGateOpen: true,
      isNextPreview: true,
      iframe,
    }),
    true,
  );
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      embedReachable: true,
      iframeAccessible: true,
      devEmbedGateOpen: true,
      iframe,
    }),
    true,
  );
});

test("shouldMarkNextInAppCompile only when Next route actually changed and not ready", () => {
  const readyHtml = `<!DOCTYPE html><html><body><div id="__next"><main>dashboard</main></div><script src="/_next/static/chunks/main.js"></script></body></html>`;
  const readyIframe = {
    contentDocument: {
      documentElement: { outerHTML: readyHtml },
      body: { innerText: "dashboard", textContent: "dashboard" },
      getElementById: (id) =>
        id === "__next" ? { childElementCount: 1, textContent: "dashboard" } : null,
      querySelector: () => null,
    },
  };
  assert.equal(
    shouldMarkNextInAppCompile({
      isNextPreview: true,
      previousPath: "/home",
      nextPath: "/home",
      iframe: readyIframe,
    }),
    false,
  );
  assert.equal(
    shouldMarkNextInAppCompile({
      isNextPreview: true,
      previousPath: "/home",
      nextPath: "/settings",
      iframe: readyIframe,
    }),
    false,
  );
  assert.equal(
    shouldMarkNextInAppCompile({
      isNextPreview: false,
      previousPath: "/home",
      nextPath: "/settings",
      iframe: null,
    }),
    false,
  );
  assert.equal(
    shouldMarkNextInAppCompile({
      isNextPreview: true,
      previousPath: "/home",
      nextPath: "/settings",
      iframe: null,
    }),
    true,
  );
  assert.equal(
    shouldMarkNextInAppCompile({
      isNextPreview: true,
      previousPath: "",
      nextPath: "/settings",
      iframe: null,
    }),
    false,
  );
});

test("isClientLinkPreviewLoaderBlocking covers while nextInAppCompiling even if boot-ready", () => {
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: true,
      previewBootFailed: false,
      embedReachable: true,
      iframeAccessible: true,
      devEmbedGateOpen: true,
      isNextPreview: true,
      nextInAppCompiling: true,
      iframe: null,
    }),
    true,
  );
});

test("isClientLinkPreviewLoaderBlocking stays true with failure diagnosis", () => {
  assert.equal(
    isClientLinkPreviewLoaderBlocking({
      previewIframeReady: false,
      previewBootFailed: false,
      devEmbedGateOpen: true,
      iframeAccessible: true,
      hasFailureDiagnosis: true,
      iframe: null,
    }),
    true,
  );
});

test("previewHtmlLooksLikeStaticSpa accepts Vite production index", () => {
  const html = `<!DOCTYPE html><html><body><div id="root"></div>
    <script type="module" src="/assets/index-abc.js"></script>
    <link rel="stylesheet" href="/assets/index-abc.css"></body></html>`;
  assert.equal(previewHtmlLooksLikeStaticSpa(html), true);
});

test("previewHtmlLooksLikeStaticSpa rejects Vite source index and /assets/*.json false positive", () => {
  assert.equal(
    previewHtmlLooksLikeStaticSpa(
      `<!DOCTYPE html><html><body><div id="root"></div>
       <link rel="manifest" href="/assets/manifest.json" />
       <script type="module" src="/src/main.tsx"></script></body></html>`,
    ),
    false,
  );
  assert.equal(
    previewHtmlLooksLikeStaticSpa(
      `<!DOCTYPE html><html><body><div id="root"></div>
       <script type="module">import '/src/main.tsx'</script></body></html>`,
    ),
    false,
  );
});

test("isIframePreviewContentReady rejects Vite dev shell before root hydrates", () => {
  const html = `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>`;
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: html },
      body: { innerText: "", textContent: "" },
      getElementById: (id) => (id === "root" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewContentReady(iframe), false);
});

test("isIframePreviewContentReady accepts static shell once root hydrates", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML:
          '<html><head><script src="/embedded/8030/assets/index.js"></script></head><body><div id="root"><main>ok</main></div></body></html>',
      },
      body: { innerText: "ok", textContent: "ok" },
      getElementById: (id) => (id === "root" ? { childElementCount: 1, textContent: "ok" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewContentReady(iframe), true);
});

test("extractEmbedPreviewErrorFromBody parses proxy not running page", () => {
  const html = `<!DOCTYPE html><html><body><h1>Preview is not running on port 8005</h1><p>Open the client link to start the preview, then reload.</p></body></html>`;
  assert.match(extractEmbedPreviewErrorFromBody(html, 502), /Preview is not running on port 8005/i);
});

test("looksLikeAppAuthGateText treats email login copy as a healthy app page", () => {
  const html = `<!DOCTYPE html><html><body><h1>Please enter your email to continue.</h1><form><input type="email" /></form></body></html>`;
  assert.equal(looksLikeAppAuthGateText(html), true);
  assert.equal(previewHtmlLooksLikeEmbedAppHtml(html), true);
  assert.equal(extractEmbedPreviewErrorFromBody(html, 200), "");
  assert.equal(classifyPreviewFailure({ bodyText: html, httpStatus: 200, source: "probe" }), null);
});

test("isIframePreviewBlankOrBroken detects empty root", () => {
  const iframe = {
    contentDocument: {
      body: { innerText: "", textContent: "" },
      getElementById: () => ({ childElementCount: 0, textContent: "" }),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewBlankOrBroken(iframe), true);
});

test("extractIframePreviewFailureMessage reads proxy 502 page", () => {
  const html = `<!DOCTYPE html><html><body><h1>Cannot reach preview</h1><p>Start the project dev server.</p></body></html>`;
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: html },
      body: {
        innerHTML: html,
        innerText: "Cannot reach preview Start the project dev server.",
        textContent: "Cannot reach preview Start the project dev server.",
      },
      getElementById: () => null,
      querySelector: () => null,
    },
  };
  const msg = extractIframePreviewFailureMessage(iframe);
  assert.match(msg, /cannot reach preview/i);
});

test("extractIframePreviewFailureMessage reads vite-error-overlay", () => {
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: "<html><body></body></html>" },
      body: { innerHTML: "", innerText: "", textContent: "" },
      getElementById: () => null,
      querySelector: mockQuerySelector({
        "vite-error-overlay": {
          textContent: 'Failed to resolve import "./Missing.jsx"',
          shadowRoot: null,
        },
      }),
    },
  };
  assert.match(extractIframePreviewFailureMessage(iframe), /Failed to resolve import/i);
});

test("looksLikeDevCompileErrorHtml detects Next Build Error", () => {
  const html = `<!DOCTYPE html><html><body><nextjs-portal></nextjs-portal>
    <div>Build Error Parsing ecmascript source code failed ./lib/mock/data.ts:860:52 Expected ':', got 'ident'</div>
  </body></html>`;
  assert.equal(looksLikeDevCompileErrorHtml(html), true);
  assert.match(
    formatDevCompileErrorSummary(
      "Build Error Parsing ecmascript source code failed ./lib/mock/data.ts:860:52 Expected ':', got 'ident' Import traces",
    ),
    /Build Error/i,
  );
});

test("looksLikeDevCompileErrorHtml ignores healthy Next.js nextjs-portal badge", () => {
  const html = `<!DOCTYPE html><html><body>
    <div id="__next"><main>Fantasy Sports. On-Chain. Fair.</main></div>
    <nextjs-portal></nextjs-portal>
    <script src="/_next/static/chunks/main.js"></script>
  </body></html>`;
  assert.equal(looksLikeDevCompileErrorHtml(html), false);
  assert.equal(previewHtmlLooksLikeEmbedAppHtml(html), true);
  assert.equal(previewHtmlLooksLikeNextDev(html, { allowBoot: true }), true);
});

test("looksLikeDevCompileErrorHtml ignores nextjs-portal Bootstrap Reboot CSS", () => {
  const css = `:host { all: initial; direction: ltr; } /*! * Bootstrap Reboot v4.4.1 */ *, *::before { box-sizing: border-box; }`;
  assert.equal(looksLikeDevCompileErrorHtml(css), false);
  assert.equal(
    looksLikeDevCompileErrorHtml(`<html><body><nextjs-portal></nextjs-portal></body></html>`),
    false,
  );
});

test("extractEmbedPreviewErrorFromBody extracts Next 500 build error", () => {
  const html = `<!DOCTYPE html><html><body>
    <h1>Build Error</h1>
    <p>Parsing ecmascript source code failed</p>
    <code>./lib/mock/data.ts:860:52</code>
    <p>Expected ':', got 'ident'</p>
  </body></html>`;
  const msg = extractEmbedPreviewErrorFromBody(html, 500);
  assert.match(msg, /Build Error|Parsing ecmascript/i);
  assert.equal(previewHtmlLooksLikeEmbedAppHtml(html), false);
});

test("classifyPreviewFailure detects compile_error from HTTP 500 Next body", () => {
  const d = classifyPreviewFailure({
    httpStatus: 500,
    bodyText: `<html><body>Build Error Parsing ecmascript source code failed ./lib/mock/data.ts:860:52 Expected ':', got 'ident'</body></html>`,
    source: "probe",
  });
  assert.equal(d?.kind, "compile_error");
  assert.match(d.summary, /HTTP 500|exact error page|preview frame/i);
  assert.match(d.detail, /Build Error|Parsing ecmascript/i);
});

test("isIframePreviewErrorPage detects nextjs-portal overlay with real error text", () => {
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: "<html><body><nextjs-portal></nextjs-portal></body></html>" },
      body: {
        innerHTML: "<nextjs-portal></nextjs-portal>",
        innerText: "",
        textContent: "",
      },
      getElementById: () => ({ childElementCount: 0, textContent: "" }),
      querySelector: mockQuerySelector({
        "nextjs-portal": {
          textContent: "",
          shadowRoot: {
            textContent:
              "Build Error Parsing ecmascript source code failed ./lib/mock/data.ts:860:52",
          },
        },
      }),
    },
  };
  assert.equal(isIframePreviewErrorPage(iframe), true);
  assert.match(extractIframePreviewFailureMessage(iframe), /Build Error|Parsing ecmascript/i);
});

test("isIframePreviewErrorPage ignores healthy nextjs-portal badge", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML:
          '<html><body><div id="__next"><main>ok</main></div><nextjs-portal></nextjs-portal></body></html>',
      },
      body: {
        innerHTML: '<div id="__next"><main>ok</main></div><nextjs-portal></nextjs-portal>',
        innerText: "ok",
        textContent: "ok",
      },
      getElementById: (id) =>
        id === "__next" ? { childElementCount: 1, textContent: "ok" } : null,
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
});

test("looksLikeDevCompileErrorText requires real failure phrases", () => {
  assert.equal(looksLikeDevCompileErrorText("Bootstrap Reboot :host { all: initial }"), false);
  assert.equal(
    looksLikeDevCompileErrorText("Build Error Parsing ecmascript source code failed"),
    true,
  );
});

test("classifyPreviewFailure detects port_unreachable from 502 body", () => {
  const d = classifyPreviewFailure({
    httpStatus: 502,
    bodyText: "<html><body><h1>Cannot reach preview</h1></body></html>",
    source: "probe",
  });
  assert.equal(d?.kind, "port_unreachable");
  assert.match(d.summary, /not running|start it/i);
  assert.equal(d.detail, "");
});

test("classifyPreviewFailure does not treat compile iframe as port_unreachable", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML:
          "<html><body><div id='root'></div><vite-error-overlay></vite-error-overlay></body></html>",
      },
      body: {
        innerText: 'Failed to resolve import "./Missing.jsx"',
        textContent: 'Failed to resolve import "./Missing.jsx"',
        innerHTML: "",
      },
      getElementById: (id) => (id === "root" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: mockQuerySelector({
        "vite-error-overlay": { textContent: "Failed to resolve import", shadowRoot: null },
      }),
    },
  };
  const d = classifyPreviewFailure({ iframe, source: "iframe" });
  assert.equal(d?.kind, "compile_error");
  assert.notEqual(d?.kind, "port_unreachable");
});

test("isIframePortUnreachablePage true only for proxy cannot-reach pages", () => {
  const down = {
    contentDocument: {
      documentElement: {
        outerHTML:
          "<html><body><h1>Cannot reach preview</h1><p>Start the project</p></body></html>",
      },
      body: {
        innerText: "Cannot reach preview Start the project",
        textContent: "Cannot reach preview",
        innerHTML: "<h1>Cannot reach preview</h1>",
      },
      getElementById: () => null,
      querySelector: () => null,
    },
  };
  assert.equal(isIframePortUnreachablePage(down), true);
  assert.equal(isIframePreviewErrorPage(down), true);

  const compile = {
    contentDocument: {
      documentElement: { outerHTML: "<html><body>Build Error</body></html>" },
      body: {
        innerText: "Build Error Parsing ecmascript source code failed",
        textContent: "Build Error Parsing ecmascript source code failed",
        innerHTML: "Build Error",
      },
      getElementById: () => null,
      querySelector: () => null,
    },
  };
  assert.equal(isIframePortUnreachablePage(compile), false);
});

test("isPortUnreachableSignal ignores long bodies that only mention 502 in passing", () => {
  assert.equal(
    isPortUnreachableSignal({
      bodyText: "x".repeat(500) + " status 502 in logs somewhere",
    }),
    false,
  );
  assert.equal(isPortUnreachableSignal({ httpStatus: 502, bodyText: "anything" }), true);
});

test("classifyPreviewFailure detects boot_failed from ensure", () => {
  const d = classifyPreviewFailure({
    ensureStatus: "failed",
    ensureError: "npm run dev did not start listening on port 8005.",
    errorDetail: "Error: Cannot find module 'vite'",
    source: "ensure",
  });
  assert.equal(d?.kind, "boot_failed");
  assert.match(d.summary, /npm run dev/);
  assert.match(d.detail, /Cannot find module/);
});

test("classifyPreviewFailure returns null while installing", () => {
  assert.equal(
    classifyPreviewFailure({ ensureStatus: "installing", ensureError: "still going" }),
    null,
  );
});

test("classifyPreviewFailure detects compile_error from iframe overlay", () => {
  const iframe = {
    contentDocument: {
      documentElement: { outerHTML: "<html><body><div id='root'></div></body></html>" },
      body: {
        innerText: 'Failed to resolve import "./Missing.jsx"',
        textContent: 'Failed to resolve import "./Missing.jsx"',
      },
      getElementById: (id) => (id === "root" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: mockQuerySelector({
        "vite-error-overlay": { textContent: "Failed to resolve import", shadowRoot: null },
      }),
    },
  };
  const d = classifyPreviewFailure({ iframe, source: "iframe" });
  assert.equal(d?.kind, "compile_error");
});

test("empty layout divs are blank only after the grace window", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML: '<html><body><div id="root"><div></div><div></div></div></body></html>',
      },
      body: { innerText: "", textContent: "" },
      getElementById: (id) => (id === "root" ? { childElementCount: 2, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewVisuallyBlank(iframe), true);
  assert.equal(isIframePreviewBlankOrBroken(iframe), true);
  assert.equal(classifyPreviewFailure({ iframe, source: "iframe" }), null);
  const diagnosed = classifyPreviewFailure({ iframe, source: "iframe", blankSustained: true });
  assert.equal(diagnosed?.kind, "blank_app");
  assert.match(diagnosed.detail, /no visible content/i);
});

test("inline script payload does not count as visible content on a white page", () => {
  const iframe = {
    contentDocument: {
      readyState: "complete",
      documentElement: {
        outerHTML:
          '<html><body><div id="__next"><div class="min-h-screen bg-gray-100"></div></div><script>self.__next_f.push([1,"payload"])</script></body></html>',
      },
      body: { innerText: "", textContent: 'self.__next_f.push([1,"payload"])' },
      getElementById: (id) => (id === "__next" ? { childElementCount: 1, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewVisuallyBlank(iframe), true);
  assert.equal(isIframePreviewContentReady(iframe), false);
  const diagnosed = classifyPreviewFailure({ iframe, source: "iframe", blankSustained: true });
  assert.equal(diagnosed?.kind, "blank_app");
  assert.equal(diagnosed.blocking, true);
});

test("rootless app is blank only once the document finished loading", () => {
  const makeIframe = (readyState, URL = "https://p.example.com/") => ({
    contentDocument: {
      readyState,
      URL,
      documentElement: { outerHTML: "<html><body><div id='app-shell'></div></body></html>" },
      body: { innerText: "", textContent: "" },
      getElementById: () => null,
      querySelector: () => null,
    },
  });
  assert.equal(isIframePreviewVisuallyBlank(makeIframe("interactive")), false);
  assert.equal(isIframePreviewVisuallyBlank(makeIframe("complete")), true);
  assert.equal(isIframePreviewVisuallyBlank(makeIframe("complete", "about:blank")), false);
});

test("image-only page is not visually blank", () => {
  const img = { getBoundingClientRect: () => ({ width: 640, height: 360 }) };
  const iframe = {
    contentDocument: {
      readyState: "complete",
      documentElement: {
        outerHTML: "<html><body><div id='root'><img src='/hero.png'></div></body></html>",
      },
      body: { innerText: "", textContent: "", querySelectorAll: () => [img] },
      getElementById: (id) => (id === "root" ? { childElementCount: 1, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewVisuallyBlank(iframe), false);
});

test("brief empty Next root during the grace window is not a failure", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML: '<html><body><div id="__next"></div></body></html>',
      },
      body: { innerText: "", textContent: "" },
      getElementById: (id) => (id === "__next" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  assert.equal(isIframePreviewBlankOrBroken(iframe), true);
  const duringBoot = reconcilePreviewConsoleWatch({ iframe, blankSince: 100, now: 200 });
  assert.equal(duringBoot.type, "idle");
  const early = reconcilePreviewConsoleWatch({
    iframe,
    blankSince: 100,
    now: 200,
    previewWasReady: true,
  });
  assert.equal(early.type, "wait");
  assert.equal(classifyPreviewFailure({ iframe, source: "iframe" }), null);
});

test("uncaught error on a rendered preview is a non-blocking diagnosis", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML: "<html><body><div id='root'><main>Dashboard</main></div></body></html>",
      },
      body: { innerText: "Dashboard", textContent: "Dashboard" },
      getElementById: (id) =>
        id === "root" ? { childElementCount: 1, textContent: "Dashboard" } : null,
      querySelector: () => null,
    },
  };
  const d = classifyPreviewFailure({
    iframe,
    source: "iframe",
    consoleLines: ["error: Uncaught TypeError: boom"],
  });
  assert.equal(d?.kind, "runtime_error");
  assert.equal(d.blocking, false);
  assert.match(d.detail, /Uncaught TypeError: boom/);
});

test("classifyPreviewFailure detects blank_app for empty root after broken check", () => {
  const iframe = {
    contentDocument: {
      documentElement: {
        outerHTML:
          '<html><body><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>',
      },
      body: { innerHTML: "", innerText: "", textContent: "" },
      getElementById: (id) => (id === "root" ? { childElementCount: 0, textContent: "" } : null),
      querySelector: () => null,
    },
  };
  const d = classifyPreviewFailure({ iframe, source: "iframe" });
  assert.equal(d?.kind, "blank_app");
});

test("embedHtmlNeedsViteClientProbe true only for Vite-dev shells", () => {
  const vite = `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>`;
  const next = `<!DOCTYPE html><html><body><div id="__next"></div><script src="/_next/static/chunks/main.js"></script></body></html>`;
  assert.equal(embedHtmlNeedsViteClientProbe(vite), true);
  assert.equal(embedHtmlNeedsViteClientProbe(next), false);
  assert.equal(embedHtmlNeedsViteClientProbe(""), false);
});

test("pollUntilEmbedViteModulesReady skips @vite/client for Next embed HTML", async () => {
  const nextHtml = `<!DOCTYPE html><html><body><div id="__next"></div><script src="/_next/static/chunks/main.js"></script></body></html>`;
  const prevFetch = globalThis.fetch;
  let viteClientFetches = 0;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("/@vite/client")) {
      viteClientFetches += 1;
      return {
        ok: false,
        status: 404,
        headers: { get: () => "text/plain" },
        text: async () => "Not Found",
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
      text: async () => nextHtml,
    };
  };
  try {
    const result = await pollUntilEmbedViteModulesReady("/embedded/8035/?embed_frame=1", {
      quiet: true,
      maxAttempts: 3,
    });
    assert.equal(result.ok, true);
    assert.equal(viteClientFetches, 0);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test("embedPreviewHttpStatusLooksReady treats Next 307/308 as ready", () => {
  assert.equal(embedPreviewHttpStatusLooksReady(200, "next"), true);
  assert.equal(embedPreviewHttpStatusLooksReady(307, "next"), true);
  assert.equal(embedPreviewHttpStatusLooksReady(308, "next"), true);
  assert.equal(embedPreviewHttpStatusLooksReady(500, "next"), false);
  assert.equal(embedPreviewHttpStatusLooksReady(307, "vite"), false);
});
