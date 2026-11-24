/**
 * Shared /chat goal + loop + follow helpers.
 */

export function isAssistantGoalActive(goalState) {
  return (
    (goalState?.mode === "goal" || goalState?.mode === "loop") &&
    goalState?.status === "in_progress"
  );
}

export function isAssistantFollowActive(goalState) {
  return goalState?.mode === "follow" && goalState?.status === "in_progress";
}

/** Goal, loop, or follow — keep refreshing the thread while ticks run. */
export function isAssistantTickActive(goalState) {
  return isAssistantGoalActive(goalState) || isAssistantFollowActive(goalState);
}

/**
 * Strip trailing machine status lines from assistant prose for display.
 * Mirrors backend stripAssistantStatusLinesForDisplay.
 * @param {string} text
 */
export function stripAssistantStatusLinesForDisplay(text) {
  const src = String(text || "");
  if (!src.trim()) return "";
  const lines = src.split("\n");
  const kept = [];
  let inLegacyBlock = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^(PHASE|NEXT_ACTION|RESUME|GOAL_STATUS):\s*/i.test(line)) {
      inLegacyBlock = false;
      continue;
    }
    if (/^\*\*?Status:?\*\*?/i.test(line) || /^Status:\s*/i.test(line) || /^\*\*Status\*\*/i.test(line)) {
      inLegacyBlock = true;
      continue;
    }
    if (inLegacyBlock) {
      if (
        /^(-|\*|•)?\s*\*?\*?(Status|Session|Next action|Next Action)\*?\*?:/i.test(line) ||
        /^(Status|Session|Next action|Next Action):\s*/i.test(line) ||
        !line
      ) {
        continue;
      }
      if (!/^(Status|Session|Next action)/i.test(line) && !/^[-*•]/.test(line)) {
        inLegacyBlock = false;
        kept.push(rawLine);
      }
      continue;
    }
    if (/^(-|\*|•)?\s*\*?\*?(Status|Session|Next action|Next Action)\*?\*?:/i.test(line)) {
      continue;
    }
    kept.push(rawLine);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Prose to render for an assistant message. Falls back to the raw text when stripping
 * machine status lines would leave nothing, so a reply is never silently blank.
 * @param {string} text
 */
export function assistantDisplayText(text) {
  return stripAssistantStatusLinesForDisplay(text) || String(text || "").trim();
}

/**
 * Compact id for the in-progress card.
 * @param {string|null|undefined} id
 */
export function truncateAssistantId(id) {
  const s = String(id || "").trim();
  if (!s) return "";
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…`;
}
