import { isAgentLiveStreamPhaseLabel } from "./clientLinkStreamTimeline.util.js";

/** Entry ids that mirror streamed timeline items (the list already shows them). */
export const TIMELINE_ENTRY_ID_PREFIX = "tl:";

function normalizeLabel(value) {
  return typeof value === "string"
    ? value
        .replace(/(…|\.{3})\s*$/u, "")
        .replace(/\s+/gu, " ")
        .trim()
        .toLowerCase()
    : "";
}

/** Text of the synthetic scratch row when the project has no prompt text to show. */
export const SCRATCH_ROW_FALLBACK_TEXT = "Setting up your project…";

/**
 * Whether the synthetic scratch-prompt row (the anchor of the scratch run's activity) is shown.
 *  - The project's original prompt shows on the first release's first conversation, unless the
 *    transcript's first user message already is that prompt (no duplicate).
 *  - Otherwise (no releases / no prompt text / archived history) it still shows as long as the
 *    scratch run has activity or a live stream, but never for a chat that has a real first user
 *    message.
 * @param {{ scratchTrim?: string, appliesToRelease?: boolean, hasArchivedHistory?: boolean, firstMessageText?: string, scratchRunKey?: string | null, hasScratchActivity?: boolean }} input
 */
export function shouldShowScratchRow({
  scratchTrim = "",
  appliesToRelease = false,
  hasArchivedHistory = false,
  firstMessageText = "",
  scratchRunKey = null,
  hasScratchActivity = false,
} = {}) {
  const prompt = typeof scratchTrim === "string" ? scratchTrim.trim() : "";
  const first = typeof firstMessageText === "string" ? firstMessageText.trim() : "";
  if (prompt && first === prompt) return false;
  if (prompt && appliesToRelease && !hasArchivedHistory) return true;
  return Boolean(scratchRunKey) && Boolean(hasScratchActivity) && !first;
}

/**
 * Human duration for a finished run: "45 sec", "7 min 51 sec", "2 min", "1 hr 5 min".
 * @param {number} ms
 */
export function formatActivityDuration(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  if (totalSec < 60) return `${totalSec} sec`;
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) return sec ? `${totalMin} min ${sec} sec` : `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min ? `${hr} hr ${min} min` : `${hr} hr`;
}

const OUTCOME_PREFIX = Object.freeze({
  done: "Completed in",
  failed: "Failed after",
  stopped: "Stopped after",
});

/**
 * Disclosure label of a finished run. With a known duration: "Completed in 7 min 51 sec · 107
 * steps" ("Failed after …" / "Stopped after …" for those outcomes). Without one (still running,
 * or no server timestamps): "Activity (N steps)".
 * @param {number} count
 * @param {number | null} [durationMs]
 * @param {"done" | "failed" | "stopped" | string | null} [outcome]
 */
export function activityDisclosureLabel(count, durationMs = null, outcome = "done") {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const steps = `${n} ${n === 1 ? "step" : "steps"}`;
  if (!(Number.isFinite(durationMs) && durationMs >= 0)) return `Activity (${steps})`;
  const prefix = OUTCOME_PREFIX[outcome] ?? OUTCOME_PREFIX.done;
  return `${prefix} ${formatActivityDuration(durationMs)} · ${steps}`;
}

function toMs(value) {
  if (value == null || value === "") return null;
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Total time a finished run took, from server timestamps only (so it is identical after a hard
 * reload). The end is the turn's `endedAt`; scratch runs have none, so it falls back to the
 * newest activity entry once nothing is running. Unknown / negative → null.
 * @param {{ startedAt?: string | number | null, endedAt?: string | number | null, entries?: Array<{ ts?: number, status?: string }> }} input
 * @returns {number | null}
 */
export function resolveActivityDurationMs({ startedAt, endedAt, entries } = {}) {
  const start = toMs(startedAt);
  if (start == null) return null;
  let end = toMs(endedAt);
  if (end == null) {
    const list = Array.isArray(entries) ? entries : [];
    if (list.length === 0 || list.some((e) => e?.status === "running")) return null;
    const stamps = list.map((e) => toMs(e?.ts)).filter((v) => v != null);
    if (stamps.length === 0) return null;
    end = Math.max(...stamps);
  }
  return end >= start ? end - start : null;
}

/**
 * Decide what the live activity block renders so nothing appears twice:
 *  - the ordered `items` list (every activity entry, except assistant entries whose text is
 *    already shown in full as streamed text),
 *  - streamed assistant `streamText` only when it is real output (not a phase label, not just a
 *    copy of an entry/status line),
 *  - the stream `timeline` only when the entries do not already mirror it (`tl:*` ids).
 * @param {{ entries?: object[], stream?: { text?: string, timeline?: object[], label?: string | null } | null, statusLine?: string }} input
 */
export function buildTurnActivityModel({ entries, stream, statusLine } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const rawText = typeof stream?.text === "string" ? stream.text.trim() : "";
  const timeline = Array.isArray(stream?.timeline) ? stream.timeline : [];

  const known = new Set(
    [stream?.label, statusLine, ...list.map((e) => e.label)].map(normalizeLabel).filter(Boolean),
  );
  const textIsLabel =
    !rawText || isAgentLiveStreamPhaseLabel(rawText) || known.has(normalizeLabel(rawText));
  const streamText = textIsLabel ? "" : rawText;

  const timelineMirrored = list.some((e) => String(e.id).startsWith(TIMELINE_ENTRY_ID_PREFIX));
  const shownTimeline = timelineMirrored ? [] : timeline;

  const textKey = normalizeLabel(streamText);
  const items = streamText
    ? list.filter(
        (e) =>
          !(
            e.kind === "assistant" &&
            normalizeLabel(e.label) &&
            textKey.includes(normalizeLabel(e.label))
          ),
      )
    : list;

  return {
    items,
    streamText,
    timeline: shownTimeline,
    hasEntries: list.length > 0,
    hasOutput: Boolean(streamText) || shownTimeline.length > 0,
  };
}
