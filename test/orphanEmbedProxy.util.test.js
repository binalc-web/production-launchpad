import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrphanDocumentRedirect,
  createEmbeddedRootAssetMiddleware,
  isOrphanDocumentNavigation,
  isOrphanEmbeddedAppPath,
  isOrphanEmbeddedAssetPath,
  isOrphanEmbeddedProxyPath,
} from "../iframe-preview/rootAssetMiddleware.js";
import {
  isClientLinkShellPath,
  isLaunchpadHostAppPath,
  resolveEmbedPortFromRequest,
} from "../iframe-preview/embedPort.js";
import { isEmbedInfrastructurePath } from "../iframe-preview/constants.js";
import { rewriteRedirectLocation } from "../iframe-preview/rewritePaths.js";

test("isEmbedInfrastructurePath only covers api/embedded/iframe-preview", () => {
  assert.equal(isEmbedInfrastructurePath("/api/x"), true);
  assert.equal(isEmbedInfrastructurePath("/embedded/8035/"), true);
  assert.equal(isEmbedInfrastructurePath("/iframe-preview/1/"), true);
  assert.equal(isEmbedInfrastructurePath("/login"), false);
  assert.equal(isEmbedInfrastructurePath("/settings"), false);
  assert.equal(isEmbedInfrastructurePath("/projects/foo"), false);
  assert.equal(isEmbedInfrastructurePath("/dashboard"), false);
});

test("isOrphanEmbeddedAppPath accepts login/settings/projects (no route denylist)", () => {
  assert.equal(isOrphanEmbeddedAppPath("/dashboard"), true);
  assert.equal(isOrphanEmbeddedAppPath("/login"), true);
  assert.equal(isOrphanEmbeddedAppPath("/settings"), true);
  assert.equal(isOrphanEmbeddedAppPath("/projects"), true);
  assert.equal(isOrphanEmbeddedAppPath("/projects/abc"), true);
  assert.equal(isOrphanEmbeddedAppPath("/api/discovery/public/x"), false);
  assert.equal(isOrphanEmbeddedAppPath("/embedded/8035/dashboard"), false);
  assert.equal(isOrphanEmbeddedAppPath("/"), false);
});

test("isOrphanEmbeddedAssetPath still catches Next /_next assets", () => {
  assert.equal(isOrphanEmbeddedAssetPath("/_next/static/chunks/main.js"), true);
  assert.equal(isOrphanEmbeddedProxyPath("/_next/static/chunks/main.js"), true);
  assert.equal(isOrphanEmbeddedProxyPath("/login"), true);
  assert.equal(isOrphanEmbeddedAppPath("/_next/static/chunks/main.js"), false);
});

test("isOrphanEmbeddedAssetPath catches Vite html-proxy with query string", () => {
  assert.equal(isOrphanEmbeddedAssetPath("/index.html?html-proxy&index=0.js"), true);
  assert.equal(isOrphanEmbeddedProxyPath("/index.html?html-proxy&index=0.js"), true);
  assert.equal(isOrphanEmbeddedAssetPath("/embedded/8010/index.html?html-proxy&index=0.js"), false);
});

test("rewriteRedirectLocation prefixes /embedded/<port> for Next redirect(/dashboard)", () => {
  const out = rewriteRedirectLocation("/dashboard", "http://127.0.0.1:8035", "/embedded/8035");
  assert.equal(out, "/embedded/8035/dashboard");
});

test("rewriteRedirectLocation prefixes absolute upstream origin redirects", () => {
  const out = rewriteRedirectLocation(
    "http://127.0.0.1:8035/login",
    "http://127.0.0.1:8035",
    "/embedded/8035",
  );
  assert.equal(out, "/embedded/8035/login");
});

test("rewriteRedirectLocation leaves already-prefixed paths unchanged", () => {
  const out = rewriteRedirectLocation(
    "/embedded/8035/dashboard",
    "http://127.0.0.1:8035",
    "/embedded/8035",
  );
  assert.equal(out, "/embedded/8035/dashboard");
});

test("isClientLinkShellPath matches public client-link URLs only", () => {
  assert.equal(isClientLinkShellPath("/projects/my-slug"), true);
  assert.equal(isClientLinkShellPath("/projects/details/abc"), false);
  assert.equal(isClientLinkShellPath("/projects"), false);
  assert.equal(isClientLinkShellPath("/login"), false);
});

test("resolveEmbedPortFromRequest uses cookie after /dashboard breakout referer", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/login",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/dashboard",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest proxies /login with embed referer", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/login?_rsc=1",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest ignores cookie when referer is Client Link shell", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/dashboard",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/projects/my-slug",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not hijack Client Link document refresh via cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/projects/my-slug",
    headers: {
      cookie: "embed_port=8035",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest allows Next /projects/:id with app referer + cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/projects/abc",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/dashboard",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest prefers /embedded referer port", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/dashboard",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest does not steal LaunchPad /@vite/client via cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/@vite/client",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/projects/my-slug",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal LaunchPad vite env.mjs via cookie alone", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/vite/dist/client/env.mjs",
    headers: {
      cookie: "embed_port=8035",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest still proxies vite env.mjs when embed referer present", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/vite/dist/client/env.mjs",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest does not steal LaunchPad tldraw.css via cookie without referer", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/tldraw/tldraw.css",
    headers: {
      cookie: "embed_port=8035",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal LaunchPad reactour css via cookie without referer", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/@reactour/tour/dist/index.css",
    headers: {
      cookie: "embed_port=8035",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal LaunchPad node_modules via login referer + cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/@xyflow/react/dist/style.css",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/login",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest still proxies preview node_modules when embed referer present", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/react/index.js",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest does not orphan-proxy node_modules after dashboard breakout referer", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/node_modules/react/index.js",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/dashboard",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal LaunchPad /src via cookie alone", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/src/index.jsx",
    headers: {
      cookie: "embed_port=8035",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest still proxies /@vite/client when embed referer present", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/@vite/client",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
    },
  });
  assert.equal(port, 8035);
});

test("isLaunchpadHostAppPath covers platform routes, not common preview routes", () => {
  assert.equal(isLaunchpadHostAppPath("/auth/callback"), true);
  assert.equal(isLaunchpadHostAppPath("/integrations/callback"), true);
  assert.equal(isLaunchpadHostAppPath("/jobs"), true);
  assert.equal(isLaunchpadHostAppPath("/settings/integrations"), true);
  assert.equal(isLaunchpadHostAppPath("/"), false);
  assert.equal(isLaunchpadHostAppPath("/chat"), true);
  assert.equal(isLaunchpadHostAppPath("/projects"), true);
  assert.equal(isLaunchpadHostAppPath("/projects/"), true);
  assert.equal(isLaunchpadHostAppPath("/projects/details/abc"), true);
  assert.equal(isLaunchpadHostAppPath("/projects/onboarding"), true);
  assert.equal(isLaunchpadHostAppPath("/projects/roadmap/abc"), true);
  assert.equal(isLaunchpadHostAppPath("/login"), false);
  assert.equal(isLaunchpadHostAppPath("/dashboard"), false);
  assert.equal(isLaunchpadHostAppPath("/projects/foo"), false);
});

test("resolveEmbedPortFromRequest does not steal /projects via stale embed_port cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/projects",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/login",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal /chat via stale embed_port cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/chat",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/login",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal /projects/details via cookie alone", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/projects/details/abc",
    headers: {
      cookie: "embed_port=8035",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal /auth/callback via stale embed_port cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/auth/callback?code=abc&state=google",
    headers: {
      cookie: "embed_port=8035",
      referer: "https://accounts.google.com/",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest does not steal /auth/callback with cookie alone", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/auth/callback?code=abc&state=google",
    headers: {
      cookie: "embed_port=8035",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
    },
  });
  assert.equal(port, null);
});

test("resolveEmbedPortFromRequest still allows preview /auth via embed referer", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/auth/callback?code=abc",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
    },
  });
  assert.equal(port, 8035);
});

test("resolveEmbedPortFromRequest does not steal top-level cross-site document via cookie", () => {
  const port = resolveEmbedPortFromRequest({
    url: "/login",
    headers: {
      cookie: "embed_port=8035",
      referer: "https://accounts.google.com/",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
    },
  });
  assert.equal(port, null);
});

test("isOrphanDocumentNavigation detects iframe/tab documents, not fetch or RSC", () => {
  assert.equal(
    isOrphanDocumentNavigation({
      method: "GET",
      headers: { "sec-fetch-dest": "iframe", "sec-fetch-mode": "navigate" },
    }),
    true,
  );
  assert.equal(
    isOrphanDocumentNavigation({ method: "GET", headers: { "sec-fetch-dest": "document" } }),
    true,
  );
  assert.equal(
    isOrphanDocumentNavigation({ method: "GET", headers: { accept: "text/html,*/*" } }),
    true,
  );
  assert.equal(
    isOrphanDocumentNavigation({
      method: "GET",
      headers: { "sec-fetch-dest": "empty", accept: "text/html" },
    }),
    false,
  );
  assert.equal(
    isOrphanDocumentNavigation({
      method: "GET",
      headers: { rsc: "1", "sec-fetch-dest": "document" },
    }),
    false,
  );
  assert.equal(
    isOrphanDocumentNavigation({ method: "POST", headers: { "sec-fetch-dest": "document" } }),
    false,
  );
});

test("buildOrphanDocumentRedirect keeps path and query under /embedded/<port>", () => {
  assert.equal(buildOrphanDocumentRedirect(8035, "/dashboard"), "/embedded/8035/dashboard");
  assert.equal(
    buildOrphanDocumentRedirect(8035, "/projects/7?tab=files"),
    "/embedded/8035/projects/7?tab=files",
  );
});

function runRootAssetMiddleware(req) {
  const middleware = createEmbeddedRootAssetMiddleware({ upstreamHost: "127.0.0.1" });
  const res = {
    statusCode: null,
    headers: null,
    ended: false,
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    },
    end() {
      this.ended = true;
    },
  };
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

test("orphan app-route document redirects under /embedded/<port> (base href must prefix URL)", () => {
  const { res, nextCalled } = runRootAssetMiddleware({
    method: "GET",
    url: "/dashboard?x=1",
    headers: {
      cookie: "embed_port=8035",
      referer: "http://localhost:5173/embedded/8035/",
      "sec-fetch-dest": "iframe",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
    },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, "/embedded/8035/dashboard?x=1");
  assert.equal(res.ended, true);
});

test("orphan app-route document without resolvable port falls through to host", () => {
  const { res, nextCalled } = runRootAssetMiddleware({
    method: "GET",
    url: "/dashboard",
    headers: { "sec-fetch-dest": "document", "sec-fetch-mode": "navigate" },
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("LAUNCHPAD_ORPHAN_RESERVED_SEGMENTS is removed", async () => {
  let threw = false;
  try {
    await import("../iframe-preview/constants.js").then((m) => {
      assert.equal(m.LAUNCHPAD_ORPHAN_RESERVED_SEGMENTS, undefined);
    });
  } catch {
    threw = true;
  }
  assert.equal(threw, false);
});
