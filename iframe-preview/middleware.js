import { createProxyMiddleware } from "http-proxy-middleware";
import {
  createEmbedUpstreamResolver,
  normalizeEmbedUpstreamResolver,
  isPreviewEmbedHmrEnabled,
  resolveEmbedBackendApiPort,
  resolveEmbeddedWsUpstreamTarget,
  resolveEmbedUpstreamOptionsFromEnv,
  shouldRelayEmbedViaBackendApi,
  upstreamViteHostHeader,
} from "./embedUpstream.js";
import { parseEmbeddedPortRequest, stripEmbedFrameParam } from "./rewritePaths.js";
import { proxyEmbeddedRequest } from "./embedProxyHandler.js";
import { createEmbeddedRootAssetMiddleware } from "./rootAssetMiddleware.js";
import { buildEmbedUpstreamConnectPath } from "../../shared/preview-rewrite/embedUpstreamPath.js";

const EMBED_PORT_KEY = Symbol("launchpadEmbedPort");

/** HPM calls pathRewrite(path, req) — path is the request pathname. */
function pathRewriteForEmbedded(path, req) {
  const rawUrl = req?.url ?? path ?? "/";
  const parsed = parseEmbeddedPortRequest(rawUrl);
  if (!parsed) return path ?? rawUrl;
  const query = rawUrl.includes("?") ? rawUrl.slice(rawUrl.indexOf("?")) : "";
  const up = parsed.upstreamPath || "/";
  // Next with basePath serves HMR under /embedded/<port>/_next/… — keep prefix for those.
  const nextHmr = /^\/_next(?:\/|$)/.test(up) || /webpack-hmr|turbopack-hmr|__nextjs_/i.test(up);
  if (nextHmr) {
    return stripEmbedFrameParam(
      `${buildEmbedUpstreamConnectPath({
        port: parsed.port,
        upstreamTail: up,
        forwardUnstripped: true,
      })}${query}`,
    );
  }
  return stripEmbedFrameParam(up + query);
}

/**
 * HTTP: direct proxy + body rewrite (reliable HTML transform).
 * WebSocket: http-proxy-middleware upgrade to upstream dev server port (not API relay).
 * @param {{ upstreamHost?: string, resolveUpstreamHost?: (port: number) => string }} [options]
 */
export function createEmbeddedProxyMiddleware(options = {}) {
  const resolveUpstreamHost = normalizeEmbedUpstreamResolver(options);
  const rootAssetProxy = createEmbeddedRootAssetMiddleware({ resolveUpstreamHost });
  const backendApiPort = resolveEmbedBackendApiPort();

  const applyWsUpstreamHeaders = (proxyReq, req) => {
    // pathRewrite has already stripped /embedded/<port> from req.url by the time proxyReq fires.
    const port = req[EMBED_PORT_KEY] ?? parseEmbeddedPortRequest(req.url ?? "/")?.port;
    if (!port) return;
    const host = upstreamViteHostHeader(port);
    const origin = `http://${host}`;
    proxyReq.setHeader("host", host);
    proxyReq.setHeader("origin", origin);
  };

  const wsProxy = createProxyMiddleware({
    target: "http://127.0.0.1:1",
    router: (req) => {
      const parsed = parseEmbeddedPortRequest(req.url ?? "/");
      if (!parsed) return undefined;
      req[EMBED_PORT_KEY] = parsed.port;
      const upstreamHost = resolveUpstreamHost(parsed.port);
      return resolveEmbeddedWsUpstreamTarget(upstreamHost, parsed.port);
    },
    changeOrigin: false,
    ws: true,
    xfwd: true,
    pathRewrite: pathRewriteForEmbedded,
    on: {
      proxyReq: (proxyReq, req) => {
        applyWsUpstreamHeaders(proxyReq, req);
      },
      proxyReqWs: (proxyReq, req) => {
        applyWsUpstreamHeaders(proxyReq, req);
      },
      error: (err, req, socket) => {
        if (socket && !socket.destroyed) {
          socket.destroy();
        }
        // eslint-disable-next-line no-console -- embed HMR diagnostics
        console.warn(
          `[embed-hmr] WebSocket proxy error ${req?.url ?? "?"}: ${err?.message || err}`,
        );
      },
    },
  });

  const middleware = (req, res, next) => {
    const parsed = parseEmbeddedPortRequest(req.url ?? "/");
    if (!parsed) {
      rootAssetProxy(req, res, next);
      return;
    }

    const upstreamHost = resolveUpstreamHost(parsed.port);
    proxyEmbeddedRequest(req, res, {
      upstreamHost,
      port: parsed.port,
      assetPath: parsed.assetPath,
      upstreamPath: parsed.upstreamPath,
      relayViaBackendApi: shouldRelayEmbedViaBackendApi(upstreamHost, parsed.port, options),
      backendApiPort,
    });
  };

  middleware.upgrade = wsProxy.upgrade?.bind(wsProxy);
  return middleware;
}

const EMBED_UPGRADE_PREFIX_RE = /^\/(?:embedded|iframe-preview)\//;
const embedUpgradeResolver = createEmbedUpstreamResolver(resolveEmbedUpstreamOptionsFromEnv());

/**
 * Forward WebSocket upgrades for embed HMR, or destroy when disabled / invalid.
 * @param {import('http').Server} server
 * @param {ReturnType<typeof createEmbeddedProxyMiddleware>} [embeddedProxy]
 */
export function attachEmbeddedUpgrade(server, embeddedProxy) {
  if (!server?.prependListener) return;
  server.prependListener("upgrade", (req, socket, head) => {
    const raw = req.url ?? "";
    if (!EMBED_UPGRADE_PREFIX_RE.test(raw)) return;

    if (!isPreviewEmbedHmrEnabled()) {
      socket.destroy();
      return;
    }

    const parsed = parseEmbeddedPortRequest(raw);
    if (!parsed || !embeddedProxy?.upgrade) {
      socket.destroy();
      return;
    }

    const upstreamHost = embedUpgradeResolver(parsed.port);
    const target = resolveEmbeddedWsUpstreamTarget(upstreamHost, parsed.port);
    // eslint-disable-next-line no-console -- embed HMR diagnostics (docker logs)
    console.log(`[embed-hmr] upgrade ${raw} → ${target ?? "?"}`);
    embeddedProxy.upgrade(req, socket, head);
  });
}
