import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { proxyEmbeddedRequest } from "../iframe-preview/embedProxyHandler.js";
import { parseEmbeddedPortRequest } from "../iframe-preview/rewritePaths.js";

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));

test("binary embed responses stream to the client before the upstream finishes", async () => {
  let releaseUpstream;
  const firstChunkSeen = new Promise((resolve) => {
    releaseUpstream = resolve;
  });
  const head = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
  const tail = Buffer.from([0x01, 0x02, 0x03]);
  const upstream = http.createServer(async (_req, res) => {
    res.writeHead(200, { "content-type": "image/png" });
    res.write(head);
    await firstChunkSeen;
    res.end(tail);
  });
  const upstreamPort = await listen(upstream);

  const gateway = http.createServer((req, res) => {
    const parsed = parseEmbeddedPortRequest(req.url);
    proxyEmbeddedRequest(req, res, {
      upstreamHost: "127.0.0.1",
      port: parsed.port,
      assetPath: parsed.assetPath,
      upstreamPath: parsed.upstreamPath,
    });
  });
  const gatewayPort = await listen(gateway);

  try {
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      http
        .get(`http://127.0.0.1:${gatewayPort}/embedded/${upstreamPort}/logo.png`, (res) => {
          assert.equal(res.headers["content-type"], "image/png");
          res.on("data", (c) => {
            chunks.push(c);
            releaseUpstream();
          });
          res.on("end", () => resolve(Buffer.concat(chunks)));
        })
        .on("error", reject);
    });
    assert.deepEqual(body, Buffer.concat([head, tail]));
  } finally {
    gateway.close();
    upstream.close();
  }
});
