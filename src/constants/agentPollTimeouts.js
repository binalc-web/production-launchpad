/**
 * Client-side agent status polling. Keep at or below backend
 * `CURSOR_AGENT_POLL_MAX_RUNTIME_MS` (default 3 hours).
 * Default matches the backend wall-clock so the UI does not hard-fail at ~55m
 * while the agent is still running (common 40–66 min report class).
 * Set `VITE_AGENT_UI_POLL_MAX_MS` to `0` or `-1` for uncapped UI polling.
 */

const DEFAULT_UI_AGENT_POLL_MAX_MS = 3 * 60 * 60 * 1000;

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** @returns {number} Cap in ms, or `0` when uncapped. */
function parsePollMaxMs(raw, fallback) {
  const n = Number(raw);
  if (n === 0 || n === -1) return 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Max time the UI waits on agent status before showing a timeout message (`0` = uncapped). */
export const AGENT_UI_POLL_MAX_MS = parsePollMaxMs(
  import.meta.env.VITE_AGENT_UI_POLL_MAX_MS,
  DEFAULT_UI_AGENT_POLL_MAX_MS,
);

/** Whether UI agent status polling has no wall-clock cap. */
export function isAgentUiPollUncapped(maxMs = AGENT_UI_POLL_MAX_MS) {
  return !Number.isFinite(Number(maxMs)) || Number(maxMs) <= 0;
}

/**
 * Keep polling until terminal / caller breaks when uncapped.
 * @param {number} startedAtMs
 * @param {number} [maxMs]
 * @param {number} [nowMs]
 */
export function shouldContinueAgentUiPoll(
  startedAtMs,
  maxMs = AGENT_UI_POLL_MAX_MS,
  nowMs = Date.now(),
) {
  if (isAgentUiPollUncapped(maxMs)) return true;
  return nowMs - startedAtMs < maxMs;
}

const DEFAULT_AGENT_STATUS_FETCH_TIMEOUT_MS = 30_000;

/** Per-request timeout for GET agent-status (avoids hung XHRs saturating the connection pool). */
export const AGENT_STATUS_FETCH_TIMEOUT_MS = parsePositiveInt(
  import.meta.env.VITE_AGENT_STATUS_FETCH_TIMEOUT_MS,
  DEFAULT_AGENT_STATUS_FETCH_TIMEOUT_MS,
);
