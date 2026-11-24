import test from "node:test";
import assert from "node:assert/strict";
import {
  PREVIEW_AUTO_SOFT_RELOAD_DELAY_MS,
  PREVIEW_AUTO_HEAL_MAX_ATTEMPTS,
  getAutoHealDelayMs,
  shouldAttemptAutoSoftReload,
} from "../src/pages/ClientLink/clientLinkPreviewAutoSoftReload.util.js";

test("PREVIEW_AUTO_SOFT_RELOAD_DELAY_MS is 8 seconds", () => {
  assert.equal(PREVIEW_AUTO_SOFT_RELOAD_DELAY_MS, 8000);
});

test("getAutoHealDelayMs backs off then clamps", () => {
  assert.equal(getAutoHealDelayMs(0), 8000);
  assert.equal(getAutoHealDelayMs(1), 12000);
  assert.equal(getAutoHealDelayMs(2), 20000);
  assert.equal(getAutoHealDelayMs(99), 20000);
});

test("shouldAttemptAutoSoftReload requires gate open + blank + under max attempts", () => {
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      attemptCount: 0,
      blankOrBroken: true,
    }),
    true,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      alreadyAttempted: true,
      blankOrBroken: true,
    }),
    false,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      attemptCount: PREVIEW_AUTO_HEAL_MAX_ATTEMPTS,
      blankOrBroken: true,
    }),
    false,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: false,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      attemptCount: 0,
      blankOrBroken: true,
    }),
    false,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: true,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      attemptCount: 0,
      blankOrBroken: true,
    }),
    false,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: true,
      attemptCount: 0,
      blankOrBroken: true,
    }),
    false,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      attemptCount: 0,
      blankOrBroken: false,
    }),
    false,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: true,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: false,
      attemptCount: 0,
      blankOrBroken: true,
      nextInAppCompiling: true,
    }),
    false,
  );
});

test("shouldAttemptAutoSoftReload allows port_unreachable even with diagnosis / closed gate", () => {
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: false,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: true,
      attemptCount: 0,
      blankOrBroken: false,
      portUnreachable: true,
    }),
    true,
  );
  assert.equal(
    shouldAttemptAutoSoftReload({
      gateOpen: false,
      previewIframeReady: false,
      previewBootFailed: false,
      hasFailureDiagnosis: true,
      attemptCount: PREVIEW_AUTO_HEAL_MAX_ATTEMPTS,
      blankOrBroken: false,
      portUnreachable: true,
    }),
    false,
  );
});
