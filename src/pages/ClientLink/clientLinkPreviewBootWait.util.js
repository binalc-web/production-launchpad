/** Idle soft-stop wake — mirror clientLinkPreviewRecovery.constants (kept local for test isolation). */
function isPreviewIdleWakeReason(wakeReason) {
  return String(wakeReason || "").trim() === "inactivity";
}

/** Min ms between automatic ensure POSTs during boot (backend limiter: 12/min). */
export const PREVIEW_ENSURE_COOLDOWN_MS = 30_000;

/** Default backoff when ensure returns 429. */
export const PREVIEW_ENSURE_RATE_LIMIT_BACKOFF_MS = 60_000;

/**
 * True while Client Link preview is blocked on `npm install`.
 * @param {{ status?: string, installRunning?: boolean } | null | undefined} st
 */
export function isPreviewInstallInProgress(st) {
  if (!st || typeof st !== "object") return false;
  if (st.installRunning === true) return true;
  return String(st.status || "").toLowerCase() === "installing";
}

/**
 * Dev server / PM2 spawn in progress — port is usually down (502 if probed every tick).
 * @param {{ status?: string, installRunning?: boolean } | null | undefined} st
 */
export function isPreviewSpawnInProgress(st) {
  if (!st || typeof st !== "object") return false;
  if (isPreviewInstallInProgress(st)) return true;
  const status = String(st.status || "").toLowerCase();
  return status === "starting" || status === "restarting";
}

/**
 * Preview boot still in flight — prefer status polling over hammering ensure/embed.
 * @param {{ status?: string, installRunning?: boolean, listening?: boolean } | null | undefined} st
 */
export function isPreviewBootPending(st) {
  if (!st || typeof st !== "object") return false;
  if (isPreviewInstallInProgress(st)) return true;
  if (isPreviewSpawnInProgress(st)) return true;
  if (st.listening === true) return false;
  const status = String(st.status || "").toLowerCase();
  if (status === "ready" || status === "running") return false;
  if (status === "failed") return false;
  return status === "stopped" || status === "starting" || status === "restarting";
}

/**
 * @param {{ error?: string, message?: string, status?: number } | null | undefined} err
 */
export function isPreviewEnsureRateLimitedError(err) {
  if (!err || typeof err !== "object") return false;
  if (Number(err.status) === 429) return true;
  const text = `${err.error || ""} ${err.message || ""}`;
  return /too many requests|slow down and try again/i.test(text);
}

/**
 * @param {number} [retryAfterSec]
 */
export function resolvePreviewEnsureThrottleUntil(retryAfterSec) {
  const sec = Number(retryAfterSec);
  const backoffMs =
    Number.isFinite(sec) && sec > 0
      ? sec * 1000
      : PREVIEW_ENSURE_RATE_LIMIT_BACKOFF_MS;
  return Date.now() + backoffMs;
}

/**
 * @param {number | null | undefined} lastEnsureAt
 * @param {number} [now]
 */
export function canCallPreviewEnsureNow(lastEnsureAt, now = Date.now()) {
  if (!lastEnsureAt || !Number.isFinite(lastEnsureAt)) return true;
  return now - lastEnsureAt >= PREVIEW_ENSURE_COOLDOWN_MS;
}

/**
 * Embed GET probes 502 while deps install or dev server is still spawning.
 * @param {{ status?: string, installRunning?: boolean, listening?: boolean, throttled?: boolean } | null | undefined} st
 * @param {number} [attempt]
 */
export function shouldProbeEmbedDuringBoot(st, attempt = 1) {
  if (st?.throttled === true) return false;
  if (isPreviewInstallInProgress(st)) return false;
  if (isPreviewSpawnInProgress(st) && st?.listening !== true) {
    return Number(attempt) % 4 === 0;
  }
  if (isPreviewBootPending(st) && st?.listening !== true) {
    return Number(attempt) % 3 === 0;
  }
  return true;
}

/**
 * Soft-stopped / still-starting previews may need another ensure — never while install/spawn
 * is in flight and never inside the ensure cooldown window.
 * @param {{ status?: string, installRunning?: boolean, listening?: boolean, wakeReason?: string } | null | undefined} st
 * @param {number} attempt
 * @param {{ lastEnsureAt?: number | null, now?: number }} [opts]
 */
export function shouldReEnsureDuringBoot(st, attempt, opts = {}) {
  if (isPreviewInstallInProgress(st)) return false;
  if (isPreviewSpawnInProgress(st) && st?.listening !== true) return false;
  if (!canCallPreviewEnsureNow(opts.lastEnsureAt, opts.now)) return false;
  if (Number(attempt) % 8 !== 0) return false;
  if (st?.listening === true) return false;
  const status = String(st?.status || "").toLowerCase();
  return (
    status === "stopped" ||
    status === "starting" ||
    isPreviewIdleWakeReason(st?.wakeReason)
  );
}

/**
 * Failed status with a recoverable install/pm2 error.
 * @param {{ status?: string, installRunning?: boolean, error?: string } | null | undefined} st
 * @param {number} attempt
 * @param {{ lastEnsureAt?: number | null, now?: number }} [opts]
 */
export function shouldRetryEnsureAfterFailedStatus(st, attempt, opts = {}) {
  if (isPreviewInstallInProgress(st)) return false;
  if (!canCallPreviewEnsureNow(opts.lastEnsureAt, opts.now)) return false;
  if (String(st?.status || "").toLowerCase() !== "failed") return false;
  if (Number(attempt) > 24) return false;
  return /native binding|rolldown|npm|install|node_modules|SIGINT|pm2/i.test(String(st?.error || ""));
}

/**
 * Status GET is cheap — poll every 4th tick, or every tick while install is running.
 * @param {number} attempt
 * @param {{ status?: string, installRunning?: boolean } | null | undefined} st
 */
export function shouldPollPreviewStatusDuringBoot(attempt, st) {
  if (isPreviewInstallInProgress(st)) return true;
  return Number(attempt) % 4 === 0;
}

/**
 * Delay + traffic policy for one boot wait-loop iteration.
 * @param {{ status?: string, installRunning?: boolean, listening?: boolean, wakeReason?: string, throttled?: boolean } | null | undefined} st
 * @param {number} attempt
 * @param {{ ensureThrottledUntil?: number | null, now?: number }} [opts]
 */
export function nextPreviewBootWaitTick(st, attempt, opts = {}) {
  const now = opts.now ?? Date.now();
  const throttled =
    st?.throttled === true ||
    (Number(opts.ensureThrottledUntil) > 0 && now < Number(opts.ensureThrottledUntil));
  const install = isPreviewInstallInProgress(st);
  const spawnPending = isPreviewSpawnInProgress(st) && st?.listening !== true;

  let delayMs;
  if (throttled) {
    delayMs = Math.max(5000, Number(opts.ensureThrottledUntil) - now);
  } else if (install) {
    delayMs = 5000;
  } else if (spawnPending) {
    delayMs = Number(attempt) <= 4 ? 2000 : Number(attempt) <= 15 ? 3000 : 4000;
  } else if (isPreviewBootPending(st)) {
    delayMs = Number(attempt) <= 4 ? 1500 : Number(attempt) <= 15 ? 2500 : 3500;
  } else {
    delayMs = Number(attempt) <= 4 ? 1000 : Number(attempt) <= 15 ? 2000 : 3000;
  }

  const bootState = throttled ? { ...st, throttled: true } : st;

  return {
    waitInstall: install,
    throttled,
    probeEmbed: shouldProbeEmbedDuringBoot(bootState, attempt),
    pollStatus: shouldPollPreviewStatusDuringBoot(attempt, st),
    reEnsure: !throttled && shouldReEnsureDuringBoot(st, attempt, opts),
    delayMs,
  };
}

/**
 * One auto boot at a time. Manual retry may take over.
 * @param {{ inFlight?: boolean, retry?: boolean }} opts
 */
export function shouldSkipOverlappingPreviewBoot(opts = {}) {
  return Boolean(opts.inFlight) && !opts.retry;
}

/** Interval for passive embed recovery while Start Server card is showing. */
export const PREVIEW_PORT_RECOVERY_PROBE_MS = 8000;
