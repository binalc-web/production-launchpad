/** @param {number} ms */
export function formatAgentTurnElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** @param {string | Date | null | undefined} value */
export function parseTimestampMs(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Resolve wall-clock anchor for the agent-turn elapsed timer.
 * @param {{
 *   current?: number | null,
 *   requestStartedAt?: number | null,
 *   lastUserMessageCreatedAt?: string | Date | null,
 * }} params
 * @returns {number}
 */
export function resolveAgentTurnStartedAtMs({
  current = null,
  requestStartedAt = null,
  lastUserMessageCreatedAt = null,
} = {}) {
  if (current != null && Number.isFinite(current)) {
    return current;
  }
  if (requestStartedAt != null && Number.isFinite(requestStartedAt)) {
    return requestStartedAt;
  }
  const fromMessage = parseTimestampMs(lastUserMessageCreatedAt);
  if (fromMessage != null) {
    return fromMessage;
  }
  return Date.now();
}

/**
 * Status chip text: "Agent is working… · Composer 2.5 · 0:55".
 * @param {{ label?: string, model?: string, elapsed?: string }} params
 * @returns {string}
 */
export function buildAgentProgressStatusLine({ label = "", model = "", elapsed = "" } = {}) {
  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  const trimmedModel = typeof model === "string" ? model.trim() : "";
  const trimmedElapsed = typeof elapsed === "string" ? elapsed.trim() : "";
  return [trimmedLabel, trimmedModel, trimmedElapsed].filter(Boolean).join(" · ");
}
