/**
 * Single shared notifications SSE for the whole browser profile.
 *
 * Without this, every tab (and every useNotifications mount) opens its own long-lived
 * fetch to /api/notifications/stream. On HTTP/1.1 that quickly exhausts Chrome's
 * 6-connection-per-origin pool and freezes all LaunchPad tabs.
 *
 * Leader tab (Web Locks) owns the SSE and fans out via BroadcastChannel; other tabs
 * only listen. Within a tab, multiple subscribers share one local fan-out.
 */

import { consumeNotificationsStream } from "@/api";
import { logger } from "@/utils/logger";
import { isAbortError } from "@/lib/abortError.util";

const LOCK_NAME = "launchpad-notifications-sse";
const CHANNEL_NAME = "launchpad-notifications-sse";
const BC_EVENT = "notification_sse";

/** @type {Set<(evt: object) => void>} */
const localListeners = new Set();

/** @type {BroadcastChannel | null} */
let channel = null;

/** @type {AbortController | null} */
let sessionAbort = null;

/** @type {Promise<void> | null} */
let sessionPromise = null;

function getChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (msg) => {
      const data = msg?.data;
      if (!data || data.type !== BC_EVENT || !data.evt) return;
      dispatchLocal(data.evt);
    };
  }
  return channel;
}

function dispatchLocal(evt) {
  for (const cb of localListeners) {
    try {
      cb(evt);
    } catch {
      /* ignore subscriber errors */
    }
  }
}

function fanOut(evt) {
  if (!evt || typeof evt !== "object") return;
  dispatchLocal(evt);
  try {
    getChannel()?.postMessage({ type: BC_EVENT, evt });
  } catch {
    /* ignore */
  }
}

async function runLeaderStream(signal) {
  let delayMs = 1000;
  while (!signal.aborted) {
    try {
      await consumeNotificationsStream({
        signal,
        onEvent: (evt) => {
          fanOut(evt);
        },
      });
    } catch (err) {
      if (signal.aborted || isAbortError(err)) return;
      logger.warn("notifications_sse_reconnect", err?.message || err);
    }
    if (signal.aborted) return;
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(delayMs * 2, 30_000);
  }
}

/**
 * Become (or wait to become) the sole SSE owner for this origin profile.
 * Falls back to per-tab SSE when Web Locks are unavailable.
 */
async function holdLeaderAndStream(signal) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    try {
      await navigator.locks.request(LOCK_NAME, { signal }, async () => {
        await runLeaderStream(signal);
      });
      return;
    } catch (err) {
      if (signal.aborted || isAbortError(err)) return;
      logger.warn("notifications_sse_lock_fallback", err?.message || err);
    }
  }
  await runLeaderStream(signal);
}

function ensureSession() {
  getChannel();
  if (sessionPromise) return;
  sessionAbort = new AbortController();
  const { signal } = sessionAbort;
  // Attach .catch synchronously so AbortController teardown never becomes an
  // unhandledrejection (Sentry RND-LAUNCHPAD-FE-E on /projects/details).
  sessionPromise = holdLeaderAndStream(signal)
    .catch((err) => {
      if (isAbortError(err) || signal.aborted) return;
      logger.warn("notifications_sse_session", err?.message || err);
    })
    .finally(() => {
      if (sessionAbort?.signal === signal) {
        sessionAbort = null;
        sessionPromise = null;
      }
    });
}

function stopSessionIfIdle() {
  if (localListeners.size > 0) return;
  try {
    sessionAbort?.abort();
  } catch {
    /* ignore */
  }
  sessionAbort = null;
  sessionPromise = null;
}

/**
 * Subscribe to live notification SSE events (shared across tabs when possible).
 * @param {(evt: object) => void} onEvent
 * @returns {() => void} unsubscribe
 */
export function subscribeNotificationsLive(onEvent) {
  if (typeof onEvent !== "function") return () => {};
  localListeners.add(onEvent);
  ensureSession();
  return () => {
    localListeners.delete(onEvent);
    stopSessionIfIdle();
  };
}
