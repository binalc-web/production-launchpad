import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agentStatusMatchesLatestChatUserTurn,
  agentTurnSettlementSystemMessage,
  isClientLinkComposerAgentBusy,
  isClientLinkQueueDrainHandoff,
  isClientLinkSettleReadyForNextTurn,
  shouldSkipClientLinkHistoryReconnect,
  isStaleAgentStatusForTrackedTurn,
  shouldApplyAgentLiveStreamFromStatus,
  shouldDeferMergeFromAgentStatus,
  findLatestUserChatRow,
  hasAgentStatusStreamOutput,
  isEarlyFinishedCurrentUserTurn,
  shouldRecoverClientLinkSendAfterFollowupError,
  shouldReconnectAgentPollFromStatus,
  shouldRunAgentTurnPreviewSync,
  shouldSettleAgentTurnFromStatus,
  resolveClientLinkMissingOutputBridgeFromStatus,
} from "../src/lib/clientLinkAgentTurnSettlement.js";
import { isCurrent, startGeneration, stopGeneration } from "../src/lib/generationManager.js";

test("shouldDeferMergeFromAgentStatus when merge flags set", () => {
  assert.equal(shouldDeferMergeFromAgentStatus({ mergeConfirmationPending: true }), true);
  assert.equal(shouldDeferMergeFromAgentStatus({ awaitingLaunchpadConfirmation: true }), true);
  assert.equal(shouldDeferMergeFromAgentStatus({ autoLaunchpadMergePending: true }), true);
  assert.equal(shouldDeferMergeFromAgentStatus({ busy: false }), false);
});

test("shouldRunAgentTurnPreviewSync skips ask turns", () => {
  assert.equal(shouldRunAgentTurnPreviewSync({ lastUserTurnMode: "ask" }), false);
  assert.equal(shouldRunAgentTurnPreviewSync({ lastUserTurnMode: "agent" }), true);
  assert.equal(shouldRunAgentTurnPreviewSync(null), true);
});

test("agentTurnSettlementSystemMessage picks merged vs applied", () => {
  assert.equal(
    agentTurnSettlementSystemMessage(
      { mergeConfirmationPending: true },
      { applied: "applied", merged: "merged" },
    ),
    "merged",
  );
  assert.equal(
    agentTurnSettlementSystemMessage({ busy: false }, { applied: "applied", merged: "merged" }),
    "applied",
  );
});

test("shouldReconnectAgentPollFromStatus", () => {
  assert.equal(shouldReconnectAgentPollFromStatus({ busy: true }), true);
  assert.equal(shouldReconnectAgentPollFromStatus({ generationState: "running" }), true);
  assert.equal(
    shouldReconnectAgentPollFromStatus({
      busy: false,
      generationState: "completed",
    }),
    false,
  );
  assert.equal(shouldReconnectAgentPollFromStatus({ error: "x" }), false);
  assert.equal(
    shouldReconnectAgentPollFromStatus({
      busy: false,
      status: "FINISHED",
      generationState: "running",
    }),
    true,
  );
  assert.equal(
    shouldReconnectAgentPollFromStatus({
      busy: true,
      generationState: "stopped",
      userStopped: true,
    }),
    false,
  );
});

test("isClientLinkQueueDrainHandoff when newer generation owns the release", () => {
  assert.equal(
    isClientLinkQueueDrainHandoff(
      { generationRequestId: "req-b", busy: true, generationState: "running" },
      "req-a",
    ),
    true,
  );
  assert.equal(
    isClientLinkQueueDrainHandoff(
      { generationRequestId: "req-a", busy: true, generationState: "running" },
      "req-a",
    ),
    false,
  );
  assert.equal(
    isClientLinkQueueDrainHandoff(
      { generationRequestId: "req-b", busy: false, generationState: "idle" },
      "req-a",
    ),
    false,
  );
  assert.equal(isClientLinkQueueDrainHandoff({ busy: true }, "req-a"), false);
  assert.equal(
    isClientLinkQueueDrainHandoff(
      { generationRequestId: "req-b", busy: true, error: "x" },
      "req-a",
    ),
    false,
  );
});

test("isClientLinkSettleReadyForNextTurn idle or queue handoff", () => {
  assert.equal(isClientLinkSettleReadyForNextTurn({ busy: false }, "req-a"), true);
  assert.equal(isClientLinkSettleReadyForNextTurn({ busy: true }, "req-a"), false);
  assert.equal(
    isClientLinkSettleReadyForNextTurn(
      { busy: false, awaitingLaunchpadConfirmation: true },
      "req-a",
    ),
    false,
  );
  assert.equal(
    isClientLinkSettleReadyForNextTurn(
      { generationRequestId: "req-b", busy: true, generationState: "running" },
      "req-a",
    ),
    true,
  );
  assert.equal(isClientLinkSettleReadyForNextTurn({ error: "nope", busy: false }, "req-a"), false);
  assert.equal(isClientLinkSettleReadyForNextTurn({ busy: false, queuedCount: 1 }, "req-a"), false);
  assert.equal(isClientLinkSettleReadyForNextTurn({ busy: false, queuedCount: 0 }, "req-a"), true);
  assert.equal(isClientLinkSettleReadyForNextTurn({ busy: false }, "req-a", 2), false);
  assert.equal(
    isClientLinkSettleReadyForNextTurn(
      { generationRequestId: "req-b", busy: true, generationState: "running" },
      "req-a",
      2,
    ),
    true,
  );
});

test("shouldSkipClientLinkHistoryReconnect allows forced queued-turn reconnect", () => {
  assert.equal(
    shouldSkipClientLinkHistoryReconnect({
      chatPolling: true,
      busyAutoPollStarted: true,
      turnRunLocked: true,
    }),
    true,
  );
  assert.equal(
    shouldSkipClientLinkHistoryReconnect({
      force: true,
      chatPolling: true,
      busyAutoPollStarted: true,
      turnRunLocked: true,
      pollStopped: true,
    }),
    false,
  );
  assert.equal(
    shouldSkipClientLinkHistoryReconnect({
      force: true,
      agentStopSettling: true,
    }),
    true,
  );
});

test("resolveClientLinkMissingOutputBridgeFromStatus prefers askReplyText then streamText", () => {
  assert.equal(resolveClientLinkMissingOutputBridgeFromStatus(null), null);
  assert.equal(resolveClientLinkMissingOutputBridgeFromStatus({ busy: false }), null);
  assert.deepEqual(
    resolveClientLinkMissingOutputBridgeFromStatus({
      lastUserTurnMode: "ask",
      askReplyText: "  Ask answer  ",
      streamText: "ignored when askReplyText set",
      streamTimeline: [{ type: "assistant", text: "x" }],
    }),
    {
      body: "Ask answer",
      timeline: [{ type: "assistant", text: "x" }],
      mode: "ask",
    },
  );
  assert.deepEqual(
    resolveClientLinkMissingOutputBridgeFromStatus({
      lastUserTurnMode: "agent",
      streamText: "Agent stream body",
      streamTimeline: [],
    }),
    {
      body: "Agent stream body",
      timeline: [],
      mode: "agent",
    },
  );
});

test("shouldApplyAgentLiveStreamFromStatus blocks stale stream promotion", () => {
  const tracked = "req-new-stream";
  startGeneration({ requestId: tracked, releaseId: 1, slug: "demo" });
  try {
    assert.equal(
      shouldApplyAgentLiveStreamFromStatus(
        {
          generationRequestId: "req-old",
          busy: true,
          generationState: "running",
          streamText: "Previous answer",
        },
        tracked,
      ),
      false,
    );
    assert.equal(
      shouldApplyAgentLiveStreamFromStatus(
        { generationRequestId: tracked, busy: true, generationState: "running" },
        tracked,
      ),
      true,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("shouldApplyAgentLiveStreamFromStatus blocks prior body under optimistic user", () => {
  const tracked = "req-followup-stream";
  startGeneration({ requestId: tracked, releaseId: 2, slug: "demo" });
  try {
    const priorBody = {
      generationRequestId: tracked,
      busy: true,
      status: "RUNNING",
      generationState: "running",
      lastUserTurnMessageId: 99,
      streamText: "Previous chat agent output",
    };
    assert.equal(
      shouldApplyAgentLiveStreamFromStatus(priorBody, tracked, {
        chatRows: [{ role: "user", text: "brand new chat" }],
      }),
      false,
    );
    assert.equal(
      shouldApplyAgentLiveStreamFromStatus(priorBody, tracked, {
        chatRows: [{ id: 99, role: "user", text: "brand new chat" }],
      }),
      true,
    );
    assert.equal(
      shouldApplyAgentLiveStreamFromStatus(
        {
          generationRequestId: tracked,
          busy: true,
          status: "RUNNING",
          generationState: "running",
          lastUserTurnMessageId: 99,
          streamPhase: "Editing files…",
          streamTimeline: [
            {
              type: "tool_call",
              id: "t1",
              status: "running",
              label: "Edit file",
            },
          ],
        },
        tracked,
        { chatRows: [{ role: "user", text: "brand new chat" }] },
      ),
      true,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("isStaleAgentStatusForTrackedTurn ignores previous-turn terminal status", () => {
  const tracked = "req-new";
  startGeneration({ requestId: tracked, releaseId: 1, slug: "demo" });
  try {
    assert.equal(
      isStaleAgentStatusForTrackedTurn({ generationState: "completed", busy: false }, tracked),
      true,
    );
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        { generationRequestId: "req-old", busy: true, generationState: "running" },
        tracked,
      ),
      true,
    );
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        { generationRequestId: tracked, busy: true, generationState: "running" },
        tracked,
      ),
      false,
    );
  } finally {
    stopGeneration(tracked);
  }
  assert.equal(isCurrent(tracked), false);
});

test("isStaleAgentStatusForTrackedTurn ignores prior stop markers for active request", () => {
  const tracked = "req-after-stop";
  startGeneration({ requestId: tracked, releaseId: 2, slug: "demo" });
  try {
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        { generationState: "stopped", userStopped: true, busy: false },
        tracked,
      ),
      true,
    );
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        {
          generationRequestId: "req-old-stop",
          generationState: "stopped",
          userStopped: true,
          busy: false,
        },
        tracked,
      ),
      true,
    );
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        {
          generationRequestId: tracked,
          generationState: "stopped",
          userStopped: true,
          busy: false,
        },
        tracked,
      ),
      false,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("shouldReconnectAgentPollFromStatus stops when FINISHED with linked SHA", () => {
  assert.equal(
    shouldReconnectAgentPollFromStatus({
      busy: false,
      status: "FINISHED",
      generationState: "running",
      autoLaunchpadMergePending: true,
      lastUserTurnAppliedCommitSha: "c5a198aac5e66631932d729b1bc595cc8dd80748",
    }),
    false,
  );
});

test("shouldReconnectAgentPollFromStatus stays true for stale FINISHED while generation running", () => {
  assert.equal(
    shouldReconnectAgentPollFromStatus({
      busy: false,
      status: "FINISHED",
      generationState: "running",
    }),
    true,
  );
});

test("shouldReconnectAgentPollFromStatus stops when turn merged despite busy running", () => {
  assert.equal(
    shouldReconnectAgentPollFromStatus({
      busy: true,
      status: "FINISHED",
      generationState: "running",
      reason: "pending_message",
      lastUserTurnMergedAt: "2026-06-07T07:31:17.257Z",
      lastUserTurnAppliedCommitSha: "c5a198aac5e66631932d729b1bc595cc8dd80748",
    }),
    false,
  );
  assert.equal(
    shouldSettleAgentTurnFromStatus({
      busy: true,
      status: "FINISHED",
      generationState: "running",
      lastUserTurnMergedAt: "2026-06-07T07:31:17.257Z",
    }),
    true,
  );
});

test("isStaleAgentStatusForTrackedTurn treats completed idle status as stale for active request", () => {
  const tracked = "req-stale-finished";
  startGeneration({ requestId: tracked, releaseId: 3, slug: "demo" });
  try {
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        { busy: false, status: "FINISHED", generationState: "completed" },
        tracked,
      ),
      true,
      "without chatRows, completed+cleared requestId stays stale",
    );
    // Matching latest user + FINISHED is current-turn completion (SHA may still lag).
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        {
          busy: false,
          status: "FINISHED",
          generationState: "completed",
          lastUserTurnMessageId: 10,
        },
        tracked,
        { chatRows: [{ id: 10, role: "user" }] },
      ),
      false,
    );
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        {
          busy: false,
          status: "FINISHED",
          generationState: "completed",
          lastUserTurnMessageId: 10,
        },
        { requestId: tracked, chatRows: [{ id: 10, role: "user" }] },
      ),
      true,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("isStaleAgentStatusForTrackedTurn treats prior user-turn FINISHED as stale", () => {
  const tracked = "req-second-msg";
  startGeneration({ requestId: tracked, releaseId: 9, slug: "demo" });
  try {
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        {
          generationRequestId: tracked,
          busy: true,
          status: "FINISHED",
          generationState: "running",
          lastUserTurnMessageId: 1,
        },
        tracked,
        { chatRows: [{ id: 2, role: "user", text: "second" }] },
      ),
      true,
    );
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        {
          generationRequestId: tracked,
          busy: true,
          status: "FINISHED",
          generationState: "running",
          lastUserTurnMessageId: 1,
        },
        tracked,
        { chatRows: [{ role: "user", text: "optimistic second" }] },
      ),
      true,
    );
    // Optimistic bubble + live RUNNING + pending message id must NOT be stale
    // (this was the "Connecting to agent…" while agent worked bug).
    assert.equal(
      isStaleAgentStatusForTrackedTurn(
        {
          generationRequestId: tracked,
          busy: true,
          status: "RUNNING",
          generationState: "running",
          lastUserTurnMessageId: 99,
          streamPhase: "Editing files…",
        },
        tracked,
        { chatRows: [{ role: "user", text: "brand new chat" }] },
      ),
      false,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("isStaleAgentStatusForTrackedTurn allows current-turn work-complete without requestId", () => {
  const tracked = "req-current-complete";
  startGeneration({ requestId: tracked, releaseId: 5, slug: "demo" });
  try {
    const st = {
      busy: false,
      status: "FINISHED",
      generationState: "completed",
      lastUserTurnMessageId: 42,
      lastUserTurnAppliedCommitSha: "c5a198aac5e66631932d729b1bc595cc8dd80748",
    };
    const chatRows = [{ id: 42, role: "user", text: "build it" }];
    assert.equal(isStaleAgentStatusForTrackedTurn(st, tracked, { chatRows }), false);
    assert.equal(shouldSettleAgentTurnFromStatus(st, { requestId: tracked, chatRows }), true);
    // Wrong user turn still stale even with SHA on status.
    assert.equal(
      isStaleAgentStatusForTrackedTurn(st, tracked, {
        chatRows: [{ id: 99, role: "user" }],
      }),
      true,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("shouldSettleAgentTurnFromStatus blocks stale snapshots and already persisted turns", () => {
  const tracked = "req-settle";
  startGeneration({ requestId: tracked, releaseId: 4, slug: "demo" });
  try {
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        { busy: false, status: "FINISHED", generationState: "completed" },
        { requestId: tracked },
      ),
      false,
    );
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        {
          busy: false,
          status: "FINISHED",
          generationState: "completed",
        },
        { alreadyHasPersistedOutput: true },
      ),
      false,
    );
    assert.equal(
      shouldSettleAgentTurnFromStatus({
        busy: false,
        status: "FINISHED",
        generationState: "completed",
      }),
      true,
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("shouldSettleAgentTurnFromStatus settles FINISHED with persisted output despite busy running", () => {
  assert.equal(
    shouldSettleAgentTurnFromStatus(
      {
        busy: true,
        status: "FINISHED",
        generationState: "running",
        streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
      },
      { hasPersistedOutputInHistory: true },
    ),
    true,
  );
  assert.equal(
    shouldSettleAgentTurnFromStatus(
      {
        busy: true,
        status: "FINISHED",
        generationState: "running",
        streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
      },
      { hasPersistedOutputInHistory: false },
    ),
    true,
  );
  assert.equal(
    hasAgentStatusStreamOutput({ status: "RUNNING", streamText: "x".repeat(50) }),
    false,
  );
  assert.equal(
    hasAgentStatusStreamOutput({
      status: "FINISHED",
      streamText: "Done",
    }),
    true,
  );
  assert.equal(
    hasAgentStatusStreamOutput({
      status: "FINISHED",
      streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
    }),
    true,
  );
});

test("shouldSettleAgentTurnFromStatus settles early FINISHED with stream while request in flight", () => {
  const tracked = "req-followup-inflight";
  startGeneration({ requestId: tracked, releaseId: 11, slug: "demo" });
  try {
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        {
          busy: true,
          status: "FINISHED",
          generationState: "running",
          generationRequestId: tracked,
          lastUserTurnMessageId: 2,
          lastUserTurnAppliedCommitSha: "c5a198aac5e66631932d729b1bc595cc8dd80748",
          streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
        },
        {
          requestId: tracked,
          hasPersistedOutputInHistory: false,
          chatRows: [{ id: 2, role: "user", text: "second" }],
        },
      ),
      true,
    );
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        {
          busy: true,
          status: "FINISHED",
          generationState: "running",
          generationRequestId: tracked,
          lastUserTurnMessageId: 2,
          streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
        },
        {
          requestId: tracked,
          hasPersistedOutputInHistory: true,
          chatRows: [{ id: 2, role: "user", text: "second" }],
        },
      ),
      true,
    );
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        {
          busy: true,
          status: "FINISHED",
          generationState: "running",
          generationRequestId: tracked,
          lastUserTurnMessageId: 2,
        },
        {
          requestId: tracked,
          hasPersistedOutputInHistory: false,
          chatRows: [{ id: 2, role: "user", text: "second" }],
        },
      ),
      false,
      "matching-turn FINISHED without stream must wait so live output can bridge into chat",
    );
    assert.equal(
      shouldSettleAgentTurnFromStatus(
        {
          busy: true,
          status: "FINISHED",
          generationState: "running",
          generationRequestId: tracked,
          lastUserTurnMessageId: 1,
        },
        {
          requestId: tracked,
          hasPersistedOutputInHistory: false,
          chatRows: [{ id: 2, role: "user", text: "second" }],
        },
      ),
      false,
      "prior-turn message id must not settle the new follow-up",
    );
  } finally {
    stopGeneration(tracked);
  }
});

test("shouldRecoverClientLinkSendAfterFollowupError detects in-flight run for matching user row", () => {
  const sentAt = Date.now();
  assert.equal(
    shouldRecoverClientLinkSendAfterFollowupError(
      {
        busy: true,
        generationState: "running",
        generationRequestId: "srv-req-1",
      },
      {
        sentText: "Remove avatar",
        sentAtMs: sentAt,
        lastUserRow: {
          role: "user",
          text: "Remove avatar",
          createdAt: new Date(sentAt + 500).toISOString(),
        },
      },
    ),
    true,
  );
  assert.equal(
    shouldRecoverClientLinkSendAfterFollowupError(
      {
        busy: true,
        generationState: "running",
        generationRequestId: "srv-req-1",
      },
      {
        sentText: "Remove avatar",
        sentAtMs: sentAt,
        lastUserRow: {
          role: "user",
          text: "Different message",
          createdAt: new Date(sentAt + 500).toISOString(),
        },
      },
    ),
    false,
  );
  assert.equal(
    shouldRecoverClientLinkSendAfterFollowupError(
      {
        busy: true,
        generationState: "running",
        generationRequestId: "srv-req-1",
        lastUserTurnMessageId: 99,
      },
      {
        sentText: "Remove avatar",
        sentAtMs: sentAt,
        lastUserRow: {
          id: 100,
          role: "user",
          text: "Remove avatar",
          createdAt: new Date(sentAt + 500).toISOString(),
        },
      },
    ),
    false,
  );
});

test("shouldSettleAgentTurnFromStatus blocks when status targets an older user turn", () => {
  const rows = [
    { id: 1, role: "user", text: "first" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nAnswer one",
      isPersistedAgentOutput: true,
    },
    { id: 3, role: "user", text: "second" },
  ];
  assert.equal(
    shouldSettleAgentTurnFromStatus(
      {
        busy: false,
        status: "FINISHED",
        generationState: "completed",
        lastUserTurnMessageId: 1,
        streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
      },
      { chatRows: rows },
    ),
    false,
  );
  assert.equal(
    shouldSettleAgentTurnFromStatus(
      {
        busy: true,
        status: "FINISHED",
        generationState: "running",
        lastUserTurnMessageId: 3,
        streamText: "Files changed\n- main/src/components/layout/TopBar.tsx — full redesign",
      },
      { chatRows: rows, hasPersistedOutputInHistory: false },
    ),
    true,
  );
});

test("agentStatusMatchesLatestChatUserTurn ignores prior-turn status", () => {
  const rows = [
    { id: 1, role: "user", text: "first" },
    {
      id: 2,
      role: "system",
      mode: "agent",
      text: "Agent output\n\nAnswer one",
      isPersistedAgentOutput: true,
    },
    { id: 3, role: "user", text: "second" },
  ];
  assert.equal(
    agentStatusMatchesLatestChatUserTurn({ lastUserTurnMessageId: 1, status: "FINISHED" }, rows),
    false,
  );
  assert.equal(
    agentStatusMatchesLatestChatUserTurn(
      { lastUserTurnMessageId: 3, generationState: "running" },
      rows,
    ),
    true,
  );
  assert.equal(
    agentStatusMatchesLatestChatUserTurn({ lastUserTurnMessageId: 3, generationState: "running" }, [
      { role: "user", text: "pending", id: null },
    ]),
    false,
  );
  assert.equal(
    isEarlyFinishedCurrentUserTurn(
      { status: "FINISHED", generationState: "running", lastUserTurnMessageId: 3 },
      rows,
    ),
    true,
  );
  assert.equal(
    isEarlyFinishedCurrentUserTurn(
      { status: "FINISHED", generationState: "running", lastUserTurnMessageId: 1 },
      rows,
    ),
    false,
  );
});

test("isClientLinkComposerAgentBusy", () => {
  assert.equal(isClientLinkComposerAgentBusy({ chatSending: true }), true);
  assert.equal(isClientLinkComposerAgentBusy({ agentTurnBackgroundSettling: true }), true);
  assert.equal(
    isClientLinkComposerAgentBusy({
      generationState: "completed",
      releaseAgentBusy: true,
    }),
    false,
  );
  const req = "req-busy";
  startGeneration({ requestId: req, releaseId: 2, slug: "demo" });
  try {
    assert.equal(
      isClientLinkComposerAgentBusy({
        generationState: "running",
        activeRequestId: req,
      }),
      true,
    );
  } finally {
    stopGeneration(req);
  }
});
