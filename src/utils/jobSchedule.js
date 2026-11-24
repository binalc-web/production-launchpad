import {
  addDays,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toDate } from "date-fns-tz";
import cronParser from "cron-parser";

const LONG_WEEKDAY_TO_API = {
  Sunday: "SUNDAY",
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
};

function normalizeCronExpression(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * @param {string} cronExpr
 * @param {string} timeZone
 * @param {Date} [from]
 * @returns {Date | null}
 */
function computeNextCronRunAfter(cronExpr, timeZone, from = new Date()) {
  const expr = normalizeCronExpression(cronExpr);
  if (!expr || expr.split(" ").length !== 5) return null;
  const thresholdMs = from.getTime() + 1000;
  try {
    const interval = cronParser.parseExpression(expr, {
      currentDate: new Date(thresholdMs),
      tz: String(timeZone || "UTC").trim() || "UTC",
    });
    const next = interval.next().toDate();
    if (next.getTime() <= thresholdMs) return null;
    return next;
  } catch {
    return null;
  }
}

/**
 * @param {string} scheduleTime "HH:mm"
 * @param {string} timeZone IANA
 * @returns {string} e.g. "7:00 AM"
 */
function formatTime12InZone(scheduleTime, timeZone) {
  const [h, m] = scheduleTime.split(":").map(Number);
  const now = new Date();
  const ymd = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const [y, mo, d] = ymd.split("-").map(Number);
  const localWall = new Date(y, mo - 1, d, h, m, 0, 0);
  const utc = fromZonedTime(localWall, timeZone);
  return formatInTimeZone(utc, timeZone, "h:mm a");
}

/**
 * @param {string} ymd yyyy-MM-dd
 * @param {string} wall HH:mm:ss
 * @param {string} timeZone
 * @param {number} thresholdMs
 * @returns {Date | null}
 */
function resolveOneTimeRun(ymd, wall, timeZone, thresholdMs) {
  const utc = toDate(`${ymd}T${wall}`, { timeZone });
  if (Number.isNaN(utc.getTime())) return null;
  if (utc.getTime() <= thresholdMs) return null;
  return utc;
}

/**
 * @param {string} scheduleType
 * @param {string} scheduleTime
 * @param {string|null} scheduleDay
 * @param {string} timeZone
 * @param {string|null} [scheduleDate] yyyy-MM-dd when ONETIME
 * @param {string|null} [scheduleCron] 5-field cron when CUSTOM
 */
export function formatRepeatsLine(
  scheduleType,
  scheduleTime,
  scheduleDay,
  timeZone,
  scheduleDate = null,
  scheduleCron = null,
) {
  if (scheduleType === "CUSTOM") {
    const expr = normalizeCronExpression(scheduleCron);
    if (expr) {
      return `Runs on cron \`${expr}\` (${timeZone})`;
    }
    return `Custom cron schedule (${timeZone})`;
  }

  const t = formatTime12InZone(scheduleTime, timeZone);
  if (scheduleType === "ONETIME" && scheduleDate) {
    const ymd = String(scheduleDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const noon = toDate(`${ymd}T12:00:00`, { timeZone });
      const dLabel = formatInTimeZone(noon, timeZone, "MMM d, yyyy");
      return `Runs once on ${dLabel} at ${t} (${timeZone})`;
    }
  }
  if (scheduleType === "WEEKLY" && scheduleDay) {
    const label =
      scheduleDay.charAt(0) + scheduleDay.slice(1).toLowerCase();
    return `Runs weekly on ${label} at ${t} (${timeZone})`;
  }
  return `Runs daily at ${t} (${timeZone})`;
}

/**
 * Next scheduled run instant in UTC, or null if none found.
 */
export function getNextRunDate(
  scheduleType,
  scheduleTime,
  scheduleDay,
  timeZone,
  scheduleDate = null,
  scheduleCron = null,
) {
  try {
    const now = new Date();
    const thresholdMs = now.getTime() + 1000;

    if (scheduleType === "CUSTOM") {
      const expr = normalizeCronExpression(scheduleCron);
      if (!expr) return null;
      return computeNextCronRunAfter(expr, timeZone, now);
    }

    const [h, min] = scheduleTime.split(":").map(Number);
    const wall = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

    if (scheduleType === "ONETIME" && scheduleDate) {
      const ymd = String(scheduleDate).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
      return resolveOneTimeRun(ymd, wall, timeZone, thresholdMs);
    }

    for (let offset = 0; offset < 120; offset++) {
      const dayProbe = addDays(now, offset);
      const ymd = formatInTimeZone(dayProbe, timeZone, "yyyy-MM-dd");
      const [y, mo, d] = ymd.split("-").map(Number);
      const localWall = new Date(y, mo - 1, d, h, min, 0, 0);
      const utc = fromZonedTime(localWall, timeZone);
      if (utc.getTime() <= now.getTime()) continue;

      if (scheduleType === "WEEKLY" && scheduleDay) {
        const long = formatInTimeZone(utc, timeZone, "EEEE");
        const api = LONG_WEEKDAY_TO_API[long];
        if (api !== scheduleDay) continue;
      }

      return utc;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * Compact schedule line for automation cards.
 * @param {object} job
 */
export function formatScheduleCardLine(job) {
  const tz = job.timezone || "UTC";
  const scheduleType = job.scheduleType;
  if (scheduleType === "CUSTOM") {
    const expr = normalizeCronExpression(job.scheduleCron);
    if (expr) return `Custom · \`${expr}\``;
    return "Custom · cron";
  }
  const time = job.scheduleTime || "00:00";
  const t = formatTime12InZone(time, tz);
  if (scheduleType === "ONETIME" && job.scheduleDate) {
    const ymd = String(job.scheduleDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const noon = toDate(`${ymd}T12:00:00`, { timeZone: tz });
      const dLabel = formatInTimeZone(noon, tz, "MMM d, yyyy");
      return `One time · ${dLabel} at ${t}`;
    }
  }
  if (scheduleType === "WEEKLY" && job.scheduleDay) {
    const short =
      job.scheduleDay.charAt(0) +
      job.scheduleDay.slice(1, 3).toLowerCase();
    return `Weekly · ${short} at ${t}`;
  }
  return `Daily · ${t}`;
}

/**
 * Human-readable time until `target`, using the largest fitting unit.
 */
export function formatTimeUntil(target, now = new Date()) {
  if (!(target instanceof Date) || Number.isNaN(target.getTime())) return null;
  if (target.getTime() <= now.getTime()) return null;

  const months = differenceInMonths(target, now);
  if (months >= 1) {
    return `In ${months} month${months === 1 ? "" : "s"}`;
  }

  const days = differenceInDays(target, now);
  if (days >= 1) {
    return `In ${days} day${days === 1 ? "" : "s"}`;
  }

  const hours = differenceInHours(target, now);
  if (hours >= 1) {
    return `In ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const mins = Math.max(1, differenceInMinutes(target, now));
  return `In ${mins} min${mins === 1 ? "" : "s"}`;
}

/**
 * Whether a next-run column should be shown for this automation.
 */
export function isNextRunApplicable(job) {
  if (job.enabled === false) return false;
  return (
    getNextRunDate(
      job.scheduleType,
      job.scheduleTime || "00:00",
      job.scheduleDay ?? null,
      job.timezone || "UTC",
      job.scheduleDate ?? null,
      job.scheduleCron ?? null,
    ) != null
  );
}

/**
 * Relative next-run label for cards.
 */
export function formatNextRunRelative(job) {
  if (!isNextRunApplicable(job)) return null;
  const tz = job.timezone || "UTC";
  const utc = getNextRunDate(
    job.scheduleType,
    job.scheduleTime || "00:00",
    job.scheduleDay ?? null,
    tz,
    job.scheduleDate ?? null,
    job.scheduleCron ?? null,
  );
  if (!utc) return null;
  return formatTimeUntil(utc, new Date());
}

/**
 * Next occurrence summary for detail view.
 */
export function getNextRunSummaryText(
  scheduleType,
  scheduleTime,
  scheduleDay,
  timeZone,
  scheduleDate = null,
  scheduleCron = null,
) {
  const utc = getNextRunDate(
    scheduleType,
    scheduleTime,
    scheduleDay,
    timeZone,
    scheduleDate,
    scheduleCron,
  );
  if (!utc) return "Next run: —";
  const relative = formatTimeUntil(utc, new Date());
  return relative ? `Next run: ${relative}` : "Next run: —";
}
