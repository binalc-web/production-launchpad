import { format, formatDistanceToNow, parseISO } from "date-fns";

const ABSOLUTE_FORMAT = "MMM d, yyyy 'at' h:mm a";

function parseRunTimestamp(value) {
  if (!value) return null;
  try {
    const date = typeof value === "string" ? parseISO(value) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatAbsolute(date) {
  return format(date, ABSOLUTE_FORMAT);
}

function formatRelative(date) {
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
  }
}

/**
 * @param {{ status?: string, startedAt?: string | null, completedAt?: string | null } | null | undefined} run
 */
export function formatArchitectureDiagramRunTime(run) {
  if (!run) return null;

  const status = String(run.status ?? "").toLowerCase();
  const completedAt = parseRunTimestamp(run.completedAt);
  const startedAt = parseRunTimestamp(run.startedAt);
  const timestamp = completedAt ?? startedAt;

  if (!timestamp) return null;

  const absolute = formatAbsolute(timestamp);
  const relative = formatRelative(timestamp);

  if (status === "ready") {
    return { label: `Last generated ${absolute}`, relative };
  }
  if (status === "failed") {
    return { label: `Last attempt ${absolute}`, relative };
  }
  if (status === "generating") {
    return { label: `Generation started ${absolute}`, relative };
  }
  return { label: absolute, relative };
}
