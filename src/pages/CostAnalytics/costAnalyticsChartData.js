import { format, parseISO } from "date-fns";
import { SOURCE_LABELS } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";
import { getCursorModelLabel } from "@/constants/cursorModelCatalog";
import { formatBudgetUsd } from "./costAnalyticsDisplay";

/** Chart config tokens using theme chart CSS variables. */
export const COST_CHART_COLORS = {
  spend: "var(--chart-1)",
  budget: "var(--chart-2)",
  remaining: "var(--chart-3)",
  runs: "var(--chart-4)",
  other: "var(--chart-5)",
};

/**
 * Sum all token fields on a daily usage row.
 * @param {{ inputTokens?: number, outputTokens?: number, cacheReadTokens?: number, cacheWriteTokens?: number, totalTokens?: number }} row
 */
export function sumDailyUsageTokens(row) {
  const explicit = Number(row?.totalTokens) || 0;
  if (explicit > 0) return explicit;
  return (
    (Number(row?.inputTokens) || 0) +
    (Number(row?.outputTokens) || 0) +
    (Number(row?.cacheReadTokens) || 0) +
    (Number(row?.cacheWriteTokens) || 0)
  );
}

/**
 * Stable chart series key for a project id.
 * @param {number|string} projectId
 */
export function projectTokenSeriesKey(projectId) {
  return `project_${projectId}`;
}

/**
 * Normalize daily rollup rows for recharts.
 * @param {Array<{ usageDate: string|Date, totalCostUsd?: number, runCount?: number }>} rows
 * @param {number} [limitDays]
 */
export function buildDailySpendChartData(rows, limitDays = 30) {
  const list = Array.isArray(rows) ? rows : [];
  const sliced = limitDays > 0 ? list.slice(-limitDays) : list;
  return sliced.flatMap((row) => {
    const rawDate = row?.usageDate;
    const date =
      rawDate instanceof Date
        ? rawDate
        : typeof rawDate === "string"
          ? parseISO(rawDate.split("T")[0])
          : new Date(rawDate);
    if (!Number.isFinite(date.getTime())) return [];
    const cost = Number(row?.totalCostUsd) || 0;
    const runs = Number(row?.runCount) || 0;
    return [
      {
        dateKey: format(date, "yyyy-MM-dd"),
        label: format(date, "MMM d"),
        cost,
        runs,
        costLabel: formatBudgetUsd(cost),
      },
    ];
  });
}

/**
 * Top projects by spend for horizontal bar chart.
 * @param {Array<{ name?: string, totalSpendUsd?: number, budgetUsd?: number }>} projects
 * @param {number} [limit]
 */
export function buildTopProjectsChartData(projects, limit = 8) {
  const list = Array.isArray(projects) ? projects : [];
  return [...list]
    .sort((a, b) => (Number(b.totalSpendUsd) || 0) - (Number(a.totalSpendUsd) || 0))
    .slice(0, limit)
    .map((row) => {
      const spent = Number(row.totalSpendUsd) || 0;
      const budget = Number(row.budgetUsd) || 0;
      const name = String(row.name ?? "Project").trim() || "Project";
      return {
        name: name.length > 22 ? `${name.slice(0, 20)}…` : name,
        fullName: name,
        spent,
        budget,
        spentLabel: formatBudgetUsd(spent),
        budgetLabel: formatBudgetUsd(budget),
      };
    });
}

/**
 * Source breakdown for bar or pie charts.
 * @param {Array<{ source?: string, costUsd?: number, runCount?: number }>} rows
 * @param {number} [limit]
 */
export function buildSourceSpendChartData(rows, limit = 8) {
  const list = Array.isArray(rows) ? rows : [];
  return [...list]
    .sort((a, b) => (Number(b.costUsd) || 0) - (Number(a.costUsd) || 0))
    .slice(0, limit)
    .map((row, index) => {
      const source = String(row.source ?? "unknown");
      const cost = Number(row.costUsd) || 0;
      const runs = Number(row.runCount) || 0;
      return {
        source,
        label: SOURCE_LABELS[source] ?? source.replace(/_/g, " "),
        cost,
        runs,
        costLabel: formatBudgetUsd(cost),
        fill: `var(--chart-${(index % 5) + 1})`,
      };
    });
}

/**
 * Model breakdown for horizontal bar chart.
 * @param {Array<{ modelId?: string, costUsd?: number, runCount?: number }>} rows
 * @param {number} [limit]
 */
export function buildModelSpendChartData(rows, limit = 8) {
  const list = Array.isArray(rows) ? rows : [];
  return [...list]
    .sort((a, b) => (Number(b.costUsd) || 0) - (Number(a.costUsd) || 0))
    .slice(0, limit)
    .map((row, index) => {
      const modelId = String(row.modelId ?? "Auto").trim() || "Auto";
      const cost = Number(row.costUsd) || 0;
      const runs = Number(row.runCount) || 0;
      return {
        modelId,
        label: getCursorModelLabel(modelId),
        cost,
        runs,
        costLabel: formatBudgetUsd(cost),
        fill: `var(--chart-${(index % 5) + 1})`,
      };
    });
}

/**
 * Budget utilization donut segments.
 * @param {{ totalSpendUsd?: number, totalBudgetUsd?: number, totalRemainingUsd?: number }} totals
 */
export function buildBudgetUtilizationChartData(totals) {
  const spent = Number(totals?.totalSpendUsd) || 0;
  const remaining = Math.max(0, Number(totals?.totalRemainingUsd) || 0);
  return [
    {
      key: "spent",
      label: "Spent",
      value: spent,
      fill: COST_CHART_COLORS.spend,
    },
    {
      key: "remaining",
      label: "Remaining",
      value: remaining,
      fill: COST_CHART_COLORS.remaining,
    },
  ].filter((row) => row.value > 0);
}

/**
 * Build stacked daily token usage series for top projects.
 * @param {Array<{ usageDate: string|Date, projectId: number, projectName?: string, totalTokens?: number, inputTokens?: number, outputTokens?: number, cacheReadTokens?: number, cacheWriteTokens?: number }>} rows
 * @param {{ limitProjects?: number, limitDays?: number }} [options]
 */
export function buildDailyTokenUsageByProjectChartData(rows, options = {}) {
  const limitProjects = Number(options.limitProjects) || 6;
  const limitDays = Number(options.limitDays) || 30;
  const list = Array.isArray(rows) ? rows : [];

  const projectTotals = new Map();
  const projectNames = new Map();
  for (const row of list) {
    const projectId = Number(row?.projectId);
    if (!Number.isInteger(projectId) || projectId < 1) continue;
    const tokens = sumDailyUsageTokens(row);
    projectTotals.set(projectId, (projectTotals.get(projectId) || 0) + tokens);
    const name = String(row?.projectName ?? "").trim();
    if (name) projectNames.set(projectId, name);
  }

  const topProjectIds = [...projectTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limitProjects)
    .map(([projectId]) => projectId);
  const topProjectIdSet = new Set(topProjectIds);

  const dateBuckets = new Map();
  for (const row of list) {
    const projectId = Number(row?.projectId);
    if (!Number.isInteger(projectId) || projectId < 1) continue;

    const rawDate = row?.usageDate;
    const date =
      rawDate instanceof Date
        ? rawDate
        : typeof rawDate === "string"
          ? parseISO(rawDate.split("T")[0])
          : new Date(rawDate);
    const dateKey = format(date, "yyyy-MM-dd");
    const tokens = sumDailyUsageTokens(row);

    if (!dateBuckets.has(dateKey)) {
      const bucket = {
        dateKey,
        label: format(date, "MMM d"),
        totalTokens: 0,
      };
      for (const pid of topProjectIds) {
        bucket[projectTokenSeriesKey(pid)] = 0;
      }
      bucket.other = 0;
      dateBuckets.set(dateKey, bucket);
    }

    const bucket = dateBuckets.get(dateKey);
    bucket.totalTokens += tokens;
    if (topProjectIdSet.has(projectId)) {
      const seriesKey = projectTokenSeriesKey(projectId);
      bucket[seriesKey] += tokens;
    } else {
      bucket.other += tokens;
    }
  }

  const hasOther = [...dateBuckets.values()].some((bucket) => bucket.other > 0);
  const data = [...dateBuckets.values()]
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-limitDays);

  const series = topProjectIds.map((projectId, index) => {
    const fullName = projectNames.get(projectId) ?? `Project ${projectId}`;
    const label = fullName.length > 18 ? `${fullName.slice(0, 16)}…` : fullName;
    const key = projectTokenSeriesKey(projectId);
    return {
      key,
      projectId,
      label,
      fullName,
      color: `var(--chart-${(index % 5) + 1})`,
    };
  });

  if (hasOther) {
    series.push({
      key: "other",
      projectId: null,
      label: "Other",
      fullName: "Other projects",
      color: COST_CHART_COLORS.other,
    });
  }

  const chartConfig = Object.fromEntries(
    series.map((item) => [item.key, { label: item.fullName, color: item.color }]),
  );

  return { data, series, chartConfig };
}
