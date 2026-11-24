import assert from "node:assert/strict";
import test from "node:test";
import { resolveAgentRunDetailActivityStream } from "../src/pages/AgentAnalytics/agentRunDetailActivity.util.js";

test("SSE timeline is used even when REST detail has a larger snapshot", () => {
  const detail = {
    streamText: "stale detail text",
    streamPhase: "Old phase",
    streamTimeline: [{ id: "d1", type: "assistant", text: "from detail" }],
  };
  const selectedStream = {
    streamText: "live text",
    streamPhase: "Agent is working…",
    streamTimeline: [{ id: "l1", type: "thinking", text: "live think", status: "streaming" }],
  };
  const merged = resolveAgentRunDetailActivityStream(true, detail, selectedStream);
  assert.equal(merged.streamText, "live text");
  assert.equal(merged.streamPhase, "Agent is working…");
  assert.equal(merged.streamTimeline[0].id, "l1");
});

test("empty SSE falls back to REST detail timeline for finished runs", () => {
  const detail = {
    streamText: "detail text",
    streamPhase: "Preparing workspace…",
    streamTimeline: [{ id: "d1", type: "assistant", text: "from detail" }],
  };
  const selectedStream = {
    streamText: "",
    streamPhase: "",
    streamTimeline: [],
  };
  const merged = resolveAgentRunDetailActivityStream(false, detail, selectedStream);
  assert.equal(merged.streamText, "detail text");
  assert.equal(merged.streamPhase, "Preparing workspace…");
  assert.equal(merged.streamTimeline[0].id, "d1");
});

test("empty SSE falls back to conversation messages when GET has no timeline", () => {
  const detail = {
    conversation: {
      id: "bc_1",
      messages: [
        { type: "user_message", text: "Add auth" },
        { type: "assistant_message", text: "Auth is wired." },
      ],
    },
  };
  const merged = resolveAgentRunDetailActivityStream(false, detail, {
    streamText: "",
    streamPhase: "",
    streamTimeline: [],
  });
  assert.equal(merged.streamText, "Auth is wired.");
  assert.equal(merged.streamTimeline[0].type, "assistant");
  assert.equal(merged.streamTimeline[0].text, "Auth is wired.");
});

test("finished run still uses SSE cache when present", () => {
  const selectedStream = {
    streamText: "cached live",
    streamPhase: "",
    streamTimeline: [{ id: "l1", type: "assistant", text: "done" }],
  };
  const merged = resolveAgentRunDetailActivityStream(false, { streamTimeline: [] }, selectedStream);
  assert.equal(merged.streamText, "cached live");
  assert.equal(merged.streamTimeline[0].id, "l1");
});
