import assert from "node:assert/strict";
import test from "node:test";
import { runSseWithReconnect } from "../src/lib/sseStreamReconnect.js";

test("runSseWithReconnect returns cleanly when aborted during backoff (RND-LAUNCHPAD-FE-E)", async () => {
  const controller = new AbortController();
  let connects = 0;
  const done = runSseWithReconnect({
    signal: controller.signal,
    maxAttempts: 4,
    baseDelayMs: 50,
    onEvent: () => {},
    connect: async () => {
      connects += 1;
      return null;
    },
  });
  await new Promise((r) => setTimeout(r, 10));
  controller.abort();
  const result = await done;
  assert.equal(result, null);
  assert.ok(connects >= 1);
});

test("runSseWithReconnect swallows AbortError from connect", async () => {
  const controller = new AbortController();
  const err = new Error("signal is aborted without reason");
  err.name = "AbortError";
  const result = await runSseWithReconnect({
    signal: controller.signal,
    maxAttempts: 3,
    baseDelayMs: 1,
    onEvent: () => {},
    connect: async () => {
      throw err;
    },
  });
  assert.equal(result, null);
});
