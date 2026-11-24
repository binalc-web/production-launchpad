import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCursorAgentUsageCostBreakdown,
  computeCursorAgentUsageCostUsd,
  filterAgentRuns,
  formatUsd,
  getAgentRunDisplayStatus,
  getAgentRunLastActivityAt,
  getAgentRunLiveActivityLabel,
  isAgentRunActive,
  isActiveStatus,
  mergeAgentAnalyticsRun,
  mergeAgentAnalyticsTimelines,
  readAgentAnalyticsEventRun,
  rollupPeriodTokenTotals,
} from "../src/pages/AgentAnalytics/agentAnalyticsDisplay.js";

test("computeCursorAgentUsageCostUsd applies Cursor per-million token rates", () => {
  const cost = computeCursorAgentUsageCostUsd({
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    cacheReadTokens: 1_000_000,
    cacheWriteTokens: 1_000_000,
  });
  assert.equal(cost, 1.25 + 6 + 0.25 + 1.25);
});

test("buildCursorAgentUsageCostBreakdown returns line items and total", () => {
  const breakdown = buildCursorAgentUsageCostBreakdown({
    inputTokens: 2_000_000,
    outputTokens: 500_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  assert.equal(breakdown.rows.find((row) => row.key === "input")?.costUsd, 2.5);
  assert.equal(breakdown.rows.find((row) => row.key === "output")?.costUsd, 3);
  assert.equal(breakdown.totalCostUsd, 5.5);
});

test("formatUsd shows sub-cent values as less than one cent", () => {
  assert.equal(formatUsd(0.004), "<$0.01");
  assert.equal(formatUsd(1.2), "$1.20");
});

test("rollupPeriodTokenTotals keeps cache read and write separate", () => {
  const finishedAt = new Date("2026-06-25T12:00:00.000Z").toISOString();
  const totals = rollupPeriodTokenTotals(
    [
      {
        agentStatus: "FINISHED",
        finishedAt,
        usageTotals: { inputTokens: 10, cacheReadTokens: 4 },
      },
      {
        agentStatus: "FINISHED",
        finishedAt,
        usageTotals: { outputTokens: 5, cacheWriteTokens: 2 },
      },
    ],
    Date.parse("2026-06-24T00:00:00.000Z"),
    Date.parse("2026-06-26T00:00:00.000Z"),
  );
  assert.equal(totals.inputTokens, 10);
  assert.equal(totals.outputTokens, 5);
  assert.equal(totals.cacheReadTokens, 4);
  assert.equal(totals.cacheWriteTokens, 2);
  assert.equal(totals.cacheTokens, 6);
});

test("isActiveStatus treats MIGRATE_PLATFORM_SYNC_FAILED as terminal", () => {
  assert.equal(isActiveStatus("MIGRATE_PLATFORM_SYNC_FAILED"), false);
  assert.equal(isActiveStatus("FAILED"), false);
  assert.equal(isActiveStatus("RUNNING"), true);
  assert.equal(isActiveStatus("READONLY_SYNCING"), true);
});

test("isAgentRunActive treats Stopped by API summary as inactive even if RUNNING", () => {
  assert.equal(
    isAgentRunActive({
      source: "scratch",
      agentStatus: "RUNNING",
      statusHint: "RUNNING",
      summary: "Stopped by API",
    }),
    false,
  );
  assert.equal(
    isAgentRunActive({
      source: "scratch",
      agentStatus: "RUNNING",
      pipelineDetail: "Stopped by API",
    }),
    false,
  );
});

test("isAgentRunActive uses statusHint for failed migrate runs", () => {
  assert.equal(
    isAgentRunActive({
      source: "migrate_frontend",
      statusHint: "MIGRATE_PLATFORM_SYNC_FAILED",
    }),
    false,
  );
  assert.equal(
    isAgentRunActive({
      source: "migrate_frontend",
      agentStatus: "RUNNING",
    }),
    true,
  );
});

test("isAgentRunActive treats empty agentStatus as missing (use statusHint)", () => {
  assert.equal(
    isAgentRunActive({
      source: "client_link",
      agentStatus: "",
      statusHint: "MIGRATE_PLATFORM_SYNC_FAILED",
    }),
    false,
  );
  assert.equal(
    isAgentRunActive({
      source: "client_link",
      agentStatus: "   ",
      statusHint: "MIGRATE_PLATFORM_SYNC_FAILED",
    }),
    false,
  );
});

test("isAgentRunActive prefers terminal statusHint over stale live agentStatus", () => {
  assert.equal(
    isAgentRunActive({
      source: "client_link",
      agentStatus: "RUNNING",
      statusHint: "MIGRATE_PLATFORM_SYNC_FAILED",
    }),
    false,
  );
  assert.equal(
    isAgentRunActive({
      source: "client_link",
      agentStatus: "READONLY_SYNCING",
      statusHint: "MIGRATE_PLATFORM_SYNC_FAILED",
    }),
    false,
  );
});

test("isAgentRunActive keeps fresher live RUNNING over older terminal statusHint", () => {
  assert.equal(
    isAgentRunActive({
      source: "client_link",
      agentStatus: "RUNNING",
      statusHint: "MIGRATE_PLATFORM_SYNC_FAILED",
      updatedAt: "2026-08-11T12:00:00.000Z",
      finishedAt: "2026-08-11T11:00:00.000Z",
    }),
    true,
  );
});

test("isAgentRunActive prefers newer finishedAt over older live RUNNING", () => {
  assert.equal(
    isAgentRunActive({
      source: "client_link",
      agentStatus: "RUNNING",
      statusHint: "FAILED",
      updatedAt: "2026-08-11T11:00:00.000Z",
      finishedAt: "2026-08-11T12:00:00.000Z",
    }),
    false,
  );
});

test("readAgentAnalyticsEventRun accepts nested or flattened run_update payloads", () => {
  assert.deepEqual(
    readAgentAnalyticsEventRun({
      type: "run_update",
      run: { cursorAgentId: "bc_1", updatedAt: "2026-08-18T12:00:00.000Z" },
    }),
    { cursorAgentId: "bc_1", updatedAt: "2026-08-18T12:00:00.000Z" },
  );
  assert.equal(
    readAgentAnalyticsEventRun({
      type: "run_update",
      cursorAgentId: "bc_1",
      updatedAt: "2026-08-18T12:01:00.000Z",
    }).updatedAt,
    "2026-08-18T12:01:00.000Z",
  );
});

test("getAgentRunLastActivityAt prefers updatedAt for live row timestamps", () => {
  assert.equal(
    getAgentRunLastActivityAt({
      startedAt: "2026-08-11T11:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z",
    }),
    "2026-08-11T12:00:00.000Z",
  );
  assert.equal(
    getAgentRunLastActivityAt({
      startedAt: "2026-08-11T11:00:00.000Z",
    }),
    "2026-08-11T11:00:00.000Z",
  );
});

test("mergeAgentAnalyticsTimelines keeps earlier items when a later patch is shorter", () => {
  const merged = mergeAgentAnalyticsTimelines(
    [
      { id: "tl_001", type: "thinking", text: "start" },
      { id: "tl_002", type: "tool_call", label: "Read GRAPH_REPORT.md" },
    ],
    [{ id: "tl_002", type: "tool_call", label: "Read GRAPH_REPORT.md", status: "failed" }],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "tl_001");
  assert.equal(merged[1].status, "failed");
});

test("mergeAgentAnalyticsRun does not let an empty timeline wipe live activity", () => {
  const merged = mergeAgentAnalyticsRun(
    {
      cursorAgentId: "bc_1",
      streamPhase: "Agent is working…",
      streamTimeline: [{ id: "tl_001", type: "thinking", text: "start" }],
    },
    {
      cursorAgentId: "bc_1",
      updatedAt: "2026-08-18T13:58:24.906Z",
      streamTimeline: [],
      streamPhase: "",
    },
  );
  assert.equal(merged.streamTimeline.length, 1);
  assert.equal(merged.streamPhase, "Agent is working…");
  assert.equal(merged.updatedAt, "2026-08-18T13:58:24.906Z");
});

test("getAgentRunLiveActivityLabel uses the latest tool or assistant line", () => {
  assert.equal(
    getAgentRunLiveActivityLabel({
      streamPhase: "Agent is working…",
      streamTimeline: [
        { id: "tl_001", type: "thinking", text: "old" },
        { id: "tl_180", type: "tool_call", label: "Shell", toolName: "Shell" },
      ],
    }),
    "Shell",
  );
});

test("filterAgentRuns separates Finished and Completed status filters", () => {
  const finishedAt = new Date(Date.now() - 60_000).toISOString();
  const runs = [
    { cursorAgentId: "bc_fin", label: "QA", agentStatus: "FINISHED", finishedAt },
    { cursorAgentId: "bc_cmp", label: "Feedback fix", agentStatus: "COMPLETED", finishedAt },
    { cursorAgentId: "bc_run", label: "Active", agentStatus: "RUNNING", updatedAt: finishedAt },
  ];

  const finishedOnly = filterAgentRuns(runs, { statusFilter: "finished", horizon: "90d" });
  assert.deepEqual(
    finishedOnly.map((r) => r.cursorAgentId),
    ["bc_fin"],
  );

  const completedOnly = filterAgentRuns(runs, { statusFilter: "completed", horizon: "90d" });
  assert.deepEqual(
    completedOnly.map((r) => r.cursorAgentId),
    ["bc_cmp"],
  );
});

test("a FINISHED run with queued follow-ups is Running", () => {
  const run = { agentStatus: "FINISHED", statusHint: "FINISHED", followupQueueDepth: 2 };
  assert.equal(isAgentRunActive(run), true);
  assert.equal(getAgentRunDisplayStatus(run), "RUNNING");
});

test("a FINISHED run with an empty follow-up queue stays Finished", () => {
  const run = { agentStatus: "FINISHED", statusHint: "FINISHED", followupQueueDepth: 0 };
  assert.equal(isAgentRunActive(run), false);
  assert.equal(getAgentRunDisplayStatus(run), "FINISHED");
});

test("a failed or stopped run is not Running because of queued follow-ups", () => {
  assert.equal(isAgentRunActive({ agentStatus: "FAILED", followupQueueDepth: 3 }), false);
  assert.equal(
    isAgentRunActive({ agentStatus: "FINISHED", summary: "Stopped by API", followupQueueDepth: 3 }),
    false,
  );
});
