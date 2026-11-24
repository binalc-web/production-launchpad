import test from "node:test";
import assert from "node:assert/strict";
import {
  collectIframeNextNavPrefetchUrls,
  resolveNextEmbedPrefetchUrl,
  resolveNextInAppBrowsePath,
  runSequentialNextEmbedIdleCompile,
  shouldSkipNextEmbedPrefetchHref,
} from "../src/lib/nextEmbedRoutePrefetch.util.js";

test("shouldSkipNextEmbedPrefetchHref skips hash, mailto, and empty", () => {
  assert.equal(shouldSkipNextEmbedPrefetchHref(""), true);
  assert.equal(shouldSkipNextEmbedPrefetchHref("#section"), true);
  assert.equal(shouldSkipNextEmbedPrefetchHref("mailto:a@b.com"), true);
  assert.equal(shouldSkipNextEmbedPrefetchHref("tel:123"), true);
  assert.equal(shouldSkipNextEmbedPrefetchHref("javascript:void(0)"), true);
  assert.equal(shouldSkipNextEmbedPrefetchHref("/dashboard"), false);
});

test("resolveNextInAppBrowsePath returns in-app path and skips auth/external", () => {
  assert.equal(
    resolveNextInAppBrowsePath("/dashboard", {
      baseHref: "http://localhost:5173/embedded/8053/home",
      origin: "http://localhost:5173",
    }),
    "/dashboard",
  );
  assert.equal(
    resolveNextInAppBrowsePath("settings", {
      baseHref: "http://localhost:5173/embedded/8053/home",
      origin: "http://localhost:5173",
    }),
    "/settings",
  );
  assert.equal(
    resolveNextInAppBrowsePath("/auth/login", {
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
    }),
    "",
  );
  assert.equal(
    resolveNextInAppBrowsePath("https://example.com/app", {
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
    }),
    "",
  );
});

test("resolveNextEmbedPrefetchUrl prefixes in-app paths under /embedded/<port>", () => {
  assert.equal(
    resolveNextEmbedPrefetchUrl("/dashboard", {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/home",
      origin: "http://localhost:5173",
    }),
    "/embedded/8053/dashboard",
  );
  assert.equal(
    resolveNextEmbedPrefetchUrl("settings", {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/home",
      origin: "http://localhost:5173",
    }),
    "/embedded/8053/settings",
  );
  assert.equal(
    resolveNextEmbedPrefetchUrl("/embedded/8053/billing?tab=invoices", {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
    }),
    "/embedded/8053/billing?tab=invoices",
  );
});

test("resolveNextEmbedPrefetchUrl skips auth routes and external origins", () => {
  assert.equal(
    resolveNextEmbedPrefetchUrl("/auth/login", {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
    }),
    "",
  );
  assert.equal(
    resolveNextEmbedPrefetchUrl("https://example.com/app", {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
    }),
    "",
  );
  assert.equal(resolveNextEmbedPrefetchUrl("/dashboard", { port: 0 }), "");
});

test("collectIframeNextNavPrefetchUrls unique in-app links and skips current", () => {
  const iframe = {
    contentDocument: {
      querySelectorAll: () => [
        { getAttribute: () => "/dashboard" },
        { getAttribute: () => "/dashboard" },
        { getAttribute: () => "/settings" },
        { getAttribute: () => "/auth/login" },
        { getAttribute: () => "mailto:a@b.com" },
        { getAttribute: () => "/billing" },
      ],
    },
  };
  assert.deepEqual(
    collectIframeNextNavPrefetchUrls(iframe, {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
      skipBrowsePath: "/dashboard",
    }),
    ["/embedded/8053/settings", "/embedded/8053/billing"],
  );
});

test("collectIframeNextNavPrefetchUrls caps at max", () => {
  const iframe = {
    contentDocument: {
      querySelectorAll: () =>
        ["/a", "/b", "/c"].map((href) => ({ getAttribute: () => href })),
    },
  };
  assert.deepEqual(
    collectIframeNextNavPrefetchUrls(iframe, {
      port: 8053,
      baseHref: "http://localhost:5173/embedded/8053/",
      origin: "http://localhost:5173",
      max: 2,
    }),
    ["/embedded/8053/a", "/embedded/8053/b"],
  );
});

test("runSequentialNextEmbedIdleCompile one in-flight with gap and max", async () => {
  let inflight = 0;
  let peak = 0;
  const hits = [];
  const result = await runSequentialNextEmbedIdleCompile(
    [
      "/embedded/8053/a",
      "/embedded/8053/b",
      "/embedded/8053/c",
      "/embedded/8053/d",
    ],
    {
      max: 3,
      gapMs: 0,
      fetchImpl: async (url) => {
        inflight += 1;
        peak = Math.max(peak, inflight);
        hits.push(url);
        inflight -= 1;
        return { ok: true };
      },
      isHidden: () => false,
    },
  );
  assert.equal(peak, 1);
  assert.deepEqual(hits, ["/embedded/8053/a", "/embedded/8053/b", "/embedded/8053/c"]);
  assert.equal(result.compiled, 3);
  assert.equal(result.total, 3);
  assert.equal(result.aborted, false);
});

test("runSequentialNextEmbedIdleCompile pauses while compiling then continues", async () => {
  let pauseTicks = 2;
  const hits = [];
  const result = await runSequentialNextEmbedIdleCompile(["/embedded/8053/a", "/embedded/8053/b"], {
    gapMs: 1,
    fetchImpl: async (url) => {
      hits.push(url);
      return { ok: true };
    },
    shouldPause: () => {
      if (pauseTicks > 0) {
        pauseTicks -= 1;
        return true;
      }
      return false;
    },
    isHidden: () => false,
  });
  assert.deepEqual(hits, ["/embedded/8053/a", "/embedded/8053/b"]);
  assert.equal(result.paused, true);
  assert.equal(result.compiled, 2);
});

test("runSequentialNextEmbedIdleCompile aborts when tab hidden", async () => {
  const hits = [];
  const result = await runSequentialNextEmbedIdleCompile(["/embedded/8053/a"], {
    gapMs: 0,
    fetchImpl: async (url) => {
      hits.push(url);
      return { ok: true };
    },
    isHidden: () => true,
  });
  assert.deepEqual(hits, []);
  assert.equal(result.compiled, 0);
  assert.equal(result.aborted, true);
});

test("runSequentialNextEmbedIdleCompile aborts remaining after shouldAbort", async () => {
  const hits = [];
  const result = await runSequentialNextEmbedIdleCompile(
    ["/embedded/8053/a", "/embedded/8053/b"],
    {
      gapMs: 0,
      fetchImpl: async (url) => {
        hits.push(url);
        return { ok: true };
      },
      shouldAbort: () => hits.length >= 1,
      isHidden: () => false,
    },
  );
  assert.deepEqual(hits, ["/embedded/8053/a"]);
  assert.equal(result.compiled, 1);
  assert.equal(result.aborted, true);
});
