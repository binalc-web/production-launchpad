/**
 * Persist the active /chat (Ai Home) thread in the URL so a reload restores
 * the same conversation instead of an empty composer.
 */

export const ASSISTANT_THREAD_PARAM = "threadId";

/**
 * @param {URLSearchParams | { get?: (k: string) => string|null } | null | undefined} searchParams
 * @returns {string|null}
 */
export function readAssistantThreadIdFromSearchParams(searchParams) {
  if (!searchParams || typeof searchParams.get !== "function") return null;
  const raw = searchParams.get(ASSISTANT_THREAD_PARAM);
  const id = typeof raw === "string" ? raw.trim() : "";
  return id || null;
}

/**
 * @param {URLSearchParams} prev
 * @param {string|null|undefined} threadId
 * @returns {URLSearchParams}
 */
export function applyAssistantThreadIdToSearchParams(prev, threadId) {
  const next = new URLSearchParams(prev);
  const tid = typeof threadId === "string" ? threadId.trim() : "";
  if (!tid) {
    next.delete(ASSISTANT_THREAD_PARAM);
    return next;
  }
  next.set(ASSISTANT_THREAD_PARAM, tid);
  return next;
}

/**
 * @param {URLSearchParams | { get?: (k: string) => string|null } | null | undefined} prev
 * @param {string|null|undefined} threadId
 * @returns {boolean}
 */
export function assistantThreadSearchParamMatches(prev, threadId) {
  const tid = typeof threadId === "string" ? threadId.trim() : "";
  const current =
    prev && typeof prev.get === "function" ? readAssistantThreadIdFromSearchParams(prev) : null;
  if (!tid) return !current;
  return current === tid;
}
