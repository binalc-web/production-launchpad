import assert from "node:assert/strict";
import test from "node:test";
import { readAbortableSseChunk } from "../src/lib/sseJson.js";

test("readAbortableSseChunk returns done on AbortError (Sentry RND-LAUNCHPAD-FE-E)", async () => {
  const err = new Error("signal is aborted without reason");
  err.name = "AbortError";
  const reader = {
    read: async () => {
      throw err;
    },
  };
  const result = await readAbortableSseChunk(reader);
  assert.deepEqual(result, { done: true, value: undefined });
});

test("readAbortableSseChunk rethrows non-abort errors", async () => {
  const reader = {
    read: async () => {
      throw new Error("boom");
    },
  };
  await assert.rejects(() => readAbortableSseChunk(reader), /boom/);
});

test("readAbortableSseChunk passes through normal chunks", async () => {
  const chunk = { done: false, value: new Uint8Array([1, 2]) };
  const reader = {
    read: async () => chunk,
  };
  assert.equal(await readAbortableSseChunk(reader), chunk);
});
