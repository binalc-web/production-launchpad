/**
 * Client-link chat message mapping, merge, and in-flight output bridging.
 * Server rows are source of truth; local-only rows are merged explicitly.
 */

import {
  buildClientLinkEphemeralAgentOutputMessage,
  isLocalUserMessagePendingOnServer,
  isPersistedClientLinkAgentOutputRow,
  lastUserTurnHasPersistedAgentOutput,
  shouldKeepEphemeralAgentOutputMessage,
  splitClientLinkPersistedAgentOutputText,
  userTurnHasPersistedAgentOutputForUserId,
} from "../clientLinkPersistedAgentOutput.util.js";
import { isWaitingQueuedChatStatus } from "../../../lib/chatMessageQueue.util.js";

export const CLIENT_LINK_TURN_APPLIED_MSG_KEY_PREFIX = "client-link-turn-applied:";
export const CLIENT_LINK_TURN_MERGED_MSG_KEY_PREFIX = "client-link-turn-merged:";

export const AGENT_OUTPUT_PERSIST_POLL_MS = 400;
// The backend persists the assistant row on FINISHED before the terminal SSE fires, so the
// first refresh almost always already has the row. This runs in the non-blocking background
// settle, so a short ceiling is enough — it only bounds how long the "applying" chip lingers
// when persistence is genuinely delayed (the preview still rebuilds afterwards regardless).
export const AGENT_OUTPUT_PERSIST_MAX_MS = 8_000;

export function liveAgentStatusBubbleKey(releaseId) {
  return `live-agent-status:${Number(releaseId)}`;
}

export function stoppedAssistantKey(requestId) {
  const id = typeof requestId === "string" && requestId.trim() ? requestId.trim() : "unknown";
  return `ephemeral:stopped:${id}`;
}

export function isLiveAgentStatusBubbleMessage(msg) {
  const key = typeof msg?.key === "string" ? msg.key : "";
  return key.startsWith("live-agent-status:");
}

export function findLastClientLinkUserMessageIndex(rows) {
  if (!Array.isArray(rows)) return -1;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const m = rows[i];
    if (m?.role === "user" && !m?.isScratchPrompt) return i;
  }
  return -1;
}

export function getLastUserTurnCreatedAtFromMessages(rows) {
  const idx = findLastClientLinkUserMessageIndex(rows);
  if (idx < 0) return null;
  const createdAt = rows[idx]?.createdAt;
  return typeof createdAt === "string" && createdAt.trim() ? createdAt : null;
}

export function recoveryEligibilityFromMessageRows(rows) {
  if (!Array.isArray(rows)) {
    return { retryEligible: false, figmaConversionId: null };
  }
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const m = rows[i];
    if (m?.role !== "user" || m?.isScratchPrompt) continue;
    return {
      retryEligible: Boolean(m.retryEligible),
      figmaConversionId: m.figmaConversionId != null ? Number(m.figmaConversionId) : null,
    };
  }
  return { retryEligible: false, figmaConversionId: null };
}

export function isClientLinkTurnDoneSystemMessage(msg) {
  const key = typeof msg?.key === "string" ? msg.key : "";
  return (
    msg?.role === "system" &&
    (key.startsWith(CLIENT_LINK_TURN_APPLIED_MSG_KEY_PREFIX) ||
      key.startsWith(CLIENT_LINK_TURN_MERGED_MSG_KEY_PREFIX))
  );
}

export function withoutClientLinkTurnDoneMessages(messages) {
  return (messages || []).filter((m) => !isClientLinkTurnDoneSystemMessage(m));
}

/** @param {Array<{ id?: number, role?: string, mode?: string | null, text?: string }>} row */
export function mapClientLinkChatRow(row) {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    mode: row.mode ?? null,
    queueStatus: row.queueStatus ?? null,
    isPersistedAgentOutput: isPersistedClientLinkAgentOutputRow(row),
    key: `db:${row.id}`,
    createdAt: row.createdAt ?? null,
    appliedCommitSha: row.appliedCommitSha || null,
    isMerged: Boolean(row.isMerged),
    mergedAt: row.mergedAt || null,
    revertedAt: row.revertedAt || null,
    isReverted: Boolean(row.isReverted),
    revertCommitSha: row.revertCommitSha || null,
    figmaConversionId: row.figmaConversionId ?? null,
    retryEligible: Boolean(row.retryEligible),
    agentFailureReason:
      typeof row.agentFailureReason === "string" && row.agentFailureReason.trim()
        ? row.agentFailureReason.trim()
        : null,
    attachmentPreviewUrls: (() => {
      const arr = row.attachmentImageUrls;
      if (Array.isArray(arr) && arr.length) {
        return arr.filter((u) => typeof u === "string" && u.trim());
      }
      return [];
    })(),
    attachmentPreviewUrl:
      (Array.isArray(row.attachmentImageUrls) && row.attachmentImageUrls[0]) ||
      row.attachmentPreviewUrl ||
      null,
    jiraTicketLinks: Array.isArray(row.jiraTicketLinks) ? row.jiraTicketLinks : [],
    // Persisted agent activity log (user rows, or a scratch run's summary row); the chat session merges it by turn / run key.
    ...(Array.isArray(row.activity) ? { activity: row.activity } : {}),
  };
}

export function mapClientLinkChatRows(rows = []) {
  return rows
    .filter((row) => !isWaitingQueuedChatStatus(row?.queueStatus))
    .map(mapClientLinkChatRow);
}

function isPersistedOutputMessage(m) {
  return Boolean(m?.isPersistedAgentOutput) || isPersistedClientLinkAgentOutputRow(m);
}

/**
 * Keep one persisted agent/ask row per user turn (latest before next user).
 * Prevents duplicate output after reload when history contains retries.
 */
export function dedupePersistedAgentOutputByUserTurn(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows || [];
  const out = [];
  let lastUserIdx = -1;
  let lastOutputIdx = -1;

  const flushOutput = () => {
    if (lastOutputIdx < 0) return;
    out.push(rows[lastOutputIdx]);
    lastOutputIdx = -1;
  };

  for (let i = 0; i < rows.length; i += 1) {
    const m = rows[i];
    if (m?.role === "user" && !m?.isScratchPrompt) {
      flushOutput();
      lastUserIdx = i;
      out.push(m);
      continue;
    }
    if (lastUserIdx >= 0 && isPersistedOutputMessage(m)) {
      lastOutputIdx = i;
      continue;
    }
    flushOutput();
    out.push(m);
  }
  flushOutput();
  return out;
}

export function patchLastUserMessageFromAgentStatus(rows, st) {
  if (!Array.isArray(rows) || !rows.length || !st || typeof st !== "object") {
    return rows;
  }
  const lastIdx = findLastClientLinkUserMessageIndex(rows);
  if (lastIdx < 0) return rows;
  const cur = rows[lastIdx];
  const stConvId = st.figmaConversionId != null ? Number(st.figmaConversionId) : null;
  if (
    cur?.figmaConversionId != null &&
    stConvId != null &&
    Number(cur.figmaConversionId) !== stConvId
  ) {
    return rows;
  }
  const failReason = typeof st.failureReason === "string" ? st.failureReason.trim() : "";
  const stMsgId = st.lastUserTurnMessageId != null ? Number(st.lastUserTurnMessageId) : null;
  const curId = cur?.id != null ? Number(cur.id) : null;
  const mergeHintsApply = stMsgId != null && curId != null && stMsgId === curId;
  const next = [...rows];
  next[lastIdx] = {
    ...cur,
    retryEligible: Boolean(cur.retryEligible) || Boolean(st.retryEligible),
    agentFailureReason:
      (typeof cur.agentFailureReason === "string" && cur.agentFailureReason.trim()) ||
      failReason ||
      null,
    ...(mergeHintsApply && st.lastUserTurnMergedAt
      ? {
          mergedAt: cur.mergedAt || st.lastUserTurnMergedAt,
          isMerged: Boolean(cur.isMerged) || Boolean(st.lastUserTurnMergedAt),
        }
      : {}),
    ...(mergeHintsApply && st.lastUserTurnAppliedCommitSha
      ? {
          appliedCommitSha: cur.appliedCommitSha || st.lastUserTurnAppliedCommitSha,
        }
      : {}),
  };
  return next;
}

export function ephemeralAgentOutputKey(releaseId, userId) {
  return `ephemeral:agent-output:${releaseId}:${userId}`;
}

export function resolveEphemeralUserToken(rows) {
  const lastUserIdx = findLastClientLinkUserMessageIndex(rows);
  if (lastUserIdx >= 0 && rows[lastUserIdx]?.id != null) {
    return String(rows[lastUserIdx].id);
  }
  return "latest";
}

/**
 * When the optimistic user row gets a server id, migrate `…:latest` ephemeral to `…:{id}`.
 */
export function rekeyEphemeralAgentOutputForUser(setChatMessages, { releaseId, userId }) {
  const rid = Number(releaseId);
  const uid = userId != null && Number.isFinite(Number(userId)) ? String(Number(userId)) : "";
  if (!Number.isInteger(rid) || rid < 1 || !uid) return;

  const latestKey = ephemeralAgentOutputKey(rid, "latest");
  const targetKey = ephemeralAgentOutputKey(rid, uid);

  setChatMessages((prev) => {
    const latestIdx = prev.findIndex((m) => m?.key === latestKey);
    if (latestIdx < 0) return prev;

    const latest = prev[latestIdx];
    const targetIdx = prev.findIndex((m) => m?.key === targetKey);
    if (targetIdx >= 0) {
      const latestText = typeof latest?.text === "string" ? latest.text.trim() : "";
      const targetText =
        typeof prev[targetIdx]?.text === "string" ? prev[targetIdx].text.trim() : "";
      const mergedText = latestText.length >= targetText.length ? latestText : targetText;
      return prev
        .map((m, i) => (i === targetIdx && mergedText ? { ...m, text: mergedText } : m))
        .filter((m) => m?.key !== latestKey);
    }

    const next = [...prev];
    next[latestIdx] = { ...latest, key: targetKey };
    return next;
  });
}

/**
 * Merge server chat rows with local-only UI rows (optimistic user, ephemeral bridges).
 */
export function mergeChatRowsWithEphemeralUi(prev, rows, opts = {}) {
  const serverRows = dedupePersistedAgentOutputByUserTurn(rows || []);
  if (opts.replaceEphemeralUi) {
    return serverRows;
  }
  const keepStoppedEphemeral = opts.keepStoppedEphemeral !== false;
  const ephemeralStopped = keepStoppedEphemeral
    ? prev.filter(
        (m) =>
          m?.isEphemeral === true &&
          typeof m?.key === "string" &&
          m.key.startsWith("ephemeral:stopped:"),
      )
    : [];
  const pendingLocalUsers = prev.filter((m) => isLocalUserMessagePendingOnServer(m, serverRows));
  const mergeContextRows = [...serverRows, ...pendingLocalUsers];
  const ephemeralAgentOutput = prev.filter(
    (m) =>
      typeof m?.key === "string" &&
      m.key.startsWith("ephemeral:agent-output:") &&
      shouldKeepEphemeralAgentOutputMessage(m, mergeContextRows),
  );
  const localSystemMessages = prev.filter((m) => {
    if (m?.role !== "system" || m?.isEphemeral === true) return false;
    const key = typeof m?.key === "string" ? m.key.trim() : "";
    if (!key) return false;
    if (key.startsWith("ephemeral:agent-output:")) return false;
    return !serverRows.some((s) => s?.key === key);
  });
  return [
    ...serverRows,
    ...pendingLocalUsers,
    ...ephemeralStopped,
    ...ephemeralAgentOutput,
    ...localSystemMessages,
  ];
}

export async function refreshUntilPersistedAgentOutput(
  refreshFn,
  releaseId,
  { mode = "agent", shouldContinue } = {},
) {
  const stillCurrent = () => typeof shouldContinue !== "function" || shouldContinue();
  const deadline = Date.now() + AGENT_OUTPUT_PERSIST_MAX_MS;
  let rows = [];
  while (Date.now() < deadline) {
    if (!stillCurrent()) return rows;
    rows = await refreshFn(releaseId, {
      keepStoppedEphemeral: false,
      syncAgentStatus: false,
    });
    if (lastUserTurnHasPersistedAgentOutput(rows, { mode })) {
      return rows;
    }
    if (!stillCurrent()) return rows;
    await new Promise((resolve) => {
      window.setTimeout(resolve, AGENT_OUTPUT_PERSIST_POLL_MS);
    });
  }
  return rows;
}

/**
 * Upsert ephemeral agent output in the chat thread (live during streaming, or at settlement).
 */
export function promoteAgentLiveStreamToEphemeralMessage(
  setChatMessages,
  { releaseId, streamText, streamTimeline, liveKey, mode = "agent" },
) {
  const body = typeof streamText === "string" ? streamText.trim() : "";
  const timeline = Array.isArray(streamTimeline) ? streamTimeline : [];
  setChatMessages((prev) => {
    const withoutLive = liveKey ? prev.filter((x) => x?.key !== liveKey) : prev;
    const base = withoutLive;
    if (!body && timeline.length === 0) return base;

    const lastUserIdx = findLastClientLinkUserMessageIndex(base);
    const userToken = resolveEphemeralUserToken(base);
    const modeOpt = mode === "ask" ? "ask" : "agent";
    const ephemeralKey = ephemeralAgentOutputKey(releaseId, userToken);
    const existingIdx = base.findIndex((m) => m?.key === ephemeralKey);

    if (existingIdx >= 0) {
      const next = [...base];
      next[existingIdx] = {
        ...next[existingIdx],
        text: body,
        streamTimeline: timeline,
      };
      return next;
    }

    const serverPersistedRows = base.filter((m) => m?.isEphemeral !== true);
    if (
      userTurnHasPersistedAgentOutputForUserId(serverPersistedRows, userToken, {
        mode: modeOpt,
      })
    ) {
      return base;
    }

    const ephemeral = buildClientLinkEphemeralAgentOutputMessage(body, modeOpt, timeline);
    if (!ephemeral) return base;

    const insertAt = lastUserIdx >= 0 ? Math.min(lastUserIdx + 1, base.length) : base.length;
    const next = [...base];
    next.splice(insertAt, 0, {
      ...ephemeral,
      key: ephemeralKey,
      createdAt: new Date().toISOString(),
    });
    return next;
  });
}

export function patchLastUserMessageFailureReason(prev, reason) {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return prev;
  const idx = findLastClientLinkUserMessageIndex(prev);
  if (idx < 0) return prev;
  const next = [...prev];
  next[idx] = { ...next[idx], agentFailureReason: text };
  return next;
}

export function clearLastUserMessageFailureReason(prev) {
  const idx = findLastClientLinkUserMessageIndex(prev);
  if (idx < 0) return prev;
  const cur = prev[idx];
  if (!cur?.agentFailureReason) return prev;
  const next = [...prev];
  next[idx] = { ...next[idx], agentFailureReason: null };
  return next;
}

export { splitClientLinkPersistedAgentOutputText };
