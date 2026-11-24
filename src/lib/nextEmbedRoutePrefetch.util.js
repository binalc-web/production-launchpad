import {
  extractEmbedBrowsePathFromLocation,
  isAuthBrowsePath,
} from "./clientLinkEmbeddedPreviewSrc.js";

const SKIP_HREF_RE = /^(mailto:|tel:|javascript:|data:)/i;

/**
 * @param {string} href
 * @returns {boolean}
 */
export function shouldSkipNextEmbedPrefetchHref(href) {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("#")) return true;
  if (SKIP_HREF_RE.test(raw)) return true;
  return false;
}

/**
 * In-app browse path for a Next iframe `<a href>` (no embed prefix). Empty if skip/external/auth.
 * @param {string} href
 * @param {{ baseHref?: string, origin?: string }} [opts]
 * @returns {string}
 */
export function resolveNextInAppBrowsePath(href, opts = {}) {
  if (shouldSkipNextEmbedPrefetchHref(href)) return "";
  const baseHref = String(opts.baseHref || "http://127.0.0.1/");
  let url;
  try {
    url = new URL(String(href).trim(), baseHref);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  const raw = String(href).trim();
  const allowedOrigin = String(opts.origin || "").replace(/\/$/, "");
  if (
    allowedOrigin &&
    (raw.startsWith("http://") || raw.startsWith("https://")) &&
    url.origin !== allowedOrigin
  ) {
    return "";
  }
  const browse = extractEmbedBrowsePathFromLocation(url.pathname || "/", url.search || "", "");
  if (isAuthBrowsePath(browse)) return "";
  return browse;
}

/**
 * Resolve an in-app Next `<a href>` to an embed-prefixed path.
 * @param {string} href
 * @param {{ port: number, baseHref?: string, origin?: string }} opts
 * @returns {string} pathname+search under `/embedded/<port>`, or ""
 */
export function resolveNextEmbedPrefetchUrl(href, opts = {}) {
  const n = Number(opts.port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return "";
  const browse = resolveNextInAppBrowsePath(href, {
    baseHref: opts.baseHref || `http://127.0.0.1/embedded/${n}/`,
    origin: opts.origin,
  });
  if (!browse) return "";
  const pathOnly = String(browse.split("#")[0] || "/");
  const [pathname, search = ""] = pathOnly.split("?");
  const p = pathname || "/";
  const embedPath = p === "/" ? `/embedded/${n}/` : `/embedded/${n}${p}`;
  return `${embedPath}${search ? `?${search}` : ""}`;
}

export const NEXT_IDLE_COMPILE_GAP_MS = 1500;
export const NEXT_IDLE_COMPILE_MAX_URLS = 8;

/**
 * Unique in-app sidebar/nav embed URLs from the preview iframe (no hover listeners).
 * @param {{ contentDocument?: Document | { querySelectorAll?: Function } } | null} iframe
 * @param {{
 *   port: number,
 *   baseHref?: string,
 *   origin?: string,
 *   max?: number,
 *   skipBrowsePath?: string,
 * }} opts
 * @returns {string[]}
 */
export function collectIframeNextNavPrefetchUrls(iframe, opts = {}) {
  const max =
    Number(opts.max) > 0 ? Math.floor(Number(opts.max)) : NEXT_IDLE_COMPILE_MAX_URLS;
  const port = Number(opts.port);
  if (!iframe || !Number.isInteger(port) || port < 1 || port > 65535) return [];
  let doc;
  try {
    doc = iframe.contentDocument;
  } catch {
    return [];
  }
  if (!doc || typeof doc.querySelectorAll !== "function") return [];
  const origin = String(
    opts.origin || (typeof window !== "undefined" ? window.location.origin : ""),
  );
  const baseHref = String(
    opts.baseHref ||
      (typeof doc.baseURI === "string" && doc.baseURI
        ? doc.baseURI
        : origin
          ? `${origin}/embedded/${port}/`
          : `http://127.0.0.1/embedded/${port}/`),
  );
  const skip = new Set();
  if (opts.skipBrowsePath) {
    const skipUrl = resolveNextEmbedPrefetchUrl(opts.skipBrowsePath, { port, baseHref, origin });
    if (skipUrl) skip.add(skipUrl);
  }
  const seen = new Set();
  const out = [];
  const anchors = doc.querySelectorAll("a[href]");
  for (const a of anchors) {
    const href = a?.getAttribute?.("href") ?? a?.href ?? "";
    const url = resolveNextEmbedPrefetchUrl(href, { port, baseHref, origin });
    if (!url || skip.has(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

function idleCompileSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sequential same-origin document fetch so later in-app clicks hit compiled routes.
 * Max 1 in-flight; pauses while compiling; aborts when the tab is hidden.
 *
 * @param {string[]} urls
 * @param {{
 *   max?: number,
 *   gapMs?: number,
 *   fetchImpl?: typeof fetch,
 *   shouldAbort?: () => boolean,
 *   shouldPause?: () => boolean,
 *   isHidden?: () => boolean,
 * }} [opts]
 * @returns {Promise<{ compiled: number, total: number, aborted: boolean, paused: boolean }>}
 */
export async function runSequentialNextEmbedIdleCompile(urls, opts = {}) {
  const max =
    Number(opts.max) > 0 ? Math.floor(Number(opts.max)) : NEXT_IDLE_COMPILE_MAX_URLS;
  const gapMs = Number(opts.gapMs) >= 0 ? Number(opts.gapMs) : NEXT_IDLE_COMPILE_GAP_MS;
  const list = Array.isArray(urls)
    ? [...new Set(urls.filter(Boolean))].slice(0, max)
    : [];
  const fetchImpl =
    opts.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  const isHidden =
    opts.isHidden || (() => typeof document !== "undefined" && Boolean(document.hidden));
  let compiled = 0;
  let paused = false;
  let aborted = false;

  for (let i = 0; i < list.length; i++) {
    if (opts.shouldAbort?.()) {
      aborted = true;
      break;
    }
    while (opts.shouldPause?.()) {
      paused = true;
      if (opts.shouldAbort?.()) {
        aborted = true;
        break;
      }
      await idleCompileSleep(gapMs);
    }
    if (aborted) break;
    if (isHidden()) {
      aborted = true;
      break;
    }
    if (fetchImpl) {
      try {
        await fetchImpl(list[i], {
          credentials: "same-origin",
          headers: { Accept: "text/html" },
        });
        compiled += 1;
      } catch {
        /* ignore failed idle compile */
      }
    }
    if (i < list.length - 1) {
      await idleCompileSleep(gapMs);
    }
  }

  return { compiled, total: list.length, aborted, paused };
}
