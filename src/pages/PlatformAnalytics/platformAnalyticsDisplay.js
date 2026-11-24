import { formatUsd } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";

export const PLATFORM_CHART_COLORS = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  quaternary: "var(--chart-4)",
  other: "var(--chart-5)",
};

export const RANGE_PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 12 months" },
];

export const GRANULARITY_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

/**
 * Build API range params from a preset (days back, inclusive of today).
 * @param {string|number} presetDays
 * @param {string} granularity
 * @param {Date} [now]
 */
export function buildRangeParams(presetDays, granularity, now = new Date()) {
  const days = Math.max(1, Number(presetDays) || 30);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const params = {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
  if (granularity && granularity !== "auto") params.granularity = granularity;
  return params;
}

/** @param {number|null|undefined} value */
export function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

/** @param {number|null|undefined} value */
export function formatPlatformUsd(value) {
  return formatUsd(Number(value) || 0);
}

/**
 * @param {number|null|undefined} deltaPct
 * @returns {{ label: string, tone: "up"|"down"|"flat"|"new" }}
 */
export function formatDelta(deltaPct) {
  if (deltaPct === null) return { label: "New", tone: "new" };
  const n = Number(deltaPct);
  if (!Number.isFinite(n) || n === 0) return { label: "0%", tone: "flat" };
  return { label: `${n > 0 ? "+" : ""}${n}%`, tone: n > 0 ? "up" : "down" };
}

/**
 * Compare two cell values. Missing dates stay last in both directions.
 * @param {unknown} left
 * @param {unknown} right
 * @param {"text"|"number"|"date"} kind
 * @param {"asc"|"desc"} [order]
 */
export function compareSortValues(left, right, kind, order = "asc") {
  const dir = order === "desc" ? -1 : 1;
  if (kind === "date") {
    const lt = left ? new Date(left).getTime() : NaN;
    const rt = right ? new Date(right).getTime() : NaN;
    const lMissing = !Number.isFinite(lt);
    const rMissing = !Number.isFinite(rt);
    if (lMissing || rMissing) {
      if (lMissing && rMissing) return 0;
      return lMissing ? 1 : -1;
    }
    return (lt - rt) * dir;
  }
  if (kind === "number") return ((Number(left) || 0) - (Number(right) || 0)) * dir;
  return (
    String(left ?? "").localeCompare(String(right ?? ""), undefined, {
      sensitivity: "base",
      numeric: true,
    }) * dir
  );
}

/**
 * @template T
 * @param {T[]} rows
 * @param {string} sortKey
 * @param {"asc"|"desc"} order
 * @param {Record<string, { kind: "text"|"number"|"date", read: (row: T) => unknown }>} accessors
 */
export function sortRowsByKey(rows, sortKey, order, accessors) {
  const access = accessors[sortKey];
  if (!access) return rows;
  return [...rows].sort(
    (a, b) =>
      compareSortValues(access.read(a), access.read(b), access.kind, order) ||
      (Number(a.id) || 0) - (Number(b.id) || 0),
  );
}

/** @param {string|null|undefined} iso */
export function formatRelativeTime(iso, now = Date.now()) {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** @param {string|null|undefined} iso */
export function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * X-axis label for a bucket date (YYYY-MM-DD).
 * @param {string} date
 * @param {"day"|"week"|"month"} granularity
 */
export function formatBucketLabel(date, granularity) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  if (granularity === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}
