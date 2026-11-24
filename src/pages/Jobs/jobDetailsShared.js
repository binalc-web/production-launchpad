import { format, isToday, isYesterday, parseISO } from "date-fns";
import { isJobRunTimedOut } from "./utils/jobRunStatus.util";

export function runHasReport(run) {
  const r = run?.report;
  if (r === undefined || r === null) return false;
  if (typeof r === "string") return r.trim().length > 0;
  return true;
}

export function formatRunWhen(iso) {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
    if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
    return format(d, "MMM d 'at' h:mm a");
  } catch {
    return "—";
  }
}

const STATUS_BADGE = {
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  FAILED: "border-red-200 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  RUNNING: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  PENDING: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
};

export function statusBadgeClass(status, run) {
  if (isJobRunTimedOut(run)) {
    return STATUS_BADGE.FAILED;
  }
  const u = String(status || "").toUpperCase();
  return STATUS_BADGE[u] ?? "border-border bg-muted text-muted-foreground";
}

/** Label for run list badge (handles client-side timeout before API reconcile). */
export function runStatusLabel(run) {
  if (isJobRunTimedOut(run)) return "TIMED OUT";
  return String(run?.status ?? "").toUpperCase() || "—";
}

export function triggerLabel(trigger) {
  return String(trigger || "MANUAL").toUpperCase() === "SCHEDULED" ? "Scheduled" : "Manual";
}
