/** How long users are told to wait after prepare-to-deploy starts. */
export const PLATFORM_DEPLOY_RETURN_WINDOW_MS = 10 * 60 * 1000;

export const PLATFORM_DEPLOY_RETURN_SOON_MESSAGE = "The platform should be back real soon.";

/**
 * Milliseconds left in the ten-minute return window.
 * Null when the start time is missing or invalid.
 * @param {string|null|undefined} sinceIso
 * @param {number} [nowMs]
 * @returns {number|null}
 */
export function platformDeployReturnRemainingMs(sinceIso, nowMs = Date.now()) {
  const started = Date.parse(sinceIso || "");
  if (!Number.isFinite(started)) return null;
  const elapsed = Math.max(0, nowMs - started);
  return Math.max(0, PLATFORM_DEPLOY_RETURN_WINDOW_MS - elapsed);
}

/**
 * @param {number} remainingMs
 * @returns {string}
 */
export function formatPlatformDeployCountdown(remainingMs) {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/**
 * User-facing return estimate. Zero remaining means the window elapsed and the platform is still down.
 * @param {string|null|undefined} sinceIso
 * @param {number} [nowMs]
 * @returns {string|null}
 */
export function platformDeployReturnMessage(sinceIso, nowMs = Date.now()) {
  const remaining = platformDeployReturnRemainingMs(sinceIso, nowMs);
  if (remaining == null) return null;
  if (remaining <= 0) return PLATFORM_DEPLOY_RETURN_SOON_MESSAGE;
  return `The platform should be back in ${formatPlatformDeployCountdown(remaining)}.`;
}

/**
 * Coarser phrase for screen readers so the clock does not announce every second.
 * @param {string|null|undefined} sinceIso
 * @param {number} [nowMs]
 * @returns {string|null}
 */
export function platformDeployReturnSpokenMessage(sinceIso, nowMs = Date.now()) {
  const remaining = platformDeployReturnRemainingMs(sinceIso, nowMs);
  if (remaining == null) return null;
  if (remaining <= 0) return PLATFORM_DEPLOY_RETURN_SOON_MESSAGE;
  const minutes = Math.max(1, Math.ceil(remaining / 60_000));
  const unit = minutes === 1 ? "minute" : "minutes";
  return `The platform should be back in ${minutes} ${unit}.`;
}
