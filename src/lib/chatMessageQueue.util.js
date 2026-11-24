/**
 * User-facing copy for server-persisted chat message queues.
 */

/** @param {{ queued?: boolean } | null | undefined} result */
export function isQueuedChatSendResult(result) {
  return Boolean(result?.queued);
}

/**
 * @param {{ queueStatus?: string | null } | null | undefined} item
 */
export function isDispatchingChatQueueItem(item) {
  return String(item?.queueStatus || "").toLowerCase() === "dispatching";
}

/** Waiting in the queue — not yet sent to the agent. */
export function isWaitingQueuedChatStatus(status) {
  return String(status || "").toLowerCase() === "queued";
}

/** @param {string | null | undefined} status */
export function isOutboundQueuedChatStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "queued" || s === "dispatching";
}

/** Hide the queue card when there is nothing to show — including while a background reload spins. */
export function shouldRenderChatMessageQueuePanel(items) {
  return Array.isArray(items) && items.length > 0;
}

/**
 * Refresh the transcript when a queued prompt starts sending (if the previous
 * turn is no longer live), or the queue empties after dispatch.
 */
export function shouldRefreshTranscriptForQueueChange(
  prevItems,
  nextItems,
  { previousTurnLive = false } = {},
) {
  const prev = Array.isArray(prevItems) ? prevItems : [];
  const next = Array.isArray(nextItems) ? nextItems : [];
  if (prev.length > 0 && next.length === 0) return true;
  if (next.length > 0 && next.length < prev.length) return true;
  const prevDispatching = prev.some(isDispatchingChatQueueItem);
  const nextDispatching = next.some(isDispatchingChatQueueItem);
  if (!prevDispatching && nextDispatching && !previousTurnLive) return true;
  return false;
}

/** Reconnect live SSE after the queue item has been handed to the agent. */
export function shouldReconnectAfterQueueChange(prevItems, nextItems) {
  const prev = Array.isArray(prevItems) ? prevItems : [];
  const next = Array.isArray(nextItems) ? nextItems : [];
  return prev.length > 0 && next.length === 0;
}

export function formatQueuedDispatchingLabel() {
  return "Sending queued message to the agent";
}

/**
 * Cancel raced the server (message already dispatched/cancelled) — treat as gone.
 * @param {unknown} error
 */
export function isChatQueueCancelAlreadyGoneError(error) {
  if (!error || typeof error !== "object") return false;
  const status = Number(
    /** @type {{ response?: { status?: number }, status?: number, statusCode?: number }} */ (error)
      .response?.status ??
      /** @type {{ status?: number }} */ (error).status ??
      /** @type {{ statusCode?: number }} */ (error).statusCode,
  );
  return status === 404;
}

/**
 * @param {{ queuePosition?: number | null, queuedCount?: number | null }} [opts]
 * @returns {string}
 */
export function formatQueuedSendToast({ queuePosition, queuedCount } = {}) {
  const position = Number(queuePosition);
  const count = Number(queuedCount);
  if (Number.isInteger(position) && position > 0 && Number.isInteger(count) && count > 0) {
    return `Message queued (#${position} of ${count}).`;
  }
  if (Number.isInteger(count) && count > 0) {
    return count === 1 ? "Message queued." : `${count} messages in queue.`;
  }
  return "Message queued.";
}
