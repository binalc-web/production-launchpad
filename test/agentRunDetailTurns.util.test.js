import assert from "node:assert/strict";
import test from "node:test";
import {
  agentRunTurnLabel,
  resolveAgentRunDetailTurns,
  splitConversationIntoTurns,
} from "../src/pages/AgentAnalytics/agentRunDetailTurns.util.js";

test("splitConversationIntoTurns keeps user prompts", () => {
  const turns = splitConversationIntoTurns({
    messages: [
      { type: "user_message", text: "Do the thing" },
      { type: "assistant_message", text: "Done." },
    ],
  });
  assert.equal(turns[0].prompt, "Do the thing");
  assert.equal(turns[0].assistantText, "Done.");
});

test("resolveAgentRunDetailTurns prefers server turns and overlays live timeline on latest", () => {
  const detail = {
    turns: [
      {
        index: 0,
        kind: "original",
        prompt: "First",
        assistantText: "A1",
        streamTimeline: [{ id: "a", type: "assistant", text: "A1" }],
        usage: { inputTokens: 10, outputTokens: 1 },
      },
      {
        index: 1,
        kind: "followup",
        prompt: "Second",
        assistantText: "stale",
        streamTimeline: [],
        usage: { inputTokens: 5, outputTokens: 1 },
      },
    ],
  };
  const out = resolveAgentRunDetailTurns(
    detail,
    {
      streamTimeline: [{ id: "live", type: "assistant", text: "live out" }],
      streamText: "live out",
    },
    true,
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].streamTimeline[0].id, "a");
  assert.equal(out[1].streamTimeline[0].id, "live");
  assert.equal(out[1].assistantText, "live out");
});

test("resolveAgentRunDetailTurns builds from conversation when turns missing", () => {
  const out = resolveAgentRunDetailTurns(
    {
      conversation: {
        messages: [
          { type: "user_message", text: "Prompt A" },
          { type: "assistant_message", text: "Reply A" },
          { type: "user_message", text: "Prompt B" },
          { type: "assistant_message", text: "Reply B" },
        ],
      },
      usage: {
        invocations: [
          { runPhase: "launch", inputTokens: 100, outputTokens: 10 },
          { runPhase: "followup", inputTokens: 50, outputTokens: 5 },
        ],
      },
      streamArchives: [
        {
          turnIndex: 0,
          items: [{ id: "old", type: "tool_call", text: "Read file", status: "success" }],
        },
      ],
    },
    { streamTimeline: [{ id: "now", type: "assistant", text: "Reply B live" }] },
    false,
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].prompt, "Prompt A");
  assert.equal(out[0].streamTimeline[0].type, "tool_call");
  assert.equal(out[1].prompt, "Prompt B");
  assert.equal(agentRunTurnLabel(out[1]), "Follow-up 1");
});
