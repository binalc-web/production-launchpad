/**
 * Pure helpers for client-link agent turn settlement (preview + chat sync).
 */

import {
  isBackendAgentSuccessTerminal,
  isClientLinkAgentTurnComplete,
  isClientLinkAgentUserStopped,
  isClientLinkAgentWorkComplete,
  normalizeBackendAgentStatus,
} from "./backendAgentStatus.js";
import { isCurrent } from "./generationManager.js";

/** @param {object | null | undefined} st */
export function readAgentStreamRequestIdFromStatus(st) {
  const id = typeof st?.generationRequestId === "string" ? st.generationRequestId.trim() : "";
  return id || null;
}

/**
 * True when agent-status shows an in-flight Cursor run (not leftover FINISHED).
 * Used to unblock optimistic user bubbles that do not have a server id yet.
 * @param {object | null | undefined} st
 */
export function isLiveInFlightAgentStatus(st) {
  if (!st || typeof st !== "object") return false;
  const raw = st.status != null ? String(st.status).trim().toUpperCase().replace(/\s+/g, "_") : "";
  if (
    raw &&
    !isBackendAgentSuccessTerminal(raw) &&
    raw !== "FAILED" &&
    !raw.includes("FAIL") &&
    raw !== "ERROR" &&
    raw !== "STOPPED"
  ) {
    return true;
  }
  const gen = typeof st.generationState === "string" ? st.generationState.trim() : "";
  if (
    (gen === "running" || gen === "retrying") &&
    Boolean(st.busy) &&
    !isBackendAgentSuccessTerminal(raw)
  ) {
    return true;
  }
  const phase = typeof st.streamPhase === "string" ? st.streamPhase.trim() : "";
  if (
    phase &&
    !/^agent finished\.?$/i.test(phase) &&
    !/^preview is ready\.?$/i.test(phase) &&
    !/^preview build failed\.?$/i.test(phase) &&
    !isBackendAgentSuccessTerminal(raw)
  ) {
    return true;
  }
  const timeline = Array.isArray(st.streamTimeline) ? st.streamTimeline : [];
  return timeline.some((item) => item?.status === "running" || item?.status === "streaming");
}

/**
 * Server status from the previous turn must not abort a newly started local generation.
 * @param {object | null | undefined} st
 * @param {string | null | undefined} trackedRequestId
 * @param {{ chatRows?: Array<object> | null }} [opts]
 */
export function isStaleAgentStatusForTrackedTurn(st, trackedRequestId, { chatRows = null } = {}) {
  const tracked = typeof trackedRequestId === "string" ? trackedRequestId.trim() : "";
  if (!tracked || !isCurrent(tracked)) return false;

  const serverReqId = readAgentStreamRequestIdFromStatus(st);
  if (serverReqId && serverReqId !== tracked) return true;

  const gen = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  const busy = Boolean(st?.busy) && !st?.error;

  // Status still describes a previous user message (or an optimistic new bubble).
  if (Array.isArray(chatRows) && chatRows.length > 0) {
    const lastUser = findLastClientLinkUserChatRow(chatRows);
    if (lastUser) {
      const stMsgId = st?.lastUserTurnMessageId != null ? Number(st.lastUserTurnMessageId) : null;
      if (lastUser.id == null) {
        // Optimistic bubble for the send in flight. Do NOT treat pending lastUserTurnMessageId
        // as prior-turn residue — that stuck the chip on "Connecting to agent…" while the
        // agent was already RUNNING. Only terminal leftovers are stale here.
        if (isLiveInFlightAgentStatus(st)) return false;
        if (isBackendAgentSuccessTerminal(st?.status) || isClientLinkAgentWorkComplete(st)) {
          return true;
        }
      } else if (stMsgId != null && Number(stMsgId) !== Number(lastUser.id)) {
        // Queue handoff: pending id advanced before the new user row is in chatRows.
        if (isClientLinkPendingTurnAheadOfTranscript(st, chatRows)) return false;
        return true;
      }
    }
  }

  if (!busy && (gen === "completed" || gen === "idle") && !serverReqId) {
    // Current-turn completion clears generationRequestId after clearActiveGeneration.
    // Matching latest user + success terminal must not be treated as stale — otherwise
    // poll forces generationState back to "running" and the UI sticks on
    // "Agent is working…" until reload (which has no tracked requestId).
    if (
      Array.isArray(chatRows) &&
      chatRows.length > 0 &&
      agentStatusMatchesLatestChatUserTurn(st, chatRows) &&
      (isClientLinkAgentWorkComplete(st) || isBackendAgentSuccessTerminal(st?.status))
    ) {
      return false;
    }
    return true;
  }
  // Prior stop markers must not abort a newly started local generation.
  if (
    (gen === "stopped" || Boolean(st?.userStopped)) &&
    (!serverReqId || serverReqId !== tracked)
  ) {
    return true;
  }
  return false;
}

/**
 * True when status carries an assistant/result body (not just in-progress tools/thinking).
 * Used to block prior-turn transcript from painting under a new/optimistic user bubble.
 * @param {object | null | undefined} st
 */
export function hasSubstantiveAgentStatusAssistantOutput(st) {
  if (!st || typeof st !== "object") return false;
  const text = typeof st.streamText === "string" ? st.streamText.trim() : "";
  if (text.length > 0) return true;
  const timeline = Array.isArray(st.streamTimeline) ? st.streamTimeline : [];
  return timeline.some(
    (item) =>
      item &&
      ((item.type === "assistant" && typeof item.text === "string" && item.text.trim()) ||
        item.type === "result"),
  );
}

/**
 * Whether live stream overlay from agent status may be shown for the tracked turn.
 * Live in-flight status without an assistant body may still update (tools/thinking).
 * Substantive assistant output requires the status to be bound to the latest chat user.
 */
export function shouldApplyAgentLiveStreamFromStatus(
  st,
  trackedRequestId,
  { chatRows = null } = {},
) {
  if (isStaleAgentStatusForTrackedTurn(st, trackedRequestId, { chatRows })) return false;
  if (!hasSubstantiveAgentStatusAssistantOutput(st)) return true;
  if (!Array.isArray(chatRows) || chatRows.length === 0) return true;
  return agentStatusMatchesLatestChatUserTurn(st, chatRows);
}

/** Block composer send/retry while a local agent turn is actually in flight. */
export function isClientLinkComposerAgentBusy({
  turnPhase = "idle",
  chatSending = false,
  chatPolling = false,
  agentStopSettling = false,
  agentTurnBackgroundSettling = false,
  generationState = "idle",
  activeRequestId = null,
} = {}) {
  if (agentStopSettling) return true;
  if (turnPhase !== "idle" && turnPhase !== "stopped" && turnPhase !== "failed") {
    return true;
  }
  if (agentTurnBackgroundSettling || chatSending || chatPolling) {
    return true;
  }
  return (
    generationState === "running" &&
    typeof activeRequestId === "string" &&
    activeRequestId.trim() &&
    isCurrent(activeRequestId.trim())
  );
}

/** @param {object | null | undefined} st */
export function shouldDeferMergeFromAgentStatus(st) {
  if (!st || typeof st !== "object") return false;
  return (
    Boolean(st.mergeConfirmationPending) ||
    Boolean(st.awaitingLaunchpadConfirmation) ||
    Boolean(st.autoLaunchpadMergePending)
  );
}

/** Agent-mode turns sync preview; ask turns do not. */
export function shouldRunAgentTurnPreviewSync(st) {
  if (!st || typeof st !== "object") return true;
  return st.lastUserTurnMode !== "ask";
}

/**
 * @param {object | null | undefined} st
 * @param {{ applied: string, merged: string }} messages
 */
export function agentTurnSettlementSystemMessage(st, { applied, merged }) {
  return shouldDeferMergeFromAgentStatus(st) ? merged : applied;
}

/**
 * True when status shows a newer generation than the turn we are settling
 * (LaunchPad queue drained the next user message while settle waited).
 * @param {object | null | undefined} st
 * @param {string | null | undefined} settlingRequestId
 */
export function isClientLinkQueueDrainHandoff(st, settlingRequestId) {
  if (!st || typeof st !== "object" || st.error) return false;
  const settling = typeof settlingRequestId === "string" ? settlingRequestId.trim() : "";
  if (!settling) return false;
  const serverReqId = readAgentStreamRequestIdFromStatus(st);
  if (!serverReqId || serverReqId === settling) return false;
  const gen = typeof st.generationState === "string" ? st.generationState.trim() : "";
  return Boolean(st.busy) || gen === "running" || gen === "retrying";
}

/**
 * Settle gate: release idle for this turn, or a drained next turn already owns the release.
 * Do not treat a brief idle gap as ready while LaunchPad still has queued follow-ups.
 * @param {object | null | undefined} st
 * @param {string | null | undefined} settlingRequestId
 * @param {number} [localQueuedCount]
 */
export function isClientLinkSettleReadyForNextTurn(st, settlingRequestId, localQueuedCount = 0) {
  if (!st || typeof st !== "object") return false;
  if (st.error) return false;
  if (st.awaitingLaunchpadConfirmation) return false;
  if (isClientLinkQueueDrainHandoff(st, settlingRequestId)) return true;
  const queuedCount = Number(st.queuedCount);
  const serverQueued = Number.isInteger(queuedCount) ? queuedCount : 0;
  const localQueued = Number(localQueuedCount);
  const pendingQueue = Math.max(serverQueued, Number.isInteger(localQueued) ? localQueued : 0);
  if (pendingQueue > 0) return false;
  return !Boolean(st.busy);
}

/**
 * History reconnect after a queued follow-up must not be blocked by the previous
 * turn still sitting in `streaming` React state.
 */
export function shouldSkipClientLinkHistoryReconnect({
  force = false,
  chatPolling = false,
  pollStopped = false,
  agentStopSettling = false,
  busyAutoPollStarted = false,
  turnRunLocked = false,
} = {}) {
  if (agentStopSettling) return true;
  if (force) return false;
  if (chatPolling || pollStopped || busyAutoPollStarted || turnRunLocked) return true;
  return false;
}

/**
 * Whether history load should reconnect SSE poll for an in-flight agent.
 * @param {object | null | undefined} st
 */
export function shouldReconnectAgentPollFromStatus(st) {
  if (!st || typeof st !== "object" || st.error) return false;
  if (isClientLinkAgentUserStopped(st)) return false;
  if (isClientLinkAgentWorkComplete(st)) return false;
  const raw = normalizeBackendAgentStatus(st?.status);
  const sha =
    typeof st.lastUserTurnAppliedCommitSha === "string"
      ? st.lastUserTurnAppliedCommitSha.trim()
      : "";
  if (isBackendAgentSuccessTerminal(raw) && !Boolean(st.busy) && sha.length >= 7) {
    return false;
  }
  if (Boolean(st.busy)) return true;
  const gen = typeof st.generationState === "string" ? st.generationState.trim() : "";
  if (gen === "running" || gen === "retrying") return true;
  if (isClientLinkAgentTurnComplete(st)) return false;
  return false;
}

/**
 * Bridge text for a finished turn that has no ChatHistory system row yet (tab reopen).
 * Prefers askReplyText (backend ask-mode field), then live streamText.
 * @param {object | null | undefined} st
 * @returns {{ body: string, timeline: object[], mode: "ask" | "agent" } | null}
 */
export function resolveClientLinkMissingOutputBridgeFromStatus(st) {
  if (!st || typeof st !== "object") return null;
  const mode = st.lastUserTurnMode === "ask" ? "ask" : "agent";
  const askText = typeof st.askReplyText === "string" ? st.askReplyText.trim() : "";
  const streamText = typeof st.streamText === "string" ? st.streamText.trim() : "";
  const timeline = Array.isArray(st.streamTimeline) ? st.streamTimeline : [];
  const body = askText || streamText;
  if (!body && timeline.length === 0) return null;
  return { body: body || "", timeline, mode };
}

/** Cursor FINISHED with substantive stream / timeline output for this turn. */
export function hasAgentStatusStreamOutput(st) {
  if (!st || !isBackendAgentSuccessTerminal(st?.status)) return false;
  const text = typeof st.streamText === "string" ? st.streamText.trim() : "";
  if (text.length > 0) return true;
  const timeline = Array.isArray(st.streamTimeline) ? st.streamTimeline : [];
  if (timeline.length === 0) return false;
  return timeline.some(
    (item) =>
      item &&
      ((item.type === "assistant" && typeof item.text === "string" && item.text.trim()) ||
        item.type === "result" ||
        item.type === "tool_call"),
  );
}

/**
 * FINISHED for the latest chat user turn (first message or follow-up).
 * Backend remaps stale prior-turn FINISHED to RUNNING during follow-up startup, so a
 * success-terminal status that matches the latest user row is this turn's completion —
 * including early CLI FINISHED while generationState/busy still lag.
 * @param {object | null | undefined} st
 * @param {Array<object> | null | undefined} chatRows
 */
export function isEarlyFinishedCurrentUserTurn(st, chatRows = null) {
  if (!st || !isBackendAgentSuccessTerminal(st?.status)) return false;
  if (Array.isArray(chatRows) && chatRows.length > 0) {
    return agentStatusMatchesLatestChatUserTurn(st, chatRows);
  }
  return true;
}

/**
 * Whether agent-status warrants full turn settlement (preview sync + toast line).
 * Blocks stale prior-turn snapshots and re-settling turns that already persisted output.
 * @param {object | null | undefined} st
 * @param {{
 *   requestId?: string | null,
 *   alreadyHasPersistedOutput?: boolean,
 *   hasPersistedOutputInHistory?: boolean,
 *   chatRows?: Array<object> | null,
 * }} [opts]
 */
export function shouldSettleAgentTurnFromStatus(
  st,
  {
    requestId = null,
    alreadyHasPersistedOutput = false,
    hasPersistedOutputInHistory = false,
    chatRows = null,
  } = {},
) {
  if (!st || typeof st !== "object") return false;
  if (alreadyHasPersistedOutput) return false;
  if (isStaleAgentStatusForTrackedTurn(st, requestId, { chatRows })) return false;
  if (isClientLinkAgentUserStopped(st)) return false;
  if (
    Array.isArray(chatRows) &&
    chatRows.length > 0 &&
    !agentStatusMatchesLatestChatUserTurn(st, chatRows)
  ) {
    return false;
  }

  const gen = typeof st?.generationState === "string" ? st.generationState.trim() : "";
  const inFlightGen = gen === "running" || gen === "retrying" || Boolean(st?.busy);

  // Leftover prior-turn FINISHED must not settle a brand-new follow-up while generation
  // is still marked running. Wait for stream/persisted output (or generation to clear) —
  // settling on bare early FINISHED clears the live overlay before output is bridged.
  if (
    isBackendAgentSuccessTerminal(st?.status) &&
    inFlightGen &&
    !hasPersistedOutputInHistory &&
    typeof requestId === "string" &&
    requestId.trim() &&
    isCurrent(requestId.trim()) &&
    !hasAgentStatusStreamOutput(st)
  ) {
    return false;
  }

  if (
    isBackendAgentSuccessTerminal(st?.status) &&
    (hasPersistedOutputInHistory ||
      isClientLinkAgentWorkComplete(st) ||
      hasAgentStatusStreamOutput(st))
  ) {
    return true;
  }

  if (shouldReconnectAgentPollFromStatus(st)) return false;
  if (!isClientLinkAgentTurnComplete(st)) return false;
  return true;
}

/** @param {Array<{ role?: string, text?: string, createdAt?: string, isScratchPrompt?: boolean }>} rows */
export function findLatestUserChatRow(rows) {
  if (!Array.isArray(rows)) return null;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.role === "user") return rows[i];
  }
  return null;
}

/** Latest non-scratch user row in client-link chat history. */
export function findLastClientLinkUserChatRow(rows) {
  if (!Array.isArray(rows)) return null;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const m = rows[i];
    if (m?.role === "user" && !m?.isScratchPrompt) return m;
  }
  return null;
}

/**
 * True when agent-status lastUserTurnMessageId refers to the latest chat user row.
 * Prevents prior-turn FINISHED + persisted output from closing a new in-flight turn.
 * @param {object | null | undefined} st
 * @param {Array<{ id?: number | null, role?: string, isScratchPrompt?: boolean }>} rows
 */
export function agentStatusMatchesLatestChatUserTurn(st, rows) {
  if (!st || typeof st !== "object") return false;
  const lastUser = findLastClientLinkUserChatRow(rows);
  if (!lastUser) return false;
  const stMsgId = st.lastUserTurnMessageId != null ? Number(st.lastUserTurnMessageId) : null;
  if (stMsgId == null) return true;
  if (lastUser.id != null) return Number(lastUser.id) === stMsgId;
  return false;
}

/**
 * Queued follow-up was claimed (`lastUserTurnMessageId`) but the transcript still shows
 * the previous user (queued row filtered / refresh not finished). Live RUNNING for that
 * pending id must not be treated as prior-turn residue or the chip sticks on Connecting.
 * @param {object | null | undefined} st
 * @param {Array<{ id?: number | null, role?: string, isScratchPrompt?: boolean }> | null | undefined} rows
 */
export function isClientLinkPendingTurnAheadOfTranscript(st, rows) {
  if (!st || typeof st !== "object" || !Array.isArray(rows) || rows.length === 0) return false;
  if (!isLiveInFlightAgentStatus(st)) return false;
  const stMsgId = st.lastUserTurnMessageId != null ? Number(st.lastUserTurnMessageId) : null;
  if (stMsgId == null || !Number.isInteger(stMsgId) || stMsgId < 1) return false;
  const pendingInTranscript = rows.some(
    (m) => m?.role === "user" && !m?.isScratchPrompt && m?.id != null && Number(m.id) === stMsgId,
  );
  if (pendingInTranscript) return false;
  const lastUser = findLastClientLinkUserChatRow(rows);
  if (!lastUser || lastUser.id == null) return false;
  return Number(lastUser.id) !== stMsgId;
}

/** @param {string | null | undefined} text */
export function normalizeClientLinkOutboundMessageText(text) {
  return typeof text === "string" ? text.trim() : "";
}

/**
 * Follow-up HTTP may fail after the server registered generation / Cursor accepted the prompt.
 * Recover when agent-status + latest user row match this send.
 * @param {object | null | undefined} st
 * @param {{ sentText?: string, sentAtMs?: number, lastUserRow?: object | null }} [opts]
 */
export function shouldRecoverClientLinkSendAfterFollowupError(
  st,
  { sentText = "", sentAtMs = NaN, lastUserRow = null } = {},
) {
  if (!st || typeof st !== "object" || st.error) return false;
  if (isClientLinkAgentUserStopped(st)) return false;

  const gen = typeof st.generationState === "string" ? st.generationState.trim() : "";
  const inFlight =
    gen === "running" ||
    gen === "retrying" ||
    (Boolean(st.busy) && !isClientLinkAgentTurnComplete(st));
  if (!inFlight) return false;

  const expected = normalizeClientLinkOutboundMessageText(sentText);
  const lastText = normalizeClientLinkOutboundMessageText(lastUserRow?.text);
  if (!expected || lastText !== expected) return false;

  const createdMs = Date.parse(String(lastUserRow?.createdAt ?? ""));
  const sentMs = Number(sentAtMs);
  if (!Number.isFinite(createdMs) || !Number.isFinite(sentMs)) return false;
  if (createdMs < sentMs - 15_000 || createdMs > sentMs + 120_000) return false;

  if (st.lastUserTurnMessageId != null && lastUserRow?.id != null) {
    if (Number(st.lastUserTurnMessageId) !== Number(lastUserRow.id)) {
      return false;
    }
  }

  return Boolean(readAgentStreamRequestIdFromStatus(st) || gen === "running");
}
