import { detectReplacementKind, resolveReplacementElement } from "@/lib/previewImageReplace";
import {
  extractEmbedBrowsePathFromLocation,
  previewRoutePathname,
} from "@/lib/clientLinkEmbeddedPreviewSrc";
import { callPreviewBridge, isPreviewBridgeFrame } from "@/lib/previewBridge";
import {
  FEEDBACK_WIDGET_CHROME_SELECTOR,
  isEmbedFeedbackHostElement,
  isFeedbackWidgetChrome,
  pickHostElementAtClientPoint,
} from "@/embed/embedDocumentPick.util.js";

export {
  FEEDBACK_WIDGET_CHROME_SELECTOR,
  isEmbedFeedbackHostElement,
  isFeedbackWidgetChrome,
} from "@/embed/embedDocumentPick.util.js";

const MAX_OUTER_HTML = 800;
const MAX_TEXT = 200;
const MAX_SELECTOR_DEPTH = 10;

/**
 * Returns true when the preview iframe document is readable (same-origin / proxied).
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function canAccessIframeDocument(iframe) {
  if (!iframe) return false;
  try {
    const doc = iframe.contentDocument;
    return !!doc?.documentElement;
  } catch {
    return false;
  }
}

function truncate(s, max) {
  const t = typeof s === "string" ? s : String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** @param {Element} el */
function getReactFiberFromElement(el) {
  if (!el || el.nodeType !== 1) return null;
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$") || k === "__reactFiber");
  return key ? el[key] : null;
}

/**
 * React component names + dev source location from the DOM node (Vite dev builds).
 * @param {Element} el
 */
export function extractReactComponentContext(el) {
  const fiber = getReactFiberFromElement(el);
  if (!fiber) return null;

  /** @type {string[]} */
  const componentStack = [];
  /** @type {{ file: string, line?: number, column?: number } | null} */
  let source = null;

  let f = fiber;
  let depth = 0;
  while (f && depth < 12) {
    const t = f.type;
    if (typeof t === "function") {
      const name = t.displayName || t.name;
      if (name && name !== "Anonymous") componentStack.push(name);
    } else if (typeof t === "object" && t && typeof t.render === "function") {
      const name = t.displayName || t.render?.name || t.constructor?.name;
      if (name) componentStack.push(name);
    }
    if (!source) {
      const dbg = f._debugSource || f._debugOwner?._debugSource;
      if (dbg?.fileName) {
        source = {
          file: String(dbg.fileName).replace(/^.*\/src\//, "src/"),
          line: dbg.lineNumber,
          column: dbg.columnNumber,
        };
      }
    }
    f = f.return;
    depth += 1;
  }

  const uniqueStack = [...new Set(componentStack)].filter(Boolean);
  if (!uniqueStack.length && !source) return null;
  return { componentStack: uniqueStack, source };
}

/** @param {Element} el */
function parentElementSummary(el) {
  const p = el?.parentElement;
  if (!p || p.nodeType !== 1) return "";
  const tag = p.tagName?.toLowerCase() || "";
  const id = p.id ? `#${p.id}` : "";
  const text = truncate((p.innerText || "").trim().replace(/\s+/g, " "), 80);
  return text ? `${tag}${id} — "${text}"` : `${tag}${id}`;
}

function escapeId(id) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/([^\w-])/g, "\\$1");
}

/** @param {Element} el */
export function buildSelector(el) {
  if (!el || el.nodeType !== 1) return "";
  if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) {
    return `#${escapeId(el.id)}`;
  }
  const parts = [];
  let node = el;
  let depth = 0;
  while (
    node &&
    node.nodeType === 1 &&
    node !== node.ownerDocument?.documentElement &&
    depth < MAX_SELECTOR_DEPTH
  ) {
    const tag = node.tagName?.toLowerCase() || "unknown";
    if (node.id && /^[a-zA-Z][\w-]*$/.test(node.id)) {
      parts.unshift(`#${escapeId(node.id)}`);
      break;
    }
    const parent = node.parentElement;
    let part = tag;
    if (parent) {
      const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
      const idx = sameTag.indexOf(node) + 1;
      if (sameTag.length > 1) part += `:nth-of-type(${idx})`;
    }
    parts.unshift(part);
    node = parent;
    depth += 1;
  }
  return parts.join(" > ");
}

/** Human-readable ancestor chain, e.g. `div#root > div.flex.min-h-svh`. */
export function buildDomPathString(el, maxDepth = 12) {
  const parts = [];
  let n = el;
  let d = 0;
  while (n && n.nodeType === 1 && d < maxDepth) {
    const tag = n.tagName.toLowerCase();
    let seg = tag;
    if (n.id) seg = `${tag}#${n.id}`;
    else if (typeof n.className === "string" && n.className.trim()) {
      const c = n.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".");
      if (c) seg = `${tag}.${c}`;
    }
    parts.unshift(seg);
    if (tag === "html") break;
    n = n.parentElement;
    d += 1;
  }
  return parts.join(" > ");
}

const COMPUTED_STYLE_KEYS = [
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "display",
  "width",
  "height",
  "padding",
  "margin",
  "border-radius",
  "gap",
];

function snapshotComputedStyles(el) {
  const win = el.ownerDocument?.defaultView;
  if (!win) return null;
  let cs;
  try {
    cs = win.getComputedStyle(el);
  } catch {
    return null;
  }
  const out = {};
  for (const k of COMPUTED_STYLE_KEYS) {
    const v = cs.getPropertyValue(k);
    if (v && String(v).trim()) out[k] = String(v).trim();
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Keep the element the browser actually hit.
 * @param {Element} el
 */
export function refinePickTarget(el) {
  let cur = el;
  let steps = 0;
  while (cur && cur.nodeType === 1 && steps < 24) {
    const tag = cur.tagName?.toUpperCase();
    if (tag === "HTML" || tag === "BODY") {
      return el;
    }
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
      cur = cur.parentElement;
      steps += 1;
      continue;
    }
    return cur;
  }
  return el;
}

function computeAssetSrcHint(el) {
  if (!el || el.nodeType !== 1) return "";
  const tag = el.tagName?.toUpperCase();
  if (tag === "IMG") return (el.getAttribute("src") || "").slice(0, 800);
  if (tag === "PICTURE") {
    const im = el.querySelector("img");
    return im ? (im.getAttribute("src") || "").slice(0, 800) : "";
  }
  if (tag === "SVG") {
    const im = el.querySelector("image");
    const href =
      (im &&
        (im.getAttribute("href") || im.getAttributeNS?.("http://www.w3.org/1999/xlink", "href"))) ||
      "";
    return String(href).slice(0, 800);
  }
  const pics = el.querySelectorAll("picture");
  if (pics.length === 1) {
    const im = pics[0].querySelector("img");
    if (im) return (im.getAttribute("src") || "").slice(0, 800);
  }
  const imgs = el.querySelectorAll("img");
  if (imgs.length === 1) return (imgs[0].getAttribute("src") || "").slice(0, 800);
  return "";
}

/**
 * @param {Element} el
 * @param {Window} [win]
 */
export function serializePickedElement(el, win) {
  const target = resolveReplacementElement(el);
  if (!target || target.nodeType !== 1) return null;
  el = target;
  const doc = el.ownerDocument;
  const w = win || doc?.defaultView;
  let path = "";
  try {
    if (w?.location) {
      const browsePath = extractEmbedBrowsePathFromLocation(
        w.location.pathname || "",
        w.location.search || "",
        w.location.hash || "",
      );
      path = previewRoutePathname(browsePath);
    }
  } catch {
    path = "";
  }

  const tag = el.tagName?.toLowerCase() || "unknown";
  const className =
    typeof el.className === "string"
      ? el.className
      : el.className?.baseVal != null
        ? String(el.className.baseVal)
        : "";

  const componentHint =
    el.getAttribute("data-component") ||
    el.getAttribute("data-testid") ||
    el.getAttribute("data-cy") ||
    "";

  const domPath = buildDomPathString(el);
  const computedStyles = snapshotComputedStyles(el);
  const reactContext = extractReactComponentContext(el);
  const parentSummary = parentElementSummary(el);

  return {
    tag,
    id: el.id || "",
    className: className.trim(),
    role: el.getAttribute("role") || "",
    ariaLabel: el.getAttribute("aria-label") || "",
    href: tag === "a" ? el.getAttribute("href") || "" : "",
    dataComponent: el.getAttribute("data-component") || "",
    dataTestId: el.getAttribute("data-testid") || "",
    dataCy: el.getAttribute("data-cy") || "",
    componentHint,
    path,
    domPath,
    selector: buildSelector(el),
    textPreview: truncate((el.innerText || "").trim().replace(/\s+/g, " "), MAX_TEXT),
    outerHTML: truncate(el.outerHTML || "", MAX_OUTER_HTML),
    computedStyles,
    replacementKind: detectReplacementKind(el),
    assetSrcHint: computeAssetSrcHint(el),
    reactComponentStack: reactContext?.componentStack || [],
    reactSourceFile: reactContext?.source?.file || "",
    reactSourceLine: reactContext?.source?.line ?? null,
    parentSummary,
  };
}

/**
 * Map a rect from the iframe document viewport into overlay-local coordinates.
 * @param {Element} el
 * @param {HTMLIFrameElement} iframe
 * @param {HTMLElement} overlay
 */
export function elementRectToOverlayLocal(el, iframe, overlay) {
  if (!el || !iframe || !overlay) return null;
  const er = el.getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const originLeft = iframeRect.left + iframe.clientLeft;
  const originTop = iframeRect.top + iframe.clientTop;
  return {
    left: originLeft + er.left - overlayRect.left,
    top: originTop + er.top - overlayRect.top,
    width: er.width,
    height: er.height,
  };
}

/**
 * Map a rect reported in the iframe viewport (subdomain bridge) into overlay-local coordinates.
 * @param {{ left: number, top: number, width: number, height: number } | null | undefined} rect
 * @param {HTMLIFrameElement} iframe
 * @param {HTMLElement} overlay
 */
export function viewportRectToOverlayLocal(rect, iframe, overlay) {
  if (!rect || !iframe || !overlay) return null;
  const iframeRect = iframe.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  return {
    left: iframeRect.left + iframe.clientLeft + rect.left - overlayRect.left,
    top: iframeRect.top + iframe.clientTop + rect.top - overlayRect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Pointer position → coordinates for iframe document.elementFromPoint.
 * @param {number} clientX
 * @param {number} clientY
 * @param {HTMLIFrameElement} iframe
 */
export function clientPointToIframeViewport(clientX, clientY, iframe) {
  const iframeRect = iframe.getBoundingClientRect();
  return {
    x: clientX - iframeRect.left - iframe.clientLeft,
    y: clientY - iframeRect.top - iframe.clientTop,
  };
}

/**
 * Resolve element bounding box in overlay coordinates from a CSS selector.
 * @param {HTMLIFrameElement} iframe
 * @param {HTMLElement} overlay
 * @param {string} selector
 */
export function measurePinnedBox(iframe, overlay, selector) {
  if (!iframe || !overlay || !selector?.trim()) return null;
  let doc;
  try {
    doc = iframe.contentDocument;
  } catch {
    return null;
  }
  if (!doc) return null;
  let el;
  try {
    el = doc.querySelector(selector);
  } catch {
    return null;
  }
  if (!el || el.nodeType !== 1) return null;
  return elementRectToOverlayLocal(el, iframe, overlay);
}

/**
 * Click offset inside element bbox as 0–1 ratios (Figma FrameOffset style).
 * @param {Element} el
 * @param {HTMLIFrameElement} iframe
 * @param {number} clientX
 * @param {number} clientY
 */
export function computeOffsetRatio(el, iframe, clientX, clientY) {
  const { x: ox, y: oy } = clientPointToIframeViewport(clientX, clientY, iframe);
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: Math.min(1, Math.max(0, (ox - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (oy - rect.top) / rect.height)),
  };
}

/**
 * Build persisted comment anchor JSON from a picked element context.
 * @param {ReturnType<typeof serializePickedElement>} serialized
 * @param {Window} win
 * @param {{ x: number, y: number }} offsetRatio
 */
export function buildCommentAnchor(serialized, win, offsetRatio) {
  if (!serialized) return null;
  let documentScroll = { x: 0, y: 0 };
  let viewport = { w: 0, h: 0 };
  try {
    if (win) {
      documentScroll = { x: win.scrollX || 0, y: win.scrollY || 0 };
      viewport = { w: win.innerWidth || 0, h: win.innerHeight || 0 };
    }
  } catch {
    /* cross-origin guard */
  }
  return {
    anchorType: "element",
    previewPath: serialized.path || "/",
    selector: serialized.selector || "",
    domPath: serialized.domPath || "",
    offsetRatio: offsetRatio || { x: 0.5, y: 0.5 },
    reactComponentStack: serialized.reactComponentStack || [],
    textFingerprint: serialized.textPreview || "",
    viewport,
    documentScroll,
    tag: serialized.tag || "element",
  };
}

/**
 * Comment anchor from a subdomain bridge `pickAt` result.
 * @param {{ context?: Record<string, any>, rect?: { left: number, top: number, width: number, height: number }, scroll?: { x?: number, y?: number }, viewport?: { w?: number, h?: number } } | null | undefined} pick
 * @param {{ x: number, y: number }} point click position in the iframe viewport
 */
export function buildCommentAnchorFromBridgePick(pick, point) {
  const ctx = pick?.context;
  if (!ctx || typeof ctx !== "object") return null;
  const r = pick.rect;
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const offsetRatio =
    r && r.width > 0 && r.height > 0
      ? { x: clamp01((point.x - r.left) / r.width), y: clamp01((point.y - r.top) / r.height) }
      : { x: 0.5, y: 0.5 };
  const anchor = buildCommentAnchor(
    { ...ctx, path: previewRoutePathname(ctx.path || "/") },
    null,
    offsetRatio,
  );
  return {
    ...anchor,
    documentScroll: { x: Number(pick.scroll?.x) || 0, y: Number(pick.scroll?.y) || 0 },
    viewport: { w: Number(pick.viewport?.w) || 0, h: Number(pick.viewport?.h) || 0 },
  };
}

/**
 * Pick a host-page element under the pointer (Code Snippet embed — no iframe).
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ el: Element, win: Window } | null}
 */
export function pickDocumentElementAtClientPoint(clientX, clientY) {
  return pickHostElementAtClientPoint(clientX, clientY, {
    refinePickTarget,
    resolveReplacementElement,
  });
}

/**
 * Pick the DOM element under a pointer inside the preview iframe.
 * @param {HTMLIFrameElement} iframe
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ el: Element, win: Window } | null}
 */
export function pickElementAtClientPoint(iframe, clientX, clientY) {
  if (!iframe || !canAccessIframeDocument(iframe)) return null;
  const { x: ox, y: oy } = clientPointToIframeViewport(clientX, clientY, iframe);
  if (ox < 0 || oy < 0 || ox > iframe.clientWidth || oy > iframe.clientHeight) {
    return null;
  }
  let doc;
  let win;
  try {
    doc = iframe.contentDocument;
    win = iframe.contentWindow;
  } catch {
    return null;
  }
  if (!doc || !win) return null;
  let el = doc.elementFromPoint(ox, oy);
  while (el && el.nodeType !== 1) el = el.parentElement;
  if (!el) return null;
  el = refinePickTarget(el);
  el = resolveReplacementElement(el);
  const top = el.tagName?.toUpperCase();
  if (top === "HTML" || top === "BODY") return null;
  return { el, win };
}

/**
 * Resolve anchor selector to a live DOM element inside the preview iframe.
 * @param {HTMLIFrameElement} iframe
 * @param {{ selector?: string }} anchor
 */
export function resolveAnchorElement(iframe, anchor) {
  if (!iframe || !anchor?.selector?.trim()) return null;
  try {
    const doc = iframe.contentDocument;
    if (!doc) return null;
    const el = doc.querySelector(anchor.selector);
    return el && el.nodeType === 1 ? el : null;
  } catch {
    return null;
  }
}

/**
 * Restore scroll position then scroll the anchored element into view.
 * @param {HTMLIFrameElement} iframe
 * @param {{ selector?: string, documentScroll?: { x?: number, y?: number } }} anchor
 */
export function scrollIframeToAnchor(iframe, anchor) {
  if (iframe && isPreviewBridgeFrame(iframe)) {
    void callPreviewBridge(iframe, "scrollToAnchor", {
      selector: anchor?.selector || "",
      scroll: anchor?.documentScroll || null,
    }).catch(() => {});
    return true;
  }
  if (!iframe || !canAccessIframeDocument(iframe)) return false;
  let win;
  try {
    win = iframe.contentWindow;
  } catch {
    return false;
  }
  if (!win) return false;
  const scroll = anchor?.documentScroll;
  if (scroll && (scroll.x != null || scroll.y != null)) {
    try {
      win.scrollTo(scroll.x || 0, scroll.y || 0);
    } catch {
      /* ignore */
    }
  }
  const el = resolveAnchorElement(iframe, anchor);
  if (!el) return false;
  try {
    el.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build visual-pick context from a stored comment anchor (live DOM when possible).
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {Record<string, unknown> | null | undefined} anchor
 * @param {string} [previewPathFallback]
 */
export function anchorToPickedElementContext(iframe, anchor, previewPathFallback = "/") {
  if (!anchor || typeof anchor !== "object") return null;

  if (iframe && canAccessIframeDocument(iframe)) {
    scrollIframeToAnchor(iframe, anchor);
    const el = resolveAnchorElement(iframe, anchor);
    if (el) {
      let win;
      try {
        win = iframe.contentWindow;
      } catch {
        win = undefined;
      }
      const serialized = serializePickedElement(el, win);
      if (serialized) return serialized;
    }
  } else if (iframe && isPreviewBridgeFrame(iframe)) {
    scrollIframeToAnchor(iframe, anchor);
  }

  const path =
    typeof anchor.previewPath === "string" && anchor.previewPath.trim()
      ? previewRoutePathname(anchor.previewPath)
      : previewRoutePathname(previewPathFallback);

  return {
    tag: typeof anchor.tag === "string" ? anchor.tag : "element",
    id: "",
    className: "",
    role: "",
    ariaLabel: "",
    href: "",
    dataComponent: "",
    dataTestId: "",
    dataCy: "",
    componentHint: "",
    path,
    domPath: typeof anchor.domPath === "string" ? anchor.domPath : "",
    selector: typeof anchor.selector === "string" ? anchor.selector : "",
    textPreview: typeof anchor.textFingerprint === "string" ? anchor.textFingerprint : "",
    outerHTML: "",
    computedStyles: {},
    replacementKind: null,
    assetSrcHint: "",
    reactComponentStack: Array.isArray(anchor.reactComponentStack)
      ? anchor.reactComponentStack.filter(Boolean)
      : [],
    reactSourceFile: "",
    reactSourceLine: null,
    parentSummary: "",
  };
}

/**
 * Pin position on overlay from anchor (element box + offset ratio).
 * @param {HTMLIFrameElement} iframe
 * @param {HTMLElement} overlay
 * @param {{ selector?: string, offsetRatio?: { x?: number, y?: number } }} anchor
 */
function escapeAttrValue(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Single-line opening tag for inspector / prompts (truncated class list). */
export function buildOpeningTagSnippet(ctx, maxClassLen = 260) {
  if (!ctx?.tag) return "";
  let out = `<${ctx.tag}`;
  if (ctx.id) out += ` id="${escapeAttrValue(ctx.id)}"`;
  if (ctx.className) {
    const c =
      ctx.className.length > maxClassLen
        ? `${ctx.className.slice(0, maxClassLen - 1)}…`
        : ctx.className;
    out += ` class="${escapeAttrValue(c)}"`;
  }
  if (ctx.role) out += ` role="${escapeAttrValue(ctx.role)}"`;
  if (ctx.href) out += ` href="${escapeAttrValue(ctx.href)}"`;
  if (ctx.ariaLabel) out += ` aria-label="${escapeAttrValue(ctx.ariaLabel)}"`;
  if (ctx.dataTestId) out += ` data-testid="${escapeAttrValue(ctx.dataTestId)}"`;
  if (ctx.dataComponent) out += ` data-component="${escapeAttrValue(ctx.dataComponent)}"`;
  if (ctx.dataCy) out += ` data-cy="${escapeAttrValue(ctx.dataCy)}"`;
  out += ">";
  return out;
}

export function measureAnchorPinPosition(iframe, overlay, anchor) {
  const box = measurePinnedBox(iframe, overlay, anchor?.selector);
  if (!box) return null;
  const ox = anchor?.offsetRatio?.x ?? 0.5;
  const oy = anchor?.offsetRatio?.y ?? 0.5;
  return {
    box,
    pinLeft: box.left + box.width * ox,
    pinTop: box.top + box.height * oy,
  };
}

/** Approximate inline comment composer size for overlay placement. */
export const COMMENT_COMPOSER_LAYOUT = {
  width: 420,
  height: 340,
  offset: 12,
  padding: 8,
};

/**
 * Position the new-comment composer beside a pin, flipping above when near the bottom edge.
 * @param {{
 *   pinLeft: number,
 *   pinTop: number,
 *   overlayWidth: number,
 *   overlayHeight: number,
 *   composerWidth?: number,
 *   composerHeight?: number,
 *   offset?: number,
 *   padding?: number,
 * }} params
 */
export function computeCommentComposerPosition({
  pinLeft,
  pinTop,
  overlayWidth,
  overlayHeight,
  composerWidth = COMMENT_COMPOSER_LAYOUT.width,
  composerHeight = COMMENT_COMPOSER_LAYOUT.height,
  offset = COMMENT_COMPOSER_LAYOUT.offset,
  padding = COMMENT_COMPOSER_LAYOUT.padding,
}) {
  const maxLeft = Math.max(padding, overlayWidth - composerWidth - padding);
  let left = Math.min(Math.max(padding, pinLeft + offset), maxLeft);

  let top = pinTop + offset;
  if (top + composerHeight + padding > overlayHeight) {
    top = pinTop - composerHeight - offset;
  }
  const maxTop = Math.max(padding, overlayHeight - composerHeight - padding);
  top = Math.min(Math.max(padding, top), maxTop);

  return { left, top };
}
