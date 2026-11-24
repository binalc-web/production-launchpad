import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmbeddedPreviewSrc,
  extractEmbedBrowsePathFromLocation,
  isAuthBrowsePath,
  navigateEmbedIframeToAppRoute,
  navigateEmbedIframeToBrowsePath,
  parsePreviewUrlInput,
  resolvePreviewRefreshBrowsePath,
  sanitizeEmbedBrowsePath,
} from "../src/lib/clientLinkEmbeddedPreviewSrc.js";

test("buildEmbeddedPreviewSrc preserves deep route and cache bust", () => {
  const src = buildEmbeddedPreviewSrc(8010, "/settings?tab=general", { nonce: 2 });
  assert.equal(
    src,
    "/embedded/8010/settings?embed_frame=1&embed_port=8010&_pv=2&tab=general",
  );
});

test("buildEmbeddedPreviewSrc keeps hash on deep route", () => {
  const src = buildEmbeddedPreviewSrc(8010, "/docs#intro", { nonce: 1 });
  assert.equal(
    src,
    "/embedded/8010/docs?embed_frame=1&embed_port=8010&_pv=1#intro",
  );
});

test("buildEmbeddedPreviewSrc uses embed root when path empty", () => {
  const src = buildEmbeddedPreviewSrc(8010, "", { nonce: 3 });
  assert.equal(src, "/embedded/8010/?embed_frame=1&embed_port=8010&_pv=3");
});

test("sanitizeEmbedBrowsePath strips embed wrapper query params", () => {
  assert.equal(
    sanitizeEmbedBrowsePath(
      "/?embed_frame=1&embed_port=8017&_pv=1&tab=home",
    ),
    "/?tab=home",
  );
});

test("buildEmbeddedPreviewSrc does not duplicate _pv from stored browse path", () => {
  const src = buildEmbeddedPreviewSrc(
    8017,
    "/?embed_frame=1&embed_port=8017&_pv=1",
    { nonce: 2 },
  );
  assert.equal(
    src,
    "/embedded/8017/?embed_frame=1&embed_port=8017&_pv=2",
  );
});

test("extractEmbedBrowsePathFromLocation strips embed prefix", () => {
  assert.equal(
    extractEmbedBrowsePathFromLocation(
      "/embedded/8010/settings",
      "?tab=general",
      "",
    ),
    "/settings?tab=general",
  );
});

test("extractEmbedBrowsePathFromLocation keeps hash routes", () => {
  assert.equal(
    extractEmbedBrowsePathFromLocation("/embedded/8010/", "", "#/dashboard"),
    "/#/dashboard",
  );
});

test("buildEmbeddedPreviewSrc preserves hash-router path on soft reload", () => {
  const src = buildEmbeddedPreviewSrc(8010, "/#/dashboard", { nonce: 4 });
  assert.equal(
    src,
    "/embedded/8010/?embed_frame=1&embed_port=8010&_pv=4#/dashboard",
  );
});

test("resolvePreviewRefreshBrowsePath prefers live iframe path", () => {
  assert.equal(
    resolvePreviewRefreshBrowsePath({
      live: "/billing",
      ref: "/",
      stored: "/",
    }),
    "/billing",
  );
});

test("resolvePreviewRefreshBrowsePath falls back to ref when live is empty", () => {
  assert.equal(
    resolvePreviewRefreshBrowsePath({
      live: "",
      ref: "/reports",
      stored: "/",
    }),
    "/reports",
  );
});

test("isAuthBrowsePath detects common sign-in routes", () => {
  assert.equal(isAuthBrowsePath("/login"), true);
  assert.equal(isAuthBrowsePath("/sign-in"), true);
  assert.equal(isAuthBrowsePath("/#/login"), true);
  assert.equal(isAuthBrowsePath("/dashboard"), false);
});

test("resolvePreviewRefreshBrowsePath skips auth paths when non-auth fallback exists", () => {
  assert.equal(
    resolvePreviewRefreshBrowsePath({
      live: "/login",
      ref: "/login",
      stored: "",
      lastNonAuth: "/settings?tab=billing",
      persisted: "",
    }),
    "/settings?tab=billing",
  );
});

test("navigateEmbedIframeToBrowsePath replaces auth route with stored path", () => {
  let replaced = "";
  const iframe = {
    contentWindow: {
      location: {
        pathname: "/embedded/8010/login",
        search: "?embed_frame=1&embed_port=8010",
        hash: "",
        replace(url) {
          replaced = url;
        },
      },
    },
  };
  assert.equal(
    navigateEmbedIframeToBrowsePath(iframe, 8010, "/dashboard"),
    true,
  );
  assert.equal(replaced, "/embedded/8010/dashboard?embed_frame=1&embed_port=8010");
});

test("resolvePreviewRefreshBrowsePath uses persisted non-auth path", () => {
  assert.equal(
    resolvePreviewRefreshBrowsePath({
      live: "",
      ref: "",
      stored: "",
      lastNonAuth: "",
      persisted: "/projects/42#details",
    }),
    "/projects/42#details",
  );
});

test("parsePreviewUrlInput normalizes bare paths and strips embed prefix", () => {
  assert.equal(parsePreviewUrlInput("dashboard"), "/dashboard");
  assert.equal(parsePreviewUrlInput("/embedded/8010/settings?tab=general"), "/settings?tab=general");
  assert.equal(
    parsePreviewUrlInput("http://localhost:8010/embedded/8010/billing"),
    "/billing",
  );
});

test("navigateEmbedIframeToAppRoute preserves app query params", () => {
  let replaced = "";
  const iframe = {
    contentWindow: {
      location: {
        pathname: "/embedded/8010/dashboard",
        search: "?embed_frame=1&embed_port=8010",
        hash: "",
        replace(url) {
          replaced = url;
        },
      },
    },
  };
  assert.equal(
    navigateEmbedIframeToAppRoute(iframe, 8010, "/settings?tab=billing"),
    true,
  );
  assert.equal(
    replaced,
    "/embedded/8010/settings?embed_frame=1&embed_port=8010&tab=billing",
  );
});
