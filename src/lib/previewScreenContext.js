import { buildSelector, canAccessIframeDocument } from "@/lib/previewElementAnchor.util";
import {
  extractEmbedBrowsePathFromLocation,
  previewRoutePathname,
  readIframeBrowsePath,
} from "@/lib/clientLinkEmbeddedPreviewSrc";
import {
  SCREEN_SNAPSHOT_LIMITS as L,
  clipScreenText,
  withScreenElementId,
} from "@/lib/previewScreenContext.util";

export { collectNavigateTargets, summarizeScreenSnapshot } from "@/lib/previewScreenContext.util";

export const INTERACTIVE_SELECTOR =
  "a[href],button,[role=button],[role=tab],[role=link],[role=menuitem],[role=switch],summary,input,select,textarea";
const TEXT_SELECTOR = "h1,h2,h3,h4,p,li,label,figcaption,blockquote,td,th";
const MEDIA_SELECTOR = "img[alt],svg[aria-label],video";

function hrefToAppRoute(a, win) {
  try {
    const url = new URL(a.getAttribute("href") || "", win.location.href);
    if (url.origin !== win.location.origin) return null;
    return previewRoutePathname(extractEmbedBrowsePathFromLocation(url.pathname, url.search, ""));
  } catch {
    return null;
  }
}

export function elementLabel(el) {
  return clipScreenText(
    el.getAttribute("aria-label") ||
      el.getAttribute("alt") ||
      el.getAttribute("title") ||
      el.getAttribute("placeholder") ||
      el.innerText ||
      el.getAttribute("value") ||
      el.getAttribute("name") ||
      "",
    L.LABEL_CHARS,
  );
}

export function renderedRect(el, win) {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const cs = win.getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return null;
  return r;
}

/**
 * DOM snapshot of the preview iframe: route, title, visible text, and interactive/text/media elements.
 * @param {HTMLIFrameElement | null} iframe
 * @param {{ pickedElement?: string | null }} [extra]
 */
export function snapshotPreviewScreen(iframe, extra = {}) {
  if (!canAccessIframeDocument(iframe)) return null;
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc?.body || !win) return null;
  const route = previewRoutePathname(readIframeBrowsePath(iframe)) || "/";
  const vh = win.innerHeight || doc.documentElement.clientHeight || 0;
  const vw = win.innerWidth || doc.documentElement.clientWidth || 0;

  const elements = [];
  const seen = new Set();
  const collect = (selector, kind) => {
    for (const el of doc.querySelectorAll(selector)) {
      if (elements.length >= L.ELEMENTS) return;
      if (seen.has(el)) continue;
      seen.add(el);
      const rect = renderedRect(el, win);
      if (!rect) continue;
      const label = elementLabel(el);
      if (!label) continue;
      const tag = el.tagName.toLowerCase();
      elements.push(
        withScreenElementId({
          kind,
          tag,
          role: el.getAttribute("role") || "",
          label,
          route,
          href: tag === "a" ? hrefToAppRoute(el, win) : null,
          selector: buildSelector(el),
          type: tag === "input" || tag === "button" ? el.getAttribute("type") || "" : "",
          inViewport: rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw,
        }),
      );
    }
  };
  collect(INTERACTIVE_SELECTOR, "interactive");
  collect(TEXT_SELECTOR, "text");
  collect(MEDIA_SELECTOR, "media");

  return {
    route,
    title: clipScreenText(doc.title, L.LABEL_CHARS),
    text: clipScreenText(doc.body.innerText || "", L.TEXT_CHARS),
    elements,
    pickedElement: extra.pickedElement || null,
    capturedAt: Date.now(),
  };
}

/**
 * Downscaled JPEG data URL of the visible preview viewport (same-origin iframe only).
 * @param {HTMLIFrameElement | null} iframe
 * @returns {Promise<string | null>}
 */
export async function capturePreviewScreenshot(iframe) {
  if (!canAccessIframeDocument(iframe)) return null;
  try {
    await new Promise((r) =>
      window.requestIdleCallback
        ? window.requestIdleCallback(r, { timeout: 1500 })
        : setTimeout(r, 200),
    );
    if (!canAccessIframeDocument(iframe)) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    const vw = Math.max(1, Math.floor(iframe.clientWidth || win.innerWidth));
    const vh = Math.max(1, Math.floor(iframe.clientHeight || win.innerHeight));
    // Viewport only, rendered straight at the target width: the full-page DPR capture blocks the UI.
    const out = await html2canvas(doc.documentElement, {
      x: win.scrollX,
      y: win.scrollY,
      width: vw,
      height: vh,
      windowWidth: vw,
      windowHeight: vh,
      scale: Math.min(1, L.SCREENSHOT_WIDTH / vw),
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
    for (const quality of [0.7, 0.5, 0.35]) {
      const url = out.toDataURL("image/jpeg", quality);
      if (url.length <= L.SCREENSHOT_MAX_DATA_URL) return url;
    }
    return null;
  } catch {
    return null;
  }
}
