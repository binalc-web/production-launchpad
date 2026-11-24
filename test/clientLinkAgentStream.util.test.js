import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClientLinkChatAgentPipelineStatusLabel,
  resolvePipelineLabelForStatus,
  resolvePipelineLabelWhileAwaitingCurrentTurn,
  shouldApplyClientLinkAgentPipelineLabel,
} from "../src/pages/ClientLink/chat/clientLinkAgentStream.util.js";

test("buildClientLinkChatAgentPipelineStatusLabel ignores legacy publishStep pending", () => {
  const label = buildClientLinkChatAgentPipelineStatusLabel({
    status: "FINISHED",
    generationState: "running",
    publishStep: { phase: "pending", label: "Publishing to GitHub…" },
    mergeConfirmationPending: false,
    awaitingLaunchpadConfirmation: false,
  });
  assert.equal(label, "Agent finished.");
});

test("buildClientLinkChatAgentPipelineStatusLabel prefers Running N subagents", () => {
  const label = buildClientLinkChatAgentPipelineStatusLabel({
    status: "RUNNING",
    streamPhase: "Agent is working…",
    streamTimeline: [
      {
        id: "tl_001",
        type: "tool_call",
        callId: "task_a",
        toolKind: "subagent",
        toolName: "Verifier",
        label: "Check auth",
        status: "running",
      },
      {
        id: "tl_002",
        type: "tool_call",
        callId: "task_b",
        toolKind: "subagent",
        toolName: "Explore",
        label: "Find login",
        status: "running",
      },
    ],
  });
  assert.equal(label, "Running 2 subagents…");
});

test("resolvePipelineLabelWhileAwaitingCurrentTurn drops prior terminal status", () => {
  assert.equal(
    resolvePipelineLabelWhileAwaitingCurrentTurn("Preview is ready."),
    "Starting agent…",
  );
  assert.equal(resolvePipelineLabelWhileAwaitingCurrentTurn("Agent finished."), "Starting agent…");
  assert.equal(
    resolvePipelineLabelWhileAwaitingCurrentTurn("Connecting to agent…"),
    "Connecting to agent…",
  );
  assert.equal(
    resolvePipelineLabelWhileAwaitingCurrentTurn("Sending your request…"),
    "Sending your request…",
  );
  assert.equal(resolvePipelineLabelWhileAwaitingCurrentTurn(""), "Starting agent…");
});

test("resolvePipelineLabelWhileAwaitingCurrentTurn keeps this-turn live progress", () => {
  assert.equal(
    resolvePipelineLabelWhileAwaitingCurrentTurn("The panel is capped at sm:max-w-lg…"),
    "The panel is capped at sm:max-w-lg…",
  );
  assert.equal(resolvePipelineLabelWhileAwaitingCurrentTurn("Thinking…"), "Thinking…");
  assert.equal(
    resolvePipelineLabelForStatus("Editing files…", {
      busy: true,
      status: "FINISHED",
      generationState: "running",
    }),
    "Editing files…",
  );
});

test("resolvePipelineLabelForStatus shows a live run instead of a stuck Connecting label", () => {
  assert.equal(
    resolvePipelineLabelForStatus("Connecting to agent…", {
      busy: true,
      status: "RUNNING",
      streamPhase: "Thinking…",
    }),
    "Thinking…",
  );
  // Prior-turn FINISHED still never paints under a new turn.
  assert.equal(
    resolvePipelineLabelForStatus("Connecting to agent…", { busy: true, status: "FINISHED" }),
    "Connecting to agent…",
  );
  assert.equal(
    resolvePipelineLabelForStatus("Agent finished.", { busy: false, status: "RUNNING" }),
    "Starting agent…",
  );
});

test("shouldApplyClientLinkAgentPipelineLabel blocks prior finished under new message", () => {
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "FINISHED",
        generationState: "running",
        lastUserTurnMessageId: 1,
        model: "default",
      },
      [{ id: 2, role: "user", text: "second" }],
    ),
    false,
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "FINISHED",
        generationState: "running",
        lastUserTurnMessageId: 2,
        streamPhase: "Editing files…",
        model: "default",
      },
      [{ id: 2, role: "user", text: "second" }],
    ),
    true,
    "matching follow-up turn FINISHED (early CLI) must drive labels",
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "FINISHED",
        generationState: "running",
        lastUserTurnMessageId: 1,
        streamText: "Done",
        model: "default",
      },
      [{ id: 1, role: "user", text: "first" }],
    ),
    true,
    "brand-new chat early FINISHED must drive labels",
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "RUNNING",
        generationState: "running",
        lastUserTurnMessageId: 2,
        streamPhase: "Editing files…",
      },
      [{ id: 2, role: "user", text: "second" }],
    ),
    true,
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "RUNNING",
        generationState: "running",
        lastUserTurnMessageId: 55,
        streamPhase: "Editing files…",
      },
      [{ role: "user", text: "optimistic — no server id yet" }],
    ),
    true,
    "optimistic bubble must still show live agent progress (not Connecting…)",
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "FINISHED",
        generationState: "completed",
        lastUserTurnMessageId: 55,
      },
      [{ role: "user", text: "optimistic — no server id yet" }],
    ),
    false,
    "optimistic bubble must not paint prior FINISHED labels",
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "RUNNING",
        generationState: "running",
        busy: true,
        lastUserTurnMessageId: 99,
        streamPhase: "Editing files…",
      },
      [{ id: 1, role: "user", text: "first turn still visible" }],
    ),
    true,
    "queue handoff: pending id ahead of transcript must still show live progress",
  );
  assert.equal(
    shouldApplyClientLinkAgentPipelineLabel(
      {
        status: "FINISHED",
        generationState: "completed",
        lastUserTurnMessageId: 1,
        streamPhase: "Agent finished.",
      },
      [{ id: 2, role: "user", text: "second" }],
    ),
    false,
    "prior-turn FINISHED under a newer visible user must stay blocked",
  );
});
