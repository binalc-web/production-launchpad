import React from "react";
import { parseReleaseDescriptionForJira } from "@/utils/releaseDescriptionJiraDisplayParse";
import { EpicStoryAccordion } from "./EpicStoryAccordion";
import { cn } from "@/lib/utils";

const REASON_MESSAGES = {
  empty: "Add a release description to see how it maps to Jira Epics and Stories.",
  no_themes:
    "Use a line starting with ### for each Epic title (Jira Epic).",
  preamble_before_theme:
    "Remove any text before the first ### Epic heading.",
  empty_theme_title: "Each ### line needs a non-empty Epic title.",
  missing_features_header:
    "Each Epic block must include a **Features:** line before story bullets.",
  no_features: "Each Epic needs at least one story bullet under **Features:**.",
  invalid_feature_line:
    "Each story must look like: - **Story title** — description",
};

/**
 * @param {object} props
 * @param {string} props.description
 * @param {{ ok: boolean, themes?: Array, reason?: string, detail?: string }} [props.preParsed] — when set, skip parsing `description` (parent may parse once and pass the result)
 * @param {string} [props.className]
 * @param {string} [props.headingClassName]
 * @param {boolean} [props.showHeading]
 * @param {object} [props.jiraReleaseSync]
 */
export function JiraPreview({
  description,
  preParsed,
  className,
  headingClassName,
  showHeading = true,
  jiraReleaseSync,
}) {
  const text = typeof description === "string" ? description : "";
  const parsed =
    preParsed != null
      ? preParsed
      : text.trim()
        ? parseReleaseDescriptionForJira(text)
        : { ok: false, reason: "empty" };

  if (!parsed.ok) {
    const reason = parsed.reason || "unknown";
    const hint = REASON_MESSAGES[reason] || "This description does not match the Jira structure.";
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900/40",
          className,
        )}
      >
        {showHeading ? (
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400", headingClassName)}>
            Jira structure
          </p>
        ) : null}
        <p className="text-sm text-slate-800 dark:text-slate-200">{hint}</p>
        {parsed.detail ? (
          <p className="mt-1 font-mono text-[11px] text-slate-500 break-all line-clamp-3 dark:text-slate-400">
            {String(parsed.detail)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white px-2 py-2 sm:px-3 dark:border-slate-700 dark:bg-slate-950/50",
        className,
      )}
    >
      {showHeading ? (
        <p className={cn("text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1 dark:text-slate-400", headingClassName)}>
          Jira structure (Epic → Story)
        </p>
      ) : null}
      <EpicStoryAccordion themes={parsed.themes} jiraReleaseSync={jiraReleaseSync} />
    </div>
  );
}
