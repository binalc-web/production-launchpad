/**
 * Parse client-link agent SSE events into status snapshots.
 */

/** @param {Record<string, unknown> | null | undefined} evt */
export function statusFromClientLinkStreamEvent(evt) {
  if (!evt || typeof evt !== "object") return null;
  if (evt.type === "generation_started") {
    if (evt.status && typeof evt.status === "object") return evt.status;
    const requestId = typeof evt.requestId === "string" ? evt.requestId.trim() : "";
    if (!requestId) return null;
    return {
      generationRequestId: requestId,
      generationState: "running",
      busy: true,
    };
  }
  if (
    evt.type === "connected" ||
    evt.type === "terminal" ||
    evt.type === "snapshot" ||
    evt.type === "update"
  ) {
    const st = evt.status;
    return st && typeof st === "object" ? st : null;
  }
  return null;
}

/** @param {Record<string, unknown> | null | undefined} evt */
export function shouldIgnoreClientLinkStreamEvent(evt) {
  return evt?.type === "heartbeat";
}
