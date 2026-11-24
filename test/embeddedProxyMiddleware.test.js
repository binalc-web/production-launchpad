import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import {
  resolveEmbeddedWsUpstreamTarget,
  isPreviewEmbedHmrEnabled,
} from "../iframe-preview/embedUpstream.js";
import { createEmbeddedProxyMiddleware } from "../iframe-preview/middleware.js";

test("resolveEmbeddedWsUpstreamTarget uses project dev port not API relay", () => {
  assert.equal(resolveEmbeddedWsUpstreamTarget("backend", 8010), "http://backend:8010");
  assert.notEqual(
    resolveEmbeddedWsUpstreamTarget("backend", 8010),
    "http://backend:5000/embedded/8010",
  );
  assert.equal(resolveEmbeddedWsUpstreamTarget("backend", 99999), null);
});

test("isPreviewEmbedHmrEnabled defaults on", () => {
  const prev = process.env.PREVIEW_EMBED_HMR;
  delete process.env.PREVIEW_EMBED_HMR;
  assert.equal(isPreviewEmbedHmrEnabled(), true);
  if (prev === undefined) delete process.env.PREVIEW_EMBED_HMR;
  else process.env.PREVIEW_EMBED_HMR = prev;
});

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));

test("embedded WS upgrade rewrites path and sends upstream Host/Origin", async () => {
  let seen;
  const upstream = http.createServer((_req, res) => res.end());
  upstream.on("upgrade", (req, socket) => {
    seen = { url: req.url, host: req.headers.host, origin: req.headers.origin };
    socket.end(
      "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n",
    );
  });
  const upstreamPort = await listen(upstream);

  const embedded = createEmbeddedProxyMiddleware({ resolveUpstreamHost: () => "127.0.0.1" });
  const gateway = http.createServer((_req, res) => res.end());
  gateway.on("upgrade", (req, socket, head) => embedded.upgrade(req, socket, head));
  const gatewayPort = await listen(gateway);

  try {
    const status = await new Promise((resolve, reject) => {
      const client = net.connect(gatewayPort, "127.0.0.1", () => {
        client.write(
          `GET /embedded/${upstreamPort}/?token=abc HTTP/1.1\r\n` +
            "Host: api.example.com\r\nOrigin: https://app.example.com\r\n" +
            "Connection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\n" +
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n",
        );
      });
      client.once("data", (buf) => {
        resolve(buf.toString().split("\r\n")[0]);
        client.destroy();
      });
      client.on("error", reject);
    });
    assert.match(status, /101/);
    assert.deepEqual(seen, {
      url: "/?token=abc",
      host: `localhost:${upstreamPort}`,
      origin: `http://localhost:${upstreamPort}`,
    });
  } finally {
    upstream.close();
    gateway.close();
  }
});
