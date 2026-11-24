const DEFAULT_POLL_MS = 800;
const MAX_EXPORT_PR_WAIT_MS = 30 * 60 * 1000;

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {string | null | undefined} prUrl
 * @param {number | null | undefined} prNumber
 * @returns {number | null}
 */
export function parseQaExportPrNumber(prUrl, prNumber) {
  if (Number.isInteger(prNumber) && Number(prNumber) > 0) return Number(prNumber);
  const match = String(prUrl || "").match(/\/pull\/(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function qaExportPrStatusLabel(status) {
  if (status && typeof status === "object" && typeof status.message === "string") {
    const trimmed = status.message.trim();
    if (trimmed) return trimmed;
  }
  return "Preparing…";
}

/**
 * @param {{
 *   projectId: number,
 *   jobId: string,
 *   fetchStatus: (projectId: number, jobId: string) => Promise<unknown>,
 *   onProgress?: (status: unknown) => void,
 *   pollMs?: number,
 *   maxWaitMs?: number,
 * }} opts
 */
export async function pollQaExportPrUntilReady({
  projectId,
  jobId,
  fetchStatus,
  onProgress,
  pollMs = DEFAULT_POLL_MS,
  maxWaitMs = MAX_EXPORT_PR_WAIT_MS,
}) {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    // eslint-disable-next-line no-await-in-loop
    const lastStatus = await fetchStatus(projectId, jobId);
    onProgress?.(lastStatus);

    const row = /** @type {{ status?: string, error?: string, message?: string }} */ (lastStatus);
    if (row.status === "ready") {
      return lastStatus;
    }
    if (row.status === "failed") {
      throw {
        error: row.error || row.message || "Export PR failed",
      };
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(pollMs);
  }

  throw {
    error:
      "Export PR is taking longer than expected. Wait a minute and try again.",
  };
}
