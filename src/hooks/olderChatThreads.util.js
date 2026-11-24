/**
 * @param {unknown} err
 * @param {string} fallback
 */
export function resolveOlderChatError(err, fallback) {
  return (typeof err === "object" && err?.error) || err?.message || fallback;
}

/**
 * @param {{ messages?: Array<object> } | null | undefined} data
 */
export function parseArchivedThreadMessages(data) {
  return Array.isArray(data?.messages) ? data.messages : [];
}

/**
 * @param {Array<object>} messages
 */
export function archivedThreadEmptyMessage(messages) {
  return messages.length === 0 ? "No messages found for this older chat." : "";
}
