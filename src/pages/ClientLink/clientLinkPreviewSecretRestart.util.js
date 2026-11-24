/**
 * Pure helpers for the secret Reload-preview triple-click → force npm restart gesture.
 */

/** Clicks within this window count toward a force restart. */
export const SECRET_RESTART_CLICK_WINDOW_MS = 1000;

/** Wait this long after the last click (< 3) before firing normal soft/boot reload. */
export const SECRET_RESTART_SOFT_DELAY_MS = 350;

/** Clicks needed within the window to force-restart the preview process. */
export const SECRET_RESTART_CLICK_COUNT = 3;

/**
 * @typedef {'wait' | 'soft' | 'forceRestart'} SecretRestartAction
 * @typedef {{ times: number[] }} SecretRestartClickState
 * @typedef {{ action: SecretRestartAction, state: SecretRestartClickState }} SecretRestartClickResult
 */

/**
 * @param {SecretRestartClickState} [state]
 * @returns {SecretRestartClickState}
 */
export function createSecretRestartClickState(state) {
  return { times: Array.isArray(state?.times) ? [...state.times] : [] };
}

/**
 * Record a Reload-preview click and decide whether to wait, soft-reload, or force-restart.
 * @param {SecretRestartClickState} state
 * @param {number} [nowMs]
 * @param {{
 *   windowMs?: number,
 *   softDelayMs?: number,
 *   clickCount?: number,
 * }} [opts]
 * @returns {SecretRestartClickResult}
 */
export function recordSecretRestartClick(state, nowMs = Date.now(), opts = {}) {
  const windowMs =
    Number.isFinite(opts.windowMs) && opts.windowMs > 0
      ? opts.windowMs
      : SECRET_RESTART_CLICK_WINDOW_MS;
  const clickCount =
    Number.isInteger(opts.clickCount) && opts.clickCount > 0
      ? opts.clickCount
      : SECRET_RESTART_CLICK_COUNT;
  const now = Number(nowMs) || 0;
  const prev = createSecretRestartClickState(state);
  const cutoff = now - windowMs;
  const times = prev.times.filter((t) => Number(t) > cutoff);
  times.push(now);

  if (times.length >= clickCount) {
    return { action: "forceRestart", state: createSecretRestartClickState() };
  }

  // Defer soft so more clicks can still form a triple within the window.
  return { action: "wait", state: createSecretRestartClickState({ times }) };
}

/**
 * After soft delay elapses for the last click batch: soft if still pending, else ignore.
 * @param {SecretRestartClickState} state
 * @param {number} [nowMs]
 * @param {{ windowMs?: number }} [opts]
 * @returns {{ action: 'soft' | 'none', state: SecretRestartClickState }}
 */
export function resolveSecretRestartSoftAfterDelay(state, nowMs = Date.now(), opts = {}) {
  const windowMs =
    Number.isFinite(opts.windowMs) && opts.windowMs > 0
      ? opts.windowMs
      : SECRET_RESTART_CLICK_WINDOW_MS;
  const now = Number(nowMs) || 0;
  const prev = createSecretRestartClickState(state);
  const cutoff = now - windowMs;
  const times = prev.times.filter((t) => Number(t) > cutoff);
  if (times.length === 0) {
    return { action: "none", state: createSecretRestartClickState() };
  }
  // Soft once for 1–2 clicks; flush state so extra delayed timers no-op.
  return { action: "soft", state: createSecretRestartClickState() };
}
