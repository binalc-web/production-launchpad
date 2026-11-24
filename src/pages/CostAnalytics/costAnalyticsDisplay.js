import { formatUsd } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";

/** Sortable column keys for the cost analytics projects table. */
export const COST_ANALYTICS_TABLE_SORT_KEYS = [
  "budgetUsd",
  "totalSpendUsd",
  "remainingUsd",
  "lastSpendAt",
];

/**
 * @param {number} amountUsd
 */
export function formatBudgetUsd(amountUsd) {
  return formatUsd(amountUsd);
}

/**
 * @param {string|Date|null|undefined} value
 */
export function formatUsageDateLabel(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function toSortableNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function toSortableTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Client-side sort for cost analytics project rows.
 * @param {Array<Record<string, unknown>>} projects
 * @param {string|null|undefined} sortKey
 * @param {"asc"|"desc"|string} direction
 * @returns {Array<Record<string, unknown>>}
 */
export function sortCostAnalyticsProjects(projects, sortKey, direction = "desc") {
  const list = Array.isArray(projects) ? projects : [];
  if (!sortKey || !COST_ANALYTICS_TABLE_SORT_KEYS.includes(sortKey)) {
    return [...list];
  }

  const ascending = direction === "asc";
  const multiplier = ascending ? 1 : -1;

  return [...list].sort((left, right) => {
    if (sortKey === "lastSpendAt") {
      const leftTime = toSortableTimestamp(left.lastSpendAt);
      const rightTime = toSortableTimestamp(right.lastSpendAt);
      if (leftTime == null && rightTime == null) return 0;
      if (leftTime == null) return 1;
      if (rightTime == null) return -1;
      return (leftTime - rightTime) * multiplier;
    }

    const leftValue = toSortableNumber(left[sortKey]);
    const rightValue = toSortableNumber(right[sortKey]);
    return (leftValue - rightValue) * multiplier;
  });
}
