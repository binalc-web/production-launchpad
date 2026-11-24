import test from "node:test";
import assert from "node:assert/strict";
import {
  EMBED_HMR_WS_FAIL_BEFORE_HARD_RELOAD,
  createEmbedHmrWsFailureTracker,
} from "../src/lib/clientLinkEmbedHmrWsRecovery.util.js";

test("shows initial toast only once across repeated failures", () => {
  const tracker = createEmbedHmrWsFailureTracker({
    failBeforeHardReload: 5,
    maxAutoHardReloads: 1,
  });

  const first = tracker.onFailed();
  assert.equal(first.showInitialToast, true);
  assert.equal(first.nextState, "failed");

  for (let i = 0; i < 3; i += 1) {
    const next = tracker.onFailed();
    assert.equal(next.showInitialToast, false);
    assert.equal(next.action, "counted");
  }
});

test("triggers hard reload on the fifth failure", () => {
  const tracker = createEmbedHmrWsFailureTracker({
    failBeforeHardReload: 5,
    maxAutoHardReloads: 1,
  });

  for (let i = 0; i < 4; i += 1) {
    tracker.onFailed();
  }

  const fifth = tracker.onFailed();
  assert.equal(fifth.action, "hard-reload");
  assert.equal(fifth.nextState, "recovering");
});

test("exhausts immediately when auto hard reload fails", () => {
  const tracker = createEmbedHmrWsFailureTracker({
    failBeforeHardReload: 5,
    maxAutoHardReloads: 1,
  });

  for (let i = 0; i < 5; i += 1) {
    tracker.onFailed();
  }

  const outcome = tracker.onHardReloadComplete({ success: false });
  assert.equal(outcome.showExhaustedToast, true);
  assert.equal(outcome.nextState, "exhausted");
  assert.equal(tracker.isExhausted(), true);
  assert.equal(tracker.onFailed().action, "ignored");
});

test("exhausts when failures continue after the auto hard reload was already attempted", () => {
  const tracker = createEmbedHmrWsFailureTracker({
    failBeforeHardReload: 5,
    maxAutoHardReloads: 1,
  });

  for (let i = 0; i < 5; i += 1) {
    tracker.onFailed();
  }
  tracker.onHardReloadComplete({ success: true });

  for (let i = 0; i < 4; i += 1) {
    const counted = tracker.onFailed();
    assert.equal(counted.action, "counted");
  }

  const fifth = tracker.onFailed();
  assert.equal(fifth.action, "exhausted");
  assert.equal(fifth.showExhaustedToast, true);
  assert.equal(fifth.nextState, "exhausted");
});

test("resets on open after a failure streak", () => {
  const tracker = createEmbedHmrWsFailureTracker();
  tracker.onFailed();
  tracker.onFailed();
  const open = tracker.onOpen();
  assert.equal(open.nextState, "connected");
  assert.equal(tracker.isExhausted(), false);

  const again = tracker.onFailed();
  assert.equal(again.showInitialToast, true);
});

test("default fail threshold is five", () => {
  const tracker = createEmbedHmrWsFailureTracker({ maxAutoHardReloads: 1 });
  for (let i = 0; i < EMBED_HMR_WS_FAIL_BEFORE_HARD_RELOAD - 1; i += 1) {
    assert.equal(tracker.onFailed().action, "counted");
  }
  assert.equal(tracker.onFailed().action, "hard-reload");
});
