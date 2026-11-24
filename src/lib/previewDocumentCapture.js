/**
 * Full-page capture of a live document. Runs in the LaunchPad window against a same-origin
 * preview iframe, and inside cross-origin subdomain previews via `src/embed/preview-capture-main.js`
 * (keep this module free of app imports so that bundle stays small).
 */
import {
  FULL_PAGE_SHOT_MAX_AREA,
  FULL_PAGE_SHOT_MAX_AREA_SAFARI,
  computeFullPageShotScale,
  isSafariUserAgent,
} from "@/lib/previewFullPageScreenshot.util";

const SCROLL_ATTR = "data-lp-fullshot-scroll";
const UNCLAMP_ATTR = "data-lp-fullshot-unclamp";
const SCROLL_STEP_DELAY_MS = 120;
const MAX_SCROLL_STEPS = 60;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** App shells often scroll an inner `<main>` instead of the document; find those panes. */
function findPageScrollContainers(doc, win) {
  const minHeight = (win.innerHeight || 0) * 0.5;
  const found = [];
  for (const el of doc.body.querySelectorAll("*")) {
    if (el.clientHeight < minHeight || el.scrollHeight - el.clientHeight < 4) continue;
    const overflowY = win.getComputedStyle(el).overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") found.push(el);
  }
  return found;
}

/** Walk each scroller top→bottom so lazy images and in-view animations render before capture. */
async function primeScrolledContent(scrollers) {
  for (const el of scrollers) {
    const step = Math.max(200, Math.floor(el.clientHeight * 0.8));
    for (
      let i = 0;
      i < MAX_SCROLL_STEPS && el.scrollTop + el.clientHeight < el.scrollHeight - 2;
      i += 1
    ) {
      el.scrollTop += step;
      await wait(SCROLL_STEP_DELAY_MS);
    }
    el.scrollTop = 0;
  }
  await wait(SCROLL_STEP_DELAY_MS * 2);
}

function markScrollContainers(doc, containers) {
  const marked = [];
  for (const el of containers) {
    el.setAttribute(SCROLL_ATTR, "");
    marked.push(el);
    for (let p = el.parentElement; p && p !== doc.documentElement; p = p.parentElement) {
      if (p.hasAttribute(UNCLAMP_ATTR)) break;
      p.setAttribute(UNCLAMP_ATTR, "");
      marked.push(p);
    }
  }
  return () => {
    for (const el of marked) {
      el.removeAttribute(SCROLL_ATTR);
      el.removeAttribute(UNCLAMP_ATTR);
    }
  };
}

function unclampClonedDocument(cloneDoc) {
  const style = cloneDoc.createElement("style");
  style.textContent = `
html, body, [${UNCLAMP_ATTR}], [${SCROLL_ATTR}] {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
}`;
  (cloneDoc.head || cloneDoc.documentElement).appendChild(style);
}

const MASK_URL_RE = /url\(\s*(['"]?)(.*?)\1\s*\)/;

function escapeXmlAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** SVG-as-image cannot load external URLs, so mask sources are inlined as data URLs. */
async function maskSourceAsDataUrl(url, baseUrl, cache) {
  if (url.startsWith("data:")) return url;
  let absolute;
  try {
    absolute = new URL(url, baseUrl).href;
  } catch {
    return null;
  }
  if (!cache.has(absolute)) {
    cache.set(
      absolute,
      fetch(absolute)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => (blob ? blobToDataUrl(blob) : null))
        .catch(() => null),
    );
  }
  return cache.get(absolute);
}

function maskPreserveAspectRatio(style) {
  const size = String(style.webkitMaskSize || style.maskSize || "");
  if (/100%\s+100%/.test(size)) return "none";
  const slice = size.includes("cover");
  const pos = String(style.webkitMaskPosition || style.maskPosition || "");
  const align = /^0(%|px)?\s+0(%|px)?$/.test(pos.trim()) ? "xMinYMin" : "xMidYMid";
  return `${align} ${slice ? "slice" : "meet"}`;
}

/**
 * html2canvas cannot apply CSS masks, so mask-based icons (`bg-current` + `mask-image`) render
 * as solid squares. Swap each one for an SVG that paints the mask shape in the element's colour.
 */
async function replaceMaskedIcons(cloneDoc) {
  const win = cloneDoc.defaultView;
  if (!win || !cloneDoc.body) return;
  const cache = new Map();
  const jobs = [];
  for (const el of cloneDoc.body.querySelectorAll("*")) {
    const style = win.getComputedStyle(el);
    const maskImage = style.webkitMaskImage || style.maskImage || "";
    const match = maskImage !== "none" && maskImage.match(MASK_URL_RE);
    if (!match) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const bg = style.backgroundColor;
    const color = bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)" ? bg : style.color;
    const fit = maskPreserveAspectRatio(style);
    jobs.push(
      maskSourceAsDataUrl(match[2], cloneDoc.baseURI, cache).then((src) => {
        if (!src) return;
        const w = Math.round(rect.width * 100) / 100;
        const h = Math.round(rect.height * 100) / 100;
        const svg =
          `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
          `<filter id="c" x="0" y="0" width="100%" height="100%"><feFlood flood-color="${escapeXmlAttr(color)}"/><feComposite in2="SourceAlpha" operator="in"/></filter>` +
          `<image width="${w}" height="${h}" preserveAspectRatio="${fit}" filter="url(#c)" href="${escapeXmlAttr(src)}" xlink:href="${escapeXmlAttr(src)}"/></svg>`;
        const set = (prop, value) => el.style.setProperty(prop, value, "important");
        set("-webkit-mask-image", "none");
        set("mask-image", "none");
        set("background-color", "transparent");
        set("background-image", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
        set("background-size", "100% 100%");
        set("background-repeat", "no-repeat");
        set("background-position", "0 0");
      }),
    );
  }
  await Promise.all(jobs);
}

const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "url",
  "tel",
  "number",
  "password",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

function formFieldDisplayText(el) {
  if (el.tagName === "TEXTAREA") return { text: el.value, placeholder: !el.value };
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (type === "password" && el.value)
    return { text: "•".repeat(el.value.length), placeholder: false };
  if (type === "date" && el.value) {
    const date = new Date(`${el.value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return { text: new Intl.DateTimeFormat().format(date), placeholder: false };
    }
  }
  if (el.value) return { text: el.value, placeholder: false };
  return { text: el.getAttribute("placeholder") || "", placeholder: true };
}

/**
 * html2canvas draws input text from the top of the content box, which clips descenders in
 * padded fixed-height fields. Replace text fields with styled boxes that lay text out normally.
 */
function replaceFormFields(cloneDoc) {
  const win = cloneDoc.defaultView;
  if (!win || !cloneDoc.body) return;
  const fields = [...cloneDoc.body.querySelectorAll("input, textarea")].filter(
    (el) =>
      el.tagName === "TEXTAREA" ||
      TEXT_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase()),
  );
  for (const el of fields) {
    const style = win.getComputedStyle(el);
    if (style.display === "none") continue;
    const { text, placeholder } = formFieldDisplayText(el);
    const box = cloneDoc.createElement("div");
    for (let i = 0; i < style.length; i += 1) {
      const prop = style[i];
      box.style.setProperty(prop, style.getPropertyValue(prop));
    }
    const isTextarea = el.tagName === "TEXTAREA";
    box.style.setProperty(
      "display",
      style.display === "inline" ? "inline-flex" : isTextarea ? "block" : "flex",
    );
    if (!isTextarea) box.style.setProperty("align-items", "center");
    box.style.setProperty("overflow", "hidden");
    box.style.setProperty("white-space", isTextarea ? "pre-wrap" : "pre");
    box.style.setProperty("text-overflow", "ellipsis");
    box.style.setProperty("box-sizing", style.boxSizing);
    box.style.setProperty("width", style.width);
    box.style.setProperty("height", style.height);
    if (placeholder) {
      const placeholderColor = win.getComputedStyle(el, "::placeholder").color;
      if (placeholderColor) box.style.setProperty("color", placeholderColor);
    }
    box.textContent = text;
    el.replaceWith(box);
  }
}

const SVG_IMAGE_SRC_RE = /^data:image\/svg\+xml[,;]|\.svg(?:[?#]|$)/i;

/** Give the root `<svg>` explicit width/height, keeping everything else as-is. */
function sizeSvgMarkup(markup, width, height) {
  return markup.replace(/<svg\b([^>]*)>/i, (_tag, attrs) => {
    const rest = attrs.replace(/\s(?:width|height)\s*=\s*(["']).*?\1/gi, "");
    return `<svg width="${width}" height="${height}"${rest}>`;
  });
}

/**
 * SVG images that only declare a viewBox have no intrinsic size, and html2canvas draws them
 * as nothing (e.g. logos). Re-encode them with the size they are displayed at.
 */
async function sizeSvgImages(cloneDoc) {
  const jobs = [...cloneDoc.querySelectorAll("img")].map(async (img) => {
    const src = img.currentSrc || img.getAttribute("src") || "";
    if (!SVG_IMAGE_SRC_RE.test(src)) return;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    try {
      const res = await fetch(new URL(src, cloneDoc.baseURI).href);
      if (!res.ok) return;
      const markup = await res.text();
      const w = Math.round(rect.width * 100) / 100;
      const h = Math.round(rect.height * 100) / 100;
      img.removeAttribute("srcset");
      img.setAttribute(
        "src",
        `data:image/svg+xml,${encodeURIComponent(sizeSvgMarkup(markup, w, h))}`,
      );
    } catch {
      /* cross-origin or unreadable — leave the original */
    }
  });
  await Promise.all(jobs);
}

/** Prepare the html2canvas clone: full-length layout plus fixes for things it cannot draw. */
async function prepareCloneForCapture(cloneDoc) {
  unclampClonedDocument(cloneDoc);
  replaceFormFields(cloneDoc);
  await Promise.all([replaceMaskedIcons(cloneDoc), sizeSvgImages(cloneDoc)]);
}

const CLIPPING_OVERFLOW = new Set(["hidden", "clip", "auto", "scroll", "overlay"]);

/**
 * Bottom edge (CSS px) of what is actually visible in the unclamped clone. Ignores content
 * clipped by an ancestor (collapsed accordions, carousels), parked off-screen to the right
 * (drawers, toasts), fixed overlays and invisible nodes, all of which inflate scrollHeight.
 */
function measureVisibleContentBottom(doc, viewportW) {
  const win = doc.defaultView;
  if (!win || !doc.body) return 0;
  const scrollY = win.scrollY || 0;
  let bottom = 0;
  const visit = (el, clipBottom) => {
    if (el.hasAttribute("data-html2canvas-ignore")) return;
    const style = win.getComputedStyle(el);
    if (style.display === "none" || Number(style.opacity) === 0) return;
    if (style.position === "fixed") return;
    const rect = el.getBoundingClientRect();
    const elBottom = rect.bottom + scrollY;
    const onScreenX = rect.right > 0 && rect.left < viewportW;
    if (onScreenX && rect.width > 0 && rect.height > 0 && style.visibility !== "hidden") {
      bottom = Math.max(bottom, Math.min(elBottom, clipBottom));
    }
    const childClip = CLIPPING_OVERFLOW.has(style.overflowY)
      ? Math.min(clipBottom, elBottom)
      : clipBottom;
    if (childClip <= 0) return;
    for (const child of el.children) visit(child, childClip);
  };
  visit(doc.body, Infinity);
  return Math.ceil(bottom);
}

function cropCanvasHeight(canvas, height) {
  if (height >= canvas.height) return canvas;
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = height;
  out.getContext("2d").drawImage(canvas, 0, 0);
  return out;
}

/** Crop a full-document canvas to the region visible at (scrollX, scrollY) in CSS px. */
function cropCanvasToViewportRegion(fullCanvas, scrollX, scrollY, viewportW, viewportH, scale) {
  const srcX = Math.min(
    Math.round(scrollX * scale),
    Math.max(0, fullCanvas.width - viewportW * scale),
  );
  const srcY = Math.min(
    Math.round(scrollY * scale),
    Math.max(0, fullCanvas.height - viewportH * scale),
  );
  const srcW = Math.min(Math.round(viewportW * scale), fullCanvas.width - srcX);
  const srcH = Math.min(Math.round(viewportH * scale), fullCanvas.height - srcY);
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = Math.round(viewportW * scale);
  croppedCanvas.height = Math.round(viewportH * scale);
  const ctx = croppedCanvas.getContext("2d");
  ctx.drawImage(
    fullCanvas,
    srcX,
    srcY,
    srcW,
    srcH,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height,
  );
  return croppedCanvas;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}

/**
 * Visible viewport PNG of `doc` at the current scroll position (for feedback annotation).
 * Uses the same html2canvas pipeline as {@link captureDocumentFullPage}, then crops to the viewport.
 * @param {Document} doc
 * @param {Window} win
 * @returns {Promise<{ blob: Blob, width: number, height: number, cssWidth: number }>}
 */
export async function captureDocumentViewport(doc, win) {
  if (!doc?.body || !win) throw new Error("Preview is not ready for capture yet.");

  const docScroller = doc.scrollingElement || doc.documentElement;
  const containers = findPageScrollContainers(doc, win).filter((el) => el !== docScroller);
  const scrollers = [docScroller, ...containers];
  const savedScroll = scrollers.map((el) => [el, el.scrollTop, el.scrollLeft]);
  const unmark = markScrollContainers(doc, containers);

  const viewportW = Math.max(1, Math.floor(doc.documentElement.clientWidth || win.innerWidth || 1));
  const viewportH = Math.max(1, Math.floor(win.innerHeight || 1));
  const scrollX = win.scrollX ?? win.pageXOffset ?? 0;
  const scrollY = win.scrollY ?? win.pageYOffset ?? 0;

  try {
    await doc.fonts?.ready;

    const hiddenScroll = containers.reduce(
      (sum, el) => sum + Math.max(0, el.scrollHeight - el.clientHeight),
      0,
    );
    const estimatedH = Math.max(docScroller.scrollHeight, viewportH) + hiddenScroll;
    const maxArea = isSafariUserAgent(navigator.userAgent)
      ? FULL_PAGE_SHOT_MAX_AREA_SAFARI
      : FULL_PAGE_SHOT_MAX_AREA;

    const { default: html2canvas } = await import("html2canvas-pro");
    let scale = computeFullPageShotScale(viewportW, estimatedH, { maxArea });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      let fullCanvas = null;
      try {
        fullCanvas = await html2canvas(doc.documentElement, {
          scale,
          scrollX: 0,
          scrollY: 0,
          width: viewportW,
          windowWidth: viewportW,
          windowHeight: viewportH,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: async (cloneDoc) => prepareCloneForCapture(cloneDoc),
        });
      } catch {
        fullCanvas = null;
      }

      if (fullCanvas && fullCanvas.width > 0 && fullCanvas.height > 0) {
        const canvas = cropCanvasToViewportRegion(
          fullCanvas,
          scrollX,
          scrollY,
          viewportW,
          viewportH,
          scale,
        );
        const blob = await canvasToPngBlob(canvas);
        if (blob?.size) {
          return { blob, width: canvas.width, height: canvas.height, cssWidth: viewportW };
        }
      }
      scale = Math.max(0.25, Math.floor(scale * 50) / 100);
    }
    throw new Error("Page is too large to capture in this browser.");
  } finally {
    unmark();
    for (const [el, top, left] of savedScroll) {
      el.scrollTop = top;
      el.scrollLeft = left;
    }
  }
}

/**
 * Full-length PNG of `doc`, including content hidden inside inner scroll containers.
 * @param {Document} doc
 * @param {Window} win
 * @returns {Promise<{ blob: Blob, width: number, height: number, cssWidth: number }>}
 */
export async function captureDocumentFullPage(doc, win) {
  if (!doc?.body || !win) throw new Error("Preview is not ready for capture yet.");

  const docScroller = doc.scrollingElement || doc.documentElement;
  const containers = findPageScrollContainers(doc, win).filter((el) => el !== docScroller);
  const scrollers = [docScroller, ...containers];
  const savedScroll = scrollers.map((el) => [el, el.scrollTop, el.scrollLeft]);
  const unmark = markScrollContainers(doc, containers);

  try {
    await primeScrolledContent(scrollers);
    await doc.fonts?.ready;

    // clientWidth excludes the scrollbar, so the shot is exactly the width the page lays out at.
    const viewportW = Math.max(
      1,
      Math.floor(doc.documentElement.clientWidth || win.innerWidth || 1),
    );
    const viewportH = Math.max(1, Math.floor(win.innerHeight || 1));
    const hiddenScroll = containers.reduce(
      (sum, el) => sum + Math.max(0, el.scrollHeight - el.clientHeight),
      0,
    );
    const estimatedH = Math.max(docScroller.scrollHeight, viewportH) + hiddenScroll;
    const maxArea = isSafariUserAgent(navigator.userAgent)
      ? FULL_PAGE_SHOT_MAX_AREA_SAFARI
      : FULL_PAGE_SHOT_MAX_AREA;

    const { default: html2canvas } = await import("html2canvas-pro");
    let scale = computeFullPageShotScale(viewportW, estimatedH, { maxArea });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let canvas = null;
      let contentBottom = 0;
      try {
        canvas = await html2canvas(doc.documentElement, {
          scale,
          scrollX: 0,
          scrollY: 0,
          width: viewportW,
          windowWidth: viewportW,
          windowHeight: viewportH,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: async (cloneDoc) => {
            await prepareCloneForCapture(cloneDoc);
            contentBottom = measureVisibleContentBottom(cloneDoc, viewportW);
          },
        });
        if (canvas && contentBottom > 0) {
          const fitH = Math.ceil(Math.max(contentBottom, viewportH) * scale);
          canvas = cropCanvasHeight(canvas, fitH);
        }
      } catch {
        canvas = null;
      }
      const blob = canvas ? await canvasToPngBlob(canvas) : null;
      if (blob && blob.size > 0) {
        return { blob, width: canvas.width, height: canvas.height, cssWidth: viewportW };
      }
      scale = Math.max(0.25, Math.floor(scale * 50) / 100);
    }
    throw new Error("Page is too large to capture in this browser.");
  } finally {
    unmark();
    for (const [el, top, left] of savedScroll) {
      el.scrollTop = top;
      el.scrollLeft = left;
    }
  }
}

const SETTLE_POLL_MS = 150;
const DOM_QUIET_MS = 1_000;
/** SPAs often paint a shell first and fill it after data loads. */
const PAGE_SETTLE_MIN_MS = 1_500;
const PAGE_SETTLE_MAX_MS = 15_000;
const IMAGE_WAIT_MAX_MS = 5_000;
const LOADING_INDICATOR_SELECTOR = [
  '[aria-busy="true"]',
  '[role="progressbar"]',
  '[class*="skeleton" i]',
  '[class*="spinner" i]',
  '[class*="loading" i]',
].join(",");

function hasVisibleLoadingIndicator(doc) {
  for (const el of doc.querySelectorAll(LOADING_INDICATOR_SELECTOR)) {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) return true;
  }
  return false;
}

/** Wait for the DOM to stop changing and loading indicators to disappear (bounded). */
export async function waitForPageSettled(doc, signal) {
  const earliest = Date.now() + PAGE_SETTLE_MIN_MS;
  const deadline = Date.now() + PAGE_SETTLE_MAX_MS;
  while (!signal?.aborted) {
    await waitForDomQuiet(doc, signal, Math.max(0, deadline - Date.now()));
    const now = Date.now();
    if (now >= deadline) return;
    if (now < earliest) {
      await wait(earliest - now);
      continue;
    }
    if (!hasVisibleLoadingIndicator(doc)) return;
    await wait(SETTLE_POLL_MS * 2);
  }
}

function waitForDomQuiet(doc, signal, maxMs) {
  return new Promise((resolve) => {
    let quietTimer = null;
    let capTimer = null;
    let observer = null;
    const done = () => {
      observer?.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(capTimer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(done, DOM_QUIET_MS);
    });
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    quietTimer = setTimeout(done, DOM_QUIET_MS);
    capTimer = setTimeout(done, maxMs);
    signal?.addEventListener("abort", done, { once: true });
  });
}

export function waitForImages(doc) {
  const pending = [...doc.images].filter((img) => !img.complete && img.loading !== "lazy");
  if (!pending.length) return Promise.resolve();
  const loaded = pending.map(
    (img) =>
      new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      }),
  );
  return Promise.race([Promise.all(loaded), wait(IMAGE_WAIT_MAX_MS)]);
}
