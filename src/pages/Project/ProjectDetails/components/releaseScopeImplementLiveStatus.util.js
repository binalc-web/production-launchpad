const IN_FLIGHT_IMPLEMENT_STATUSES = new Set(["queued", "running", "awaiting_questions"]);

/** Stable key matching backend `scopeImplementItemKey`. */
export function scopeStoryIdentityKey(story) {
  if (story?.jiraIssueKey) return `j:${story.jiraIssueKey}`;
  if (story?.backlogStoryId != null) return `b:${story.backlogStoryId}`;
  return null;
}

/** Map current implement-run items by story identity key. */
export function buildLiveImplementItemMap(runItems) {
  const map = new Map();
  for (const item of runItems ?? []) {
    const key = scopeStoryIdentityKey(item);
    if (key) map.set(key, item);
  }
  return map;
}

/**
 * Prefer the current run's item status over last-terminal scope status.
 * In-flight items hide previous Failed/Done (and old PR links) so the Jira tree
 * matches "Implementation in progress".
 */
export function resolveDisplayedImplementMeta(story, liveMap) {
  const key = scopeStoryIdentityKey(story);
  const live = key && liveMap instanceof Map ? liveMap.get(key) : null;
  const liveStatus = String(live?.status ?? "").toLowerCase();
  if (!live || !liveStatus) {
    return {
      status: story?.implementStatus ?? null,
      outcome: story?.implementOutcome ?? null,
    };
  }
  if (IN_FLIGHT_IMPLEMENT_STATUSES.has(liveStatus)) {
    return { status: liveStatus, outcome: null };
  }
  return {
    status: liveStatus,
    outcome: live.outcomeSnapshot ?? story?.implementOutcome ?? null,
  };
}
