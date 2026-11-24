/**
 * Wall-clock deadline helper for client-link SSE waits.
 * Kept free of API imports so unit tests can load it under plain node.
 */

/**
 * @param {number} deadlineMs
 * @returns {boolean}
 */
export function isClientLinkWaitDeadlineReached(deadlineMs) {
  return Date.now() >= Number(deadlineMs);
}
