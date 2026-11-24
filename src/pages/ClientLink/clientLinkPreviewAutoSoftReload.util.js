/** Initial delay before the first auto heal attempt (blank after gate). */
export const PREVIEW_AUTO_SOFT_RELOAD_DELAY_MS = 8000;

/** Max automatic soft-reload / ensure / remount attempts per preview session. */
export const PREVIEW_AUTO_HEAL_MAX_ATTEMPTS = 3;

/** Backoff between heal attempts (index 0 = first delay). */
export const PREVIEW_AUTO_HEAL_DELAYS_MS = [8000, 12000, 20000];

/**
 * @param {number} attemptIndex zero-based count of attempts already made
 * @returns {number}
 */
export function getAutoHealDelayMs(attemptIndex) {
  const i = Math.max(0, Math.floor(Number(attemptIndex) || 0));
  const delays = PREVIEW_AUTO_HEAL_DELAYS_MS;
  return delays[Math.min(i, delays.length - 1)];
}

/**
 * Whether Client Link should fire an automatic soft reload / heal.
 * Supports bounded multi-attempt heal for blank embeds and port_unreachable.
 * @param {{
 *   gateOpen: boolean,
 *   previewIframeReady: boolean,
 *   previewBootFailed: boolean,
 *   hasFailureDiagnosis: boolean,
 *   alreadyAttempted?: boolean,
 *   attemptCount?: number,
 *   maxAttempts?: number,
 *   blankOrBroken: boolean,
 *   portUnreachable?: boolean,
 *   previewRefreshBusy?: boolean,
 *   nextInAppCompiling?: boolean,
 * }} opts
 */
export function shouldAttemptAutoSoftReload(opts) {
  if (opts.previewRefreshBusy) return false;
  if (opts.nextInAppCompiling) return false;

  const attemptCount = Math.max(0, Math.floor(Number(opts.attemptCount) || 0));
  const maxAttempts =
    Number(opts.maxAttempts) > 0
      ? Math.floor(Number(opts.maxAttempts))
      : PREVIEW_AUTO_HEAL_MAX_ATTEMPTS;

  // Legacy one-shot API: `alreadyAttempted` without attemptCount.
  if (opts.alreadyAttempted === true && opts.attemptCount == null && opts.maxAttempts == null) {
    return false;
  }
  if (attemptCount >= maxAttempts) return false;

  if (opts.previewIframeReady) return false;
  if (opts.previewBootFailed) return false;

  // Port-down: heal even when a failure diagnosis is showing (Start Server card).
  if (opts.portUnreachable) return true;

  if (!opts.gateOpen) return false;
  if (opts.hasFailureDiagnosis) return false;
  if (!opts.blankOrBroken) return false;
  return true;
}
