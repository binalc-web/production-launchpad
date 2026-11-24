/**
 * Normalize stream timeline items from agent-status SSE payloads.
 * @param {unknown} raw
 * @returns {Array<object>}
 */
export function normalizeAgentStreamTimeline(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const type = item.type;
    return type === "thinking" || type === "tool_call" || type === "assistant" || type === "result";
  });
}

/**
 * @param {object | null | undefined} st
 * @returns {Array<object>}
 */
export function readAgentStreamTimeline(st) {
  return normalizeAgentStreamTimeline(st?.streamTimeline);
}

/**
 * @param {Array<object>} items
 * @returns {boolean}
 */
export function agentStreamTimelineHasContent(items) {
  return Array.isArray(items) && items.length > 0;
}

/** Known backend phase labels — not substantive assistant output. */
export const AGENT_LIVE_STREAM_PHASE_LABELS = [
  "Preparing workspace…",
  "Agent is working…",
  "Publishing changes…",
  "Publishing to GitHub…",
  "Published to GitHub",
  "Publish failed",
];

/**
 * True when text is a short run-phase status line rather than assistant output.
 * @param {string} text
 * @returns {boolean}
 */
export function isAgentLiveStreamPhaseLabel(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return false;
  if (AGENT_LIVE_STREAM_PHASE_LABELS.includes(trimmed)) return true;
  return trimmed.length <= 48 && trimmed.endsWith("…");
}

/**
 * Join assistant segments from a normalized timeline.
 * @param {Array<object>} timeline
 * @returns {string}
 */
export function extractAssistantTextFromAgentTimeline(timeline) {
  return timeline
    .filter((item) => item.type === "assistant" && typeof item.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Prefer timeline assistant segments when streamText is a phase label only.
 * When streamText is substantive and conflicts with timeline assistant, prefer streamText.
 * @param {string} streamText
 * @param {Array<object>} timeline
 * @returns {string}
 */
export function resolveAgentLiveAssistantText(streamText, timeline) {
  const items = normalizeAgentStreamTimeline(timeline);
  const fromTimeline = extractAssistantTextFromAgentTimeline(items);
  const raw = typeof streamText === "string" ? streamText.trim() : "";
  const streamSubstantive = Boolean(raw) && !isAgentLiveStreamPhaseLabel(raw);
  if (streamSubstantive && fromTimeline && raw !== fromTimeline) {
    return raw;
  }
  if (fromTimeline) return fromTimeline;
  return raw;
}

/**
 * True when live streamText should replace stale assistant segments in the timeline UI.
 * @param {string} streamText
 * @param {Array<object>} timeline
 * @returns {boolean}
 */
export function shouldPreferStreamTextOverTimelineAssistant(streamText, timeline) {
  const items = normalizeAgentStreamTimeline(timeline);
  const fromTimeline = extractAssistantTextFromAgentTimeline(items);
  const raw = typeof streamText === "string" ? streamText.trim() : "";
  return (
    Boolean(raw) &&
    !isAgentLiveStreamPhaseLabel(raw) &&
    Boolean(fromTimeline) &&
    raw !== fromTimeline
  );
}
