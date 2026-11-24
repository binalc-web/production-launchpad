import test from "node:test";
import assert from "node:assert/strict";
import {
  PREVIEW_ENSURE_COOLDOWN_MS,
  PREVIEW_PORT_RECOVERY_PROBE_MS,
  canCallPreviewEnsureNow,
  isPreviewBootPending,
  isPreviewEnsureRateLimitedError,
  isPreviewInstallInProgress,
  isPreviewSpawnInProgress,
  nextPreviewBootWaitTick,
  resolvePreviewEnsureThrottleUntil,
  shouldPollPreviewStatusDuringBoot,
  shouldProbeEmbedDuringBoot,
  shouldReEnsureDuringBoot,
  shouldRetryEnsureAfterFailedStatus,
  shouldSkipOverlappingPreviewBoot,
} from "../src/pages/ClientLink/clientLinkPreviewBootWait.util.js";

test("isPreviewInstallInProgress: installing status or installRunning", () => {
  assert.equal(isPreviewInstallInProgress({ status: "installing" }), true);
  assert.equal(isPreviewInstallInProgress({ installRunning: true, status: "starting" }), true);
  assert.equal(isPreviewInstallInProgress({ status: "starting" }), false);
});

test("isPreviewSpawnInProgress: starting/restarting/install", () => {
  assert.equal(isPreviewSpawnInProgress({ status: "starting" }), true);
  assert.equal(isPreviewSpawnInProgress({ status: "restarting" }), true);
  assert.equal(isPreviewSpawnInProgress({ status: "installing" }), true);
  assert.equal(isPreviewSpawnInProgress({ status: "ready", listening: true }), false);
});

test("isPreviewBootPending: not ready and not failed", () => {
  assert.equal(isPreviewBootPending({ status: "starting", listening: false }), true);
  assert.equal(isPreviewBootPending({ status: "stopped", listening: false }), true);
  assert.equal(isPreviewBootPending({ status: "ready", listening: true }), false);
  assert.equal(isPreviewBootPending({ status: "failed" }), false);
});

test("shouldProbeEmbedDuringBoot: sparse probes while install/spawn pending", () => {
  assert.equal(shouldProbeEmbedDuringBoot({ status: "installing" }, 1), false);
  assert.equal(shouldProbeEmbedDuringBoot({ status: "starting", listening: false }, 1), false);
  assert.equal(shouldProbeEmbedDuringBoot({ status: "starting", listening: false }, 4), true);
  assert.equal(shouldProbeEmbedDuringBoot({ throttled: true, status: "starting" }, 4), false);
  assert.equal(shouldProbeEmbedDuringBoot({ status: "ready", listening: true }, 1), true);
});

test("shouldReEnsureDuringBoot: cooldown + no ensure during spawn/install", () => {
  const now = 1_000_000;
  assert.equal(shouldReEnsureDuringBoot({ status: "installing" }, 8), false);
  assert.equal(
    shouldReEnsureDuringBoot({ status: "starting", listening: false }, 8, {
      lastEnsureAt: now - 1000,
      now,
    }),
    false,
  );
  assert.equal(
    shouldReEnsureDuringBoot({ status: "stopped", listening: false }, 8, {
      lastEnsureAt: now - PREVIEW_ENSURE_COOLDOWN_MS,
      now,
    }),
    true,
  );
  assert.equal(
    shouldReEnsureDuringBoot({ status: "stopped", listening: false }, 8, {
      lastEnsureAt: now - 5000,
      now,
    }),
    false,
  );
});

test("shouldRetryEnsureAfterFailedStatus: respects cooldown and install", () => {
  const now = 1_000_000;
  assert.equal(
    shouldRetryEnsureAfterFailedStatus(
      { status: "failed", error: "npm install failed", installRunning: true },
      8,
    ),
    false,
  );
  assert.equal(
    shouldRetryEnsureAfterFailedStatus(
      { status: "failed", error: "native binding missing" },
      8,
      { lastEnsureAt: now - PREVIEW_ENSURE_COOLDOWN_MS, now },
    ),
    true,
  );
});

test("nextPreviewBootWaitTick: install/spawn/throttle use longer delays", () => {
  const installTick = nextPreviewBootWaitTick({ status: "installing", installRunning: true }, 1);
  assert.equal(installTick.waitInstall, true);
  assert.equal(installTick.probeEmbed, false);
  assert.equal(installTick.pollStatus, true);
  assert.ok(installTick.delayMs >= 4000);

  const spawnTick = nextPreviewBootWaitTick({ status: "starting", listening: false }, 1);
  assert.equal(spawnTick.probeEmbed, false);
  assert.ok(spawnTick.delayMs >= 2000);

  const throttledTick = nextPreviewBootWaitTick(
    { status: "starting" },
    1,
    { ensureThrottledUntil: 50_000, now: 10_000 },
  );
  assert.equal(throttledTick.throttled, true);
  assert.equal(throttledTick.reEnsure, false);
  assert.equal(throttledTick.delayMs, 40_000);
});

test("shouldPollPreviewStatusDuringBoot: every tick during install", () => {
  assert.equal(shouldPollPreviewStatusDuringBoot(1, { status: "installing" }), true);
  assert.equal(shouldPollPreviewStatusDuringBoot(2, { status: "starting" }), false);
  assert.equal(shouldPollPreviewStatusDuringBoot(4, { status: "starting" }), true);
});

test("shouldSkipOverlappingPreviewBoot: skip duplicate auto boots", () => {
  assert.equal(shouldSkipOverlappingPreviewBoot({ inFlight: true, retry: false }), true);
  assert.equal(shouldSkipOverlappingPreviewBoot({ inFlight: true, retry: true }), false);
});

test("isPreviewEnsureRateLimitedError and throttle resolver", () => {
  assert.equal(
    isPreviewEnsureRateLimitedError({
      error: "Too many requests. Please slow down and try again shortly.",
    }),
    true,
  );
  const until = resolvePreviewEnsureThrottleUntil(45);
  assert.ok(until >= Date.now() + 44_000);
});

test("canCallPreviewEnsureNow respects cooldown", () => {
  const now = 100_000;
  assert.equal(canCallPreviewEnsureNow(null, now), true);
  assert.equal(canCallPreviewEnsureNow(now - 5000, now), false);
  assert.equal(canCallPreviewEnsureNow(now - PREVIEW_ENSURE_COOLDOWN_MS, now), true);
});

test("PREVIEW_PORT_RECOVERY_PROBE_MS is conservative", () => {
  assert.ok(PREVIEW_PORT_RECOVERY_PROBE_MS >= 5000);
});
