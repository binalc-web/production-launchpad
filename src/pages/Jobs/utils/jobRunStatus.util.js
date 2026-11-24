/** Max wall-clock time to show a job run as in progress (30 minutes). */
export const JOB_RUN_MAX_RUNTIME_MS = 30 * 60 * 1000;

/**
 * @param {{ startedAt?: string|Date|null, status?: string|null }|null|undefined} run
 * @param {number} [nowMs]
 */
export function isJobRunTimedOut(run, nowMs = Date.now()) {
  if (!run) return false;
  const status = String(run.status ?? "").toUpperCase();
  if (status !== "RUNNING" && status !== "PENDING") return false;
  const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : NaN;
  if (!Number.isFinite(startedAt)) return false;
  return nowMs - startedAt >= JOB_RUN_MAX_RUNTIME_MS;
}

/**
 * True when a job run is still in progress and within the max runtime window.
 * @param {{ status?: string|null, startedAt?: string|Date|null }|string|null|undefined} runOrStatus
 */
export function isRunInProgress(runOrStatus) {
  if (runOrStatus != null && typeof runOrStatus === "object") {
    const status = String(runOrStatus.status ?? "").toUpperCase();
    if (status !== "RUNNING" && status !== "PENDING") return false;
    return !isJobRunTimedOut(runOrStatus);
  }
  const normalized = String(runOrStatus ?? "").toUpperCase();
  return normalized === "RUNNING" || normalized === "PENDING";
}

/**
 * Effective status for UI when a RUNNING row exceeded the timeout (before API reconcile).
 * @param {{ status?: string|null, startedAt?: string|Date|null }|null|undefined} run
 */
export function effectiveJobRunStatus(run) {
  const status = String(run?.status ?? "").toUpperCase();
  if (isJobRunTimedOut(run)) return "FAILED";
  return status;
}
