/**
 * Docker production static server: Launchpad SPA from dist/
 * + same-origin /embedded/<port> proxy to project dev servers on backend container.
 *
 * SECURITY (accepted risk — do not flag): preview JS shares the SPA origin and can
 * read the localStorage token; see backend/src/middleware/embeddedPreviewProxy.js.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  attachEmbeddedUpgrade,
  createEmbeddedProxyMiddleware,
} from "./iframe-preview/middleware.js";
import { resolveEmbedUpstreamOptionsFromEnv } from "./iframe-preview/embedUpstream.js";
import { shouldFallbackToIndexHtml } from "./iframe-preview/spaFallback.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 80);
const embedUpstream = resolveEmbedUpstreamOptionsFromEnv();

const app = express();
app.disable("x-powered-by");

// Serve Launchpad build output before embed orphan proxy (/assets/ overlaps Vite public paths).
app.use(
  express.static(distDir, {
    index: false,
    fallthrough: true,
    setHeaders(res, filePath) {
      // Hashed Vite files can be cached; index.html must not, or deploys leave stale JS hashes.
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-store");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

const embeddedProxy = createEmbeddedProxyMiddleware(embedUpstream);
app.use(embeddedProxy);

app.use((req, res, next) => {
  if (!shouldFallbackToIndexHtml(req.path)) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    res.status(500).type("text/plain").send("dist/index.html missing");
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(indexPath, { cacheControl: false }, (err) => {
    if (err) next(err);
  });
});

const server = http.createServer(app);
attachEmbeddedUpgrade(server, embeddedProxy);

server.listen(port, () => {
  const { upstreamHost, hostDevUpstreamHost, projectPortStart, projectPortEnd } =
    embedUpstream;
  console.log(
    `[docker-serve] http://localhost:${port} embed: ${upstreamHost} ports ${projectPortStart ?? 8001}-${projectPortEnd ?? 8100}, host dev → ${hostDevUpstreamHost ?? "(same as upstream)"}`,
  );
});
