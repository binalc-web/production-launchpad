import test from "node:test";
import assert from "node:assert/strict";

function ensureBrowserGlobals() {
  if (typeof globalThis.window !== "undefined") return;
  const messageListeners = new Set();
  globalThis.window = {
    location: { origin: "http://localhost" },
    addEventListener(type, fn) {
      if (type === "message") messageListeners.add(fn);
    },
    removeEventListener(type, fn) {
      if (type === "message") messageListeners.delete(fn);
    },
    dispatchEvent(ev) {
      if (ev.type === "message") {
        for (const fn of messageListeners) fn(ev);
      }
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };
}

ensureBrowserGlobals();

const { EMBED_HMR_WS_MESSAGE_TYPE, waitForEmbedHmrUpdate } = await import(
  "../src/lib/clientLinkEmbedHmrWs.js"
);

test("waitForEmbedHmrUpdate resolves on hmr-update postMessage", async () => {
  const port = 8015;
  const promise = waitForEmbedHmrUpdate({ port, timeoutMs: 500, settleMs: 0 });

  queueMicrotask(() => {
    window.dispatchEvent({
      type: "message",
      origin: window.location.origin,
      data: {
        type: EMBED_HMR_WS_MESSAGE_TYPE,
        status: "hmr-update",
        port,
        updates: 1,
      },
    });
  });

  const result = await promise;
  assert.equal(result.ok, true);
  assert.equal(result.status, "hmr-update");
});

test("waitForEmbedHmrUpdate resolves on full-reload postMessage", async () => {
  const port = 8020;
  const promise = waitForEmbedHmrUpdate({ port, timeoutMs: 500, settleMs: 0 });

  queueMicrotask(() => {
    window.dispatchEvent({
      type: "message",
      origin: window.location.origin,
      data: {
        type: EMBED_HMR_WS_MESSAGE_TYPE,
        status: "full-reload",
        port,
        path: "/",
      },
    });
  });

  const result = await promise;
  assert.equal(result.ok, true);
  assert.equal(result.status, "full-reload");
});

test("waitForEmbedHmrUpdate times out when no signal arrives", async () => {
  const result = await waitForEmbedHmrUpdate({
    port: 8030,
    timeoutMs: 30,
    settleMs: 0,
  });
  assert.deepEqual(result, { ok: false, reason: "timeout" });
});

test("waitForEmbedHmrUpdate ignores messages for a different port", async () => {
  const promise = waitForEmbedHmrUpdate({ port: 8040, timeoutMs: 40, settleMs: 0 });

  queueMicrotask(() => {
    window.dispatchEvent({
      type: "message",
      origin: window.location.origin,
      data: {
        type: EMBED_HMR_WS_MESSAGE_TYPE,
        status: "hmr-update",
        port: 9999,
      },
    });
  });

  const result = await promise;
  assert.deepEqual(result, { ok: false, reason: "timeout" });
});

test("waitForEmbedHmrUpdate ignores messages during settle window", async () => {
  const port = 8050;
  const promise = waitForEmbedHmrUpdate({
    port,
    timeoutMs: 200,
    settleMs: 80,
  });

  queueMicrotask(() => {
    window.dispatchEvent({
      type: "message",
      origin: window.location.origin,
      data: {
        type: EMBED_HMR_WS_MESSAGE_TYPE,
        status: "hmr-update",
        port,
      },
    });
  });

  const result = await promise;
  assert.deepEqual(result, { ok: false, reason: "timeout" });
});
