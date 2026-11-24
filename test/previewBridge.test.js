import test from "node:test";
import assert from "node:assert/strict";

// Minimal window for the parent-side message listener.
const listeners = new Set();
globalThis.window = {
  location: { origin: "https://launchpad.example.com" },
  addEventListener: (type, fn) => type === "message" && listeners.add(fn),
  removeEventListener: (type, fn) => listeners.delete(fn),
};
const dispatch = (ev) => {
  for (const fn of listeners) fn(ev);
};

const {
  attachPreviewBridge,
  callPreviewBridge,
  getPreviewBridgeState,
  getPreviewConsoleLines,
  subscribePreviewConsole,
  isPreviewBridgeSrc,
  normalizePreviewEmbedOrigin,
  removeIframeWindowListener,
} = await import("../src/lib/previewBridge.js");
const {
  buildEmbeddedPreviewSrc,
  buildSubdomainPreviewSrc,
  navigateEmbedIframeToAppRoute,
  readIframeBrowsePath,
} = await import("../src/lib/clientLinkEmbeddedPreviewSrc.js");
const {
  isDevIframePreviewSrc,
  classifyPreviewFailure,
  isIframePreviewBlankOrBroken,
  isIframePreviewContentReady,
  isIframePreviewErrorPage,
  PREVIEW_BLANK_SUSTAIN_MS,
  reconcilePreviewConsoleWatch,
  resolveEmbedViteClientProbeUrl,
} = await import("../src/lib/clientLinkPreviewHealth.js");

const ORIGIN = "https://demo.preview.example.com";

function fakeFrame() {
  const sent = [];
  const contentWindow = { postMessage: (msg, origin) => sent.push({ msg, origin }) };
  return { iframe: { contentWindow, contentDocument: null }, sent };
}

const push = (iframe, state, origin = ORIGIN) =>
  dispatch({
    origin,
    source: iframe.contentWindow,
    data: { type: "launchpad:bridge:state", state },
  });

const READY = {
  path: "/dashboard?tab=1",
  readyState: "complete",
  hasBody: true,
  hasRoot: true,
  rootEmpty: false,
  bodyTextLength: 120,
  errorOverlay: false,
  overlayText: "",
};

test("subdomain src: app at /, version and nonce, no embed_* params", () => {
  assert.equal(normalizePreviewEmbedOrigin(`${ORIGIN}/x`), ORIGIN);
  assert.equal(buildSubdomainPreviewSrc(ORIGIN), `${ORIGIN}/`);
  assert.equal(
    buildEmbeddedPreviewSrc(8005, "/settings?embed_port=8005#h", {
      origin: ORIGIN,
      versionId: 7,
      nonce: 2,
    }),
    `${ORIGIN}/settings?version=7&_pv=2#h`,
  );
  assert.match(buildEmbeddedPreviewSrc(8005, "/settings"), /^\/embedded\/8005\/settings\?/);
});

test("health and route helpers read bridge state for cross-origin frames", () => {
  const { iframe } = fakeFrame();
  attachPreviewBridge(iframe, ORIGIN);
  assert.ok(isPreviewBridgeSrc(`${ORIGIN}/?_pv=1`));
  assert.ok(isDevIframePreviewSrc(`${ORIGIN}/`));
  assert.equal(resolveEmbedViteClientProbeUrl(`${ORIGIN}/a?b=1`), `${ORIGIN}/@vite/client`);

  assert.equal(isIframePreviewContentReady(iframe), false, "no state yet");
  assert.equal(isIframePreviewBlankOrBroken(iframe), true);

  push(iframe, READY, "https://evil.example.com");
  assert.equal(getPreviewBridgeState(iframe), null, "foreign origin ignored");

  push(iframe, READY);
  assert.equal(isIframePreviewContentReady(iframe), true);
  assert.equal(readIframeBrowsePath(iframe), "/dashboard?tab=1");

  push(iframe, { ...READY, rootEmpty: true });
  assert.equal(isIframePreviewContentReady(iframe), false);

  push(iframe, { ...READY, errorOverlay: true, overlayText: "Failed to resolve import ./x" });
  assert.equal(isIframePreviewErrorPage(iframe), true);
});

test("same-origin console post is stored on the iframe", () => {
  const { iframe } = fakeFrame();
  const seen = [];
  subscribePreviewConsole(iframe, (lines) => seen.push(lines));
  dispatch({
    origin: "https://evil.example.com",
    source: iframe.contentWindow,
    data: { type: "launchpad:preview-console", consoleLines: ["error: ignored"] },
  });
  assert.deepEqual(getPreviewConsoleLines(iframe), []);
  dispatch({
    origin: "https://launchpad.example.com",
    source: iframe.contentWindow,
    data: { type: "launchpad:preview-console", consoleLines: ["error: Uncaught boom"] },
  });
  assert.deepEqual(getPreviewConsoleLines(iframe), ["error: Uncaught boom"]);
  assert.equal(seen.length, 1);
});

test("subdomain white screen is blank only after it lasts, and a later crash is diagnosed", () => {
  const { iframe } = fakeFrame();
  attachPreviewBridge(iframe, ORIGIN);
  const blank = {
    ...READY,
    rootEmpty: false,
    bodyTextLength: 0,
    visibleTextLength: 0,
    bodyTextSample: "",
    consoleLines: [],
  };
  push(iframe, blank);
  assert.equal(isIframePreviewBlankOrBroken(iframe), true);
  assert.equal(isIframePreviewContentReady(iframe), false);
  assert.equal(classifyPreviewFailure({ iframe, source: "iframe" }), null);

  const duringBoot = reconcilePreviewConsoleWatch({
    iframe,
    blankSince: 1_000,
    now: 1_000 + PREVIEW_BLANK_SUSTAIN_MS,
    previewWasReady: false,
  });
  assert.equal(duringBoot.type, "idle");

  const early = reconcilePreviewConsoleWatch({
    iframe,
    blankSince: 1_000,
    now: 1_000 + 500,
    previewWasReady: true,
  });
  assert.equal(early.type, "wait");

  const later = reconcilePreviewConsoleWatch({
    iframe,
    blankSince: 1_000,
    now: 1_000 + PREVIEW_BLANK_SUSTAIN_MS,
    previewWasReady: true,
  });
  assert.equal(later.type, "apply");
  assert.equal(later.diagnosis.kind, "blank_app");

  push(iframe, {
    ...READY,
    consoleLines: ["error: Uncaught TypeError: boom"],
  });
  const crash = classifyPreviewFailure({ iframe, source: "iframe" });
  assert.equal(crash?.kind, "runtime_error");
  assert.equal(crash.blocking, false);
  assert.match(crash.detail, /Uncaught TypeError: boom/);

  push(iframe, { ...blank, consoleLines: ["error: Uncaught TypeError: boom"] });
  const whiteCrash = reconcilePreviewConsoleWatch({
    iframe,
    now: 5_000,
    blankSince: 5_000,
    previewWasReady: true,
  });
  assert.equal(whiteCrash.type, "apply");
  assert.equal(whiteCrash.diagnosis.kind, "blank_app");
  assert.match(whiteCrash.diagnosis.detail, /Uncaught TypeError: boom/);
});

test("navigate and calls go through postMessage to the preview origin", async () => {
  const { iframe, sent } = fakeFrame();
  attachPreviewBridge(iframe, ORIGIN);
  push(iframe, READY);

  assert.equal(navigateEmbedIframeToAppRoute(iframe, 8005, "/dashboard?tab=1"), true);
  assert.equal(sent.length, 0, "already there");
  assert.equal(navigateEmbedIframeToAppRoute(iframe, 8005, "/reports"), true);
  assert.equal(sent[0].origin, ORIGIN);
  assert.equal(sent[0].msg.method, "navigate");
  assert.deepEqual(sent[0].msg.params, { path: "/reports" });

  const pending = callPreviewBridge(iframe, "ping");
  const req = sent.at(-1).msg;
  dispatch({
    origin: ORIGIN,
    source: iframe.contentWindow,
    data: { type: "launchpad:bridge:res", id: req.id, ok: true, result: { ok: 1 } },
  });
  assert.deepEqual(await pending, { ok: 1 });

  const failing = callPreviewBridge(iframe, "reload", {}, { timeoutMs: 20 });
  await assert.rejects(failing, /timed out/);
});

test("removeIframeWindowListener tolerates a frame that navigated cross-origin", () => {
  const crossOrigin = {
    removeEventListener() {
      throw new Error("SecurityError: Blocked a frame from accessing a cross-origin frame.");
    },
  };
  assert.doesNotThrow(() => removeIframeWindowListener(crossOrigin, "popstate", () => {}));
  assert.doesNotThrow(() => removeIframeWindowListener(null, "popstate", () => {}));

  const removed = [];
  const sameOrigin = { removeEventListener: (...args) => removed.push(args) };
  const fn = () => {};
  removeIframeWindowListener(sameOrigin, "scroll", fn, true);
  assert.deepEqual(removed, [["scroll", fn, true]]);
});
