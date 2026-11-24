import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOUD_AGENT_USER_STOP_SUMMARY,
  classifyCursorAgentPollTerminal,
  isClientLinkAgentTurnComplete,
  isClientLinkAgentTurnFailed,
  isClientLinkAgentUserStopped,
  isClientLinkAgentWorkComplete,
  isReleaseBackendAgentFailed,
  isReleaseBackendAgentOutstanding,
  isReleaseBackendAgentRunning,
  isReleaseEffectivelyLocked,
  isReleaseLockOrchestrationActive,
  isReleaseLockPanelEligible,
  isReleaseLockPending,
  shouldPollReleaseBackendLockCompletion,
  syncClientLinkAgentUiFromStatus,
} from "../src/lib/backendAgentStatus.js";

test("isReleaseEffectivelyLocked is true when status is locked", () => {
  assert.equal(
    isReleaseEffectivelyLocked({
      status: "locked",
      backendAgentStatus: "FAILED",
    }),
    true,
  );
});

test("isReleaseEffectivelyLocked is false when status is active", () => {
  assert.equal(
    isReleaseEffectivelyLocked({
      status: "active",
      backendAgentStatus: "FAILED",
    }),
    false,
  );
});

test("isReleaseLockPending is true while agent runs on an active release", () => {
  assert.equal(isReleaseLockPending({ status: "active", backendAgentStatus: "RUNNING" }), true);
});

test("isReleaseLockPending is false when release is locked", () => {
  assert.equal(isReleaseLockPending({ status: "locked", backendAgentStatus: "RUNNING" }), false);
});

test("isReleaseLockPending is false when skipLockAgentOperations locked without agent", () => {
  assert.equal(
    isReleaseLockPending({
      status: "locked",
      skipLockAgentOperations: true,
      backendAgentId: null,
      backendAgentStatus: null,
    }),
    false,
  );
});

test("isReleaseBackendAgentOutstanding is true for active release with backendAgentId", () => {
  assert.equal(
    isReleaseBackendAgentOutstanding({
      status: "active",
      backendAgentId: "agent-abc",
    }),
    true,
  );
});

test("isReleaseBackendAgentOutstanding is false when release is locked", () => {
  assert.equal(
    isReleaseBackendAgentOutstanding({
      status: "locked",
      backendAgentId: "agent-abc",
    }),
    false,
  );
});

test("isReleaseBackendAgentOutstanding is false without backendAgentId", () => {
  assert.equal(
    isReleaseBackendAgentOutstanding({
      status: "active",
      backendAgentId: null,
    }),
    false,
  );
});

test("isReleaseBackendAgentFailed is true when agent id exists and status is FAILED", () => {
  assert.equal(
    isReleaseBackendAgentFailed({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FAILED",
    }),
    true,
  );
  assert.equal(
    isReleaseBackendAgentRunning({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FAILED",
    }),
    false,
  );
});

test("isReleaseBackendAgentRunning is true while status is non-terminal", () => {
  assert.equal(
    isReleaseBackendAgentRunning({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "RUNNING",
    }),
    true,
  );
  assert.equal(
    isReleaseBackendAgentFailed({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "RUNNING",
    }),
    false,
  );
});

test("shouldPollReleaseBackendLockCompletion is true while agent runs", () => {
  assert.equal(
    shouldPollReleaseBackendLockCompletion([
      { status: "active", backendAgentId: "agent-abc", backendAgentStatus: "RUNNING" },
    ]),
    true,
  );
});

test("shouldPollReleaseBackendLockCompletion is true when terminal but release not locked yet", () => {
  assert.equal(
    shouldPollReleaseBackendLockCompletion([
      { status: "active", backendAgentId: "agent-abc", backendAgentStatus: "FINISHED" },
    ]),
    true,
  );
});

test("shouldPollReleaseBackendLockCompletion is false after release is locked", () => {
  assert.equal(
    shouldPollReleaseBackendLockCompletion([
      { status: "locked", backendAgentId: "agent-abc", backendAgentStatus: "FINISHED" },
    ]),
    false,
  );
});

test("shouldPollReleaseBackendLockCompletion is false when agent failed", () => {
  assert.equal(
    shouldPollReleaseBackendLockCompletion([
      { status: "active", backendAgentId: "agent-abc", backendAgentStatus: "FAILED" },
    ]),
    false,
  );
});

test("isReleaseLockOrchestrationActive is true for FINISHED before lock", () => {
  assert.equal(
    isReleaseLockOrchestrationActive({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FINISHED",
    }),
    true,
  );
});

test("isReleaseLockOrchestrationActive is true while agent runs", () => {
  assert.equal(
    isReleaseLockOrchestrationActive({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "RUNNING",
    }),
    true,
  );
});

test("isReleaseLockOrchestrationActive is true for awaiting_questions", () => {
  assert.equal(
    isReleaseLockOrchestrationActive({
      status: "active",
      backendAgentLockPhase: "awaiting_questions",
      backendAgentId: null,
      backendAgentStatus: null,
    }),
    true,
  );
});

test("isReleaseLockOrchestrationActive is false when locked", () => {
  assert.equal(
    isReleaseLockOrchestrationActive({
      status: "locked",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FINISHED",
    }),
    false,
  );
});

test("isReleaseLockOrchestrationActive is false when agent failed", () => {
  assert.equal(
    isReleaseLockOrchestrationActive({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FAILED",
    }),
    false,
  );
});

test("isReleaseLockOrchestrationActive is true when FINISHED but isReleaseLockPending is false", () => {
  const rel = {
    status: "active",
    backendAgentId: "agent-abc",
    backendAgentStatus: "FINISHED",
  };
  assert.equal(isReleaseLockPending(rel), false);
  assert.equal(isReleaseLockOrchestrationActive(rel), true);
});

test("isReleaseLockPanelEligible is true when agent failed (sticky FAILED panel)", () => {
  assert.equal(
    isReleaseLockPanelEligible({
      status: "active",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FAILED",
    }),
    true,
  );
});

test("isReleaseLockPanelEligible is false when locked", () => {
  assert.equal(
    isReleaseLockPanelEligible({
      status: "locked",
      backendAgentId: "agent-abc",
      backendAgentStatus: "FINISHED",
    }),
    false,
  );
});

test("isClientLinkAgentUserStopped ignores stale userStopped while generation running", () => {
  assert.equal(
    isClientLinkAgentUserStopped({
      userStopped: true,
      generationState: "running",
      status: "FINISHED",
      activity: CLOUD_AGENT_USER_STOP_SUMMARY,
    }),
    false,
  );
});

test("isClientLinkAgentUserStopped treats explicit stopped generation", () => {
  assert.equal(
    isClientLinkAgentUserStopped({
      userStopped: false,
      generationState: "stopped",
      status: "STOPPED",
    }),
    true,
  );
});

test("isClientLinkAgentUserStopped ignores stale stop while completed", () => {
  assert.equal(
    isClientLinkAgentUserStopped({
      userStopped: true,
      generationState: "completed",
      status: "FINISHED",
      activity: CLOUD_AGENT_USER_STOP_SUMMARY,
    }),
    false,
  );
});

test("isClientLinkAgentTurnComplete is false while server reports busy or running generation", () => {
  assert.equal(
    isClientLinkAgentTurnComplete({
      busy: true,
      status: "FINISHED",
      generationState: "running",
    }),
    false,
  );
  assert.equal(
    isClientLinkAgentTurnComplete({
      busy: false,
      status: "FINISHED",
      generationState: "running",
    }),
    false,
  );
});

test("isClientLinkAgentWorkComplete allows applied SHA while auto merge pending", () => {
  assert.equal(
    isClientLinkAgentWorkComplete({
      status: "FINISHED",
      autoLaunchpadMergePending: true,
      lastUserTurnAppliedCommitSha: "7f72f58884a4c5a198aac5e66631932d729b1bc595cc",
    }),
    true,
  );
  assert.equal(
    isClientLinkAgentWorkComplete({
      status: "FINISHED",
      awaitingLaunchpadConfirmation: true,
      lastUserTurnAppliedCommitSha: "7f72f58884a4c5a198aac5e66631932d729b1bc595cc",
    }),
    false,
  );
});

test("isClientLinkAgentTurnComplete is true when turn merged despite busy running generation", () => {
  assert.equal(
    isClientLinkAgentWorkComplete({
      busy: true,
      status: "FINISHED",
      generationState: "running",
      lastUserTurnMergedAt: "2026-06-07T07:31:17.257Z",
      fromScratch: true,
      scratchPreviewBuilding: true,
    }),
    true,
  );
  assert.equal(
    isClientLinkAgentWorkComplete({
      busy: false,
      status: "FINISHED",
      generationState: "running",
      publishStep: { phase: "pending", label: "Publishing to GitHub…" },
      lastUserTurnMergedAt: "2026-06-07T07:31:17.257Z",
    }),
    true,
  );
  assert.equal(
    isClientLinkAgentTurnComplete({
      busy: true,
      status: "FINISHED",
      generationState: "running",
      reason: "pending_message",
      lastUserTurnMergedAt: "2026-06-07T07:31:17.257Z",
      lastUserTurnAppliedCommitSha: "c5a198aac5e66631932d729b1bc595cc8dd80748",
      fromScratch: true,
      scratchPreviewBuilding: true,
    }),
    true,
  );
});

test("isClientLinkAgentTurnComplete is true when Cursor status is FINISHED and idle", () => {
  assert.equal(
    isClientLinkAgentTurnComplete({
      busy: false,
      status: "FINISHED",
      generationState: "completed",
    }),
    true,
  );
});

test("isClientLinkAgentTurnComplete stays true while merge confirmation pending", () => {
  assert.equal(
    isClientLinkAgentTurnComplete({
      busy: false,
      status: "FINISHED",
      generationState: "completed",
      mergeConfirmationPending: true,
    }),
    true,
  );
});

test("isClientLinkAgentTurnComplete is true when Cursor status is FAILED despite lagging generationState", () => {
  assert.equal(
    isClientLinkAgentTurnComplete({
      busy: false,
      status: "FAILED",
      generationState: "running",
    }),
    true,
  );
});

test("isClientLinkAgentTurnFailed detects terminal failure from status or generationState", () => {
  assert.equal(
    isClientLinkAgentTurnFailed({
      status: "FAILED",
      generationState: "running",
    }),
    true,
  );
  assert.equal(
    isClientLinkAgentTurnFailed({
      status: "RUNNING",
      generationState: "failed",
    }),
    true,
  );
  assert.equal(
    isClientLinkAgentTurnFailed({
      status: "RUNNING",
      generationState: "running",
    }),
    false,
  );
});

test("syncClientLinkAgentUiFromStatus fails when agent failed despite lagging generationState", () => {
  let pipeline = "Working…";
  let failed = false;
  syncClientLinkAgentUiFromStatus(
    { busy: false, status: "FAILED", generationState: "running" },
    {
      setReleaseAgentBusy: () => {},
      setPipelineLabel: (v) => {
        pipeline = v;
      },
      applyApiGenerationTerminal: (gen) => {
        if (gen === "failed") failed = true;
      },
    },
  );
  assert.equal(pipeline, "");
  assert.equal(failed, true);
});

test("syncClientLinkAgentUiFromStatus does not complete while generationState is running", () => {
  let pipeline = "Working…";
  let completed = false;
  syncClientLinkAgentUiFromStatus(
    { busy: false, status: "FINISHED", generationState: "running" },
    {
      setReleaseAgentBusy: () => {},
      setPipelineLabel: (v) => {
        pipeline = v;
      },
      applyApiGenerationTerminal: (gen) => {
        if (gen === "completed") completed = true;
      },
      markCompleted: () => {},
    },
  );
  assert.equal(pipeline, "Working…");
  assert.equal(completed, false);
});

test("syncClientLinkAgentUiFromStatus clears pipeline when idle", () => {
  let pipeline = "Working…";
  syncClientLinkAgentUiFromStatus(
    { busy: false, status: "FINISHED", generationState: "completed" },
    {
      setReleaseAgentBusy: () => {},
      setPipelineLabel: (v) => {
        pipeline = v;
      },
      applyApiGenerationTerminal: () => {},
      markCompleted: () => {},
    },
  );
  assert.equal(pipeline, "");
});

test("classifyCursorAgentPollTerminal treats FINISHED + Stopped by API as stopped", () => {
  assert.equal(
    classifyCursorAgentPollTerminal({
      status: "FINISHED",
      summary: CLOUD_AGENT_USER_STOP_SUMMARY,
    }),
    "stopped",
  );
});

test("classifyCursorAgentPollTerminal treats FINISHED as success", () => {
  assert.equal(classifyCursorAgentPollTerminal({ status: "FINISHED", summary: "Done" }), "success");
});

test("classifyCursorAgentPollTerminal treats STOPPED as stopped", () => {
  assert.equal(classifyCursorAgentPollTerminal({ status: "STOPPED" }), "stopped");
});
