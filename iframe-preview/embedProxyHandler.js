import http from "node:http";
import { upstreamViteHostHeader, upstreamViteOrigin } from "./embedUpstream.js";
import {
  applyProxyResponseHeaders,
  rewriteEmbeddedBody,
  shouldRewriteResponse,
  stripEmbedFrameParam,
} from "./rewritePaths.js";
import {
  isIncorrectModuleContentType,
  isModuleScriptRequestPath,
  isViteUrlImportPath,
  resolveModuleScriptContentType,
  shouldSynthesizeViteUrlModule,
  synthesizeViteUrlModule,
} from "./viteSpecialImport.util.js";
import {
  buildEmbedUpstreamConnectPath,
  shouldForwardUnstrippedEmbedPath,
} from "../../shared/preview-rewrite/embedUpstreamPath.js";

/** Fix module MIME when upstream/relay returns application/octet-stream (UAT Docker relay). */
function applyEmbedModuleContentType(headers, requestPath) {
  if (!isModuleScriptRequestPath(requestPath)) return headers;
  const ct = headers["content-type"] ?? headers["Content-Type"];
  if (!isIncorrectModuleContentType(ct)) return headers;
  const out = { ...headers };
  delete out["Content-Type"];
  out["content-type"] = resolveModuleScriptContentType(requestPath);
  return out;
}

export function handleEmbedProxyResponse(upstream, req, out, proxyTarget, assetPath) {
  const requestPath = req.url ?? "";

  delete upstream.headers["x-frame-options"];
  delete upstream.headers["content-security-policy"];
  delete upstream.headers["content-security-policy-report-only"];

  const contentType = String(upstream.headers["content-type"] ?? "");
  const contentEncoding = String(upstream.headers["content-encoding"] ?? "");
  const rewriteResponse = shouldRewriteResponse(contentType, contentEncoding, requestPath);

  // Images, fonts, pre-bundled deps: nothing to rewrite, so stream instead of buffering.
  if (!rewriteResponse && !isViteUrlImportPath(requestPath)) {
    let headers = applyProxyResponseHeaders(upstream.headers, proxyTarget, assetPath);
    headers = applyEmbedModuleContentType(headers, requestPath);
    out.writeHead(upstream.statusCode ?? 200, headers);
    upstream.pipe(out);
    upstream.on("error", () => out.destroy());
    return;
  }

  const chunks = [];

  upstream.on("data", (chunk) => chunks.push(chunk));
  upstream.on("end", () => {
    const raw = Buffer.concat(chunks);
    let headers = applyProxyResponseHeaders(upstream.headers, proxyTarget, assetPath);
    headers = applyEmbedModuleContentType(headers, requestPath);
    let bodyText = raw.toString("utf8");

    if (shouldSynthesizeViteUrlModule(requestPath, contentType, bodyText)) {
      bodyText = synthesizeViteUrlModule(requestPath);
      delete headers["content-length"];
      delete headers["content-encoding"];
      out.writeHead(upstream.statusCode ?? 200, headers);
      out.end(Buffer.from(bodyText, "utf8"));
      return;
    }

    if (rewriteResponse) {
      const effectiveType = headers["content-type"] ?? contentType;
      const text = rewriteEmbeddedBody(bodyText, effectiveType, proxyTarget, assetPath, req);
      const body = Buffer.from(text, "utf8");
      delete headers["content-length"];
      delete headers["content-encoding"];
      out.writeHead(upstream.statusCode ?? 200, headers);
      out.end(body);
    } else {
      out.writeHead(upstream.statusCode ?? 200, headers);
      out.end(raw);
    }
  });
  upstream.on("error", () => {
    if (!out.headersSent) {
      out.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      out.end("Upstream preview error");
    }
  });
}

function proxyErrorHtml(proxyTarget) {
  const hostHint = proxyTarget.includes("host.docker.internal")
    ? "<p>On your Mac, run the dev server with <code>vite --host</code> (or <code>server.host: true</code>) so Docker can reach it via <code>host.docker.internal</code>.</p>"
    : proxyTarget.includes("://backend:")
      ? "<p>The platform is starting the preview dev server. Wait a moment, then reload this page.</p>"
      : `<p>Start the project dev server on <code>${proxyTarget}</code>, then reload.</p>`;
  return `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px">
    <h1>Cannot reach preview</h1>
    ${hostHint}
  </body></html>`;
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ upstreamHost: string, port: number, assetPath: string, upstreamPath: string, relayViaBackendApi?: boolean, backendApiPort?: number, framework?: string | null, onUpstreamError?: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void }} ctx
 *   `onUpstreamError`: replaces the "Cannot reach preview" 502 after retries (ECS gateway serves its starting page).
 * @param {number} [attempt]
 */
function proxyEmbeddedRequestInner(req, res, ctx, attempt = 0) {
  const {
    upstreamHost,
    port,
    assetPath,
    upstreamPath,
    relayViaBackendApi = false,
    backendApiPort = 5000,
    framework = null,
  } = ctx;
  const proxyTarget = upstreamViteOrigin(port);
  const host = req.headers.host ?? "localhost:5173";

  const rawUrl = req.url ?? "/";
  const query = rawUrl.includes("?") ? rawUrl.slice(rawUrl.indexOf("?")) : "";
  const pathWithQuery = stripEmbedFrameParam(upstreamPath + query);
  const pathOnly = pathWithQuery.split("?")[0] || "/";
  const queryOnly = pathWithQuery.includes("?")
    ? pathWithQuery.slice(pathWithQuery.indexOf("?"))
    : "";
  const upstreamTail = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const forwardUnstripped = shouldForwardUnstrippedEmbedPath(framework);

  const connectHostname = upstreamHost;
  const connectPort = relayViaBackendApi ? backendApiPort : port;
  // Backend relay always uses /embedded/<port>/…; backend strips or not based on framework.
  // Direct to Next: keep embed prefix so basePath matches. Direct to Vite: strip.
  const connectPath = relayViaBackendApi
    ? `/embedded/${port}${upstreamTail === "/" ? "/" : upstreamTail}${queryOnly}`
    : `${buildEmbedUpstreamConnectPath({
        port,
        upstreamTail,
        forwardUnstripped,
      })}${queryOnly}`;
  const connectTarget = `http://${connectHostname}:${connectPort}${connectPath}`;
  const transport = http;

  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.connection;
  delete forwardHeaders["proxy-connection"];
  delete forwardHeaders["transfer-encoding"];
  delete forwardHeaders.host;

  const proxyReq = transport.request(
    {
      hostname: connectHostname,
      port: connectPort,
      path: connectPath,
      method: req.method,
      headers: {
        ...forwardHeaders,
        host: upstreamViteHostHeader(port),
        origin: `http://${host}`,
        "accept-encoding": "identity",
        "x-forwarded-prefix": assetPath,
        "x-forwarded-host": host,
        "x-forwarded-proto": "http",
      },
    },
    (proxyRes) => {
      handleEmbedProxyResponse(proxyRes, req, res, proxyTarget, assetPath);
    },
  );

  proxyReq.on("error", () => {
    if (!res.headersSent && attempt < 2) {
      setTimeout(() => proxyEmbeddedRequestInner(req, res, ctx, attempt + 1), 400);
      return;
    }
    if (!res.headersSent) {
      if (typeof ctx.onUpstreamError === "function") {
        ctx.onUpstreamError(req, res);
        return;
      }
      res.writeHead(502, { "content-type": "text/html; charset=utf-8" });
      res.end(proxyErrorHtml(connectTarget));
    }
  });

  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

/** Proxy a single HTTP request to the project dev server (direct or via backend API relay). */
export function proxyEmbeddedRequest(req, res, ctx) {
  proxyEmbeddedRequestInner(req, res, ctx, 0);
}
