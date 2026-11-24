/**
 * Client-side registry for cancellable AI generations (Client Link chat, sheets, etc.).
 */

/** @type {Map<string, { controller: AbortController, releaseId: number | null, slug: string | null, startedAt: number }>} */
const activeByRequestId = new Map();

/** @type {Map<string, string>} releaseKey → requestId */
const activeByReleaseKey = new Map();

/** @type {Set<(event: { type: string, requestId?: string }) => void>} */
const listeners = new Set();

function releaseKey(slug, releaseId) {
  return `${String(slug || "").trim()}:${Number(releaseId)}`;
}

function notify(event) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ requestId: string, releaseId?: number | null, slug?: string | null }} params
 * @returns {{ signal: AbortSignal, requestId: string }}
 */
export function startGeneration({ requestId, releaseId = null, slug = null }) {
  const reqId = typeof requestId === "string" ? requestId.trim() : "";
  if (!reqId) {
    throw new Error("requestId is required");
  }

  const prevForRelease =
    releaseId != null && slug
      ? activeByReleaseKey.get(releaseKey(slug, releaseId))
      : null;
  if (prevForRelease && prevForRelease !== reqId) {
    stopGeneration(prevForRelease);
  }

  const controller = new AbortController();
  activeByRequestId.set(reqId, {
    controller,
    releaseId: releaseId != null ? Number(releaseId) : null,
    slug: slug != null ? String(slug).trim() : null,
    startedAt: Date.now(),
  });
  if (releaseId != null && slug) {
    activeByReleaseKey.set(releaseKey(slug, releaseId), reqId);
  }

  notify({ type: "start", requestId: reqId });
  return { signal: controller.signal, requestId: reqId };
}

/**
 * @param {string} requestId
 * @returns {boolean}
 */
export function stopGeneration(requestId) {
  const reqId = typeof requestId === "string" ? requestId.trim() : "";
  if (!reqId) return false;
  const entry = activeByRequestId.get(reqId);
  if (!entry) return false;

  entry.controller.abort();
  activeByRequestId.delete(reqId);
  if (entry.slug && entry.releaseId != null) {
    const key = releaseKey(entry.slug, entry.releaseId);
    if (activeByReleaseKey.get(key) === reqId) {
      activeByReleaseKey.delete(key);
    }
  }
  notify({ type: "stop", requestId: reqId });
  return true;
}

/**
 * @param {string} requestId
 */
export function isCurrent(requestId) {
  const reqId = typeof requestId === "string" ? requestId.trim() : "";
  return Boolean(reqId && activeByRequestId.has(reqId));
}

/**
 * @param {string} slug
 * @param {number} releaseId
 */
export function getActiveForRelease(slug, releaseId) {
  const reqId = activeByReleaseKey.get(releaseKey(slug, releaseId));
  if (!reqId) return null;
  const entry = activeByRequestId.get(reqId);
  if (!entry) return null;
  return { requestId: reqId, signal: entry.controller.signal };
}

/**
 * @param {string} requestId
 */
export function getSignal(requestId) {
  const reqId = typeof requestId === "string" ? requestId.trim() : "";
  return activeByRequestId.get(reqId)?.controller.signal ?? null;
}

/**
 * @param {string} requestId
 * @returns {number | null}
 */
export function getGenerationStartedAt(requestId) {
  const reqId = typeof requestId === "string" ? requestId.trim() : "";
  const startedAt = activeByRequestId.get(reqId)?.startedAt;
  return startedAt != null && Number.isFinite(startedAt) ? startedAt : null;
}

/**
 * @param {(event: { type: string, requestId?: string }) => void} listener
 * @returns {() => void}
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
export function abortableSleep(ms, signal) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Align local cancel/poll tracking with the server-issued request id from POST /followup.
 * @param {{ localRequestId?: string | null, serverRequestId: string, releaseId?: number | null, slug?: string | null }} params
 */
export function syncGenerationRequestId({
  localRequestId = null,
  serverRequestId,
  releaseId = null,
  slug = null,
}) {
  const server = typeof serverRequestId === "string" ? serverRequestId.trim() : "";
  if (!server) {
    throw new Error("serverRequestId is required");
  }
  const local =
    typeof localRequestId === "string" ? localRequestId.trim() : "";
  if (local && local !== server) {
    stopGeneration(local);
  }
  if (isCurrent(server)) {
    return {
      requestId: server,
      signal: getSignal(server),
    };
  }
  return startGeneration({ requestId: server, releaseId, slug });
}
