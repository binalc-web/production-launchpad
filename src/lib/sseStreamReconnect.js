import { isAbortError } from "./abortError.util.js";

/**
 * Delay helper for SSE reconnect backoff; rejects with AbortError when `signal` aborts.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Run an SSE consumer with exponential backoff reconnect when the stream ends
 * without a terminal event (e.g. proxy timeout). Recent events replay on reconnect.
 *
 * @param {{
 *   connect: (handlers: { onEvent: (evt: object) => void, signal?: AbortSignal }) => Promise<object|null|undefined>,
 *   onEvent: (evt: object) => void,
 *   signal?: AbortSignal,
 *   maxAttempts?: number,
 *   baseDelayMs?: number,
 * }} opts
 * @returns {Promise<object|null|undefined>} terminal event payload, if any
 */
export async function runSseWithReconnect({
  connect,
  onEvent,
  signal,
  maxAttempts = 6,
  baseDelayMs = 1000,
}) {
  let terminalResult = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) return terminalResult;

    try {
      const result = await connect({
        signal,
        onEvent: (evt) => {
          onEvent(evt);
          if (evt?.type === "terminal") {
            terminalResult = evt;
          }
        },
      });

      if (terminalResult || result?.type === "terminal") {
        return terminalResult ?? result;
      }

      if (signal?.aborted) return terminalResult;
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return terminalResult;
      if (attempt >= maxAttempts - 1) throw err;
    }

    if (attempt < maxAttempts - 1) {
      const backoffMs = baseDelayMs * 2 ** attempt;
      try {
        await delay(backoffMs, signal);
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) return terminalResult;
        throw err;
      }
    }
  }

  throw new Error("Live connection lost");
}
