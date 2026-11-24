import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDevChatLiveStatusToMessages,
  buildFreshDevChatTurnLiveStatus,
  mergeDevChatLiveStatusIntoMessage,
  sanitizeDevChatLiveStatusForTurnStart,
  sleepMs,
  statusFromDevChatStreamEvent,
  stripDevChatLiveOverlayFromAllMessages,
  stripDevChatLiveOverlayFromMessage,
  stripDevChatLiveOverlayFromMessages,
} from "../src/pages/Project/ProjectDetails/chat/projectDevChatStream.util.js";

test("statusFromDevChatStreamEvent extracts status from known event types", () => {
  const status = { assistantMessageId: "a1", busy: true, streamText: "Working…" };
  assert.deepEqual(statusFromDevChatStreamEvent({ type: "update", status }), status);
  assert.deepEqual(statusFromDevChatStreamEvent({ type: "connected", status }), status);
  assert.equal(statusFromDevChatStreamEvent({ type: "heartbeat" }), null);
});

test("mergeDevChatLiveStatusIntoMessage patches matching assistant row when completed", () => {
  const message = { id: "a1", role: "assistant", status: "completed", reply: "old" };
  const live = {
    assistantMessageId: "a1",
    aiSummary: "Reading repository…",
    streamText: "tool: grep",
    streamTimeline: [{ id: "t1", type: "thinking", text: "hmm" }],
    messageStatus: "completed",
    agentStatus: "RUNNING",
  };
  const merged = mergeDevChatLiveStatusIntoMessage(message, live);
  assert.equal(merged.reply, "Reading repository…");
  assert.equal(merged.agentStatus, "RUNNING");
  assert.equal(merged.streamText, "tool: grep");
  assert.equal(merged.streamTimeline.length, 1);
});

test("mergeDevChatLiveStatusIntoMessage does not clobber full plan reply with truncated aiSummary", () => {
  const planBody = `# Plan\n\n${"step\n".repeat(400)}`;
  const fullReply = `Intro\n\n\`\`\`launchpad-plan\n${planBody}\n\`\`\``;
  assert.ok(fullReply.length > 2000);
  const truncated = fullReply.slice(0, 2000);
  const message = { id: "a1", role: "assistant", status: "completed", reply: fullReply };
  const live = {
    assistantMessageId: "a1",
    aiSummary: truncated,
    messageStatus: "completed",
    busy: false,
  };
  const merged = mergeDevChatLiveStatusIntoMessage(message, live);
  assert.equal(merged.reply, fullReply);
});

test("mergeDevChatLiveStatusIntoMessage keeps reply when turn terminalizes from generating", () => {
  const message = {
    id: "a1",
    role: "assistant",
    status: "generating",
    streamPhase: "Planning…",
    streamTimeline: [{ id: "t1", type: "thinking", text: "hmm" }],
  };
  const planReply = "Intro\n\n```launchpad-plan\n# Plan\n## Steps\n1. Do it\n```";
  const live = {
    assistantMessageId: "a1",
    busy: false,
    messageStatus: "completed",
    agentStatus: "FINISHED",
    streamText: "",
    streamPhase: "",
    streamTimeline: [],
    assistantMessage: {
      id: "a1",
      role: "assistant",
      status: "completed",
      reply: planReply,
    },
  };
  const merged = mergeDevChatLiveStatusIntoMessage(message, live);
  assert.equal(merged.status, "completed");
  assert.equal(merged.reply, planReply);
});

test("mergeDevChatLiveStatusIntoMessage does not copy aiSummary into reply while generating", () => {
  const message = { id: "a1", role: "assistant", status: "generating", reply: "old" };
  const live = {
    assistantMessageId: "a1",
    aiSummary: "Previous turn answer",
    streamText: "tool: grep",
    streamTimeline: [{ id: "t1", type: "thinking", text: "hmm" }],
    messageStatus: "generating",
    agentStatus: "RUNNING",
  };
  const merged = mergeDevChatLiveStatusIntoMessage(message, live);
  assert.equal(merged.reply, "old");
  assert.equal(merged.streamText, "tool: grep");
});

test("mergeDevChatLiveStatusIntoMessage keeps prior live stream when overlay is empty while generating", () => {
  const message = {
    id: "a1",
    role: "assistant",
    status: "generating",
    streamText: "tool: grep",
    streamPhase: "Agent is working…",
    streamTimeline: [{ id: "t1", type: "thinking", text: "hmm" }],
  };
  const live = {
    assistantMessageId: "a1",
    streamText: "",
    streamPhase: "",
    streamTimeline: [],
    messageStatus: "generating",
    agentStatus: "RUNNING",
  };
  const merged = mergeDevChatLiveStatusIntoMessage(message, live);
  assert.equal(merged.streamText, "tool: grep");
  assert.equal(merged.streamPhase, "Agent is working…");
  assert.equal(merged.streamTimeline.length, 1);
});

test("applyDevChatLiveStatusToMessages leaves unrelated messages unchanged", () => {
  const messages = [
    { id: "u1", role: "user", content: "hi" },
    { id: "a1", role: "assistant", status: "completed", reply: "old" },
  ];
  const next = applyDevChatLiveStatusToMessages(messages, {
    assistantMessageId: "a1",
    aiSummary: "Live",
    streamText: "x",
    streamTimeline: [],
  });
  assert.equal(next[0].content, "hi");
  assert.equal(next[1].reply, "Live");
});

test("applyDevChatLiveStatusToMessages skips aiSummary reply for pending assistant", () => {
  const messages = [
    { id: "a1", role: "assistant", status: "pending", reply: "Preparing Cursor agent." },
  ];
  const next = applyDevChatLiveStatusToMessages(messages, {
    assistantMessageId: "a1",
    aiSummary: "Stale prior answer",
    streamText: "",
    streamTimeline: [],
  });
  assert.equal(next[0].reply, "Preparing Cursor agent.");
});

test("stripDevChatLiveOverlayFromMessage removes stream overlay fields", () => {
  const stripped = stripDevChatLiveOverlayFromMessage({
    id: "a1",
    role: "assistant",
    reply: "done",
    streamText: "live",
    streamPhase: "Reading files",
    streamTimeline: [{ id: "t1", type: "result", durationMs: 1000 }],
  });
  assert.equal(stripped.reply, "done");
  assert.equal(stripped.streamText, undefined);
  assert.equal(stripped.streamPhase, undefined);
  assert.equal(stripped.streamTimeline, undefined);
});

test("stripDevChatLiveOverlayFromMessages only strips matching assistant id", () => {
  const messages = [
    { id: "u1", role: "user", content: "hi" },
    {
      id: "a1",
      role: "assistant",
      reply: "live",
      streamTimeline: [{ id: "t1", type: "thinking", text: "x" }],
    },
    {
      id: "a2",
      role: "assistant",
      reply: "other",
      streamTimeline: [{ id: "t2", type: "thinking", text: "y" }],
    },
  ];
  const next = stripDevChatLiveOverlayFromMessages(messages, "a1");
  assert.equal(next[0].content, "hi");
  assert.equal(next[1].streamTimeline, undefined);
  assert.equal(next[2].streamTimeline.length, 1);
});

test("stripDevChatLiveOverlayFromAllMessages strips stream overlay from every row", () => {
  const messages = [
    {
      id: "a1",
      role: "assistant",
      reply: "live",
      streamTimeline: [{ id: "t1", type: "thinking", text: "x" }],
    },
    {
      id: "a2",
      role: "assistant",
      reply: "other",
      streamText: "tail",
      streamTimeline: [{ id: "t2", type: "thinking", text: "y" }],
    },
  ];
  const next = stripDevChatLiveOverlayFromAllMessages(messages);
  assert.equal(next[0].streamTimeline, undefined);
  assert.equal(next[1].streamText, undefined);
  assert.equal(next[1].streamTimeline, undefined);
});

test("sleepMs resolves after the requested delay", async () => {
  const startedAt = Date.now();
  await sleepMs(20);
  assert.ok(Date.now() - startedAt >= 15);
});

test("buildFreshDevChatTurnLiveStatus returns empty stream overlay for a new turn", () => {
  const status = buildFreshDevChatTurnLiveStatus("a-new");
  assert.equal(status?.assistantMessageId, "a-new");
  assert.equal(status?.busy, true);
  assert.deepEqual(status?.streamTimeline, []);
  assert.equal(status?.streamText, "");
});

test("sanitizeDevChatLiveStatusForTurnStart strips cached stream until RUNNING", () => {
  const sanitized = sanitizeDevChatLiveStatusForTurnStart({
    assistantMessageId: "a1",
    busy: true,
    agentStatus: "PENDING",
    streamText: "Previous turn",
    streamTimeline: [{ id: "t1", type: "thinking", text: "old" }],
    aiSummary: "Previous turn",
  });
  assert.equal(sanitized.streamText, "");
  assert.deepEqual(sanitized.streamTimeline, []);
  assert.equal(sanitized.streamPhase, "Preparing Cursor agent…");
  assert.equal(sanitized.aiSummary, "Preparing Cursor agent…");

  const running = sanitizeDevChatLiveStatusForTurnStart({
    agentStatus: "RUNNING",
    streamText: "Live",
    streamTimeline: [{ id: "t2", type: "thinking", text: "live" }],
    aiSummary: "Live",
  });
  assert.equal(running.streamText, "Live");
  assert.equal(running.streamTimeline.length, 1);
});

test("sanitizeDevChatLiveStatusForTurnStart strips stale succeeded publish while RUNNING", () => {
  const sanitized = sanitizeDevChatLiveStatusForTurnStart({
    agentStatus: "RUNNING",
    streamText: "Live",
    streamPhase: "Published to GitHub",
    publishStep: { phase: "succeeded", label: "Published to GitHub" },
    streamTimeline: [{ id: "t1", type: "thinking", text: "live" }],
  });
  assert.equal(sanitized.streamText, "Live");
  assert.equal(sanitized.streamPhase, "");
  assert.equal(sanitized.publishStep, null);
  assert.equal(sanitized.streamTimeline.length, 1);
});

test("sanitizeDevChatLiveStatusForTurnStart keeps Selecting model while PENDING busy", () => {
  const sanitized = sanitizeDevChatLiveStatusForTurnStart({
    agentStatus: "PENDING",
    busy: true,
    streamPhase: "Selecting model…",
    aiSummary: "Selecting model…",
    streamText: "stale",
    streamTimeline: [{ id: "t1", type: "thinking", text: "old" }],
  });
  assert.equal(sanitized.streamPhase, "Selecting model…");
  assert.equal(sanitized.aiSummary, "Selecting model…");
  assert.equal(sanitized.streamText, "");
  assert.deepEqual(sanitized.streamTimeline, []);
});

test("sanitizeDevChatLiveStatusForTurnStart keeps preparing when agentStatus missing but busy", () => {
  const sanitized = sanitizeDevChatLiveStatusForTurnStart({
    busy: true,
    streamPhase: "Preparing Cursor agent…",
    aiSummary: "Preparing Cursor agent…",
    model: "gpt-5.4-high",
  });
  assert.equal(sanitized.agentStatus, "PENDING");
  assert.equal(sanitized.streamPhase, "Preparing Cursor agent…");
  assert.equal(sanitized.model, "gpt-5.4-high");
});
