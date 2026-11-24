const ACTIVE_ASSISTANT_STATUSES = new Set(["pending", "generating"]);

const DEFAULT_TURN_LABEL = "Updating backend code…";
const DEFAULT_PLAN_TURN_LABEL = "Planning…";
const PROGRESS_TURN_LABEL_MAX = 120;

/** Short progress/status copy safe to show while a turn is still in flight. */
export function isProgressTurnLabel(value) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s || s === "Preparing Cursor agent.") return false;
  if (s.length > PROGRESS_TURN_LABEL_MAX) return false;
  // Terminal publish copy from a prior agent turn — never a live progress label.
  if (/^published to github$/i.test(s)) return false;
  if (s.endsWith("…") || s.endsWith("...")) return true;
  return /^(queued|cursor agent|updating|investigating|preparing|planning|drafting|agent is|publishing|selecting)/i.test(
    s,
  );
}

/** True when text is a completed-publish status line (stale on follow-up turns). */
export function isTerminalPublishStatusLabel(value) {
  const s = typeof value === "string" ? value.trim() : "";
  return /^published to github$/i.test(s);
}

export function isAssistantActive(message) {
  return (
    message?.role === "assistant" &&
    ACTIVE_ASSISTANT_STATUSES.has(String(message?.status ?? "").toLowerCase())
  );
}

export function pairBackendCodeChatMessages(messages) {
  const rows = [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (m.role === "user") {
      const next = list[i + 1];
      rows.push({
        user: m,
        assistant: next?.role === "assistant" ? next : null,
      });
      if (next?.role === "assistant") i += 1;
    } else if (m.role === "assistant") {
      rows.push({ user: null, assistant: m });
    }
  }
  return rows;
}

/** Latest in-flight assistant row, if any. */
export function findActiveBackendCodeChatAssistant(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const row = list[i];
    if (isAssistantActive(row)) return row;
  }
  return null;
}

/**
 * Human-readable pipeline label for a running backend code chat turn.
 * @param {object | null | undefined} liveStatus
 * @param {object | null | undefined} message
 */
export function resolveBackendCodeChatTurnLabel(liveStatus, message) {
  const inFlight = isAssistantActive(message);
  const fromLiveRaw =
    typeof liveStatus?.streamPhase === "string" ? liveStatus.streamPhase.trim() : "";
  const fromLive = inFlight && isTerminalPublishStatusLabel(fromLiveRaw) ? "" : fromLiveRaw;
  if (fromLive === "Selecting model…" || /^selecting model/i.test(fromLive)) {
    return "Selecting model…";
  }
  // Only show in-progress / failed publish labels. Succeeded publish from a prior turn on the
  // same Cursor agent must not label a new follow-up as "Published to GitHub".
  const publishPhase =
    typeof liveStatus?.publishStep?.phase === "string"
      ? liveStatus.publishStep.phase.trim().toLowerCase()
      : "";
  const publishLabel =
    typeof liveStatus?.publishStep?.label === "string" ? liveStatus.publishStep.label.trim() : "";
  if (publishLabel && (publishPhase === "pending" || publishPhase === "failed")) {
    return publishLabel;
  }
  if (fromLive) return fromLive;
  const fromMessageRaw = typeof message?.streamPhase === "string" ? message.streamPhase.trim() : "";
  const fromMessage =
    inFlight && isTerminalPublishStatusLabel(fromMessageRaw) ? "" : fromMessageRaw;
  if (fromMessage) return fromMessage;
  // While generating, ignore stale message.reply "Selecting model…" from the router gate.
  const reply = typeof message?.reply === "string" ? message.reply.trim() : "";
  if (!inFlight && (reply === "Selecting model…" || /^selecting model/i.test(reply))) {
    return "Selecting model…";
  }
  let aiSummaryRaw = typeof liveStatus?.aiSummary === "string" ? liveStatus.aiSummary.trim() : "";
  if (!aiSummaryRaw && typeof message?.reply === "string") {
    const fromReply = message.reply.trim();
    // In-flight: do not treat router-gate stub replies as live progress.
    if (
      !inFlight ||
      (fromReply &&
        fromReply !== "Selecting model…" &&
        !/^selecting model/i.test(fromReply) &&
        fromReply !== "Preparing Cursor agent.")
    ) {
      aiSummaryRaw = fromReply;
    }
  }
  const aiSummary = inFlight && isTerminalPublishStatusLabel(aiSummaryRaw) ? "" : aiSummaryRaw;
  if (!inFlight) {
    if (aiSummary && aiSummary !== "Preparing Cursor agent.") return aiSummary;
  } else if (isProgressTurnLabel(aiSummary)) {
    return aiSummary;
  }
  const messageMode = String(message?.mode ?? "")
    .trim()
    .toLowerCase();
  if (inFlight && messageMode === "plan") return DEFAULT_PLAN_TURN_LABEL;
  return DEFAULT_TURN_LABEL;
}

/**
 * Duration from the last CLI stream-json result event, when present.
 * @param {unknown} streamTimeline
 * @returns {number | null}
 */
export function extractCliResultDurationMs(streamTimeline) {
  const items = Array.isArray(streamTimeline) ? streamTimeline : [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item?.type !== "result") continue;
    const ms = Number(item.durationMs);
    if (Number.isFinite(ms) && ms >= 1) return ms;
  }
  return null;
}

/**
 * Label for the parallel-session picker (title · branch · short time when still "New chat").
 * @param {{ title?: string | null, baseBranch?: string | null, updatedAt?: string | Date | null }} session
 */
export function formatBackendCodeChatSessionOptionLabel(session) {
  const title = (session?.title && String(session.title).trim()) || "New chat";
  const branch =
    session?.baseBranch && String(session.baseBranch).trim()
      ? ` · ${String(session.baseBranch).trim()}`
      : "";
  if (title !== "New chat") return `${title}${branch}`;
  const when = formatSessionOptionTime(session?.updatedAt);
  if (when) return `New chat${branch} · ${when}`;
  return `New chat${branch}`;
}

/**
 * @param {string | Date | null | undefined} raw
 */
function formatSessionOptionTime(raw) {
  if (!raw) return "";
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
