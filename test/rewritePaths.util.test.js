import test from "node:test";
import assert from "node:assert/strict";
import {
  rewriteReactRouterBasename,
  rewriteVueRouterBase,
  rewriteTanstackRouterBasepath,
  rewriteJsModulePaths,
  rewriteJsSourceModulePaths,
  rewriteEmbeddedBody,
  rewriteNextDevPaths,
  isVitePrebundledDepPath,
  shouldRewriteResponse,
  rewriteSetCookiePathForEmbed,
  applyProxyResponseHeaders,
  injectIframeNavigationGuard,
  stripEmbedFrameParam,
  isViteHtmlProxyUrl,
  rewriteViteHtmlProxyUrls,
  isUpstreamBundlerPath,
  LAUNCHPAD_EMBED_BASENAME_EXPR,
} from "../iframe-preview/rewritePaths.js";

test("stripEmbedFrameParam preserves Vite vue flag query (?vue&type=style)", () => {
  assert.equal(
    stripEmbedFrameParam("/src/App.vue?vue&type=style&index=0&lang.css"),
    "/src/App.vue?vue&type=style&index=0&lang.css",
  );
  assert.equal(
    stripEmbedFrameParam("/src/App.vue?vue&type=style&embed_frame=1&index=0"),
    "/src/App.vue?vue&type=style&index=0",
  );
  assert.equal(
    stripEmbedFrameParam("/embedded/8012/src/App.vue?embed_frame=1&vue&type=style"),
    "/embedded/8012/src/App.vue?vue&type=style",
  );
});

test("rewriteViteHtmlProxyUrls keeps inline-module html-proxy under embed prefix", () => {
  assert.equal(isViteHtmlProxyUrl("/index.html?html-proxy&index=0.js"), true);
  assert.equal(isViteHtmlProxyUrl("/index.html"), false);
  assert.equal(isUpstreamBundlerPath("/index.html?html-proxy&index=0.js"), true);

  const html = `<script type="module" src="/index.html?html-proxy&index=0.js"></script>`;
  assert.equal(
    rewriteViteHtmlProxyUrls(html, "/embedded/8010"),
    `<script type="module" src="/embedded/8010/index.html?html-proxy&index=0.js"></script>`,
  );

  const rewritten = rewriteEmbeddedBody(
    `<!DOCTYPE html><html><body><div id="root"></div>
     <script type="module" src="/@vite/client"></script>
     <script type="module" src="/index.html?html-proxy&index=0.js"></script></body></html>`,
    "text/html",
    "http://127.0.0.1:8010",
    "/embedded/8010",
    { url: "/embedded/8010/" },
  );
  assert.match(rewritten, /src="\/embedded\/8010\/index\.html\?html-proxy&index=0\.js"/);
  assert.doesNotMatch(rewritten, /src="\/index\.html\?html-proxy/);
});

test("shouldRewriteResponse rewrites JS under /assets/", () => {
  assert.equal(
    shouldRewriteResponse("application/javascript", "", "/embedded/8030/assets/index-abc.js"),
    true,
  );
  assert.equal(shouldRewriteResponse("text/css", "", "/embedded/8030/assets/index-abc.css"), false);
});

test("rewriteSetCookiePathForEmbed scopes Path under embed prefix", () => {
  assert.equal(
    rewriteSetCookiePathForEmbed("user=%7B%22id%22%3A1%7D; Path=/", "/embedded/8013"),
    "user=%7B%22id%22%3A1%7D; Path=/embedded/8013/",
  );
  assert.equal(
    rewriteSetCookiePathForEmbed("roles=%5B%5D", "/embedded/8013/"),
    "roles=%5B%5D; Path=/embedded/8013/",
  );
});

test("applyProxyResponseHeaders rewrites set-cookie Path for embed", () => {
  const out = applyProxyResponseHeaders(
    { "set-cookie": ["user=abc; Path=/", "token=x; Path=/app"] },
    "http://127.0.0.1:8013",
    "/embedded/8013",
  );
  assert.deepEqual(out["set-cookie"], [
    "user=abc; Path=/embedded/8013/",
    "token=x; Path=/embedded/8013/",
  ]);
});

test("shouldRewriteResponse rewrites module scripts with application/octet-stream", () => {
  assert.equal(
    shouldRewriteResponse(
      "application/octet-stream",
      "",
      "/embedded/8030/node_modules/.vite/deps/react.js?v=1",
    ),
    true,
  );
  assert.equal(
    shouldRewriteResponse("application/octet-stream", "", "/embedded/8030/files/data.bin"),
    false,
  );
});

test("shouldRewriteResponse skips body rewrite for Vite ?url imports only", () => {
  assert.equal(
    shouldRewriteResponse(
      "application/javascript",
      "",
      "/embedded/8030/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url",
    ),
    false,
  );
  assert.equal(
    shouldRewriteResponse("application/javascript", "", "/node_modules/foo.mjs?url"),
    false,
  );
  assert.equal(
    shouldRewriteResponse(
      "application/javascript",
      "",
      "/embedded/8055/src/assets/logos/scopeguard-mark.svg?import",
    ),
    true,
  );
});

test("rewriteJsModulePaths prefixes normal imports but not ?url suffix", () => {
  const embedPath = "/embedded/8030";
  const normal = 'import React from "/node_modules/react/index.js";';
  const special = 'import worker from "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url";';
  assert.match(rewriteJsModulePaths(normal, embedPath), /\/embedded\/8030\/node_modules\/react/);
  assert.doesNotMatch(rewriteJsModulePaths(special, embedPath), /\/embedded\/8030\/node_modules/);
  assert.match(rewriteJsModulePaths(special, embedPath), /\/node_modules\/pdfjs-dist/);
});

test("rewriteJsModulePaths prefixes Vite ?import asset modules under embed", () => {
  const embedPath = "/embedded/8055";
  const svgImport = 'import mark from "/src/assets/logos/scopeguard-mark.svg?import";';
  const out = rewriteJsModulePaths(svgImport, embedPath);
  assert.match(out, /\/embedded\/8055\/src\/assets\/logos\/scopeguard-mark\.svg\?import/);
});

test("rewriteJsSourceModulePaths prefixes normal modules but not ?url suffix", () => {
  const embedPath = "/embedded/8030";
  const normal = 'import { x } from "/lib/utils.tsx";';
  const special = 'import url from "/lib/worker.ts?url";';
  assert.match(rewriteJsSourceModulePaths(normal, embedPath), /\/embedded\/8030\/lib\/utils/);
  assert.doesNotMatch(rewriteJsSourceModulePaths(special, embedPath), /\/embedded\/8030\/lib/);
});

test("rewriteReactRouterBasename patches minified react-router default basename", () => {
  const minified = 'function hy({basename:i="/",children:s=null,location:o}){return "x"}';
  const out = rewriteReactRouterBasename(minified, "/embedded/8030");
  assert.match(out, /basename:i=/);
  assert.doesNotMatch(out, /basename:i="\/"/);
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
});

test("rewriteReactRouterBasename never patches compiled jsxDEV BrowserRouter in app modules", () => {
  const src = `jsxDEV(BrowserRouter, { children: null }, void 0, false, {}, this);`;
  assert.equal(rewriteReactRouterBasename(src, "/embedded/8030"), src);
});

test("isVitePrebundledDepPath detects Vite deps cache", () => {
  assert.equal(
    isVitePrebundledDepPath("/embedded/8030/node_modules/.vite/deps/@react-three_drei.js?v=1"),
    true,
  );
  assert.equal(isVitePrebundledDepPath("/embedded/8030/src/main.tsx"), false);
});

test("rewriteEmbeddedBody skips aggressive rewrites for Vite prebundled deps", () => {
  const embedPath = "/embedded/8030";
  const requestPath = "/embedded/8030/node_modules/.vite/deps/@react-three_drei.js?v=1";
  const vendor = `var re=/foo\\/images\\/bar/gi; var s={src:"/images/logo.png"};`;
  const out = rewriteEmbeddedBody(
    vendor,
    "application/javascript",
    "http://127.0.0.1:8030",
    embedPath,
    { url: requestPath },
  );
  assert.equal(out, vendor);
});

test("rewriteEmbeddedBody patches react-router default basename inside Vite prebundled deps", () => {
  const embedPath = "/embedded/8030";
  const requestPath = "/embedded/8030/node_modules/.vite/deps/react-router-dom.js?v=1";
  const lib = 'function hy({basename:i="/",children:s=null}){return "x"}';
  const out = rewriteEmbeddedBody(
    lib,
    "application/javascript",
    "http://127.0.0.1:8030",
    embedPath,
    {
      url: requestPath,
    },
  );
  assert.doesNotMatch(out, /basename:i="\/"/);
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
});

test("T3: user App/main BrowserRouter source is never rewritten by proxy", () => {
  const src = `import { jsxDEV } from "react/jsx-dev-runtime";
ReactDOM.createRoot(document.getElementById("root")).render(
  jsxDEV(BrowserRouter, { children: jsxDEV(App, {}) }, void 0, false, {}, this),
);`;
  const out = rewriteEmbeddedBody(
    src,
    "application/javascript",
    "http://127.0.0.1:8030",
    "/embedded/8030",
    { url: "/embedded/8030/src/main.tsx" },
  );
  assert.doesNotMatch(out, /basename:\s*\(function\(\)/);
  assert.doesNotMatch(out, /BrowserRouter[^)]*basename/);
  // Library default still patchable separately:
  const lib = 'function hy({basename:i="/",children:s=null}){return "x"}';
  const libOut = rewriteReactRouterBasename(lib, "/embedded/8030");
  assert.ok(libOut.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
});

test("T4: Next.js _next asset paths are prefixed under /embedded/<port>/", () => {
  const html = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/_next/static/css/app.css"/>
<script src="/_next/static/chunks/main.js"></script>
</head><body><div id="__next">ok</div></body></html>`;
  const out = rewriteNextDevPaths(html, "/embedded/8033");
  assert.match(out, /href="\/embedded\/8033\/_next\/static\/css\/app\.css"/);
  assert.match(out, /src="\/embedded\/8033\/_next\/static\/chunks\/main\.js"/);
  assert.equal(out.includes('href="/_next/'), false);
  assert.equal(out.includes('src="/_next/'), false);
});

test("T5: @react-three/drei prebundled dep body stays intact", () => {
  const embedPath = "/embedded/8030";
  const requestPath = "/embedded/8030/node_modules/.vite/deps/@react-three_drei.js?v=1";
  const vendor = `var re=/foo\\/images\\/bar/gi; var s={src:"/images/logo.png"}; export default s;`;
  assert.equal(isVitePrebundledDepPath(requestPath), true);
  const out = rewriteEmbeddedBody(
    vendor,
    "application/javascript",
    "http://127.0.0.1:8030",
    embedPath,
    { url: requestPath },
  );
  assert.equal(out, vendor);
});

test("Vue: HTML entry /src/main.js is prefixed under /embedded/<port>/", () => {
  const html = `<!DOCTYPE html><html><body>
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
</body></html>`;
  const out = rewriteEmbeddedBody(html, "text/html", "http://127.0.0.1:8030", "/embedded/8030", {
    url: "/embedded/8030/",
  });
  assert.match(out, /src="\/embedded\/8030\/src\/main\.js"/);
  assert.match(out, /<base href="\/embedded\/8030\/">/);
});

test('Vue: existing root <base href="/"> is rewritten to embed prefix', () => {
  const html = `<!DOCTYPE html><html><head><base href="/">
<script type="module" src="/src/main.js"></script>
</head><body><div id="app"></div></body></html>`;
  const out = rewriteEmbeddedBody(html, "text/html", "http://127.0.0.1:8030", "/embedded/8030", {
    url: "/embedded/8030/",
  });
  assert.match(out, /<base href="\/embedded\/8030\/">/);
  assert.doesNotMatch(out, /<base href="\/">/);
});

test("Vue: rewriteEmbeddedBody patches createWebHistory and BASE_URL", () => {
  const src = `import { createWebHistory } from "vue-router";
const history = createWebHistory("/");
const env = {"BASE_URL":"/","MODE":"development"};`;
  const out = rewriteEmbeddedBody(
    src,
    "application/javascript",
    "http://127.0.0.1:8030",
    "/embedded/8030",
    { url: "/embedded/8030/src/router/index.js" },
  );
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
  assert.doesNotMatch(out, /createWebHistory\(\s*["']\/["']\s*\)/);
  assert.match(out, /"BASE_URL":"\/embedded\/8030\/"/);
});

test("Vue: rewriteVueRouterBase is exported and patches root history", () => {
  const out = rewriteVueRouterBase(`createWebHistory('/')`, { assetPath: "/embedded/8030" });
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
});

test("TanStack: rewriteEmbeddedBody injects createRouter basepath", () => {
  const src = `import { createRouter } from "@tanstack/react-router";
export function createAppRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
  });
}`;
  const out = rewriteEmbeddedBody(
    src,
    "application/javascript",
    "http://127.0.0.1:8030",
    "/embedded/8030",
    { url: "/embedded/8030/src/router.tsx" },
  );
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
  assert.match(out, /createRouter\(\s*\{basepath:/);
});

test("TanStack: rewriteEmbeddedBody patches createRouter inside Vite prebundled deps", () => {
  const embedPath = "/embedded/8030";
  const requestPath = "/embedded/8030/node_modules/.vite/deps/@tanstack_react-router.js?v=1";
  const lib =
    'function trimPath(p){return p}\nthis.basepath=`/${trimPath(this.options.basepath??"")}`;\nexport function createRouter(opts){return opts}\ncreateRouter({routeTree:t});';
  const out = rewriteEmbeddedBody(
    lib,
    "application/javascript",
    "http://127.0.0.1:8030",
    embedPath,
    { url: requestPath },
  );
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
  assert.match(out, /createRouter\(\{basepath:/);
  assert.doesNotMatch(out, /basepath\?\?""/);
});

test("TanStack: rewriteTanstackRouterBasepath is exported", () => {
  const out = rewriteTanstackRouterBasepath(`createRouter({routeTree:t})`);
  assert.ok(out.includes(LAUNCHPAD_EMBED_BASENAME_EXPR));
});

test("nav guard toEmbedUrl prefixes app routes like /login under embed", () => {
  const html = injectIframeNavigationGuard(
    "<!DOCTYPE html><html><head></head><body></body></html>",
  );
  assert.match(html, /data-embed-guard/);
  // Aggressive stay-under-embed: no host-breakout gate that leaves /login bare.
  assert.doesNotMatch(html, /isLaunchpadHostBreakout/);
  assert.match(html, /return prefix\+\(abs==="\/"\? "\/":abs\)\+rest/);
});

test("embed console reporter is injected once and is valid script", () => {
  const html = injectIframeNavigationGuard(
    "<!DOCTYPE html><html><head></head><body></body></html>",
  );
  assert.equal(html.match(/data-embed-console/g).length, 1);
  const again = injectIframeNavigationGuard(html);
  assert.equal(again.match(/data-embed-console/g).length, 1);
  const m = again.match(/<script data-embed-console>([\s\S]*?)<\/script>/);
  assert.ok(m?.[1]);
  assert.doesNotThrow(() => new Function(m[1]));
  assert.match(m[1], /launchpad:preview-console/);
});

test("nav guard inline script is syntactically valid (regex escapes survive template literal)", () => {
  const html = injectIframeNavigationGuard(
    "<!DOCTYPE html><html><head></head><body></body></html>",
  );
  const m = html.match(/<script data-embed-guard>([\s\S]*?)<\/script>/);
  assert.ok(m?.[1]);
  assert.doesNotThrow(() => new Function(m[1]));
  assert.match(m[1], /match\(\/\^\\\/embedded\\\/\(\\d\{1,5\}\)/);
});

test("nav guard rewrites bare same-origin anchor clicks under embed prefix", () => {
  const html = injectIframeNavigationGuard(
    "<!DOCTYPE html><html><head></head><body></body></html>",
  );
  const m = html.match(/<script data-embed-guard>([\s\S]*?)<\/script>/);
  assert.ok(m?.[1]);
  assert.match(m[1], /toEmbedUrl\(href\)/);
  assert.match(m[1], /abs\.indexOf\(prefix\+"\/"\)===0\)/);
});
