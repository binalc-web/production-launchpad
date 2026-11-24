import test from "node:test";
import assert from "node:assert/strict";
import {
  EMBED_HMR_WS_MESSAGE_TYPE,
  buildEmbedBootstrapScript,
  buildEmbedStorageShimScript,
  isEmbedHmrWsMessage,
} from "../iframe-preview/embedHmrWs.js";

test("buildEmbedStorageShimScript patches broken localStorage and sessionStorage", () => {
  const script = buildEmbedStorageShimScript();
  assert.match(script, /data-embed-storage-shim/);
  assert.match(script, /patch\("localStorage"\)/);
  assert.match(script, /patch\("sessionStorage"\)/);
  assert.doesNotThrow(() => {
    const body = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    assert.ok(body);
    new Function(body)();
  });
});

test("buildEmbedBootstrapScript reports HMR failures via postMessage", () => {
  const script = buildEmbedBootstrapScript();
  assert.match(script, /data-embed-storage-shim/);
  assert.match(script, /data-embed-bootstrap/);
  assert.match(script, /data-embed-session-restore/);
  assert.match(script, /launchpad:embed-session-restore:/);
  assert.match(script, /__lpSession/);
  assert.match(script, /__lpLocal/);
  assert.match(script, /__lpCookies/);
  assert.match(script, /path="\+cp/);
  assert.match(script, /Max-Age=0/);
  assert.match(script, /embed_port="\+port\+";path=\//);
  assert.match(
    script,
    new RegExp(EMBED_HMR_WS_MESSAGE_TYPE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.match(script, /postMessage/);
  assert.match(script, /notify\("open"\)/);
  assert.match(script, /notify\("failed"/);
  assert.match(script, /notify\("hmr-update"/);
  assert.match(script, /msg\.type==="update"/);
  assert.match(script, /launchpad:embed-compile-progress/);
  assert.match(script, /resetCompileTheater/);
  assert.match(script, /applyServerCompileProgress/);
  assert.match(script, /launchpad:compile-progress/);
  assert.doesNotMatch(script, /pollServerTotal/);
  assert.doesNotMatch(script, /__launchpad\/compile-progress/);
  assert.match(script, /PerformanceObserver/);
  assert.match(script, /MutationObserver/);
});

test("buildEmbedBootstrapScript inline scripts are syntactically valid", () => {
  const html = buildEmbedBootstrapScript();
  const bodies = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(bodies.length >= 3);
  for (const body of bodies) {
    assert.doesNotThrow(() => new Function(body));
  }
});

test("isEmbedHmrWsMessage accepts open, failed, full-reload, and hmr-update payloads", () => {
  assert.equal(
    isEmbedHmrWsMessage({
      type: EMBED_HMR_WS_MESSAGE_TYPE,
      status: "open",
      port: 8015,
    }),
    true,
  );
  assert.equal(
    isEmbedHmrWsMessage({
      type: EMBED_HMR_WS_MESSAGE_TYPE,
      status: "failed",
      port: 8015,
      failStreak: 3,
    }),
    true,
  );
  assert.equal(
    isEmbedHmrWsMessage({
      type: EMBED_HMR_WS_MESSAGE_TYPE,
      status: "hmr-update",
      port: 8015,
      updates: 2,
    }),
    true,
  );
  assert.equal(isEmbedHmrWsMessage({ type: "other", status: "open" }), false);
});
