import {
  callPreviewBridge,
  getPreviewBridgeState,
  getPreviewEmbedAccessToken,
  isPreviewBridgeFrame,
  normalizePreviewEmbedOrigin,
} from "./previewBridge.js";

/** postMessage type from embed iframe → Client Link parent on in-app navigation. */
export const EMBED_ROUTE_MESSAGE_TYPE = "launchpad:embed-route";

/** Parent sessionStorage key prefix for last non-auth preview route per project slug. */
export const PERSISTED_BROWSE_PATH_KEY_PREFIX = "client-link-preview-path:";

/** Parent localStorage key prefix for UI comments mode per project slug. */
export const PERSISTED_COMMENTS_MODE_KEY_PREFIX = "client-link-comments-mode:";

const AUTH_BROWSE_PATH_RE = /^\/(?:login|signin|sign-in|auth|register|signup|sign-up)(?:\/|$)/i;

const EMBED_WRAPPER_QUERY_KEYS = new Set(["embed_frame", "embed_port", "_pv", "version"]);

/**
 * Strip embed-wrapper query params from a stored browse path so we never duplicate
 * `embed_frame`, `embed_port`, or `_pv` when rebuilding the iframe src.
 */
export function sanitizeEmbedBrowsePath(browsePath = "") {
  let raw = String(browsePath || "").trim();
  if (!raw) return "";

  let hash = "";
  const hashIdx = raw.indexOf("#");
  if (hashIdx >= 0) {
    hash = raw.slice(hashIdx);
    raw = raw.slice(0, hashIdx);
  }

  let path = raw;
  let query = "";
  const queryIdx = raw.indexOf("?");
  if (queryIdx >= 0) {
    path = raw.slice(0, queryIdx) || "/";
    query = raw.slice(queryIdx + 1);
  }
  if (!path.startsWith("/")) path = `/${path}`;

  const params = new URLSearchParams(query);
  for (const key of [...params.keys()]) {
    if (EMBED_WRAPPER_QUERY_KEYS.has(key)) params.delete(key);
  }
  const remaining = params.toString();
  return `${path}${remaining ? `?${remaining}` : ""}${hash}`;
}

/** Pathname-only route key for UI comment matching (ignores query and hash). */
export function previewRoutePathname(browsePath = "") {
  const sanitized = sanitizeEmbedBrowsePath(browsePath);
  if (!sanitized) return "/";
  let raw = sanitized;
  const hashIdx = raw.indexOf("#");
  if (hashIdx >= 0) raw = raw.slice(0, hashIdx);
  const queryIdx = raw.indexOf("?");
  const pathOnly = queryIdx >= 0 ? raw.slice(0, queryIdx) : raw;
  return pathOnly || "/";
}

/** True when two browse paths refer to the same in-app route (pathname only). */
export function previewRoutesMatch(pathA = "", pathB = "") {
  return previewRoutePathname(pathA) === previewRoutePathname(pathB);
}

/**
 * Parse user-typed preview URL/path into an in-app browse path.
 * Accepts `/route`, full URLs, or `/embedded/<port>/route` paste.
 * @param {string} raw
 */
export function parsePreviewUrlInput(raw = "") {
  let v = String(raw || "").trim();
  if (!v) return "";

  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      v = `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return "";
    }
  }

  const embedMatch = v.match(/^\/embedded\/\d{1,5}(\/.*)?$/);
  if (embedMatch) {
    v = embedMatch[1] || "/";
    if (!v.startsWith("/")) v = `/${v}`;
  } else if (!v.startsWith("/")) {
    v = `/${v}`;
  }

  return sanitizeEmbedBrowsePath(v);
}

/**
 * Build embed iframe URL for an in-app route (pathname + optional hash).
 * @param {number} port
 * @param {string} browsePath
 * @param {string} currentSearch embed query string from iframe location
 */
function buildEmbedNavigateUrl(port, browsePath, currentSearch = "") {
  const sanitized = sanitizeEmbedBrowsePath(browsePath);
  let pathPart = sanitized || "/";
  let hash = "";
  const hashIdx = pathPart.indexOf("#");
  if (hashIdx >= 0) {
    hash = pathPart.slice(hashIdx);
    pathPart = pathPart.slice(0, hashIdx) || "/";
  }
  let extraSearch = "";
  const queryIdx = pathPart.indexOf("?");
  if (queryIdx >= 0) {
    extraSearch = pathPart.slice(queryIdx);
    pathPart = pathPart.slice(0, queryIdx) || "/";
  }
  if (!pathPart.startsWith("/")) pathPart = `/${pathPart}`;

  const embedPrefix = `/embedded/${port}`;
  const nextPathname = pathPart === "/" ? `${embedPrefix}/` : `${embedPrefix}${pathPart}`;

  const baseParams = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  if (extraSearch) {
    const appParams = new URLSearchParams(
      extraSearch.startsWith("?") ? extraSearch.slice(1) : extraSearch,
    );
    for (const [key, value] of appParams) {
      if (!EMBED_WRAPPER_QUERY_KEYS.has(key)) baseParams.set(key, value);
    }
  }
  const qs = baseParams.toString();
  return `${nextPathname}${qs ? `?${qs}` : ""}${hash}`;
}

/**
 * Navigate embed iframe to an in-app route without rebuilding parent iframe src.
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {number | null | undefined} port
 * @param {string} browsePath
 */
export function navigateEmbedIframeToAppRoute(iframe, port, browsePath = "") {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535 || !iframe) return false;
  const target = sanitizeEmbedBrowsePath(browsePath);
  if (!target || isAuthBrowsePath(target)) return false;
  if (isPreviewBridgeFrame(iframe)) {
    const current = sanitizeEmbedBrowsePath(getPreviewBridgeState(iframe)?.path || "");
    if (current !== target)
      void callPreviewBridge(iframe, "navigate", { path: target }).catch(() => {});
    return true;
  }
  try {
    const win = iframe.contentWindow;
    const loc = win?.location;
    if (!loc) return false;
    const currentBrowse = extractEmbedBrowsePathFromLocation(loc.pathname, loc.search, loc.hash);
    if (sanitizeEmbedBrowsePath(currentBrowse) === target) return true;

    const nextUrl = buildEmbedNavigateUrl(n, target, loc.search || "");
    const currentUrl = `${loc.pathname}${loc.search || ""}${loc.hash || ""}`;
    if (currentUrl !== nextUrl) {
      win.location.replace(nextUrl);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a same-origin iframe location into an in-app browse path (no embed prefix).
 * @param {string} pathname
 * @param {string} [search]
 * @param {string} [hash]
 */
export function extractEmbedBrowsePathFromLocation(pathname = "/", search = "", hash = "") {
  let pathPart = pathname || "/";
  const embedPrefix = pathPart.match(/^\/embedded\/(\d{1,5})(\/.*)?$/);
  if (embedPrefix) {
    pathPart = embedPrefix[2] || "/";
    if (!pathPart.startsWith("/")) pathPart = `/${pathPart}`;
  }
  return sanitizeEmbedBrowsePath(`${pathPart}${search}${hash}`);
}

/** True when the in-app browse path is an auth/sign-in route (including hash-router variants). */
export function isAuthBrowsePath(browsePath = "") {
  let raw = String(browsePath || "").trim();
  if (!raw) return false;

  let hash = "";
  const hashIdx = raw.indexOf("#");
  if (hashIdx >= 0) {
    hash = raw.slice(hashIdx);
    raw = raw.slice(0, hashIdx);
  }

  if (hash) {
    const hashPath = hash.slice(1).split("?")[0];
    const normalizedHash = hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
    if (AUTH_BROWSE_PATH_RE.test(normalizedHash)) return true;
  }

  const pathOnly = raw.split("?")[0] || "/";
  return AUTH_BROWSE_PATH_RE.test(pathOnly);
}

/** @param {string} projectSlug */
export function buildPersistedBrowsePathKey(projectSlug) {
  const slug = String(projectSlug || "").trim();
  if (!slug) return "";
  return `${PERSISTED_BROWSE_PATH_KEY_PREFIX}${slug}`;
}

/** @param {string} projectSlug */
export function loadPersistedBrowsePath(projectSlug) {
  const key = buildPersistedBrowsePathKey(projectSlug);
  if (!key || typeof window === "undefined") return "";
  try {
    return sanitizeEmbedBrowsePath(window.sessionStorage.getItem(key) || "");
  } catch {
    return "";
  }
}

/** @param {string} projectSlug @param {string} browsePath */
export function savePersistedBrowsePath(projectSlug, browsePath) {
  const key = buildPersistedBrowsePathKey(projectSlug);
  const next = sanitizeEmbedBrowsePath(browsePath);
  if (!key || !next || typeof window === "undefined") return;
  if (isAuthBrowsePath(next)) return;
  try {
    window.sessionStorage.setItem(key, next);
  } catch {
    /* quota / private mode */
  }
}

/** @param {string} projectSlug */
export function buildPersistedCommentsModeKey(projectSlug) {
  const slug = String(projectSlug || "").trim();
  if (!slug) return "";
  return `${PERSISTED_COMMENTS_MODE_KEY_PREFIX}${slug}`;
}

/** @param {string} projectSlug */
export function loadPersistedCommentsMode(projectSlug) {
  const key = buildPersistedCommentsModeKey(projectSlug);
  if (!key || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** @param {string} projectSlug @param {boolean} active */
export function savePersistedCommentsMode(projectSlug, active) {
  const key = buildPersistedCommentsModeKey(projectSlug);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, active ? "1" : "0");
  } catch {
    /* quota / private mode */
  }
}

/**
 * Read the current in-app route from a same-origin preview iframe.
 * @param {HTMLIFrameElement | null | undefined} iframe
 */
export function readIframeBrowsePath(iframe) {
  if (!iframe) return "";
  if (isPreviewBridgeFrame(iframe)) {
    return sanitizeEmbedBrowsePath(getPreviewBridgeState(iframe)?.path || "");
  }
  try {
    const doc = iframe.contentDocument;
    if (!doc?.documentElement) return "";
    const loc = iframe.contentWindow?.location;
    if (!loc) return "";
    return extractEmbedBrowsePathFromLocation(loc.pathname, loc.search, loc.hash);
  } catch {
    return "";
  }
}

/**
 * True when the iframe left `/embedded/<port>/` (Next client nav) but is still
 * the same preview session (embed_port cookie matches expected port).
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {number | null | undefined} expectedPort
 */
export function iframeIsEmbedPortBreakout(iframe, expectedPort) {
  const n = Number(expectedPort);
  if (!Number.isInteger(n) || n < 1 || n > 65535 || !iframe) return false;
  if (isPreviewBridgeFrame(iframe)) return false;
  try {
    const path = String(iframe.contentWindow?.location?.pathname || "");
    if (!path || path === "/") return false;
    if (/^\/embedded\/\d{1,5}(?:\/|$)/.test(path)) return false;
    if (path === "/api" || path.startsWith("/api/")) return false;
    if (typeof document === "undefined") return false;
    const m = document.cookie.match(/(?:^|;\s*)embed_port=(\d{1,5})(?:;|$)/);
    return Boolean(m && Number(m[1]) === n);
  } catch {
    return false;
  }
}

/**
 * Pick the best browse path for a preview reload (live read wins, then ref, then stored).
 * Skips auth/sign-in routes when a non-auth fallback exists.
 */
export function resolvePreviewRefreshBrowsePath({
  live = "",
  ref = "",
  stored = "",
  lastNonAuth = "",
  persisted = "",
} = {}) {
  for (const candidate of [live, ref, stored, lastNonAuth, persisted]) {
    const next = sanitizeEmbedBrowsePath(candidate);
    if (next && !isAuthBrowsePath(next)) return next;
  }
  for (const candidate of [live, ref, stored, lastNonAuth, persisted]) {
    const next = sanitizeEmbedBrowsePath(candidate);
    if (next) return next;
  }
  return "";
}

/**
 * Navigate a same-origin embed iframe to a stored in-app route (after session restore).
 * @param {HTMLIFrameElement | null | undefined} iframe
 * @param {number | null | undefined} port
 * @param {string} browsePath
 */
export function navigateEmbedIframeToBrowsePath(iframe, port, browsePath = "") {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535 || !iframe) return false;
  const target = sanitizeEmbedBrowsePath(browsePath);
  if (!target || isAuthBrowsePath(target)) return false;
  if (isPreviewBridgeFrame(iframe)) {
    const current = sanitizeEmbedBrowsePath(getPreviewBridgeState(iframe)?.path || "");
    if (current === target) return true;
    if (!isAuthBrowsePath(current)) return false;
    void callPreviewBridge(iframe, "navigate", { path: target }).catch(() => {});
    return true;
  }
  try {
    const win = iframe.contentWindow;
    const loc = win?.location;
    if (!loc) return false;
    const current = extractEmbedBrowsePathFromLocation(loc.pathname, loc.search, loc.hash);
    if (current === target) return true;
    if (!isAuthBrowsePath(current)) return false;

    let pathPart = target;
    let hash = "";
    const hashIdx = target.indexOf("#");
    if (hashIdx >= 0) {
      hash = target.slice(hashIdx);
      pathPart = target.slice(0, hashIdx) || "/";
    }
    let extraSearch = "";
    const queryIdx = pathPart.indexOf("?");
    if (queryIdx >= 0) {
      extraSearch = pathPart.slice(queryIdx);
      pathPart = pathPart.slice(0, queryIdx) || "/";
    }
    if (!pathPart.startsWith("/")) pathPart = `/${pathPart}`;
    const embedPrefix = `/embedded/${n}`;
    const nextPathname = pathPart === "/" ? `${embedPrefix}/` : `${embedPrefix}${pathPart}`;
    const nextUrl = `${nextPathname}${loc.search || ""}${extraSearch}${hash}`;
    const currentUrl = `${loc.pathname}${loc.search || ""}${loc.hash || ""}`;
    if (currentUrl !== nextUrl) {
      win.location.replace(nextUrl);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Build embed iframe src, optionally preserving in-app route (search/hash included).
 * `origin`: subdomain embed (`https://<slug>.<previewSuffix>`); the app is served at `/`.
 */
export function buildEmbeddedPreviewSrc(port, browsePath = "", { versionId, nonce, origin } = {}) {
  const embedOrigin = normalizePreviewEmbedOrigin(origin);
  if (embedOrigin) return buildSubdomainPreviewSrc(embedOrigin, browsePath, { versionId, nonce });
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) return null;

  let raw = sanitizeEmbedBrowsePath(browsePath);
  let hash = "";
  let extraSearch = "";
  if (raw) {
    const hashIdx = raw.indexOf("#");
    if (hashIdx >= 0) {
      hash = raw.slice(hashIdx);
      raw = raw.slice(0, hashIdx);
    }
    const queryIdx = raw.indexOf("?");
    if (queryIdx >= 0) {
      extraSearch = raw.slice(queryIdx);
      raw = raw.slice(0, queryIdx);
    }
  }
  const appPath = raw && raw !== "/" ? (raw.startsWith("/") ? raw : `/${raw}`) : "";
  const pathname = appPath ? `/embedded/${n}${appPath}` : `/embedded/${n}/`;
  const parts = ["embed_frame=1", `embed_port=${n}`];
  if (versionId != null) parts.push(`version=${encodeURIComponent(String(versionId))}`);
  if (nonce > 0) parts.push(`_pv=${nonce}`);
  let src = `${pathname}?${parts.join("&")}`;
  if (extraSearch) {
    src += extraSearch.startsWith("?") ? `&${extraSearch.slice(1)}` : extraSearch;
  }
  return src + hash;
}

/**
 * Subdomain embed src: `<origin><appPath>?version=…&_pv=…` (no /embedded prefix, no embed_* params).
 * @param {string} origin
 * @param {string} [browsePath]
 * @param {{ versionId?: unknown, nonce?: number }} [opts]
 */
export function buildSubdomainPreviewSrc(origin, browsePath = "", { versionId, nonce } = {}) {
  const base = normalizePreviewEmbedOrigin(origin);
  if (!base) return null;
  const u = new URL(sanitizeEmbedBrowsePath(browsePath) || "/", `${base}/`);
  if (versionId != null) u.searchParams.set("version", String(versionId));
  if (nonce > 0) u.searchParams.set("_pv", String(nonce));
  const access = getPreviewEmbedAccessToken(base);
  if (access) u.searchParams.set("lp_access", access);
  return u.toString();
}
