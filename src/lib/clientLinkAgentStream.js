import { consumeClientLinkAgentStream } from "@/api";
import { abortableSleep } from "@/lib/generationManager";
import {
  shouldIgnoreClientLinkStreamEvent,
  statusFromClientLinkStreamEvent,
} from "@/lib/clientLinkAgentStreamEvent.util.js";
import { isClientLinkWaitDeadlineReached } from "@/lib/clientLinkWaitDeadline.util.js";

export { shouldIgnoreClientLinkStreamEvent, statusFromClientLinkStreamEvent };
export { isClientLinkWaitDeadlineReached };

function reconnectDelayMs(attempt) {
  return Math.min(30_000, 1000 * Math.min(attempt, 6));
}

/**
 * Long-lived SSE subscription; reconnects until `signal` aborts.
 * @param {{ slug: string, releaseId: number, onStatus?: (status: object, evt: object) => void | Promise<void>, signal?: AbortSignal }} opts
 */
export async function watchClientLinkAgentStream({
  slug,
  releaseId,
  onStatus,
  signal,
  clientEmail,
}) {
  const safeSlug = String(slug || "").trim();
  const rid = Number(releaseId);
  if (!safeSlug || !Number.isInteger(rid) || rid < 1) return;

  let reconnectAttempt = 0;
  while (!signal?.aborted) {
    try {
      await consumeClientLinkAgentStream(safeSlug, rid, {
        signal,
        clientEmail,
        onEvent: async (evt) => {
          if (signal?.aborted) return true;
          if (shouldIgnoreClientLinkStreamEvent(evt)) return false;
          const st = statusFromClientLinkStreamEvent(evt);
          if (st) {
            await onStatus?.(st, evt);
          }
          return false;
        },
      });
      if (signal?.aborted) return;
    } catch (err) {
      if (err?.name === "AbortError" || signal?.aborted) return;
      reconnectAttempt += 1;
      try {
        await abortableSleep(reconnectDelayMs(reconnectAttempt), signal);
      } catch {
        return;
      }
    }
  }
}

/**
 * Wait until `predicate(status)` is true or timeout. Uses SSE push (no HTTP poll loop).
 * Honors `timeoutMs` mid-stream (aborts the open SSE) so a long busy stream cannot hang forever.
 * @param {{ slug: string, releaseId: number, predicate: (status: object, evt?: object) => boolean | Promise<boolean>, timeoutMs?: number, signal?: AbortSignal }} opts
 * @returns {Promise<boolean>} true when predicate matched
 */
export async function waitForClientLinkAgentCondition({
  slug,
  releaseId,
  predicate,
  timeoutMs = 20_000,
  signal,
  clientEmail,
}) {
  const safeSlug = String(slug || "").trim();
  const rid = Number(releaseId);
  if (!safeSlug || !Number.isInteger(rid) || rid < 1) return false;

  const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
  const deadlineAbort = new AbortController();
  const onParentAbort = () => {
    try {
      deadlineAbort.abort();
    } catch {
      /* ignore */
    }
  };
  if (signal) {
    if (signal.aborted) return false;
    signal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timeoutId = setTimeout(onParentAbort, Math.max(0, deadline - Date.now()));

  try {
    let reconnectAttempt = 0;
    while (!isClientLinkWaitDeadlineReached(deadline) && !deadlineAbort.signal.aborted) {
      try {
        let matched = false;
        await consumeClientLinkAgentStream(safeSlug, rid, {
          signal: deadlineAbort.signal,
          clientEmail,
          onEvent: async (evt) => {
            if (isClientLinkWaitDeadlineReached(deadline) || deadlineAbort.signal.aborted) {
              onParentAbort();
              return true;
            }
            if (shouldIgnoreClientLinkStreamEvent(evt)) return false;
            const st = statusFromClientLinkStreamEvent(evt);
            if (!st) return false;
            if (await predicate(st, evt)) {
              matched = true;
              return true;
            }
            if (isClientLinkWaitDeadlineReached(deadline)) {
              onParentAbort();
              return true;
            }
            return false;
          },
        });
        if (matched) return true;
        if (signal?.aborted || isClientLinkWaitDeadlineReached(deadline)) return false;
      } catch (err) {
        if (err?.name === "AbortError" || deadlineAbort.signal.aborted) {
          return false;
        }
        reconnectAttempt += 1;
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        try {
          await abortableSleep(
            Math.min(remaining, reconnectDelayMs(reconnectAttempt)),
            deadlineAbort.signal,
          );
        } catch {
          return false;
        }
      }
    }
    return false;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onParentAbort);
    }
  }
}
