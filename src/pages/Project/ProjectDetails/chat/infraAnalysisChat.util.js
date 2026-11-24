const ACTIVE_ASSISTANT_STATUSES = new Set([
  "pending",
  "previewing",
  "awaiting_confirmation",
  "generating",
]);

export function isInfraAnalysisAssistantActive(message) {
  return (
    message?.role === "assistant" &&
    ACTIVE_ASSISTANT_STATUSES.has(String(message?.status ?? "").toLowerCase())
  );
}

/** True when a Cursor agent is actively running (not awaiting user confirmation). */
export function isInfraAnalysisAgentRunning(message) {
  const status = String(message?.status ?? "").toLowerCase();
  return (
    message?.role === "assistant" &&
    (status === "pending" || status === "previewing" || status === "generating")
  );
}

export function isAwaitingInfraAnalysisConfirmation(message) {
  return (
    message?.role === "assistant" &&
    String(message?.status ?? "").toLowerCase() === "awaiting_confirmation" &&
    String(message?.confirmationStatus ?? "").toLowerCase() === "awaiting_confirmation"
  );
}

export function findPendingInfraAnalysisConfirmationMessage(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.find(isAwaitingInfraAnalysisConfirmation) ?? null;
}

export function pairInfraAnalysisChatMessages(messages) {
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
