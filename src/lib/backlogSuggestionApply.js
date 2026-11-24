/**
 * Build capture context text for backlog suggestion generation from epic draft / chat.
 * @param {{ title?: string, description?: string }} epicDraft
 * @param {string} [extra]
 */
export function buildCaptureContextFromEpic(epicDraft, extra = "") {
  const parts = [];
  const trimmedExtra = typeof extra === "string" ? extra.trim() : "";
  if (trimmedExtra) parts.push(trimmedExtra);
  const title = typeof epicDraft?.title === "string" ? epicDraft.title.trim() : "";
  const description =
    typeof epicDraft?.description === "string" ? epicDraft.description.trim() : "";
  if (title) parts.push(`## Epic title\n${title}`);
  if (description) parts.push(`## Epic description\n${description}`);
  if (parts.length === 0) return "";
  return parts.join("\n\n");
}

/**
 * Theme draft → applyBacklogSuggestion payload.
 * @param {object} draft
 * @param {object} [original]
 * @param {{ includedStoryIndexes?: Set<number>, jiraEpicKey?: string }} [options]
 */
export function draftToApplyPayload(draft, original, { includedStoryIndexes, jiraEpicKey } = {}) {
  const features = Array.isArray(draft?.features) ? draft.features : [];
  const filterByInclusion = includedStoryIndexes instanceof Set;
  const stories = features
    .map((f, idx) => ({ f, idx }))
    .filter(({ f, idx }) => {
      const title = typeof f?.name === "string" ? f.name.trim() : "";
      if (!title) return false;
      if (!filterByInclusion) return true;
      return includedStoryIndexes.has(idx);
    })
    .map(({ f }) => ({
      title: f.name,
      body: f.bodyMarkdown ?? "",
      type: "story",
    }));

  const payload = {
    epic: {
      title: draft.title ?? "",
      description: draft.epicDescriptionMarkdown ?? "",
    },
    stories,
    clientFit: original?.clientFit ?? "",
    riskOrAssumption: original?.riskOrAssumption ?? "",
  };
  const trimmedJiraEpicKey = typeof jiraEpicKey === "string" ? jiraEpicKey.trim() : "";
  if (trimmedJiraEpicKey) {
    payload.jiraEpicKey = trimmedJiraEpicKey;
  }
  return payload;
}

/**
 * Merge chat-confirmed epic fields over the first API suggestion theme.
 * @param {object} themeDraft — from suggestionToDraft
 * @param {{ title?: string, description?: string }} epicDraft
 */
export function mergeThemeWithEpicDraft(themeDraft, epicDraft) {
  const title =
    typeof epicDraft?.title === "string" && epicDraft.title.trim()
      ? epicDraft.title.trim()
      : themeDraft.title;
  const epicDescriptionMarkdown =
    typeof epicDraft?.description === "string" && epicDraft.description.trim()
      ? epicDraft.description.trim()
      : themeDraft.epicDescriptionMarkdown;
  return { ...themeDraft, title, epicDescriptionMarkdown };
}

/**
 * Format epic + optional chat lines for manual context append.
 * @param {{ title?: string, description?: string }} epicDraft
 * @param {string} [chatSummary]
 */
export function formatEpicDraftForManualContext(epicDraft, chatSummary = "") {
  const lines = ["## AI epic draft"];
  const summary = typeof chatSummary === "string" ? chatSummary.trim() : "";
  if (summary) lines.push(summary);
  const title = typeof epicDraft?.title === "string" ? epicDraft.title.trim() : "";
  const description =
    typeof epicDraft?.description === "string" ? epicDraft.description.trim() : "";
  if (title) lines.push(`**Epic title:** ${title}`);
  if (description) lines.push(description);
  return lines.join("\n\n");
}
