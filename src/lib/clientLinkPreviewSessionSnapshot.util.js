/**
 * Snapshot / restore iframe sessionStorage across parent-initiated preview reloads.
 * Preserves auth tokens and UI step state many generated apps store in sessionStorage.
 */

import { callPreviewBridge, isPreviewBridgeFrame } from "./previewBridge.js";

/** localStorage key prefix — iframe bootstrap restores before React mounts. */
export const EMBED_SESSION_RESTORE_LS_PREFIX = "launchpad:embed-session-restore:";

/** Staged snapshot payload keys (session + local storage + cookies). */
export const STAGED_IFRAME_SESSION_KEY = "__lpSession";
export const STAGED_IFRAME_LOCAL_KEY = "__lpLocal";
export const STAGED_IFRAME_COOKIES_KEY = "__lpCookies";

/** @param {number | null | undefined} port */
export function buildEmbedSessionRestoreStorageKey(port) {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) return "";
  return `${EMBED_SESSION_RESTORE_LS_PREFIX}${n}`;
}

/** @param {Storage | null | undefined} storage */
export function snapshotSessionStorage(storage) {
  if (!storage) return {};
  const out = {};
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key != null) out[key] = storage.getItem(key) ?? "";
    }
  } catch {
    return {};
  }
  return out;
}

/**
 * @param {Storage | null | undefined} storage
 * @param {Record<string, string>} snapshot
 */
export function restoreSessionStorage(storage, snapshot) {
  if (!storage || !snapshot || typeof snapshot !== "object") return false;
  try {
    for (const [key, value] of Object.entries(snapshot)) {
      if (typeof key === "string" && typeof value === "string") {
        storage.setItem(key, value);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function snapshotIframeSessionStorage(iframe) {
  try {
    const storage = iframe?.contentWindow?.sessionStorage;
    if (!storage) return {};
    return snapshotSessionStorage(storage);
  } catch {
    return {};
  }
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function snapshotIframeLocalStorage(iframe) {
  try {
    const storage = iframe?.contentWindow?.localStorage;
    if (!storage) return {};
    return snapshotSessionStorage(storage);
  } catch {
    return {};
  }
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function snapshotIframeCookies(iframe) {
  try {
    return String(iframe?.contentDocument?.cookie ?? "");
  } catch {
    return "";
  }
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {string} cookieString
 */
export function restoreIframeCookies(iframe, cookieString) {
  const raw = typeof cookieString === "string" ? cookieString.trim() : "";
  if (!raw) return false;
  try {
    const doc = iframe?.contentDocument;
    if (!doc) return false;
    // Prefer Path under /embedded/<port>/ so restored auth cookies do not use Path=/ .
    let cookiePath = "/";
    try {
      const pathname = String(iframe?.contentWindow?.location?.pathname || "");
      const match = pathname.match(/^\/embedded\/(\d{1,5})/);
      if (match) cookiePath = `/embedded/${match[1]}/`;
    } catch {
      /* cross-origin — leave path as / */
    }
    for (const part of raw.split(/;\s*/)) {
      const trimmed = part.trim();
      if (!trimmed || !trimmed.includes("=")) continue;
      const nameValue = trimmed.split(";")[0].trim();
      if (!nameValue) continue;
      doc.cookie = `${nameValue}; path=${cookiePath}; SameSite=Lax`;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {Record<string, string>} snapshot
 */
export function restoreIframeSessionStorage(iframe, snapshot) {
  try {
    const storage = iframe?.contentWindow?.sessionStorage;
    if (!storage) return false;
    return restoreSessionStorage(storage, snapshot);
  } catch {
    return false;
  }
}

/**
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {Record<string, string>} snapshot
 */
export function restoreIframeLocalStorage(iframe, snapshot) {
  try {
    const storage = iframe?.contentWindow?.localStorage;
    if (!storage) return false;
    return restoreSessionStorage(storage, snapshot);
  } catch {
    return false;
  }
}

/** @param {unknown} payload */
export function isIframeStagedStorageBundle(payload) {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    (STAGED_IFRAME_SESSION_KEY in payload ||
      STAGED_IFRAME_LOCAL_KEY in payload ||
      STAGED_IFRAME_COOKIES_KEY in payload),
  );
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function snapshotIframeStorageBundle(iframe) {
  const cookies = snapshotIframeCookies(iframe);
  return {
    [STAGED_IFRAME_SESSION_KEY]: snapshotIframeSessionStorage(iframe),
    [STAGED_IFRAME_LOCAL_KEY]: snapshotIframeLocalStorage(iframe),
    ...(cookies ? { [STAGED_IFRAME_COOKIES_KEY]: cookies } : {}),
  };
}

/**
 * Restore a staged storage bundle or legacy flat sessionStorage snapshot.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {Record<string, string> | { __lpSession?: Record<string, string>, __lpLocal?: Record<string, string> } | null | undefined} payload
 */
export function restoreIframeStagedStorage(iframe, payload) {
  if (!payload || typeof payload !== "object") return false;
  if (isIframeStagedStorageBundle(payload)) {
    const sessionOk = restoreIframeSessionStorage(iframe, payload[STAGED_IFRAME_SESSION_KEY] || {});
    const localOk = restoreIframeLocalStorage(iframe, payload[STAGED_IFRAME_LOCAL_KEY] || {});
    const cookiesOk = restoreIframeCookies(iframe, payload[STAGED_IFRAME_COOKIES_KEY] || "");
    return sessionOk || localOk || cookiesOk;
  }
  return restoreIframeSessionStorage(iframe, payload);
}

/**
 * Consume parent-staged storage from shared localStorage (fallback when head script did not run).
 * @param {number | null | undefined} port
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function applyStagedStorageFromLocalStorage(port, iframe) {
  const key = buildEmbedSessionRestoreStorageKey(port);
  if (!key || typeof globalThis.localStorage === "undefined") return false;
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const ok = restoreIframeStagedStorage(iframe, parsed);
    // Only clear after a successful restore so a remount race can retry.
    if (ok) globalThis.localStorage.removeItem(key);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Stage iframe sessionStorage into shared localStorage so the embed bootstrap script
 * can restore it synchronously in <head> before the generated app boots.
 * @param {number | null | undefined} port
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function stageIframeSessionRestore(port, iframe) {
  const key = buildEmbedSessionRestoreStorageKey(port);
  if (!key || typeof globalThis.localStorage === "undefined") return false;
  const bundle = snapshotIframeStorageBundle(iframe);
  const session = bundle[STAGED_IFRAME_SESSION_KEY] || {};
  const local = bundle[STAGED_IFRAME_LOCAL_KEY] || {};
  const cookies = bundle[STAGED_IFRAME_COOKIES_KEY] || "";
  if (
    Object.keys(session).length === 0 &&
    Object.keys(local).length === 0 &&
    !String(cookies).trim()
  ) {
    return false;
  }
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(bundle));
    return true;
  } catch {
    return false;
  }
}

/** @param {HTMLIFrameElement | null | undefined} iframe */
export function canAccessEmbedIframeDocument(iframe) {
  if (!iframe) return false;
  try {
    const doc = iframe.contentDocument;
    return Boolean(doc && doc.body);
  } catch {
    return false;
  }
}

/**
 * Reload the embed iframe in-place (same pathname/hash) with a bumped `_pv` query param.
 * Keeps `/` login apps on `/` while still cache-busting. Stages storage for head restore.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {number | null | undefined} port
 */
export function bumpEmbedIframeLocationInPlace(iframe, port) {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535 || !iframe) return false;
  // Subdomain preview: its own origin keeps storage across reloads; bust the cache via the bridge.
  if (isPreviewBridgeFrame(iframe)) {
    void callPreviewBridge(iframe, "reload", { bust: true }).catch(() => {});
    return true;
  }
  if (!canAccessEmbedIframeDocument(iframe)) return false;
  stageIframeSessionRestore(n, iframe);
  const bundle = snapshotIframeStorageBundle(iframe);
  restoreIframeStagedStorage(iframe, bundle);
  try {
    const win = iframe.contentWindow;
    const loc = win?.location;
    if (!win || !loc) return false;
    const params = new URLSearchParams(loc.search);
    params.set("embed_frame", "1");
    params.set("embed_port", String(n));
    const nextPv = Number(params.get("_pv") || 0) + 1;
    params.set("_pv", String(nextPv));
    const query = params.toString();
    const nextUrl = `${loc.pathname}${query ? `?${query}` : ""}${loc.hash || ""}`;
    if (`${loc.pathname}${loc.search}${loc.hash || ""}` !== nextUrl) {
      win.location.replace(nextUrl);
    } else {
      win.location.reload();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-apply staged storage after load — helps React apps that read auth in useEffect.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {unknown} payload
 * @param {{ delaysMs?: number[] }} [opts]
 */
export async function restoreIframeStagedStorageWithHydrationRetries(
  iframe,
  payload,
  { delaysMs = [0, 50, 200, 600] } = {},
) {
  if (!iframe || !payload) return;
  for (const delay of delaysMs) {
    if (delay > 0) {
      await new Promise((resolve) => {
        globalThis.setTimeout(resolve, delay);
      });
    }
    if (!canAccessEmbedIframeDocument(iframe)) continue;
    restoreIframeStagedStorage(iframe, payload);
  }
}

/** @param {number | null | undefined} port */
export function clearStagedSessionRestore(port) {
  const key = buildEmbedSessionRestoreStorageKey(port);
  if (!key || typeof globalThis.localStorage === "undefined") return;
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
