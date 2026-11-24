import test from "node:test";
import assert from "node:assert/strict";
import {
  PLATFORM_DEPLOY_RETURN_SOON_MESSAGE,
  PLATFORM_DEPLOY_RETURN_WINDOW_MS,
  formatPlatformDeployCountdown,
  platformDeployReturnMessage,
  platformDeployReturnRemainingMs,
} from "../src/lib/platformDeployReturn.js";

const started = "2026-11-10T09:00:00.000Z";
const startedMs = Date.parse(started);

test("countdown starts at ten minutes and decreases", () => {
  assert.equal(
    platformDeployReturnRemainingMs(started, startedMs),
    PLATFORM_DEPLOY_RETURN_WINDOW_MS,
  );
  assert.equal(formatPlatformDeployCountdown(PLATFORM_DEPLOY_RETURN_WINDOW_MS), "10:00");
  assert.equal(
    platformDeployReturnMessage(started, startedMs + 65_000),
    "The platform should be back in 8:55.",
  );
});

test("zero remaining while still down asks users to wait a little longer", () => {
  const atEnd = startedMs + PLATFORM_DEPLOY_RETURN_WINDOW_MS;
  assert.equal(platformDeployReturnRemainingMs(started, atEnd), 0);
  assert.equal(
    platformDeployReturnMessage(started, atEnd + 30_000),
    PLATFORM_DEPLOY_RETURN_SOON_MESSAGE,
  );
});

test("missing start time has no countdown", () => {
  assert.equal(platformDeployReturnRemainingMs(null), null);
  assert.equal(platformDeployReturnMessage("not-a-date"), null);
});
