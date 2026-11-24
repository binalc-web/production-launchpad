import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQaAnalyticsSearchParams,
  buildActiveDrillFilters,
  detectQaAnalyticsEmptyVariant,
  formatHalfOpenPeriodLabel,
  formatMatrixRowMetric,
  formatQaDateTime,
  formatQaDuration,
  formatQaRate,
  parseQaAnalyticsUrlState,
  QA_ANALYTICS_RANGE_OPTIONS,
  qaSeverityClass,
  toQaAnalyticsApiParams,
  toQaProjectPanelApiParams,
} from "../src/pages/QaAnalytics/qaAnalyticsDisplay.js";
import {
  buildProjectAdoptionChartData,
  buildMemberUsageChartData,
  buildFeatureAdoptionChartData,
} from "../src/pages/QaAnalytics/qaAnalyticsChartData.js";

test("range options offer Today instead of Last 90 days", () => {
  assert.deepEqual(
    QA_ANALYTICS_RANGE_OPTIONS.map((o) => o.label),
    ["Today", "Last 7 days", "Last 30 days", "Custom"],
  );
  const params = toQaAnalyticsApiParams(
    parseQaAnalyticsUrlState(new URLSearchParams("range=today")),
  );
  assert.equal(params.range, "today");
  assert.equal(params.from, undefined);
  assert.equal(params.to, undefined);
});

test("legacy Last 90 days (90d) links resolve to Today, unknown ranges to the default", () => {
  const legacy = parseQaAnalyticsUrlState(new URLSearchParams("range=90d"));
  assert.equal(legacy.range, "today");
  assert.equal(toQaAnalyticsApiParams(legacy).range, "today");
  assert.equal(parseQaAnalyticsUrlState(new URLSearchParams("range=bogus")).range, "30d");
});

test("parseQaAnalyticsUrlState applies defaults", () => {
  const state = parseQaAnalyticsUrlState(new URLSearchParams());
  assert.equal(state.range, "30d");
  assert.equal(state.compare, "previous");
  assert.equal(state.tab, "overview");
  assert.equal(state.projectState, "active");
  assert.equal(state.adoptionCohort, "all");
  assert.equal(state.matrixMetric, "count");
});

test("buildQaAnalyticsSearchParams elides default values", () => {
  const params = buildQaAnalyticsSearchParams(parseQaAnalyticsUrlState(new URLSearchParams()), {
    section: "qa-analytics",
    projectId: 42,
  });
  assert.equal(params.get("section"), "qa-analytics");
  assert.equal(params.get("projectId"), "42");
  assert.equal(params.get("range"), null);
  assert.equal(params.get("projectState"), null);
  assert.equal(params.get("adoptionCohort"), null);
});

test("toQaAnalyticsApiParams sends date-only custom range so single-day is inclusive", () => {
  const params = toQaAnalyticsApiParams({
    range: "custom",
    from: "2026-09-25",
    to: "2026-09-25T00:00:00.000Z",
  });
  assert.equal(params.from, "2026-09-25");
  assert.equal(params.to, "2026-09-25");
  assert.equal(params.range, undefined);
});

test("URL round-trip preserves portfolio filters", () => {
  const initial = {
    range: "today",
    from: "",
    to: "",
    compare: "none",
    granularity: "week",
    environment: "staging",
    userId: "u1",
    status: "failed",
    testCaseStatus: "flaky",
    tab: "roster",
    testCaseKey: "login",
    project: "7",
    projectState: "inactive",
    adoptionCohort: "unused",
    matrixMetric: "passRate",
    runsCursor: "abc",
    usersCursor: "def",
  };
  const built = buildQaAnalyticsSearchParams(initial);
  const roundTrip = parseQaAnalyticsUrlState(built);
  assert.deepEqual(roundTrip, initial);
});

test("toQaAnalyticsApiParams maps grains and cursors", () => {
  const params = toQaAnalyticsApiParams(
    parseQaAnalyticsUrlState(
      new URLSearchParams(
        "range=today&projectState=active&adoptionCohort=used&matrixMetric=flakyRate&runsCursor=r1",
      ),
    ),
    { projectId: 7 },
  );
  assert.equal(params.projectId, "7");
  assert.equal(params.range, "today");
  assert.equal(params.projectState, "active");
  assert.equal(params.adoptionCohort, "used");
  assert.equal(params.matrixMetric, "flakyRate");
  assert.equal(params.runsCursor, "r1");
});

test("formatHalfOpenPeriodLabel renders UTC window", () => {
  const label = formatHalfOpenPeriodLabel({
    fromInclusive: "2026-08-01T00:00:00.000Z",
    toExclusive: "2026-08-31T00:00:00.000Z",
  });
  assert.match(label, /UTC/);
});

test("formatQaRate handles null and rounds", () => {
  assert.equal(formatQaRate(null), "—");
  assert.equal(formatQaRate(92.456), "92.5%");
});

test("formatQaDuration scales units", () => {
  assert.equal(formatQaDuration(500), "500 ms");
  assert.equal(formatQaDuration(2500), "2.5 s");
  assert.equal(formatQaDuration(120_000), "2 min");
});

test("formatQaDateTime returns dash for invalid input", () => {
  assert.equal(formatQaDateTime(""), "—");
  assert.equal(formatQaDateTime("not-a-date"), "—");
});

test("qaSeverityClass maps severities", () => {
  assert.match(qaSeverityClass("danger"), /destructive/);
  assert.match(qaSeverityClass("warn"), /amber/);
  assert.match(qaSeverityClass("ok"), /primary/);
});

test("buildActiveDrillFilters lists active URL drill params", () => {
  const filters = buildActiveDrillFilters({
    range: "30d",
    from: "",
    to: "",
    compare: "previous",
    granularity: "day",
    environment: "staging",
    userId: "",
    status: "",
    testCaseStatus: "failed",
    tab: "overview",
    testCaseKey: "",
    project: "42",
    projectState: "active",
    adoptionCohort: "all",
    matrixMetric: "count",
    runsCursor: "",
    usersCursor: "",
  });
  assert.deepEqual(
    filters.map((f) => f.key),
    ["environment", "testCaseStatus", "project"],
  );
});

test("formatMatrixRowMetric respects metric selection", () => {
  const row = {
    insufficient: false,
    n: 10,
    metrics: { testCasePassRate: 88.5, testCaseFlakyRate: 4.2, medianCaseDurationMs: 1500 },
  };
  assert.equal(formatMatrixRowMetric(row, "passRate"), "88.5%");
  assert.equal(formatMatrixRowMetric(row, "medianDurationMs"), "1.5 s");
  assert.equal(formatMatrixRowMetric(row, "count"), "10");
});

test("detectQaAnalyticsEmptyVariant distinguishes filtered vs product empty", () => {
  assert.equal(
    detectQaAnalyticsEmptyVariant(
      { data: { kpis: [{ id: "totalRuns", value: 0 }] } },
      parseQaAnalyticsUrlState(new URLSearchParams("environment=staging")),
    ),
    "filtered",
  );
  assert.equal(
    detectQaAnalyticsEmptyVariant(
      { data: { kpis: [{ id: "totalRuns", value: 0 }] } },
      parseQaAnalyticsUrlState(new URLSearchParams()),
    ),
    "product",
  );
  assert.equal(
    detectQaAnalyticsEmptyVariant(
      { data: { kpis: [{ id: "totalRuns", value: 12 }] } },
      parseQaAnalyticsUrlState(new URLSearchParams()),
    ),
    null,
  );
});

test("toQaAnalyticsApiParams passes includeRosters flag", () => {
  const params = toQaAnalyticsApiParams(parseQaAnalyticsUrlState(new URLSearchParams()), {
    includeRosters: true,
  });
  assert.equal(params.includeRosters, "1");
});

test("buildProjectAdoptionChartData ranks by active days and filters idle projects", () => {
  const data = buildProjectAdoptionChartData([
    { projectId: 1, name: "Alpha", activeDays: 5, analyticsEvents: 10, runs: 2, activeUsers: 1 },
    { projectId: 2, name: "Beta", activeDays: 0, analyticsEvents: 0, runs: 0, activeUsers: 0 },
    { projectId: 3, name: "Gamma", activeDays: 12, analyticsEvents: 40, runs: 8, activeUsers: 3 },
  ]);
  assert.equal(data.length, 2);
  assert.equal(data[0].fullName, "Gamma");
  assert.equal(data[0].activeDays, 12);
  assert.equal(data[1].fullName, "Alpha");
});

test("toQaProjectPanelApiParams disables compare and sets granularity from range", () => {
  const week = toQaProjectPanelApiParams(
    parseQaAnalyticsUrlState(new URLSearchParams("range=7d&compare=previous")),
    { projectId: 9 },
  );
  assert.equal(week.compare, "none");
  assert.equal(week.granularity, "day");
  assert.equal(week.projectId, "9");

  const today = toQaProjectPanelApiParams(
    parseQaAnalyticsUrlState(new URLSearchParams("range=today")),
    { projectId: 9 },
  );
  assert.equal(today.range, "today");
  assert.equal(today.granularity, "day");

  const custom = toQaProjectPanelApiParams(
    parseQaAnalyticsUrlState(new URLSearchParams("range=custom&from=2026-06-01&to=2026-09-01")),
    { projectId: 9 },
  );
  assert.equal(custom.from, "2026-06-01");
  assert.equal(custom.to, "2026-09-01");
  assert.equal(custom.granularity, "week");
});

test("toQaAnalyticsApiParams ignores stale from/to for preset ranges", () => {
  const params = toQaAnalyticsApiParams({ range: "7d", from: "2026-01-01", to: "2026-01-31" });
  assert.equal(params.range, "7d");
  assert.equal(params.from, undefined);
  assert.equal(params.to, undefined);
});

test("buildMemberUsageChartData ranks by active days", () => {
  const data = buildMemberUsageChartData([
    { userId: 1, name: "Alice", activeDays: 3, runs: 2, features: ["generation"] },
    { userId: 2, name: "Bob", activeDays: 0, runs: 0, features: [] },
    { userId: 3, name: "Carol", activeDays: 8, runs: 4, features: ["execution"] },
  ]);
  assert.equal(data.length, 2);
  assert.equal(data[0].fullName, "Carol");
});

test("buildFeatureAdoptionChartData maps stage labels", () => {
  const data = buildFeatureAdoptionChartData([
    { id: "app_opened", label: "Opened QA App", uniqueUsers: 4 },
    { id: "heal_test_cases", label: "Healed test cases", uniqueUsers: 1 },
  ]);
  assert.equal(data[0].stage, "Opened QA App");
  assert.equal(data[0].uniqueUsers, 4);
});
