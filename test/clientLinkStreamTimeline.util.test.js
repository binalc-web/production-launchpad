import assert from "node:assert/strict";
import test from "node:test";
import {
  agentStreamTimelineHasContent,
  isAgentLiveStreamPhaseLabel,
  normalizeAgentStreamTimeline,
  resolveAgentLiveAssistantText,
  shouldPreferStreamTextOverTimelineAssistant,
} from "../src/pages/ClientLink/chat/clientLinkStreamTimeline.util.js";

test("normalizeAgentStreamTimeline filters invalid items", () => {
  const items = normalizeAgentStreamTimeline([
    {
      type: "tool_call",
      id: "1",
      toolName: "Read",
      label: "/x",
      status: "running",
    },
    null,
    { type: "invalid" },
  ]);
  assert.equal(items.length, 1);
});

test("resolveAgentLiveAssistantText prefers timeline when streamText is phase label", () => {
  const text = resolveAgentLiveAssistantText("Agent is working…", [
    { type: "assistant", text: "Hello from timeline" },
  ]);
  assert.equal(text, "Hello from timeline");
});

test("resolveAgentLiveAssistantText prefers substantive streamText over stale timeline", () => {
  const streamText =
    "Dark and light mode are in place across the marketing site and trading platform.";
  const timeline = [
    { type: "assistant", text: "Old routing answer from prior turn." },
    {
      type: "tool_call",
      id: "1",
      toolName: "Shell",
      label: "graphify",
      status: "running",
    },
  ];
  const text = resolveAgentLiveAssistantText(streamText, timeline);
  assert.equal(text, streamText);
  assert.equal(
    shouldPreferStreamTextOverTimelineAssistant(streamText, timeline),
    true,
  );
});

test("isAgentLiveStreamPhaseLabel detects backend phase labels", () => {
  assert.equal(isAgentLiveStreamPhaseLabel("Agent is working…"), true);
  assert.equal(
    isAgentLiveStreamPhaseLabel("Dark and light mode are in place."),
    false,
  );
});

test("normalizeAgentStreamTimeline preserves item order", () => {
  const items = normalizeAgentStreamTimeline([
    { type: "thinking", id: "1", text: "plan" },
    {
      type: "tool_call",
      id: "2",
      toolName: "Shell",
      label: "ls",
      status: "running",
    },
    { type: "assistant", id: "3", text: "Done" },
    { type: "result", id: "4", success: true, durationMs: 100 },
  ]);
  assert.deepEqual(
    items.map((item) => item.type),
    ["thinking", "tool_call", "assistant", "result"],
  );
});
