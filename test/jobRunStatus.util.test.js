import test from "node:test";
import assert from "node:assert/strict";
import {
  isJobRunTimedOut,
  isRunInProgress,
  JOB_RUN_MAX_RUNTIME_MS,
} from "../src/pages/Jobs/utils/jobRunStatus.util.js";

test("isRunInProgress stops after 30 minutes", () => {
  const now = Date.now();
  const startedAt = new Date(now - JOB_RUN_MAX_RUNTIME_MS - 1).toISOString();
  assert.equal(isRunInProgress({ status: "RUNNING", startedAt }), false);
  assert.equal(isJobRunTimedOut({ status: "RUNNING", startedAt }, now), true);
});

test("isRunInProgress is true for fresh runs", () => {
  const startedAt = new Date().toISOString();
  assert.equal(isRunInProgress({ status: "RUNNING", startedAt }), true);
});
