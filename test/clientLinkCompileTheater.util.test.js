import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPILE_THEATER_ELAPSED,
  createEmptyCompileProgress,
  mergeCompileProgress,
  hasCompileTheaterProgress,
  shouldShowCompileTheaterBar,
  compileTheaterBarPercent,
  formatCompileTheaterCopy,
} from "../src/lib/clientLinkCompileTheater.util.js";
import {
  EMBED_COMPILE_PROGRESS_MESSAGE_TYPE,
  isCompileTheaterModuleUrl,
  compileProgressFileLabel,
  stripEmbedPrefixFromPath,
  isEmbedCompileProgressMessage,
  parseEmbedCompileProgressMessage,
} from "../iframe-preview/embedCompileProgress.js";

test("stripEmbedPrefixFromPath removes /embedded/<port>", () => {
  assert.equal(stripEmbedPrefixFromPath("/embedded/8010/src/App.tsx"), "/src/App.tsx");
  assert.equal(stripEmbedPrefixFromPath("/embedded/8010"), "/");
  assert.equal(stripEmbedPrefixFromPath("/src/App.tsx"), "/src/App.tsx");
});

test("compileProgressFileLabel returns basename", () => {
  assert.equal(compileProgressFileLabel("/embedded/8010/src/pages/Home.tsx"), "Home.tsx");
  assert.equal(compileProgressFileLabel("http://localhost:5173/src/App.tsx?t=1"), "App.tsx");
});

test("isCompileTheaterModuleUrl accepts Vite/Next modules and skips assets", () => {
  assert.equal(isCompileTheaterModuleUrl("/embedded/8010/src/App.tsx"), true);
  assert.equal(isCompileTheaterModuleUrl("/src/components/Button.tsx"), true);
  assert.equal(isCompileTheaterModuleUrl("/_next/static/chunks/app/page.js"), true);
  assert.equal(isCompileTheaterModuleUrl("/@vite/client"), false);
  assert.equal(isCompileTheaterModuleUrl("/logo.png"), false);
  assert.equal(isCompileTheaterModuleUrl("/__launchpad/compile-progress"), false);
});

test("isEmbedCompileProgressMessage validates shape", () => {
  assert.equal(
    isEmbedCompileProgressMessage({
      type: EMBED_COMPILE_PROGRESS_MESSAGE_TYPE,
      port: 8010,
      done: 3,
    }),
    true,
  );
  assert.equal(isEmbedCompileProgressMessage({ type: "other", done: 1 }), false);
  assert.equal(isEmbedCompileProgressMessage(null), false);
});

test("parseEmbedCompileProgressMessage drops total <= done", () => {
  const parsed = parseEmbedCompileProgressMessage({
    type: EMBED_COMPILE_PROGRESS_MESSAGE_TYPE,
    port: 8010,
    done: 10,
    total: 8,
    file: "/src/Home.tsx",
  });
  assert.equal(parsed.done, 10);
  assert.equal(parsed.total, null);
  assert.equal(parsed.file, "Home.tsx");
});

test("mergeCompileProgress never goes backward", () => {
  const a = mergeCompileProgress(null, { done: 5, total: 20, file: "A.tsx" });
  assert.equal(a.done, 5);
  assert.equal(a.total, 20);
  const b = mergeCompileProgress(a, { done: 3, total: 10, file: "B.tsx" });
  assert.equal(b.done, 5);
  assert.equal(b.total, 20);
  assert.equal(b.file, "B.tsx");
  const c = mergeCompileProgress(b, { done: 12, total: 40 });
  assert.equal(c.done, 12);
  assert.equal(c.total, 40);
});

test("mergeCompileProgress ignores total <= done", () => {
  const a = mergeCompileProgress(null, { done: 8, total: 8 });
  assert.equal(a.done, 8);
  assert.equal(a.total, null);
});

test("mergeCompileProgress reset starts fresh", () => {
  const a = mergeCompileProgress(null, { done: 40, total: 100, file: "Old.tsx" });
  const b = mergeCompileProgress(a, { reset: true, quiet: true, route: "/pricing" });
  assert.equal(b.done, 0);
  assert.equal(b.total, null);
  assert.equal(b.file, "");
  assert.equal(b.quiet, true);
  assert.equal(b.route, "/pricing");
  assert.ok(b.startedAt >= a.startedAt);
});

test("hasCompileTheaterProgress", () => {
  assert.equal(hasCompileTheaterProgress(createEmptyCompileProgress()), false);
  assert.equal(hasCompileTheaterProgress(mergeCompileProgress(null, { done: 1 })), true);
  assert.equal(hasCompileTheaterProgress(mergeCompileProgress(null, { file: "X.tsx" })), true);
});

test("shouldShowCompileTheaterBar and percent", () => {
  const p = mergeCompileProgress(null, { done: 38, total: 142 });
  assert.equal(shouldShowCompileTheaterBar(p, COMPILE_THEATER_ELAPSED.showBarAfterMs), true);
  assert.equal(compileTheaterBarPercent(p), Math.round((38 / 142) * 100));
  assert.equal(shouldShowCompileTheaterBar(mergeCompileProgress(null, { done: 5 }), 60_000), false);
});

test("formatCompileTheaterCopy overlay / chip / quiet", () => {
  const progress = mergeCompileProgress(null, {
    done: 38,
    total: 142,
    file: "Home.tsx",
    route: "/pricing",
  });
  const overlay = formatCompileTheaterCopy({
    progress,
    elapsedMs: 50_000,
    variant: "overlay",
  });
  assert.equal(overlay.title, "Compiling modules 38 / 142");
  assert.equal(overlay.fileLine, "Home.tsx");
  assert.match(overlay.helper, /2–3 minutes/);
  assert.equal(overlay.showBar, true);

  const chip = formatCompileTheaterCopy({
    progress,
    elapsedMs: 50_000,
    variant: "chip",
  });
  assert.equal(chip.title, "Compiling modules 38 / 142 · Home.tsx");

  const quiet = formatCompileTheaterCopy({
    progress: { ...progress, quiet: true },
    elapsedMs: 5_000,
    variant: "quiet",
  });
  assert.equal(quiet.title, "Compiling /pricing · 38 / 142");
  assert.equal(quiet.helper, "");
  assert.equal(quiet.fileLine, "");
});

test("formatCompileTheaterCopy without total", () => {
  const progress = mergeCompileProgress(null, { done: 12, file: "App.tsx" });
  const overlay = formatCompileTheaterCopy({
    progress,
    elapsedMs: 10_000,
    variant: "overlay",
  });
  assert.equal(overlay.title, "Compiling modules 12");
  assert.equal(overlay.showBar, false);
});
