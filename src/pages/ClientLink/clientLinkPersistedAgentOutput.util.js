export const CLIENT_LINK_AGENT_OUTPUT_HEADER_ASK = "Ask response";
export const CLIENT_LINK_AGENT_OUTPUT_HEADER_AGENT = "Agent output";

/**
 * Split persisted agent output text into header + body.
 * @param {string | null | undefined} text
 * @returns {{ header: string | null, body: string }}
 */
export function splitClientLinkPersistedAgentOutputText(text) {
  const raw = typeof text === "string" ? text : "";
  if (!raw.trim()) {
    return { header: null, body: "" };
  }
  const sep = raw.indexOf("\n\n");
  if (sep < 0) {
    return { header: null, body: raw.trim() };
  }
  const header = raw.slice(0, sep).trim();
  const body = raw.slice(sep + 2).trim();
  if (!header) {
    return { header: null, body: raw.trim() };
  }
  return { header, body };
}

/** @param {{ role?: string, mode?: string | null } | null | undefined} row */
export function isPersistedClientLinkAgentOutputRow(row) {
  return row?.role === "system" && (row.mode === "ask" || row.mode === "agent");
}

function findLastClientLinkUserMessageIndex(rows) {
  if (!Array.isArray(rows)) return -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    const m = rows[i];
    if (m?.role === "user" && !m?.isScratchPrompt) return i;
  }
  return -1;
}

/**
 * True when a persisted ask/agent system row exists after the latest user turn.
 * @param {Array<{ role?: string, mode?: string | null, isPersistedAgentOutput?: boolean, isScratchPrompt?: boolean }> | null | undefined} rows
 * @param {{ mode?: "ask" | "agent" | null }} [opts]
 */
function userTurnSliceHasPersistedAgentOutput(rows, userIdx, opts = {}) {
  if (!Array.isArray(rows) || userIdx < 0 || userIdx >= rows.length) {
    return false;
  }
  const wantMode =
    opts.mode === "ask" || opts.mode === "agent" ? opts.mode : null;
  for (let i = userIdx + 1; i < rows.length; i++) {
    const m = rows[i];
    if (m?.role === "user" && !m?.isScratchPrompt) break;
    // Live stream bridges are not DB-persisted rows — must not end the poll early.
    if (m?.isEphemeral === true) continue;
    const persisted =
      Boolean(m?.isPersistedAgentOutput) ||
      isPersistedClientLinkAgentOutputRow(m);
    if (!persisted) continue;
    if (wantMode && m?.mode !== wantMode) continue;
    const body =
      typeof m?.text === "string"
        ? splitClientLinkPersistedAgentOutputText(m.text).body
        : "";
    if (body.trim()) return true;
  }
  return false;
}

export function lastUserTurnHasPersistedAgentOutput(rows, opts = {}) {
  const lastUserIdx = findLastClientLinkUserMessageIndex(rows);
  if (lastUserIdx < 0) return true;
  return userTurnSliceHasPersistedAgentOutput(rows, lastUserIdx, opts);
}

/**
 * True when a persisted ask/agent system row exists after a specific user message.
 * @param {Array<{ id?: number | null, role?: string }>} rows
 * @param {number | string | null | undefined} userMessageId
 * @param {{ mode?: "ask" | "agent" | null }} [opts]
 */
export function userTurnHasPersistedAgentOutputForUserId(
  rows,
  userMessageId,
  opts = {},
) {
  if (!Array.isArray(rows)) return false;
  const token =
    userMessageId === "latest"
      ? "latest"
      : userMessageId != null && Number.isFinite(Number(userMessageId))
        ? Number(userMessageId)
        : null;
  if (token == null) {
    return lastUserTurnHasPersistedAgentOutput(rows, opts);
  }
  if (token === "latest") {
    return lastUserTurnHasPersistedAgentOutput(rows, opts);
  }
  let userIdx = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if (
      rows[i]?.role === "user" &&
      !rows[i]?.isScratchPrompt &&
      rows[i]?.id != null &&
      Number(rows[i].id) === token
    ) {
      userIdx = i;
      break;
    }
  }
  if (userIdx < 0) return false;
  return userTurnSliceHasPersistedAgentOutput(rows, userIdx, opts);
}

/** @param {string | null | undefined} key */
export function parseEphemeralAgentOutputKey(key) {
  if (typeof key !== "string" || !key.startsWith("ephemeral:agent-output:")) {
    return null;
  }
  const parts = key.split(":");
  if (parts.length < 4) return null;
  const userToken = parts[parts.length - 1];
  return {
    releaseId: parts[2],
    userToken,
  };
}

/**
 * Keep ephemeral bridge rows unless that user turn already has persisted output.
 * @param {{ key?: string, mode?: string | null }} msg
 */
export function shouldKeepEphemeralAgentOutputMessage(msg, rows) {
  if (msg?.isEphemeral !== true) return false;
  const parsed = parseEphemeralAgentOutputKey(msg?.key);
  if (!parsed) return false;
  const mode = msg?.mode === "ask" ? "ask" : "agent";
  return !userTurnHasPersistedAgentOutputForUserId(rows, parsed.userToken, {
    mode,
  });
}

/** User rows present locally but not yet returned by /messages. */
export function isLocalUserMessagePendingOnServer(userMsg, rows) {
  if (userMsg?.role !== "user" || userMsg?.isScratchPrompt) return false;
  if (!Array.isArray(rows) || !rows.length) return true;
  const id = userMsg?.id != null ? Number(userMsg.id) : null;
  if (Number.isFinite(id)) {
    return !rows.some(
      (r) => r?.role === "user" && r?.id != null && Number(r.id) === id,
    );
  }
  const text = typeof userMsg?.text === "string" ? userMsg.text.trim() : "";
  if (!text) return false;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.role !== "user" || rows[i]?.isScratchPrompt) continue;
    return (rows[i]?.text || "").trim() !== text;
  }
  return true;
}

/**
 * Ephemeral chat row shown when SSE settles before the DB persist row exists.
 * @param {string} streamText
 * @param {"ask" | "agent"} [mode]
 * @param {Array<object>} [streamTimeline]
 */
export function buildClientLinkEphemeralAgentOutputMessage(
  streamText,
  mode = "agent",
  streamTimeline = [],
) {
  const body = typeof streamText === "string" ? streamText.trim() : "";
  const timeline = Array.isArray(streamTimeline) ? streamTimeline : [];
  if (!body && timeline.length === 0) return null;
  return {
    role: "system",
    mode,
    text: body,
    streamTimeline: timeline,
    isPersistedAgentOutput: true,
    isEphemeral: true,
  };
}
