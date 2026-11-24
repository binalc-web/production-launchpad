import test from "node:test";
import assert from "node:assert/strict";
import { CURRENT_CHAT_THREAD_ID } from "../src/hooks/useOlderChatThreads.js";
import {
  archivedThreadEmptyMessage,
  parseArchivedThreadMessages,
  resolveOlderChatError,
} from "../src/hooks/olderChatThreads.util.js";

test("CURRENT_CHAT_THREAD_ID is current", () => {
  assert.equal(CURRENT_CHAT_THREAD_ID, "current");
});

test("resolveOlderChatError prefers API error field", () => {
  assert.equal(
    resolveOlderChatError({ error: "Thread not found" }, "fallback"),
    "Thread not found",
  );
  assert.equal(resolveOlderChatError({ message: "Network error" }, "fallback"), "Network error");
  assert.equal(resolveOlderChatError(null, "fallback"), "fallback");
});

test("parseArchivedThreadMessages returns array or empty", () => {
  assert.deepEqual(parseArchivedThreadMessages({ messages: [{ id: 1 }] }), [{ id: 1 }]);
  assert.deepEqual(parseArchivedThreadMessages({ messages: null }), []);
  assert.deepEqual(parseArchivedThreadMessages(null), []);
});

test("archivedThreadEmptyMessage when no rows", () => {
  assert.equal(archivedThreadEmptyMessage([]), "No messages found for this older chat.");
  assert.equal(archivedThreadEmptyMessage([{ id: 1 }]), "");
});

test("selectThread success path keeps viewing state with messages", () => {
  const data = { messages: [{ id: 1, role: "user", text: "hello" }] };
  const rows = parseArchivedThreadMessages(data);
  assert.equal(rows.length, 1);
  assert.equal(archivedThreadEmptyMessage(rows), "");
});

test("selectThread failure path preserves error without reverting thread id at util layer", () => {
  const err = resolveOlderChatError({ error: "Could not load older chat." }, "fallback");
  assert.equal(err, "Could not load older chat.");
});
