/**
 * Parent side of the subdomain-preview postMessage bridge (backend/src/previewGateway/previewBridge.js).
 *
 * Subdomain previews (`https://<slug>.<previewSuffix>/`) are cross-origin, so `contentDocument`
 * is null. The page pushes `launchpad:bridge:state` (route, readiness, error overlay); callers
 * read it synchronously via {@link getPreviewBridgeState} and drive the page through
 * {@link callPreviewBridge}.
 */

export const PREVIEW_BRIDGE_STATE_TYPE = "launchpad:bridge:state";
export const PREVIEW_BRIDGE_REQ_TYPE = "launchpad:bridge:req";
export const PREVIEW_BRIDGE_RES_TYPE = "launchpad:bridge:res";
/** Page scrolled / resized; parent re-measures overlays (comment pins, picker boxes). */
export const PREVIEW_BRIDGE_VIEWPORT_TYPE = "launchpad:bridge:viewport";
/** Same-origin embed iframes post console lines with this type. */
export const PREVIEW_CONSOLE_MESSAGE_TYPE = "launchpad:preview-console";

/**
 * @typedef {{ href: string, path: string, readyState: string, title: string, hasBody: boolean,
 *   hasRoot: boolean, rootEmpty: boolean, bodyTextLength: number, visibleTextLength?: number,
 *   hasMedia?: boolean, bodyTextSample: string, errorOverlay: boolean, overlayText: string,
 *   consoleLines?: string[], at: number }} PreviewBridgeState
 */

/** @type {Map<HTMLIFrameElement, { origin: string, state: PreviewBridgeState | null, listeners: Set<(s: PreviewBridgeState) => void> }>} */
const frames = new Map();
/** @type {WeakMap<Window, string[]>} */
const consoleByWindow = new WeakMap();
/** @type {Map<HTMLIFrameElement, Set<(lines: string[]) => void>>} */
const consoleListeners = new Map();
/** @type {Map<HTMLIFrameElement, Set<(v: { scrollX: number, scrollY: number, w: number, h: number }) => void>>} */
const viewportListeners = new Map();
/** @type {Set<string>} */
const knownOrigins = new Set();
/** @type {Map<string, { resolve: (v: unknown) => void, reject: (e: Error) => void, timer: ReturnType<typeof setTimeout> }>} */
const pending = new Map();
let seq = 0;
let listening = false;

function entryForSource(source, origin) {
  for (const [iframe, entry] of frames) {
    if (entry.origin === origin && iframe.contentWindow === source) return entry;
  }
  return null;
}

function iframeForConsoleSource(source) {
  if (!source) return null;
  for (const [iframe, entry] of frames) {
    if (iframe.contentWindow === source) return { iframe, entry };
  }
  for (const iframe of consoleListeners.keys()) {
    if (iframe.contentWindow === source) return { iframe, entry: frames.get(iframe) || null };
  }
  return null;
}

function normalizeConsoleLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line) =>
      String(line || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400),
    )
    .filter(Boolean)
    .slice(-8);
}

function acceptConsoleOrigin(origin) {
  if (knownOrigins.has(origin)) return true;
  return typeof window !== "undefined" && origin === window.location.origin;
}

function onMessage(ev) {
  const data = ev.data;
  if (!data || typeof data !== "object") return;
  if (data.type === PREVIEW_CONSOLE_MESSAGE_TYPE) {
    if (!acceptConsoleOrigin(ev.origin)) return;
    const lines = normalizeConsoleLines(data.consoleLines);
    if (ev.source) consoleByWindow.set(ev.source, lines);
    const match = iframeForConsoleSource(ev.source);
    if (!match) return;
    if (match.entry?.state) {
      match.entry.state = { ...match.entry.state, consoleLines: lines };
      for (const fn of match.entry.listeners) fn(match.entry.state);
    }
    const fns = consoleListeners.get(match.iframe);
    if (fns) for (const fn of fns) fn(lines);
    return;
  }
  if (data.type === PREVIEW_BRIDGE_VIEWPORT_TYPE) {
    if (!knownOrigins.has(ev.origin) || !data.viewport) return;
    for (const [iframe, fns] of viewportListeners) {
      if (iframe.contentWindow === ev.source) for (const fn of fns) fn(data.viewport);
    }
    return;
  }
  if (data.type === PREVIEW_BRIDGE_RES_TYPE) {
    const p = pending.get(data.id);
    if (!p || !knownOrigins.has(ev.origin)) return;
    pending.delete(data.id);
    clearTimeout(p.timer);
    if (data.ok) p.resolve(data.result);
    else p.reject(new Error(data.error || "preview bridge error"));
    return;
  }
  if (data.type !== PREVIEW_BRIDGE_STATE_TYPE) return;
  const entry = entryForSource(ev.source, ev.origin);
  if (!entry || !data.state) return;
  entry.state = data.state;
  for (const fn of entry.listeners) fn(data.state);
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  window.addEventListener("message", onMessage);
  listening = true;
}

/** Normalize to `https://host[:port]` or null. */
export function normalizePreviewEmbedOrigin(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** @type {Map<string, string>} */
const accessTokens = new Map();

/**
 * Remember an embed origin so URL helpers treat it as a dev preview src. `accessToken` admits the
 * iframe to the token-gated preview host; the first one per origin is kept so a project refetch
 * (fresh token) doesn't change the iframe src and reload it.
 */
export function registerPreviewEmbedOrigin(origin, accessToken) {
  const o = normalizePreviewEmbedOrigin(origin);
  if (o) {
    knownOrigins.add(o);
    if (accessToken && !accessTokens.has(o)) accessTokens.set(o, String(accessToken));
  }
  return o;
}

/** Access token registered for a subdomain preview origin, or null. */
export function getPreviewEmbedAccessToken(origin) {
  const o = normalizePreviewEmbedOrigin(origin);
  return (o && accessTokens.get(o)) || null;
}

/** True when `src` points at a registered subdomain preview origin. */
export function isPreviewBridgeSrc(src) {
  if (typeof src !== "string" || !/^https?:\/\//i.test(src)) return false;
  try {
    return knownOrigins.has(new URL(src).origin);
  } catch {
    return false;
  }
}

/**
 * Bind an iframe to its preview origin. Returns a detach function.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {string} origin
 */
export function attachPreviewBridge(iframe, origin) {
  const o = registerPreviewEmbedOrigin(origin);
  if (!iframe || !o) return () => {};
  ensureListening();
  const prev = frames.get(iframe);
  if (prev?.origin === o) return () => detachPreviewBridge(iframe);
  frames.set(iframe, { origin: o, state: null, listeners: prev?.listeners || new Set() });
  return () => detachPreviewBridge(iframe);
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function detachPreviewBridge(iframe) {
  if (iframe) frames.delete(iframe);
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function isPreviewBridgeFrame(iframe) {
  return Boolean(iframe && frames.has(iframe));
}

/**
 * Last state pushed by the page, or null (not a bridge frame, or nothing received yet).
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @returns {PreviewBridgeState | null}
 */
export function getPreviewBridgeState(iframe) {
  return (iframe && frames.get(iframe)?.state) || null;
}

/**
 * Console lines captured from the preview page (bridge state, or same-origin postMessage).
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @returns {string[]}
 */
export function getPreviewConsoleLines(iframe) {
  const state = iframe && frames.get(iframe)?.state;
  if (state && Array.isArray(state.consoleLines)) return state.consoleLines;
  const stored = iframe?.contentWindow && consoleByWindow.get(iframe.contentWindow);
  return Array.isArray(stored) ? stored : [];
}

/**
 * Listen for same-origin embed console posts. Also registers the iframe so messages can be matched.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {(lines: string[]) => void} fn
 */
export function subscribePreviewConsole(iframe, fn) {
  if (!iframe || typeof fn !== "function") return () => {};
  ensureListening();
  let set = consoleListeners.get(iframe);
  if (!set) {
    set = new Set();
    consoleListeners.set(iframe, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) consoleListeners.delete(iframe);
  };
}

/**
 * Scroll / resize pushes from a subdomain preview. Works before {@link attachPreviewBridge}
 * (child overlays subscribe before the parent effect attaches the frame).
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {(v: { scrollX: number, scrollY: number, w: number, h: number }) => void} fn
 */
export function subscribePreviewBridgeViewport(iframe, fn) {
  if (!iframe || typeof fn !== "function") return () => {};
  ensureListening();
  let set = viewportListeners.get(iframe);
  if (!set) {
    set = new Set();
    viewportListeners.set(iframe, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) viewportListeners.delete(iframe);
  };
}

/**
 * Remove a listener from an iframe's `contentWindow` captured while it was same-origin.
 * If the frame has since navigated cross-origin, the WindowProxy throws SecurityError —
 * the old document (and its listeners) is already gone, so there is nothing to remove.
 * @param {Window | null | undefined} win
 * @param {string} type
 * @param {EventListener} fn
 * @param {boolean | EventListenerOptions} [options]
 */
export function removeIframeWindowListener(win, type, fn, options) {
  try {
    win?.removeEventListener(type, fn, options);
  } catch {
    /* cross-origin or detached frame */
  }
}

/** Forget the cached state (the parent just changed `src`; the old document is going away). */
export function resetPreviewBridgeState(iframe) {
  const entry = iframe && frames.get(iframe);
  if (entry) entry.state = null;
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {(s: PreviewBridgeState) => void} fn
 */
export function subscribePreviewBridgeState(iframe, fn) {
  const entry = iframe && frames.get(iframe);
  if (!entry) return () => {};
  entry.listeners.add(fn);
  return () => entry.listeners.delete(fn);
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {"ping" | "getState" | "navigate" | "reload" | "pickAt" | "boxForSelector" | "boxesForSelectors" | "scrollToAnchor" | "linkHrefs" | "capture" | "snapshotSession" | "restoreSession"} method
 * @param {Record<string, unknown>} [params]
 * @param {{ timeoutMs?: number }} [opts]
 */
export function callPreviewBridge(iframe, method, params = {}, { timeoutMs = 5000 } = {}) {
  const entry = iframe && frames.get(iframe);
  const win = iframe?.contentWindow;
  if (!entry || !win) return Promise.reject(new Error("preview bridge not attached"));
  ensureListening();
  seq += 1;
  const id = `lpb-${Date.now().toString(36)}-${seq}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`preview bridge ${method} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    try {
      win.postMessage({ type: PREVIEW_BRIDGE_REQ_TYPE, id, method, params }, entry.origin);
    } catch (err) {
      clearTimeout(timer);
      pending.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
