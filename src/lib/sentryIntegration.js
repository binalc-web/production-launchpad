export const SENTRY_LEVEL_OPTIONS = Object.freeze([
  { value: "debug", label: "Debug and above" },
  { value: "info", label: "Info and above" },
  { value: "warning", label: "Warning and above" },
  { value: "error", label: "Error and above" },
  { value: "fatal", label: "Fatal only" },
]);

/**
 * Toast copy for an import-issues result.
 * @param {{ fetched?: number, created?: number, alreadyImported?: number, skipped?: number, failed?: number } | null | undefined} result
 * @returns {string}
 */
export function formatSentryImportSummary(result) {
  const created = Number(result?.created) || 0;
  const already = Number(result?.alreadyImported) || 0;
  const skipped = Number(result?.skipped) || 0;
  const failed = Number(result?.failed) || 0;
  if (!Number(result?.fetched)) return "No unresolved Sentry issues to import.";
  const parts = [`Imported ${created} Sentry issue${created === 1 ? "" : "s"}`];
  if (already) parts.push(`${already} already imported`);
  if (skipped) parts.push(`${skipped} below the minimum level`);
  if (failed) parts.push(`${failed} failed (see server logs)`);
  return `${parts.join(", ")}.`;
}

/**
 * @param {{ feedbackSource?: string, metadata?: object, sentryIssue?: object }} item
 * @returns {{ sentryIssueId: string|null, shortId: string|null, permalink: string|null, level: string|null } | null}
 */
export function resolveSentryIssueInfo(item) {
  if (!item || String(item.feedbackSource || "").toUpperCase() !== "SENTRY") return null;
  const meta = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const link = item.sentryIssue && typeof item.sentryIssue === "object" ? item.sentryIssue : {};
  return {
    sentryIssueId: link.sentryIssueId || meta.sentryIssueId || null,
    shortId: link.shortId || meta.shortId || null,
    permalink: link.permalink || meta.permalink || null,
    level: meta.level || null,
  };
}
