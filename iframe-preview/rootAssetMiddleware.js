import { isEmbedInfrastructurePath } from "./constants.js";
import {
  EMBED_PUBLIC_PATH_PREFIXES,
  isPublicRootFilePath,
  isUpstreamBundlerPath,
} from "./rewritePaths.js";
import { resolveEmbedPortFromRequest } from "./embedPort.js";
import { normalizeEmbedUpstreamResolver } from "./embedUpstream.js";
import { proxyEmbeddedRequest } from "./embedProxyHandler.js";

/** True when a root-level request should be forwarded to the embedded project dev server. */
export function isOrphanEmbeddedAssetPath(pathname) {
  const raw = String(pathname ?? "");
  const p = raw.split("?")[0] ?? "";
  if (!p.startsWith("/") || p.startsWith("/embedded/") || p.startsWith("/iframe-preview/")) {
    return false;
  }
  // Keep query — Vite html-proxy is `/index.html?html-proxy&index=N.js`.
  if (isUpstreamBundlerPath(raw) || isUpstreamBundlerPath(p)) return true;
  if (
    EMBED_PUBLIC_PATH_PREFIXES.some((prefix) => p === `/${prefix}` || p.startsWith(`/${prefix}/`))
  ) {
    return true;
  }
  if (isPublicRootFilePath(p)) return true;
  return false;
}

/**
 * App routes that broke out of /embedded/<port>/ (e.g. /dashboard, /login).
 * Gated by embed context (port resolution), not by product-route names.
 */
export function isOrphanEmbeddedAppPath(pathname) {
  const p = (pathname ?? "").split("?")[0] ?? "";
  if (!p.startsWith("/") || p === "/") return false;
  if (isEmbedInfrastructurePath(p)) return false;
  if (isOrphanEmbeddedAssetPath(p)) return false;
  return true;
}

export function isOrphanEmbeddedProxyPath(pathname) {
  return isOrphanEmbeddedAssetPath(pathname) || isOrphanEmbeddedAppPath(pathname);
}

function headerValue(headers, name) {
  const v = headers?.[name];
  return String(Array.isArray(v) ? v[0] : (v ?? "")).toLowerCase();
}

/**
 * Browser navigation that will become the iframe/tab document (not fetch, XHR, or Next RSC).
 * @param {import('node:http').IncomingMessage} req
 */
export function isOrphanDocumentNavigation(req) {
  const method = String(req?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const headers = req?.headers || {};
  if (headers.rsc || headers["next-router-state-tree"]) return false;
  const dest = headerValue(headers, "sec-fetch-dest");
  if (dest) return dest === "document" || dest === "iframe" || dest === "frame";
  const mode = headerValue(headers, "sec-fetch-mode");
  if (mode) return mode === "navigate" || mode === "nested-navigate";
  return headerValue(headers, "accept").includes("text/html");
}

/**
 * Orphan documents must live under /embedded/<port>/: the proxy injects
 * `<base href="/embedded/<port>/">` and rewrites Vite BASE_URL to match, so serving the
 * same HTML at /dashboard leaves routers with a basename that does not prefix the URL
 * (React Router renders null → white screen).
 * @param {number} port
 * @param {string} rawUrl
 */
export function buildOrphanDocumentRedirect(port, rawUrl) {
  const raw = String(rawUrl || "/");
  const qIdx = raw.indexOf("?");
  const pathname = qIdx === -1 ? raw : raw.slice(0, qIdx);
  const query = qIdx === -1 ? "" : raw.slice(qIdx);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/embedded/${port}${path}${query}`;
}

/**
 * Proxy asset + app-route requests that omit /embedded/<port>/
 * when an embed port can be resolved from path/referer/cookie context.
 */
export function createEmbeddedRootAssetMiddleware(options = {}) {
  const resolveUpstreamHost = normalizeEmbedUpstreamResolver(options);

  return (req, res, next) => {
    const rawUrl = req.url ?? "/";
    const pathname = rawUrl.split("?")[0] ?? "/";
    // Pass full URL so `?html-proxy` orphan assets are recognized.
    if (!isOrphanEmbeddedProxyPath(rawUrl) && !isOrphanEmbeddedProxyPath(pathname)) {
      next();
      return;
    }

    const port = resolveEmbedPortFromRequest(req);
    if (!port) {
      next();
      return;
    }

    if (isOrphanEmbeddedAppPath(pathname) && isOrphanDocumentNavigation(req)) {
      res.writeHead(302, {
        location: buildOrphanDocumentRedirect(port, rawUrl),
        "cache-control": "no-store",
      });
      res.end();
      return;
    }

    proxyEmbeddedRequest(req, res, {
      upstreamHost: resolveUpstreamHost(port),
      port,
      assetPath: `/embedded/${port}`,
      upstreamPath: pathname,
    });
  };
}
