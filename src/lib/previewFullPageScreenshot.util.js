export const FULL_PAGE_SHOT_TARGET_SCALE = 2;
/** Firefox/Chrome reject canvases taller or wider than ~32k px. */
export const FULL_PAGE_SHOT_MAX_DIMENSION = 32000;
/** Safari caps canvas area at ~16.7M px; other engines tolerate far more. */
export const FULL_PAGE_SHOT_MAX_AREA_SAFARI = 16_000_000;
export const FULL_PAGE_SHOT_MAX_AREA = 120_000_000;

export function isSafariUserAgent(userAgent = "") {
  return /Safari\//.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR|Android)\//.test(userAgent);
}

/**
 * Largest render scale (≤ target) that keeps a width×height page inside browser canvas limits.
 * @param {number} width CSS px
 * @param {number} height CSS px
 * @param {{ targetScale?: number, maxArea?: number, maxDimension?: number }} [opts]
 */
export function computeFullPageShotScale(width, height, opts = {}) {
  const targetScale = opts.targetScale ?? FULL_PAGE_SHOT_TARGET_SCALE;
  const maxArea = opts.maxArea ?? FULL_PAGE_SHOT_MAX_AREA;
  const maxDimension = opts.maxDimension ?? FULL_PAGE_SHOT_MAX_DIMENSION;
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const scale = Math.min(
    targetScale,
    maxDimension / w,
    maxDimension / h,
    Math.sqrt(maxArea / (w * h)),
  );
  return Math.max(0.1, Math.floor(scale * 100) / 100);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Readable Figma frame name from a preview route: "/deals/new-deal" → "Deals / New deal". */
export function defaultPreviewScreenName(route) {
  const path = String(route || "/").split(/[?#]/)[0];
  const parts = path
    .split("/")
    .map((p) => decodeURIComponentSafe(p).replace(/[-_]+/g, " ").trim())
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return parts.length ? parts.join(" / ") : "Home";
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const pad2 = (n) => String(n).padStart(2, "0");

function fileStamp(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(
    date.getHours(),
  )}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

/**
 * `<project>-<route>-<YYYYMMDD-HHmmss>.png`; route "/" becomes "home".
 * @param {{ projectName?: string, route?: string, date?: Date }} [opts]
 */
export function buildFullPageShotFilename({ projectName, route, date = new Date() } = {}) {
  const routePath = String(route || "/").split(/[?#]/)[0];
  const parts = [slugify(projectName) || "preview", slugify(routePath) || "home", fileStamp(date)];
  return `${parts.join("-")}.png`;
}

/** `<project>-screens-<YYYYMMDD-HHmmss>.zip` */
export function buildScreensZipFilename({ projectName, date = new Date() } = {}) {
  return `${slugify(projectName) || "preview"}-screens-${fileStamp(date)}.zip`;
}

/** ZIP entry name that keeps the export order: `03-deals-new-deal.png`. */
export function buildScreenZipEntryName(index, route) {
  return `${pad2(index + 1)}-${slugify(route) || "home"}.png`;
}

export const PREVIEW_SCREEN_EXPORT_MAX = 50;

const ASSET_PATH_RE =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|pdf|zip|csv|xlsx?|docx?|pptx?|txt|json|xml|mp4|webm|mp3|wav|woff2?|ttf|js|css|map)$/i;
const NON_SCREEN_PREFIX_RE = /^\/(api|_next|@vite|@fs|@id|node_modules|static\/media)(\/|$)/;

/**
 * Stable key for a preview screen: pathname plus a hash-router route (`#/deals`).
 * Query strings and in-page anchors (`#pricing`) are dropped.
 */
export function previewScreenRouteKey(browsePath) {
  const raw = String(browsePath || "").trim();
  if (!raw) return "";
  const hashIdx = raw.indexOf("#");
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : "";
  let path = (hashIdx >= 0 ? raw.slice(0, hashIdx) : raw).split("?")[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  let hashRoute = "";
  if (hash.startsWith("#/")) {
    hashRoute = hash.split("?")[0].replace(/\/+$/, "");
    if (hashRoute === "#") hashRoute = "";
  }
  return `${path}${hashRoute}`;
}

/**
 * In-app route for a link inside the preview, or "" when it leaves the app or points at a file.
 * Strips the `/embedded/<port>` proxy prefix.
 * @param {string} href Absolute or relative link URL
 * @param {string} appOrigin Origin of the preview document
 */
export function previewRouteFromHref(href, appOrigin) {
  if (!href || !appOrigin) return "";
  let url;
  try {
    url = new URL(href, appOrigin);
  } catch {
    return "";
  }
  if (url.origin !== appOrigin || !/^https?:$/.test(url.protocol)) return "";
  let path = url.pathname;
  const embedded = path.match(/^\/embedded\/\d{1,5}(\/.*)?$/);
  if (embedded) path = embedded[1] || "/";
  if (ASSET_PATH_RE.test(path) || NON_SCREEN_PREFIX_RE.test(path)) return "";
  return previewScreenRouteKey(`${path}${url.hash}`);
}

/**
 * Deduped screen candidates: home first, then the current screen, then A→Z.
 * @param {{ current?: string, sources?: Array<Iterable<string>>, isExcluded?: (route: string) => boolean }} opts
 */
export function mergePreviewScreenRoutes({ current, sources = [], isExcluded = () => false } = {}) {
  const currentKey = previewScreenRouteKey(current);
  const seen = new Set();
  for (const list of [currentKey ? [currentKey] : [], ...sources]) {
    for (const raw of list || []) {
      const key = previewScreenRouteKey(raw);
      if (key && !isExcluded(key)) seen.add(key);
    }
  }
  const rank = (route) => (route === "/" ? 0 : route === currentKey ? 1 : 2);
  return [...seen].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
