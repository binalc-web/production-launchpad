import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPreviewDesktopControlWsUrl,
  connectPreviewDesktopControlSocket,
  previewControlReconnectDelayMs,
} from "../src/lib/previewDesktopControlSocket.js";

test("buildPreviewDesktopControlWsUrl maps http(s) to ws(s)", () => {
  assert.equal(
    buildPreviewDesktopControlWsUrl("https://api.example.com/", 63),
    "wss://api.example.com/api/preview-desktop/public/projects/63/control/ws",
  );
  assert.equal(
    buildPreviewDesktopControlWsUrl("http://localhost:5000", 7),
    "ws://localhost:5000/api/preview-desktop/public/projects/7/control/ws",
  );
});

test("previewControlReconnectDelayMs backs off and caps", () => {
  assert.equal(previewControlReconnectDelayMs(1), 1000);
  assert.equal(previewControlReconnectDelayMs(2), 2000);
  assert.equal(previewControlReconnectDelayMs(10), 15000);
});

function fakeSocketEnv() {
  const sockets = [];
  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.closed = false;
      sockets.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  const timers = [];
  return {
    sockets,
    timers,
    WebSocketImpl: FakeWebSocket,
    setTimeoutImpl: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeoutImpl: () => {},
  };
}

test("the socket delivers control messages and ignores other frames", () => {
  const env = fakeSocketEnv();
  const seen = [];
  connectPreviewDesktopControlSocket({ url: "ws://x", onControl: (c) => seen.push(c), ...env });
  const ws = env.sockets[0];
  ws.onmessage({ data: JSON.stringify({ type: "control", control: { active: true } }) });
  ws.onmessage({ data: JSON.stringify({ type: "heartbeat" }) });
  ws.onmessage({ data: "not json" });
  ws.onmessage({ data: JSON.stringify({ type: "control", control: null }) });
  assert.deepEqual(seen, [{ active: true }, null]);
});

test("a dropped socket reconnects with backoff and resets after it opens", () => {
  const env = fakeSocketEnv();
  let disconnects = 0;
  connectPreviewDesktopControlSocket({
    url: "ws://x",
    onControl: () => {},
    onDisconnect: () => {
      disconnects += 1;
    },
    ...env,
  });
  env.sockets[0].onclose({ code: 1006 });
  assert.equal(disconnects, 1);
  assert.equal(env.timers[0].ms, 1000);
  env.timers[0].fn();
  assert.equal(env.sockets.length, 2);
  env.sockets[1].onclose({ code: 1006 });
  assert.equal(env.timers[1].ms, 2000);
  env.timers[1].fn();
  env.sockets[2].onopen();
  env.sockets[2].onclose({ code: 1006 });
  assert.equal(env.timers[2].ms, 1000);
});

test("closing stops reconnects, and a missing project is not retried", () => {
  const env = fakeSocketEnv();
  const close = connectPreviewDesktopControlSocket({ url: "ws://x", onControl: () => {}, ...env });
  close();
  assert.equal(env.sockets[0].closed, true);
  env.sockets[0].onclose({ code: 1000 });
  assert.equal(env.timers.length, 0);

  const env2 = fakeSocketEnv();
  connectPreviewDesktopControlSocket({ url: "ws://x", onControl: () => {}, ...env2 });
  env2.sockets[0].onclose({ code: 4404 });
  assert.equal(env2.timers.length, 0);
});
