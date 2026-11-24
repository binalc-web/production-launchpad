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
 * Plain-language label for infra analysis run timing in the tab header.
 * @param {{ status?: string, startedAt?: string | null, completedAt?: string | null } | null | undefined} run
 * @returns {{ label: string, relative: string | null } | null}
 */
export function formatInfraAnalysisRunTime(run) {
  if (!run) return null;

  const status = String(run.status ?? "").toLowerCase();
  const completedAt = parseRunTimestamp(run.completedAt);
  const startedAt = parseRunTimestamp(run.startedAt);
  const timestamp = completedAt ?? startedAt;

  if (!timestamp) return null;

  const absolute = formatAbsolute(timestamp);
  const relative = formatRelative(timestamp);

  if (status === "completed") {
    return {
      label: `Last analyzed ${absolute}`,
      relative,
    };
  }

  if (status === "failed") {
    return {
      label: `Last attempt ${absolute}`,
      relative,
    };
  }

  if (status === "running" || status === "queued") {
    return {
      label: `Analysis started ${absolute}`,
      relative,
    };
  }

  return {
    label: absolute,
    relative,
  };
}
