const DEFAULT_POLL_MS = 800;
const MAX_EXPORT_WAIT_MS = 30 * 60 * 1000;

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function qaExportStatusLabel(status) {
  if (status && typeof status === "object" && typeof status.message === "string") {
    const trimmed = status.message.trim();
    if (trimmed) return trimmed;
  }
  return "Preparing download…";
}

/**
 * @param {{
 *   projectId: number,
 *   exportId: string,
 *   fetchStatus: (projectId: number, exportId: string) => Promise<unknown>,
 *   onProgress?: (status: unknown) => void,
 *   pollMs?: number,
 *   maxWaitMs?: number,
 * }} opts
 */
export async function pollQaTestsExportUntilReady({
  projectId,
  exportId,
  fetchStatus,
  onProgress,
  pollMs = DEFAULT_POLL_MS,
  maxWaitMs = MAX_EXPORT_WAIT_MS,
}) {
  const started = Date.now();
  /** @type {unknown} */
  let lastStatus = null;

  while (Date.now() - started < maxWaitMs) {
    // eslint-disable-next-line no-await-in-loop
    lastStatus = await fetchStatus(projectId, exportId);
    onProgress?.(lastStatus);

    const row = /** @type {{ status?: string, error?: string, message?: string }} */ (lastStatus);
    if (row.status === "ready") {
      return lastStatus;
    }
    if (row.status === "failed") {
      throw {
        error: row.error || row.message || "Export failed",
      };
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(pollMs);
  }

  throw {
    error:
      "Export is taking longer than expected. It may still be running on the server — wait a minute and try again.",
  };
}

/**
 * Trigger a browser download from a presigned URL without re-fetching through the app.
 * @param {string} url
 * @param {string} filename
 */
export function triggerQaExportPresignedDownload(url, filename) {
  const href = String(url || "").trim();
  if (!href) return;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.rel = "noopener";
  if (filename) anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * @param {string} url
 * @returns {Promise<Blob>}
 */
export async function fetchQaExportBlobFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw { error: "Could not download the export file." };
  }
  return response.blob();
}
