import { canAccessIframeDocument } from "@/lib/previewElementAnchor.util";
import { readIframeBrowsePath } from "@/lib/clientLinkEmbeddedPreviewSrc";
import {
  callPreviewBridge,
  getPreviewBridgeState,
  isPreviewBridgeFrame,
} from "@/lib/previewBridge";
import {
  captureDocumentFullPage,
  captureDocumentViewport,
  waitForImages,
  waitForPageSettled,
} from "@/lib/previewDocumentCapture";
import { previewRouteFromHref, previewScreenRouteKey } from "@/lib/previewFullPageScreenshot.util";
import { buildStoredZipParts } from "@/lib/zipStore.util";

export {
  buildFullPageShotFilename,
  buildScreenZipEntryName,
  buildScreensZipFilename,
  defaultPreviewScreenName,
} from "@/lib/previewFullPageScreenshot.util";

/** Served from the LaunchPad origin (`npm run build:embed`); the bridge only loads it from there. */
export const PREVIEW_CAPTURE_SCRIPT_PATH = "/embed/preview-capture.js";
/** Priming lazy content, settling and encoding a long page can take a while. */
const BRIDGE_CAPTURE_TIMEOUT_MS = 120_000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureViaPreviewBridge(iframe, { settle, mode = "full" }) {
  const scriptUrl = new URL(PREVIEW_CAPTURE_SCRIPT_PATH, window.location.origin).href;
  const shot = await callPreviewBridge(
    iframe,
    "capture",
    { scriptUrl, settle, mode },
    { timeoutMs: BRIDGE_CAPTURE_TIMEOUT_MS },
  );
  if (!(shot?.blob instanceof Blob) || !shot.blob.size) {
    throw new Error("Preview returned an empty capture.");
  }
  return {
    blob: shot.blob,
    width: Number(shot.width) || 0,
    height: Number(shot.height) || 0,
    cssWidth: Number(shot.cssWidth) || 0,
  };
}

/**
 * Full-length PNG of the page inside the preview iframe. Same-origin frames are captured from
 * here; cross-origin subdomain previews capture themselves through the bridge.
 * @param {HTMLIFrameElement | null} iframe
 * @param {{ settle?: boolean }} [opts] bridge only: wait for the page to settle first
 * @returns {Promise<{ blob: Blob, width: number, height: number, cssWidth: number }>}
 */
export async function captureFullPagePreviewScreenshot(iframe, { settle = false } = {}) {
  if (isPreviewBridgeFrame(iframe))
    return captureViaPreviewBridge(iframe, { settle, mode: "full" });
  if (!canAccessIframeDocument(iframe)) {
    throw new Error("Preview is not ready for capture yet.");
  }
  return captureDocumentFullPage(iframe.contentDocument, iframe.contentWindow);
}

/**
 * Visible viewport PNG inside the preview iframe (feedback / annotation).
 * @param {HTMLIFrameElement | null} iframe
 * @param {{ settle?: boolean }} [opts]
 * @returns {Promise<{ blob: Blob, width: number, height: number, cssWidth: number }>}
 */
export async function captureViewportPreviewScreenshot(iframe, { settle = true } = {}) {
  if (isPreviewBridgeFrame(iframe)) {
    return captureViaPreviewBridge(iframe, { settle, mode: "viewport" });
  }
  if (!canAccessIframeDocument(iframe)) {
    throw new Error("Preview is not ready for capture yet.");
  }
  return captureDocumentViewport(iframe.contentDocument, iframe.contentWindow);
}

/** @param {Blob} blob @param {string} filename */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** @param {Array<{ name: string, bytes: Uint8Array }>} entries */
export function buildZipBlob(entries) {
  return new Blob(buildStoredZipParts(entries), { type: "application/zip" });
}

/** In-app routes linked from the current preview page (nav menus, cards, footers). */
export async function collectPreviewLinkRoutes(iframe) {
  if (isPreviewBridgeFrame(iframe)) {
    const res = await callPreviewBridge(iframe, "linkHrefs", {}, { timeoutMs: 2000 }).catch(
      () => null,
    );
    const origin = typeof res?.origin === "string" ? res.origin : "";
    const hrefs = Array.isArray(res?.hrefs) ? res.hrefs : [];
    return hrefs.map((href) => previewRouteFromHref(String(href), origin)).filter(Boolean);
  }
  if (!canAccessIframeDocument(iframe)) return [];
  let origin = "";
  try {
    origin = iframe.contentWindow.location.origin;
  } catch {
    return [];
  }
  const routes = [];
  for (const anchor of iframe.contentDocument.querySelectorAll("a[href]")) {
    const route = previewRouteFromHref(anchor.href, origin);
    if (route) routes.push(route);
  }
  return routes;
}

/** A full reload can sit on the old document while Next compiles the target route. */
const ROUTE_LOAD_TIMEOUT_MS = 60_000;
/** Time a different route must hold before we call it a redirect rather than a hop. */
const ROUTE_REDIRECT_SETTLE_MS = 3_000;
const ROUTE_POLL_MS = 150;

function abortError() {
  return new DOMException("Export cancelled", "AbortError");
}

/** Cross-origin preview: route and readiness come from bridge pushes; settling happens at capture. */
function bridgeRouteStatus(iframe) {
  const state = getPreviewBridgeState(iframe);
  return {
    current: previewScreenRouteKey(state?.path || ""),
    loaded: Boolean(state && state.readyState === "complete" && state.hasBody && !state.rootEmpty),
  };
}

/**
 * Resolve once the preview shows `route` and its DOM has settled. Rejects when the app
 * redirects elsewhere (e.g. sign-in) or the route never loads.
 * @param {() => HTMLIFrameElement | null} getIframe
 * @param {string} route
 * @param {{ startRoute?: string, startDoc?: Document | null, isAuthRoute?: (r: string) => boolean, signal?: AbortSignal }} [opts]
 */
export async function waitForPreviewRoute(getIframe, route, opts = {}) {
  const { startDoc = null, isAuthRoute, signal } = opts;
  const target = previewScreenRouteKey(route);
  const start = previewScreenRouteKey(opts.startRoute);
  const deadline = Date.now() + ROUTE_LOAD_TIMEOUT_MS;
  let offTarget = null;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw abortError();
    const iframe = getIframe();
    if (isPreviewBridgeFrame(iframe)) {
      const { current, loaded } = bridgeRouteStatus(iframe);
      if (loaded && current === target) return;
      if (loaded && current && current !== start) {
        if (isAuthRoute?.(current)) throw new Error(`${route} needs sign-in in the preview`);
        if (offTarget?.route !== current) offTarget = { route: current, since: Date.now() };
        else if (Date.now() - offTarget.since > ROUTE_REDIRECT_SETTLE_MS) {
          throw new Error(`${route} redirected to ${current}`);
        }
      } else {
        offTarget = null;
      }
    } else if (canAccessIframeDocument(iframe)) {
      const doc = iframe.contentDocument;
      const current = previewScreenRouteKey(readIframeBrowsePath(iframe));
      const loaded = doc.readyState === "complete" && doc.body?.childElementCount > 0;
      if (loaded && current === target) {
        await waitForPageSettled(doc, signal);
        if (signal?.aborted) throw abortError();
        const after = getIframe();
        if (
          after?.contentDocument === doc &&
          previewScreenRouteKey(readIframeBrowsePath(after)) === target
        ) {
          await doc.fonts?.ready;
          await waitForImages(doc);
          return;
        }
      } else if (loaded && current && (doc !== startDoc || current !== start)) {
        if (isAuthRoute?.(current)) throw new Error(`${route} needs sign-in in the preview`);
        if (offTarget?.route !== current) offTarget = { route: current, since: Date.now() };
        else if (Date.now() - offTarget.since > ROUTE_REDIRECT_SETTLE_MS) {
          throw new Error(`${route} redirected to ${current}`);
        }
      } else {
        offTarget = null;
      }
    }
    await wait(ROUTE_POLL_MS);
  }
  throw new Error(`${route} did not finish loading`);
}

/**
 * Open each route in the preview, wait for it to settle, capture it full-length and hand
 * the PNG to `onScreen`. One failing route does not stop the rest.
 * @param {{
 *   getIframe: () => HTMLIFrameElement | null,
 *   routes: string[],
 *   navigate: (route: string) => boolean,
 *   isAuthRoute?: (route: string) => boolean,
 *   signal?: AbortSignal,
 *   onProgress?: (p: { index: number, total: number, route: string }) => void,
 *   onScreen: (s: { route: string, index: number, blob: Blob, width: number, height: number, cssWidth: number }) => Promise<void> | void,
 * }} opts
 * @returns {Promise<{ done: number, failures: Array<{ route: string, message: string }>, cancelled: boolean }>}
 */
export async function exportPreviewScreens(opts) {
  const { getIframe, routes, navigate, isAuthRoute, signal, onProgress, onScreen } = opts;
  const failures = [];
  let done = 0;
  for (let index = 0; index < routes.length; index += 1) {
    if (signal?.aborted) break;
    const route = routes[index];
    onProgress?.({ index, total: routes.length, route });
    try {
      const before = getIframe();
      const startRoute = readIframeBrowsePath(before);
      const startDoc = canAccessIframeDocument(before) ? before.contentDocument : null;
      if (!navigate(route)) throw new Error(`Could not open ${route}`);
      await waitForPreviewRoute(getIframe, route, { startRoute, startDoc, isAuthRoute, signal });
      const shot = await captureFullPagePreviewScreenshot(getIframe(), { settle: true });
      if (signal?.aborted) break;
      await onScreen({ route, index, ...shot });
      done += 1;
    } catch (err) {
      if (err?.name === "AbortError") break;
      failures.push({ route, message: err?.message || String(err) });
    }
  }
  return { done, failures, cancelled: Boolean(signal?.aborted) };
}
