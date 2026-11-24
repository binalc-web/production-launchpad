import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveImplementItemMap,
  resolveDisplayedImplementMeta,
} from "../src/pages/Project/ProjectDetails/components/releaseScopeImplementLiveStatus.util.js";

test("live map keys Jira and backlog run items", () => {
  const map = buildLiveImplementItemMap([
    { jiraIssueKey: "SPOR-4624", status: "queued" },
    { backlogStoryId: 9, status: "running" },
  ]);
  assert.equal(map.get("j:SPOR-4624")?.status, "queued");
  assert.equal(map.get("b:9")?.status, "running");
});

test("in-progress current run hides previous Failed on the Jira tree", () => {
  const liveMap = buildLiveImplementItemMap([
    { jiraIssueKey: "SPOR-4624", status: "queued", outcomeSnapshot: null },
  ]);
  const story = {
    jiraIssueKey: "SPOR-4624",
    implementStatus: "failed",
    implementOutcome: { prUrl: "https://github.com/acme/app/pull/1" },
  };
  assert.deepEqual(resolveDisplayedImplementMeta(story, liveMap), {
    status: "queued",
    outcome: null,
  });
});

test("running current item shows Running instead of previous Failed", () => {
  const liveMap = buildLiveImplementItemMap([
    { jiraIssueKey: "SPOR-4624", status: "running" },
  ]);
  const meta = resolveDisplayedImplementMeta(
    { jiraIssueKey: "SPOR-4624", implementStatus: "failed" },
    liveMap,
  );
  assert.equal(meta.status, "running");
  assert.equal(meta.outcome, null);
});

test("stories not in the current run keep historical terminal status", () => {
  const liveMap = buildLiveImplementItemMap([
    { jiraIssueKey: "SPOR-4623", status: "succeeded" },
  ]);
  const meta = resolveDisplayedImplementMeta(
    {
      jiraIssueKey: "SPOR-4624",
      implementStatus: "failed",
      implementOutcome: { prNumber: 12 },
    },
    liveMap,
  );
  assert.equal(meta.status, "failed");
  assert.deepEqual(meta.outcome, { prNumber: 12 });
});

test("succeeded current item uses live outcome", () => {
  const liveMap = buildLiveImplementItemMap([
    {
      jiraIssueKey: "SPOR-4623",
      status: "succeeded",
      outcomeSnapshot: { prNumber: 1174 },
    },
  ]);
  const meta = resolveDisplayedImplementMeta(
    { jiraIssueKey: "SPOR-4623", implementStatus: "failed", implementOutcome: { prNumber: 1 } },
    liveMap,
  );
  assert.equal(meta.status, "succeeded");
  assert.deepEqual(meta.outcome, { prNumber: 1174 });
});
