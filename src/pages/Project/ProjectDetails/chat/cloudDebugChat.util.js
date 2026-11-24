import { extractCliResultDurationMs, isProgressTurnLabel } from "./backendCodeChat.util";

const ACTIVE_ASSISTANT_STATUSES = new Set(["pending", "generating"]);

const DEFAULT_TURN_LABEL = "Investigating issue…";

export function isAssistantActive(message) {
  return (
    message?.role === "assistant" &&
    ACTIVE_ASSISTANT_STATUSES.has(String(message?.status ?? "").toLowerCase())
  );
}

export function pairCloudDebugChatMessages(messages) {
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

export function findActiveCloudDebugChatAssistant(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const row = list[i];
    if (isAssistantActive(row)) return row;
  }
  return null;
}

export function resolveCloudDebugChatTurnLabel(liveStatus, message) {
  const fromLive = typeof liveStatus?.streamPhase === "string" ? liveStatus.streamPhase.trim() : "";
  if (fromLive === "Selecting model…" || /^selecting model/i.test(fromLive)) {
    return "Selecting model…";
  }
  if (fromLive) return fromLive;
  const fromMessage = typeof message?.streamPhase === "string" ? message.streamPhase.trim() : "";
  if (fromMessage) return fromMessage;
  const reply = typeof message?.reply === "string" ? message.reply.trim() : "";
  if (reply === "Selecting model…" || /^selecting model/i.test(reply)) {
    return "Selecting model…";
  }
  const inFlight = isAssistantActive(message);
  const aiSummary =
    typeof liveStatus?.aiSummary === "string"
      ? liveStatus.aiSummary.trim()
      : typeof message?.reply === "string"
        ? message.reply.trim()
        : "";
  if (!inFlight) {
    if (aiSummary && aiSummary !== "Preparing Cursor agent.") return aiSummary;
  } else if (isProgressTurnLabel(aiSummary)) {
    return aiSummary;
  }
  return DEFAULT_TURN_LABEL;
}

export { extractCliResultDurationMs };
