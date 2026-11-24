import test from "node:test";
import assert from "node:assert/strict";
import {
  isUpstreamBundlerPath,
  rewriteNextDevPaths,
  rewriteViteHmrClient,
  buildHmrContext,
} from "../iframe-preview/rewritePaths.js";

test("isUpstreamBundlerPath includes Next and webpack HMR paths", () => {
  assert.equal(isUpstreamBundlerPath("/webpack-hmr"), true);
  assert.equal(isUpstreamBundlerPath("/__webpack_hmr"), true);
  assert.equal(isUpstreamBundlerPath("/turbopack-hmr"), true);
  assert.equal(isUpstreamBundlerPath("/_next/webpack-hmr"), true);
  assert.equal(isUpstreamBundlerPath("/login"), false);
});

test("rewriteNextDevPaths prefixes webpack-hmr under embed", () => {
  const embedPath = "http://localhost:5173/embedded/8010/";
  const body = 'fetch("/webpack-hmr")';
  const out = rewriteNextDevPaths(body, embedPath);
  assert.match(out, /\/embedded\/8010\/webpack-hmr/);
});

test("rewriteViteHmrClient points socket at Launchpad embed base (local port)", () => {
  const sample = `
const serverHost = "http://localhost:8010/";
const directSocketHost = "localhost:8010";
const hmrPort = 8010;
`;
  const req = { headers: { host: "app.example.com:5173" } };
  const assetPath = "/embedded/8010/";
  const ctx = buildHmrContext(req, assetPath);
  const out = rewriteViteHmrClient(sample, ctx);
  assert.match(out, /serverHost = location\.origin \+ "\/embedded\/8010\/"/);
  assert.match(out, /directSocketHost = location\.host \+ "\/embedded\/8010\/"/);
  assert.match(out, /hmrPort = \(location\.protocol === "https:" \? 443 : 80\)/);
  assert.doesNotMatch(out, /apiv2|app\.example\.com:5173\/embedded/);
});

test("buildHmrContext uses HTTPS defaults behind edge proxy (no :80 on wss)", () => {
  const ctx = buildHmrContext(
    {
      headers: {
        host: "uat.launchpad.yorkdevs.link",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "uat.launchpad.yorkdevs.link",
      },
    },
    "/embedded/8015/",
  );
  assert.equal(ctx.proto, "https");
  assert.equal(ctx.socketTarget, "uat.launchpad.yorkdevs.link/embedded/8015/");
  assert.equal(ctx.serverHostValue, "https://uat.launchpad.yorkdevs.link/embedded/8015/");
  assert.equal(ctx.hmrPort, 443);
});
