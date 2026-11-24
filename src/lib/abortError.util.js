/**
 * Pure AbortError detector (no axios) for SSE / fetch teardown paths.
 * Includes Chrome's `AbortError: signal is aborted without reason`.
 * @param {unknown} error
 */
export function isAbortError(error) {
  if (error == null) return false;
  if (typeof error === "string") {
    const m = error.toLowerCase();
    return m.includes("aborted") || m.includes("canceled") || m.includes("cancelled");
  }
  if (typeof error !== "object") return false;
  if (error.code === "ERR_CANCELED" || error.code === 20) return true;
  if (error.name === "CanceledError" || error.name === "AbortError") return true;
  const message = String(error.message ?? "").toLowerCase();
  return (
    message.includes("aborted") ||
    message.includes("canceled") ||
    message.includes("cancelled") ||
    message.includes("the user aborted a request")
  );
}
