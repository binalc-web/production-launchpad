/**
 * End-to-end gate simulation for the "Connecting to agent…" stuck chip.
 * Mirrors processOneAgentStatus decisions without mounting React.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isCurrent, startGeneration, stopGeneration } from "../src/lib/generationManager.js";
import {
  isStaleAgentStatusForTrackedTurn,
  shouldSettleAgentTurnFromStatus,
} from "../src/lib/clientLinkAgentTurnSettlement.js";
import {
  buildClientLinkChatAgentPipelineStatusLabel,
  resolvePipelineLabelWhileAwaitingCurrentTurn,
  shouldApplyClientLinkAgentPipelineLabel,
} from "../src/pages/ClientLink/chat/clientLinkAgentStream.util.js";

function simulatePollLabel({ st, chatRows, tracked, prevLabel = "Connecting to agent…" }) {
  const applyPipeline = shouldApplyClientLinkAgentPipelineLabel(st, chatRows);
  const stale = isStaleAgentStatusForTrackedTurn(st, tracked, { chatRows });
  if (stale || !applyPipeline) {
    return resolvePipelineLabelWhileAwaitingCurrentTurn(prevLabel);
  }
  return buildClientLinkChatAgentPipelineStatusLabel(st, {
    omitTranscript: Boolean(typeof st.streamText === "string" && st.streamText.trim()),
  });
}

test("e2e: optimistic bubble + RUNNING leaves Connecting and shows live progress", () => {
  const tracked = "req-e2e-connecting";
  startGeneration({ requestId: tracked, releaseId: 77, slug: "demo" });
  try {
    assert.equal(isCurrent(tracked), true);
    const optimisticRows = [{ role: "user", text: "build a landing page" }];
    const runningSt = {
      generationRequestId: tracked,
      busy: true,
      status: "RUNNING",
      generationState: "running",
      lastUserTurnMessageId: 501,
      streamPhase: "Editing files…",
    };

    // Pre-fix: this combination used to keep Connecting forever.
    assert.equal(
      isStaleAgentStatusForTrackedTurn(runningSt, tracked, { chatRows: optimisticRows }),
      false,
    );
    assert.equal(shouldApplyClientLinkAgentPipelineLabel(runningSt, optimisticRows), true);

    const label = simulatePollLabel({
      st: runningSt,
      chatRows: optimisticRows,
      tracked,
    });
    assert.equal(label, "Editing files…");
    assert.notEqual(label, "Connecting to agent…");
  } finally {
    stopGeneration(tracked);
  }
});

test("e2e: linked id + early FINISHED settles instead of sticking on Connecting", () => {
  const tracked = "req-e2e-finished";
  startGeneration({ requestId: tracked, releaseId: 78, slug: "demo" });
  try {
    const rows = [{ id: 501, role: "user", text: "build a landing page" }];
    const finishedSt = {
      generationRequestId: tracked,
      busy: true,
      status: "FINISHED",
      generationState: "running",
      lastUserTurnMessageId: 501,
      streamText: "Created index.html and styles.css for the landing page.",
    };

    assert.equal(isStaleAgentStatusForTrackedTurn(finishedSt, tracked, { chatRows: rows }), false);
    assert.equal(shouldApplyClientLinkAgentPipelineLabel(finishedSt, rows), true);
    assert.equal(
      shouldSettleAgentTurnFromStatus(finishedSt, {
        requestId: tracked,
        hasPersistedOutputInHistory: false,
        chatRows: rows,
      }),
      true,
    );

    const label = simulatePollLabel({ st: finishedSt, chatRows: rows, tracked });
    assert.equal(label, "Agent finished.");
  } finally {
    stopGeneration(tracked);
  }
});

test("e2e: completed + cleared requestId with matching user still settles", () => {
  const tracked = "req-e2e-cleared";
  startGeneration({ requestId: tracked, releaseId: 79, slug: "demo" });
  try {
    const rows = [{ id: 501, role: "user", text: "build a landing page" }];
    const completedSt = {
      busy: false,
      status: "FINISHED",
      generationState: "completed",
      lastUserTurnMessageId: 501,
      streamText: "Landing page is ready.",
    };

    assert.equal(isStaleAgentStatusForTrackedTurn(completedSt, tracked, { chatRows: rows }), false);
    assert.equal(
      shouldSettleAgentTurnFromStatus(completedSt, {
        requestId: tracked,
        chatRows: rows,
      }),
      true,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("e2e: queue handoff transcript lag leaves Connecting and shows live progress", () => {
  const tracked = "req-e2e-queue-handoff";
  startGeneration({ requestId: tracked, releaseId: 80, slug: "demo" });
  try {
    // Claimed queue message 99 is pending on the server; chat still shows turn 1.
    const laggingRows = [{ id: 1, role: "user", text: "first turn" }];
    const runningSt = {
      generationRequestId: tracked,
      busy: true,
      status: "RUNNING",
      generationState: "running",
      lastUserTurnMessageId: 99,
      streamPhase: "Editing files…",
    };

    assert.equal(
      isStaleAgentStatusForTrackedTurn(runningSt, tracked, { chatRows: laggingRows }),
      false,
    );
    assert.equal(shouldApplyClientLinkAgentPipelineLabel(runningSt, laggingRows), true);

    const label = simulatePollLabel({
      st: runningSt,
      chatRows: laggingRows,
      tracked,
    });
    assert.equal(label, "Editing files…");
    assert.notEqual(label, "Connecting to agent…");
  } finally {
    stopGeneration(tracked);
  }
});
