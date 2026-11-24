/** @typedef {"overview"|"distribution"|"priorities"|"roster"|"exceptions"|"actions"} QaAnalyticsTab */

export const QA_ANALYTICS_TABS = Object.freeze([
  { id: "overview", label: "Overview" },
  { id: "distribution", label: "Distribution" },
  { id: "priorities", label: "Priorities" },
  { id: "roster", label: "Roster" },
  { id: "exceptions", label: "Exceptions" },
  { id: "actions", label: "Actions" },
]);

export const QA_ANALYTICS_RANGE_OPTIONS = Object.freeze([
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
]);

export const QA_PROJECT_STATE_OPTIONS = Object.freeze([
  { id: "active", label: "Active projects" },
  { id: "inactive", label: "Inactive projects" },
  { id: "all", label: "All projects" },
]);

const QA_DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a `yyyy-mm-dd` date-only string as that calendar day (local components,
 * so the day never shifts with the viewer's timezone). Returns null if invalid.
 * @param {string|null|undefined} value
 * @returns {Date|null}
 */
export function parseQaDateOnly(value) {
  const match = QA_DATE_ONLY_RE.exec(value ? value.slice(0, 10) : "");
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  // Reject overflow dates (e.g. Feb 31) that Date silently rolls over.
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

/**
 * Inverse of {@link parseQaDateOnly}: format a Date as `yyyy-mm-dd` from its
 * local calendar components.
 * @param {Date|null|undefined} date
 * @returns {string}
 */
export function formatQaDateOnly(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const QA_ADOPTION_COHORT_OPTIONS = Object.freeze([
  { id: "used", label: "Used in period" },
  { id: "unused", label: "Unused in period" },
  { id: "all", label: "All" },
]);

export const QA_MATRIX_METRIC_OPTIONS = Object.freeze([
  { id: "count", label: "Test-case count" },
  { id: "passRate", label: "Test-case pass rate" },
  { id: "flakyRate", label: "Flaky rate" },
  { id: "medianDurationMs", label: "Median case duration" },
]);

export const QA_GRANULARITY_OPTIONS = Object.freeze([
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
]);

/**
 * @param {object[]|undefined} kpis
 * @param {string} id
 */
export function qaKpiValue(kpis, id) {
  const row = (kpis ?? []).find((k) => k.id === id);
  return row?.value ?? null;
}

/**
 * Project panel API params — no comparison, auto granularity by range.
 * @param {ReturnType<typeof parseQaAnalyticsUrlState>} state
 * @param {{ projectId?: number|string }} opts
 */
export function toQaProjectPanelApiParams(state, opts = {}) {
  const customDays =
    state.range === "custom" && state.from && state.to
      ? (Date.parse(state.to.slice(0, 10)) - Date.parse(state.from.slice(0, 10))) / 86_400_000 + 1
      : 0;
  const granularity = customDays > 60 ? "week" : "day";
  return {
    ...toQaAnalyticsApiParams({ ...state, compare: "none", granularity }, opts),
    compare: "none",
    granularity,
  };
}

/**
 * @param {URLSearchParams} searchParams
 */
export function parseQaAnalyticsUrlState(searchParams) {
  const rangeParam = searchParams.get("range");
  // The removed "Last 90 days" (90d) preset resolves to its replacement,
  // "Today"; any other unknown range falls back to the default preset
  // instead of reaching the API and failing validation.
  const range =
    rangeParam === "90d"
      ? "today"
      : QA_ANALYTICS_RANGE_OPTIONS.some((opt) => opt.id === rangeParam)
        ? rangeParam
        : "30d";
  return {
    range,
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    compare: searchParams.get("compare") || "previous",
    granularity: searchParams.get("granularity") || "day",
    environment: searchParams.get("environment") || "",
    userId: searchParams.get("userId") || "",
    status: searchParams.get("status") || "",
    testCaseStatus: searchParams.get("testCaseStatus") || "",
    tab: searchParams.get("tab") || "overview",
    testCaseKey: searchParams.get("testCaseKey") || "",
    project: searchParams.get("project") || "",
    projectState: searchParams.get("projectState") || "active",
    adoptionCohort: searchParams.get("adoptionCohort") || "all",
    matrixMetric: searchParams.get("matrixMetric") || "count",
    runsCursor: searchParams.get("runsCursor") || "",
    usersCursor: searchParams.get("usersCursor") || "",
  };
}

/**
 * @param {ReturnType<typeof parseQaAnalyticsUrlState>} state
 * @param {{ section?: string, projectId?: number|string }} [opts]
 */
export function buildQaAnalyticsSearchParams(state, opts = {}) {
  const params = new URLSearchParams();
  if (opts.section) params.set("section", opts.section);
  if (state.range && state.range !== "30d") params.set("range", state.range);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.compare && state.compare !== "previous") params.set("compare", state.compare);
  if (state.granularity && state.granularity !== "day")
    params.set("granularity", state.granularity);
  if (state.environment) params.set("environment", state.environment);
  if (state.userId) params.set("userId", state.userId);
  if (state.status) params.set("status", state.status);
  if (state.testCaseStatus) params.set("testCaseStatus", state.testCaseStatus);
  if (state.tab && state.tab !== "overview") params.set("tab", state.tab);
  if (state.testCaseKey) params.set("testCaseKey", state.testCaseKey);
  if (state.project) params.set("project", state.project);
  if (state.projectState && state.projectState !== "active")
    params.set("projectState", state.projectState);
  if (state.adoptionCohort && state.adoptionCohort !== "all") {
    params.set("adoptionCohort", state.adoptionCohort);
  }
  if (state.matrixMetric && state.matrixMetric !== "count")
    params.set("matrixMetric", state.matrixMetric);
  if (state.runsCursor) params.set("runsCursor", state.runsCursor);
  if (state.usersCursor) params.set("usersCursor", state.usersCursor);
  if (opts.projectId) params.set("projectId", String(opts.projectId));
  return params;
}

/**
 * @param {ReturnType<typeof parseQaAnalyticsUrlState>} state
 * @param {{ section?: string, projectId?: number|string, admin?: boolean }} [opts]
 */
export function toQaAnalyticsApiParams(state, opts = {}) {
  /** @type {Record<string, string>} */
  const params = {
    compare: state.compare || "previous",
    granularity: state.granularity || "day",
  };
  if (opts.projectId) params.projectId = String(opts.projectId);
  if (opts.includeRosters) params.includeRosters = "1";
  // Stale from/to must not override a preset range.
  const custom = state.range === "custom";
  // Date-only so the API treats `to` as inclusive through the end of that UTC day.
  if (custom && state.from) params.from = state.from.slice(0, 10);
  if (custom && state.to) params.to = state.to.slice(0, 10);
  if (!params.from && !params.to && state.range) params.range = state.range;
  if (state.environment) params.environment = state.environment;
  if (state.userId) params.userId = state.userId;
  if (state.status) params.status = state.status;
  if (state.testCaseStatus) params.testCaseStatus = state.testCaseStatus;
  if (state.project) params.project = state.project;
  if (state.projectState) params.projectState = state.projectState;
  if (state.adoptionCohort) params.adoptionCohort = state.adoptionCohort;
  if (state.matrixMetric) params.matrixMetric = state.matrixMetric;
  if (state.runsCursor) params.runsCursor = state.runsCursor;
  if (state.usersCursor) params.usersCursor = state.usersCursor;
  return params;
}

/**
 * @param {number|null|undefined} value
 * @param {{ suffix?: string, digits?: number }} [opts]
 */
export function formatQaRate(value, opts = {}) {
  if (value == null || !Number.isFinite(value)) return "—";
  const digits = opts.digits ?? 1;
  return `${value.toFixed(digits)}${opts.suffix ?? "%"}`;
}

/**
 * @param {number|null|undefined} ms
 */
export function formatQaDuration(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

/**
 * @param {string|null|undefined} iso
 */
export function formatQaDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * @param {"ok"|"warn"|"danger"|string} severity
 */
export function qaSeverityClass(severity) {
  if (severity === "danger") return "border-l-destructive bg-destructive/5";
  if (severity === "warn") return "border-l-amber-500 bg-amber-500/5";
  return "border-l-primary/40 bg-muted/30";
}

/**
 * @param {{ fromInclusive?: string, toExclusive?: string }} period
 */
export function formatHalfOpenPeriodLabel(period) {
  if (!period?.fromInclusive || !period?.toExclusive) return "—";
  const from = new Date(period.fromInclusive).toLocaleDateString(undefined, { timeZone: "UTC" });
  const to = new Date(period.toExclusive);
  to.setUTCDate(to.getUTCDate() - 1);
  const toLabel = to.toLocaleDateString(undefined, { timeZone: "UTC" });
  return `${from} – ${toLabel} UTC (half-open)`;
}

/**
 * @param {ReturnType<typeof parseQaAnalyticsUrlState>} state
 */
export function buildActiveDrillFilters(state) {
  /** @type {Array<{ key: string, label: string }>} */
  const items = [];
  if (state.environment) items.push({ key: "environment", label: `Env: ${state.environment}` });
  if (state.userId) items.push({ key: "userId", label: `User: ${state.userId}` });
  if (state.status) items.push({ key: "status", label: `Run status: ${state.status}` });
  if (state.testCaseStatus) {
    items.push({ key: "testCaseStatus", label: `Case: ${state.testCaseStatus}` });
  }
  if (state.testCaseKey) items.push({ key: "testCaseKey", label: `Test: ${state.testCaseKey}` });
  if (state.project) items.push({ key: "project", label: `Project: ${state.project}` });
  return items;
}

/**
 * @param {object} row
 * @param {"count"|"passRate"|"flakyRate"|"medianDurationMs"|string} metric
 */
export function formatMatrixRowMetric(row, metric = "count") {
  if (row?.insufficient) return "Insufficient";
  switch (metric) {
    case "passRate":
      return formatQaRate(row.metrics?.testCasePassRate);
    case "flakyRate":
      return formatQaRate(row.metrics?.testCaseFlakyRate);
    case "medianDurationMs":
      return formatQaDuration(row.metrics?.medianCaseDurationMs);
    default:
      return String(row.n ?? "—");
  }
}

/**
 * Portfolio narrative arrives with a pass-rate target comparison
 * (e.g. "…, below the 85% target."); this screen shows no such
 * reference, so drop that clause while keeping the measured facts.
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function withoutQaTargetReference(text) {
  if (!text) return "";
  return text.replace(/,?\s*below the [\d.]+% target/gi, "").replace(/\s{2,}/g, " ");
}

/**
 * @param {object|null|undefined} data
 * @param {ReturnType<typeof parseQaAnalyticsUrlState>} state
 */
export function detectQaAnalyticsEmptyVariant(data, state) {
  const hasDrill = buildActiveDrillFilters(state).length > 0;
  const runs = data?.data?.kpis?.find((k) => k.id === "totalRuns")?.value ?? 0;
  if (!data || runs === 0) {
    return hasDrill ? "filtered" : "product";
  }
  return null;
}
