import { EMBED_FRAME_PARAM, isEmbedInfrastructurePath } from "./constants.js";
import { isPublicRootFilePath } from "./rewritePaths.js";

export const EMBED_PORT_PARAM = "embed_port";
export const EMBED_PORT_COOKIE = "embed_port";

/** Parse port from `/embedded/<port>/…`. */
export function parsePortFromEmbeddedPath(pathname) {
  const m = String(pathname ?? "").match(/^\/embedded\/(\d{1,5})(?:\/|$)/);
  if (!m) return null;
  const port = Number(m[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

/**
 * LaunchPad Client Link public URL: `/projects/:slug` (not details/onboarding/roadmap).
 * Used only for top-level host-shell safety — not as an orphan path denylist.
 */
export function isClientLinkShellPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  return /^\/projects\/(?!details(?:\/|$)|onboarding(?:\/|$)|roadmap(?:\/|$))[^/]+\/?$/.test(p);
}

/**
 * Paths that belong to LaunchPad's own Vite when requested at the host root.
 * Must never be orphan-proxied via embed_port cookie alone (causes 502 on :5173).
 */
export function isLaunchpadHostVitePath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (/^\/@(?:vite|react-refresh|fs|id)(?:\/|$)/.test(p)) return true;
  if (/^\/src\//.test(p)) return true;
  // Vite client shims (env.mjs, client.mjs) — stale embed_port cookie must not proxy these to preview (502).
  if (/^\/node_modules\/vite(?:\/|$)/.test(p)) return true;
  if (/^\/node_modules\/\.vite(?:\/|$)/.test(p)) return true;
  // LaunchPad Vite CSS/JS deps (tldraw, xyflow, reactour, …) — never orphan-proxy via embed cookie.
  if (/^\/node_modules(?:\/|$)/.test(p)) return true;
  if (/^\/@id\//.test(p)) return true;
  // Typo/common host favicon — not a project orphan signal by cookie alone
  if (/^\/fevicon\.png$/i.test(p) || /^\/favicon\.ico$/i.test(p)) return true;
  return false;
}

/** Root `/node_modules/…` requests (Vite CSS/JS deps). */
export function isHostNodeModulesPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  return /^\/node_modules(?:\/|$)/.test(p);
}

/**
 * LaunchPad `/projects` host routes (list + platform subpaths).
 * Not Client Link `/projects/:slug` and not generic Next `/projects/:id`.
 */
export function isLaunchpadProjectsHostPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (p === "/projects" || p === "/projects/") return true;
  return /^\/projects\/(details|onboarding|roadmap)(?:\/|$)/.test(p);
}

/**
 * LaunchPad host SPA routes that must stay on the platform (never cookie-orphan).
 * Excludes common preview-app routes (/login, /dashboard, /projects/:id).
 * `/settings` is LaunchPad integrations — preview /settings still works via embed referer.
 */
export function isLaunchpadHostAppPath(pathname) {
  const p = String(pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/") || p === "/") return false;
  if (isLaunchpadProjectsHostPath(p)) return true;
  const first = p.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  return (
    first === "chat" ||
    first === "auth" ||
    first === "integrations" ||
    first === "settings" ||
    first === "jobs" ||
    first === "deployments" ||
    first === "prompt-management" ||
    first === "cost-analytics" ||
    first === "model-router" ||
    first === "q" ||
    first === "admin" ||
    first === "releases" ||
    first === "workspace" ||
    first === "client-link"
  );
}

function parsePortFromCookie(header) {
  if (!header) return null;
  const match = String(header).match(
    new RegExp(`(?:^|;\\s*)${EMBED_PORT_COOKIE}=(\\d{1,5})(?:;|$)`),
  );
  if (!match) return null;
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

function parsePortFromReferer(referer) {
  if (!referer) return null;
  try {
    const { pathname } = new URL(referer);
    return parsePortFromEmbeddedPath(pathname);
  } catch {
    return null;
  }
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === lower) return String(value ?? "");
  }
  return "";
}

function isTopLevelDocumentNavigation(req) {
  const dest = headerValue(req?.headers, "sec-fetch-dest").toLowerCase();
  const mode = headerValue(req?.headers, "sec-fetch-mode").toLowerCase();
  if (dest && dest !== "document") return false;
  if (mode && mode !== "navigate" && mode !== "nested-navigate") return false;
  // Missing Sec-Fetch-* (older clients / some RSC): treat path shape separately.
  if (!dest && !mode) return false;
  return dest === "document";
}

function requestPathname(req) {
  const rawUrl = req?.url ?? "/";
  try {
    return new URL(rawUrl, "http://localhost").pathname;
  } catch {
    return String(rawUrl).split("?")[0] || "/";
  }
}

/**
 * Resolve project dev-server port for orphan requests at the host root.
 * Prefer path / referer embed prefix; use embed_port cookie for breakout + RSC,
 * but never steal top-level platform navigations (OAuth, Client Link) via cookie alone.
 */
export function resolveEmbedPortFromRequest(req) {
  const rawUrl = req?.url ?? "/";
  let pathname = "/";
  try {
    const url = new URL(rawUrl, "http://localhost");
    pathname = url.pathname;
    const fromPath = parsePortFromEmbeddedPath(url.pathname);
    if (fromPath) return fromPath;

    const fromQuery = url.searchParams.get(EMBED_PORT_PARAM);
    if (fromQuery && /^\d{1,5}$/.test(fromQuery)) {
      const port = Number(fromQuery);
      if (port >= 1 && port <= 65535) return port;
    }
  } catch {
    pathname = requestPathname(req);
  }

  const referer = req?.headers?.referer;
  const fromReferer = parsePortFromReferer(referer);
  if (fromReferer) return fromReferer;

  // Host /node_modules/* is always LaunchPad Vite unless the request URL is already
  // /embedded/<port>/… (handled above). Stale embed_port + breakout referer must not 502 here.
  if (isHostNodeModulesPath(pathname)) {
    return null;
  }

  const fromCookie = parsePortFromCookie(req?.headers?.cookie);
  if (!fromCookie) return null;

  // Never steal LaunchPad Vite modules (/@vite/client, /src/…) via stale embed_port cookie.
  // Those need an /embedded/<port> referer (already handled above) or stay on host Vite.
  if (isLaunchpadHostVitePath(pathname) || isPublicRootFilePath(pathname)) {
    return null;
  }

  // Platform SPA routes (/auth/callback, /jobs, …) — cookie alone must not proxy to preview.
  // Embed-prefixed OAuth still resolves via /embedded referer above.
  if (isLaunchpadHostAppPath(pathname)) {
    return null;
  }
  const site = headerValue(req?.headers, "sec-fetch-site").toLowerCase();
  const topLevelDoc = isTopLevelDocumentNavigation(req);

  // Top-level document loads without same-origin app context (OAuth return, typed URL,
  // refresh) must hit LaunchPad — not a stale embed_port cookie → preview 502 page.
  if (topLevelDoc && (!referer || site === "none" || site === "cross-site")) {
    return null;
  }

  // Top-level open/refresh of LaunchPad Client Link must not be hijacked by embed_port.
  // Next apps may also use /projects/:id — those come with an app referer (e.g. /dashboard).
  if (isClientLinkShellPath(pathname) && topLevelDoc) {
    if (!referer || site === "none" || site === "cross-site") return null;
    try {
      const refPath = new URL(referer).pathname;
      if (
        isClientLinkShellPath(refPath) ||
        refPath.startsWith("/projects/details") ||
        refPath.startsWith("/projects/onboarding") ||
        refPath.startsWith("/projects/roadmap")
      ) {
        return null;
      }
    } catch {
      return null;
    }
  }

  if (!referer) {
    // RSC / subresource after breakout: cookie is enough.
    return fromCookie;
  }

  const refPort = parsePortFromReferer(referer);
  if (refPort === fromCookie) return fromCookie;
  if (refPort != null) return null;

  try {
    const refPath = new URL(referer).pathname;
    if (isEmbedInfrastructurePath(refPath) && !parsePortFromEmbeddedPath(refPath)) {
      return null;
    }
    // Referer is Client Link shell → do not follow cookie into orphan proxy.
    if (isClientLinkShellPath(refPath)) return null;
    // Referer is LaunchPad host SPA → stay on platform (e.g. /login → /projects).
    if (isLaunchpadHostAppPath(refPath)) return null;
    // Breakout chain: referer is an app path (/dashboard, /login, …).
    return fromCookie;
  } catch {
    return null;
  }
}

export function buildEmbedIframeEntry(port, upstreamBasePath = "") {
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return "";
  const base = upstreamBasePath.replace(/\/$/, "");
  const path = base ? `/embedded/${n}${base}/` : `/embedded/${n}/`;
  return `${path}?${EMBED_FRAME_PARAM}=1&${EMBED_PORT_PARAM}=${n}`;
}
