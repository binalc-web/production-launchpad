/**
 * Agent-status stream text and pipeline label helpers for client-link chat.
 */

import { dedupeConsecutiveStreamLines } from "../../../lib/clientLinkLiveStreamText.js";
import {
  isClientLinkAgentTurnComplete,
  isClientLinkAgentWorkComplete,
} from "../../../lib/backendAgentStatus.js";
import {
  readAgentStreamRequestIdFromStatus,
  isEarlyFinishedCurrentUserTurn,
  isLiveInFlightAgentStatus,
  isClientLinkPendingTurnAheadOfTranscript,
} from "../../../lib/clientLinkAgentTurnSettlement.js";
import {
  agentStreamTimelineHasContent,
  readAgentStreamTimeline as readTimelineItems,
} from "./clientLinkStreamTimeline.util.js";

export function isCursorAgentSuccessTerminal(status) {
  if (status == null || status === "") return false;
  const u = String(status).trim().toUpperCase().replace(/\s+/g, "_");
  return (
    u === "FINISHED" ||
    u === "COMPLETED" ||
    u === "COMPLETE" ||
    u === "SUCCEEDED" ||
    u === "SUCCESS" ||
    u === "DONE"
  );
}

export function normalizeAgentStatusRaw(status) {
  if (status == null || status === "") return "";
  return String(status).trim().toUpperCase().replace(/\s+/g, "_");
}

/** Cursor model id from agent status payload (Auto, composer-2.5, …). */
export function readAgentModelIdFromStatus(st) {
  if (!st || typeof st !== "object") return null;
  if (typeof st.model === "string" && st.model.trim()) return st.model.trim();
  if (
    st.model &&
    typeof st.model === "object" &&
    typeof st.model.id === "string" &&
    st.model.id.trim()
  ) {
    return st.model.id.trim();
  }
  if (typeof st.modelId === "string" && st.modelId.trim()) return st.modelId.trim();
  return null;
}

export function isAgentPollTurnComplete(st) {
  return isClientLinkAgentTurnComplete(st);
}

export function isAgentPollStillRunning(st) {
  if (isAgentPollTurnComplete(st)) return false;
  if (!Boolean(st?.busy)) return false;
  const raw = normalizeAgentStatusRaw(st?.status);
  const apiGenState = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  if (apiGenState === "running") return true;
  if (
    raw &&
    !isCursorAgentSuccessTerminal(raw) &&
    raw !== "FAILED" &&
    !raw.includes("FAIL") &&
    raw !== "ERROR"
  ) {
    return true;
  }
  return true;
}

export function readAgentStreamText(st) {
  const raw = typeof st?.streamText === "string" ? st.streamText.trim() : "";
  return raw ? dedupeConsecutiveStreamLines(raw) : "";
}

export function readAgentStreamTimeline(st) {
  return readTimelineItems(st);
}

export function readAgentStreamRequestId(st) {
  return readAgentStreamRequestIdFromStatus(st);
}

export function applyApiGenerationTerminal(
  apiGenState,
  { markCompleted, markFailed, setGenerationState, allowTerminal = true },
) {
  if (!allowTerminal) return;
  const gen = typeof apiGenState === "string" ? apiGenState.trim() : "";
  if (gen === "completed" || gen === "idle") {
    markCompleted();
    return;
  }
  if (gen === "failed") {
    markFailed();
    return;
  }
  if (gen === "stopped") {
    setGenerationState("stopped");
  }
}

export function formatRunningSubagentsPhase(timeline) {
  if (!Array.isArray(timeline)) return null;
  let n = 0;
  for (const item of timeline) {
    if (item?.type === "tool_call" && item.toolKind === "subagent" && item.status === "running") {
      n += 1;
    }
  }
  if (n <= 0) return null;
  return n === 1 ? "Running 1 subagent…" : `Running ${n} subagents…`;
}

const PRIOR_TURN_TERMINAL_LABELS = new Set([
  "Agent finished.",
  "Preview is ready.",
  "Preview build failed.",
]);

/**
 * While waiting for the *current* generation's agent-status (prior turn still in the
 * payload), keep this-turn labels and never re-surface a prior terminal status. Every send
 * resets the label to "Sending your request…", so any non-terminal label already showing
 * belongs to this turn.
 * @param {unknown} prev
 * @param {string} [fallback]
 */
export function resolvePipelineLabelWhileAwaitingCurrentTurn(prev, fallback = "Starting agent…") {
  const p = typeof prev === "string" ? prev.trim() : "";
  if (!p || PRIOR_TURN_TERMINAL_LABELS.has(p) || p.startsWith("Agent ended:")) {
    return fallback;
  }
  return p;
}

/**
 * Like {@link resolvePipelineLabelWhileAwaitingCurrentTurn}, but when Cursor itself reports a
 * non-terminal run on this release, show that live label. Only one agent runs per release, so a
 * live run is never prior-turn residue; keeping "Connecting to agent…" for it is just wrong.
 * @param {unknown} prev
 * @param {object | null | undefined} st
 * @param {string} [fallback]
 */
export function resolvePipelineLabelForStatus(prev, st, fallback) {
  const raw = normalizeAgentStatusRaw(st?.status);
  const cursorLive =
    Boolean(st?.busy) &&
    !st?.error &&
    raw !== "" &&
    !isCursorAgentSuccessTerminal(raw) &&
    !raw.includes("FAIL") &&
    raw !== "ERROR" &&
    raw !== "STOPPED";
  if (cursorLive) {
    const live = buildClientLinkChatAgentPipelineStatusLabel(st, {
      omitTranscript: Boolean(readAgentStreamText(st)),
    });
    if (live) return live;
  }
  return resolvePipelineLabelWhileAwaitingCurrentTurn(prev, fallback);
}

/** True when status shows live agent work (not a leftover FINISHED snapshot). */
export function hasActiveClientLinkAgentProgress(st) {
  return isLiveInFlightAgentStatus(st);
}

/**
 * Whether agent-status may drive the chat pipeline label / model chip for the latest user turn.
 * Blocks prior-turn "Agent finished." / "Preview is ready." from painting under a new message.
 * @param {object | null | undefined} st
 * @param {Array<object> | null | undefined} chatRows
 */
export function shouldApplyClientLinkAgentPipelineLabel(st, chatRows) {
  if (!st || typeof st !== "object") return false;
  if (!Array.isArray(chatRows) || chatRows.length === 0) return true;

  const lastUser = (() => {
    for (let i = chatRows.length - 1; i >= 0; i -= 1) {
      const m = chatRows[i];
      if (m?.role === "user" && !m?.isScratchPrompt) return m;
    }
    return null;
  })();
  if (!lastUser) return true;

  const stMsgId = st.lastUserTurnMessageId != null ? Number(st.lastUserTurnMessageId) : null;
  // Optimistic user bubble (id not linked yet): still paint live RUNNING / tools so we do
  // not stick on "Connecting to agent…" while the agent is already working.
  if (lastUser.id == null) {
    return hasActiveClientLinkAgentProgress(st);
  }
  if (stMsgId != null && Number(lastUser.id) !== stMsgId) {
    // Queued message claimed before transcript refresh — allow live labels.
    if (isClientLinkPendingTurnAheadOfTranscript(st, chatRows)) return true;
    return false;
  }

  const raw = normalizeAgentStatusRaw(st?.status);
  const gen = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  // Follow-up startup used to report prior FINISHED while generationState was already
  // running — that residue must not paint "Agent finished." Backend now remaps stale
  // prior FINISHED → RUNNING. Matching-turn FINISHED (first message or follow-up CLI
  // done early) must drive labels even while bookkeeping still says running.
  if (isCursorAgentSuccessTerminal(raw) && (gen === "running" || gen === "retrying")) {
    return isEarlyFinishedCurrentUserTurn(st, chatRows);
  }
  if (stMsgId == null && isCursorAgentSuccessTerminal(raw)) {
    return false;
  }
  return true;
}

/**
 * Shimmer line above the live stream pane.
 */
export function buildClientLinkChatAgentPipelineStatusLabel(st, { omitTranscript = false } = {}) {
  if (!omitTranscript) {
    const stream = readAgentStreamText(st);
    if (stream) {
      const line =
        stream
          .split(/\n/)
          .find((l) => l.trim())
          ?.trim() || stream;
      return line.length > 80 ? `${line.slice(0, 77)}…` : line;
    }
    const timeline = readAgentStreamTimeline(st);
    const subagentPhase = formatRunningSubagentsPhase(timeline);
    if (subagentPhase) return subagentPhase;
    if (agentStreamTimelineHasContent(timeline)) {
      const runningTool = timeline.find(
        (item) => item.type === "tool_call" && item.status === "running",
      );
      if (runningTool?.label) {
        const label = String(runningTool.label);
        return label.length > 80 ? `${label.slice(0, 77)}…` : label;
      }
      if (timeline.some((item) => item.type === "thinking" && item.status === "streaming")) {
        return "Thinking…";
      }
    }
  } else {
    const subagentPhase = formatRunningSubagentsPhase(readAgentStreamTimeline(st));
    if (subagentPhase) return subagentPhase;
  }
  const phase = typeof st?.streamPhase === "string" ? st.streamPhase.trim() : "";
  if (phase) return phase;

  if (!st) return "Working…";
  const raw = st?.status ? String(st.status).trim().toUpperCase().replace(/\s+/g, "_") : "";
  const hasActivity =
    Boolean(st?.activity) && typeof st.activity === "string" && Boolean(st.activity.trim());
  const mergePending =
    Boolean(st?.mergeConfirmationPending) || Boolean(st?.awaitingLaunchpadConfirmation);
  const fromScratch = Boolean(st?.fromScratch);

  if (isCursorAgentSuccessTerminal(raw)) {
    if (mergePending) {
      return "Publishing changes in the background…";
    }
    if (fromScratch) {
      if (st?.scratchPreviewFailed) {
        return "Preview build failed.";
      }
      if (st?.previewReady) return "Preview is ready.";
      if (st?.scratchPreviewBuilding) {
        return isClientLinkAgentWorkComplete(st)
          ? "Building preview…"
          : "Publishing changes in the background…";
      }
    }
    return "Agent finished.";
  }

  const failureReason = typeof st?.failureReason === "string" ? st.failureReason.trim() : "";
  const apiGenState = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  if (
    failureReason &&
    (apiGenState === "failed" ||
      apiGenState === "stopped" ||
      raw === "FAILED" ||
      raw.includes("FAIL") ||
      raw === "ERROR")
  ) {
    return failureReason.length > 160 ? `${failureReason.slice(0, 157)}…` : failureReason;
  }
  if (raw === "FAILED" || raw.includes("FAIL") || raw === "ERROR") {
    return `Agent ended: ${raw}.`;
  }
  if (raw) return `Agent ${raw}`;
  if (hasActivity) return "Agent is running…";
  return "Request received. Connecting to agent…";
}
