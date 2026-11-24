/** Theme chart tokens — use `var(--chart-N)` directly (values are oklch, not HSL components). */
export const QA_CHART_COLORS = Object.freeze({
  runs: "var(--chart-1)",
  passRate: "var(--chart-2)",
  comparison: "var(--chart-3)",
  duration: "var(--chart-4)",
  accent: "var(--chart-5)",
  primary: "var(--primary)",
  failed: "var(--destructive)",
  passed: "var(--chart-2)",
  flaky: "var(--chart-4)",
  skipped: "var(--muted-foreground)",
  unknown: "var(--chart-5)",
  danger: "var(--destructive)",
  warn: "var(--chart-4)",
  ok: "var(--chart-2)",
  feature: "var(--chart-3)",
  muted: "var(--muted-foreground)",
  background: "var(--background)",
});

/**
 * Rotating chart palette for multi-series / categorical bars.
 * @param {number} index
 */
export function qaChartSeriesColor(index) {
  return `var(--chart-${(index % 5) + 1})`;
}

const OUTCOME_COLORS = {
  passed: QA_CHART_COLORS.passed,
  failed: QA_CHART_COLORS.failed,
  flaky: QA_CHART_COLORS.flaky,
  skipped: QA_CHART_COLORS.skipped,
  unknown: QA_CHART_COLORS.unknown,
  cancelled: QA_CHART_COLORS.skipped,
  interrupted: QA_CHART_COLORS.warn,
  running: QA_CHART_COLORS.unknown,
};

/**
 * @param {Record<string, number>|undefined} mix
 */
export function buildOutcomeDistributionData(mix = {}) {
  return Object.entries(mix)
    .filter(([, count]) => count > 0)
    .map(([status, count], index) => ({
      status,
      count,
      fill: OUTCOME_COLORS[status] || qaChartSeriesColor(index),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * @param {object[]} funnel
 */
export function buildFunnelChartData(funnel = []) {
  return funnel.map((stage, index) => ({
    stage: stage.label,
    uniqueUsers: stage.unavailable ? 0 : Number(stage.uniqueUsers) || 0,
    conversionFromPrior: stage.conversionFromPrior,
    unavailable: Boolean(stage.unavailable),
    fill: qaChartSeriesColor(index),
  }));
}

/**
 * @param {object[]} featureUsage
 */
export function buildFeatureUsageChartData(featureUsage = []) {
  return featureUsage.slice(0, 10).map((row, index) => ({
    feature: row.feature,
    count: row.count,
    fill: qaChartSeriesColor(index),
  }));
}

/**
 * @param {object[]} points
 */
export function buildActionMatrixChartData(points = []) {
  return points.map((point) => ({
    ...point,
    z: Math.max(1, Number(point.bubbleSize) || 1),
    fill:
      point.severity === "danger"
        ? QA_CHART_COLORS.danger
        : point.severity === "warn"
          ? QA_CHART_COLORS.warn
          : QA_CHART_COLORS.ok,
  }));
}

/**
 * @param {object[]} projects
 * @param {number} [limit]
 */
export function buildProjectAdoptionChartData(projects = [], limit = 20) {
  return projects
    .filter((row) => (row.activeDays ?? 0) > 0 || (row.analyticsEvents ?? 0) > 0 || row.runs > 0)
    .sort(
      (a, b) =>
        (b.activeDays ?? 0) - (a.activeDays ?? 0) ||
        (b.analyticsEvents ?? 0) - (a.analyticsEvents ?? 0),
    )
    .slice(0, limit)
    .map((row, index) => ({
      name: row.name?.length > 22 ? `${row.name.slice(0, 20)}…` : row.name,
      fullName: row.name,
      projectId: row.projectId,
      activeDays: row.activeDays ?? 0,
      analyticsEvents: row.analyticsEvents ?? 0,
      runs: row.runs ?? 0,
      activeUsers: row.activeUsers ?? 0,
      fill: qaChartSeriesColor(index),
    }));
}

/**
 * @param {object[]} projects
 * @param {number} [limit]
 */
export function buildProjectsPassRateChartData(projects = [], limit = 10) {
  return projects
    .filter((row) => !row.insufficient && row.testCasePassRate != null)
    .slice(0, limit)
    .map((row, index) => ({
      name: row.name?.length > 18 ? `${row.name.slice(0, 16)}…` : row.name,
      fullName: row.name,
      passRate: row.testCasePassRate,
      runs: row.runs,
      projectId: row.projectId,
      fill: qaChartSeriesColor(index),
    }));
}

/**
 * @param {object} matrix
 * @param {"count"|"passRate"|"flakyRate"|"medianDurationMs"|string} [matrixMetric]
 */
export function buildEnvironmentHeatmapCells(matrix, matrixMetric = "count") {
  const rows = matrix?.rows ?? [];
  const columns = matrix?.columns ?? [];
  const cells = [];

  for (const row of rows) {
    for (const col of columns) {
      const cell = row.cells?.find((item) => item.outcome === col);
      const count = row.insufficient ? 0 : (cell?.count ?? 0);
      let intensity = count;
      let display = row.insufficient ? "—" : String(count);

      if (!row.insufficient && matrixMetric === "passRate" && cell?.pct != null) {
        intensity = cell.pct;
        display = `${cell.pct}%`;
      } else if (!row.insufficient && matrixMetric === "medianDurationMs") {
        intensity = row.metrics?.medianCaseDurationMs ?? 0;
        display = String(count);
      }

      cells.push({
        environmentId: row.environmentId,
        outcome: col,
        count,
        intensity,
        display,
        passRate: row.metrics?.testCasePassRate,
        insufficient: row.insufficient,
        rowN: row.n,
      });
    }
  }

  const maxIntensity = cells.reduce((max, cell) => Math.max(max, cell.intensity ?? 0), 0);
  return { cells, columns, rows, maxCount: maxIntensity, matrixMetric };
}

/**
 * @param {object[]} stages
 */
export function buildFeatureAdoptionChartData(stages = []) {
  return stages.map((stage, index) => ({
    stage: stage.label,
    uniqueUsers: Number(stage.uniqueUsers) || 0,
    fill: qaChartSeriesColor(index),
  }));
}

/**
 * @param {object[]} members
 */
export function buildMemberUsageChartData(members = []) {
  return members
    .filter((row) => (row.activeDays ?? 0) > 0)
    .sort((a, b) => b.activeDays - a.activeDays || b.runs - a.runs)
    .slice(0, 20)
    .map((row, index) => ({
      name: row.name?.length > 22 ? `${row.name.slice(0, 20)}…` : row.name,
      fullName: row.name,
      userId: row.userId,
      activeDays: row.activeDays ?? 0,
      runs: row.runs ?? 0,
      features: row.features ?? [],
      lastActiveAt: row.lastActiveAt,
      fill: qaChartSeriesColor(index),
    }));
}

/**
 * @param {{ current?: object[] }} trend
 */
export function buildActivityTrendChartData(trend) {
  return (trend?.current ?? []).map((row) => ({
    date: row.date,
    runs: Number(row.runs) || 0,
  }));
}
