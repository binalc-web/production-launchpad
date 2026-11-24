import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAssistantEvent,
  ASSISTANT_STREAMING_ID,
  isAssistantReplyEvent,
  isAssistantReplyMissing,
} from "../src/lib/assistantSseEvents.js";
import { assistantDisplayText } from "../src/lib/assistantGoal.js";

test("assistant reply detection flags a stream that ended without an answer", () => {
  assert.equal(isAssistantReplyEvent({ type: "assistant_message" }), true);
  assert.equal(isAssistantReplyEvent({ type: "error" }), true);
  assert.equal(isAssistantReplyEvent({ type: "user_message" }), false);
  assert.equal(isAssistantReplyMissing([{ role: "user", content: "Hi" }]), true);
  assert.equal(
    isAssistantReplyMissing([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]),
    false,
  );
});

test("assistantDisplayText never returns blank for a non-empty reply", () => {
  assert.equal(assistantDisplayText("Open the Preview tab."), "Open the Preview tab.");
  assert.equal(assistantDisplayText("Status: in progress"), "Status: in progress");
  assert.equal(assistantDisplayText(""), "");
});

function makeHarness(initial = {}) {
  const state = {
    messages: initial.messages || [],
    pending: initial.pending ?? null,
    thread: initial.thread ?? null,
    liveTools: initial.liveTools || [],
  };
  const setters = {
    setMessages: (fn) => {
      state.messages = typeof fn === "function" ? fn(state.messages) : fn;
    },
    setPending: (fn) => {
      state.pending = typeof fn === "function" ? fn(state.pending) : fn;
    },
    setThread: (fn) => {
      state.thread = typeof fn === "function" ? fn(state.thread) : fn;
    },
    setLiveTools: (fn) => {
      state.liveTools = typeof fn === "function" ? fn(state.liveTools) : fn;
    },
  };
  return { state, apply: (evt) => applyAssistantEvent(evt, setters) };
}

test("applyAssistantEvent appends assistant_delta onto a streaming placeholder", () => {
  const { state, apply } = makeHarness();
  apply({ type: "assistant_delta", content: "Hel" });
  apply({ type: "assistant_delta", content: "lo" });
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].id, ASSISTANT_STREAMING_ID);
  assert.equal(state.messages[0].streaming, true);
  assert.equal(state.messages[0].content, "Hello");
});

test("applyAssistantEvent replaces the streaming placeholder with assistant_message", () => {
  const { state, apply } = makeHarness({
    messages: [
      { id: ASSISTANT_STREAMING_ID, role: "assistant", content: "Hel", streaming: true },
    ],
    liveTools: [{ name: "list_stories", status: "done" }],
  });
  apply({
    type: "assistant_message",
    message: { id: "msg-1", role: "assistant", content: "Hello" },
  });
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].id, "msg-1");
  assert.equal(state.messages[0].content, "Hello");
  assert.equal(state.liveTools.length, 0);
});

test("applyAssistantEvent swaps an optimistic user row for the persisted user_message", () => {
  const { state, apply } = makeHarness({
    messages: [{ id: "local-user-1", role: "user", content: "Hi", optimistic: true }],
  });
  apply({
    type: "user_message",
    message: { id: "u-1", role: "user", content: "Hi" },
  });
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].id, "u-1");
  assert.equal(state.messages[0].optimistic, undefined);
});
