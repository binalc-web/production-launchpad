import test from "node:test";
import assert from "node:assert/strict";
import {
  SECRET_RESTART_CLICK_COUNT,
  SECRET_RESTART_CLICK_WINDOW_MS,
  SECRET_RESTART_SOFT_DELAY_MS,
  createSecretRestartClickState,
  recordSecretRestartClick,
  resolveSecretRestartSoftAfterDelay,
} from "../src/pages/ClientLink/clientLinkPreviewSecretRestart.util.js";

test("constants match planned gesture window", () => {
  assert.equal(SECRET_RESTART_CLICK_WINDOW_MS, 1000);
  assert.equal(SECRET_RESTART_SOFT_DELAY_MS, 350);
  assert.equal(SECRET_RESTART_CLICK_COUNT, 3);
});

test("recordSecretRestartClick waits on first and second click", () => {
  let state = createSecretRestartClickState();
  let r = recordSecretRestartClick(state, 1000);
  assert.equal(r.action, "wait");
  assert.equal(r.state.times.length, 1);

  r = recordSecretRestartClick(r.state, 1200);
  assert.equal(r.action, "wait");
  assert.equal(r.state.times.length, 2);
});

test("recordSecretRestartClick force-restarts on third click within window", () => {
  let state = createSecretRestartClickState();
  state = recordSecretRestartClick(state, 1000).state;
  state = recordSecretRestartClick(state, 1300).state;
  const r = recordSecretRestartClick(state, 1600);
  assert.equal(r.action, "forceRestart");
  assert.deepEqual(r.state.times, []);
});

test("recordSecretRestartClick drops stale clicks outside window", () => {
  let state = createSecretRestartClickState();
  state = recordSecretRestartClick(state, 1000).state;
  // Next click is 2s later — previous expired.
  const r = recordSecretRestartClick(state, 3000);
  assert.equal(r.action, "wait");
  assert.deepEqual(r.state.times, [3000]);
});

test("resolveSecretRestartSoftAfterDelay softs pending clicks then clears", () => {
  const state = createSecretRestartClickState({ times: [1000, 1200] });
  const r = resolveSecretRestartSoftAfterDelay(state, 1550);
  assert.equal(r.action, "soft");
  assert.deepEqual(r.state.times, []);
});

test("resolveSecretRestartSoftAfterDelay is none when state empty", () => {
  const r = resolveSecretRestartSoftAfterDelay(createSecretRestartClickState(), 2000);
  assert.equal(r.action, "none");
});
