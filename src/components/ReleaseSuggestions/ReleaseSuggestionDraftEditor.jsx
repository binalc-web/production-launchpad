import React from "react";
import { EpicStoryAccordion } from "./EpicStoryAccordion";
import { suggestionApiRowToTheme } from "@/lib/releaseDescriptionThemes";

/**
 * @typedef {ReturnType<typeof suggestionApiRowToTheme>} SuggestionThemeDraft
 */

/**
 * API suggestion row → one theme (same shape as the release description / Jira sync).
 * @param {object} s
 * @returns {SuggestionThemeDraft}
 */
export function suggestionToDraft(s) {
  return suggestionApiRowToTheme(s);
}

export { suggestionApiRowToTheme };

/**
 * Editable Epic + Stories for one release suggestion (before apply). Same structure and
 * editor as the release description (`EpicStoryAccordion` in edit mode, single epic).
 *
 * @param {object} props
 * @param {SuggestionThemeDraft} props.draft
 * @param {(next: SuggestionThemeDraft) => void} props.onDraftChange
 * @param {string|number} [props.projectId] — enables AI-assist chat per epic / story
 * @param {boolean} [props.showStoryInclusionToggles]
 * @param {Set<number>} [props.includedStoryIndexes]
 * @param {(updater: (prev: Set<number>) => Set<number>) => void} [props.onIncludedStoryIndexesChange]
 */
export function ReleaseSuggestionDraftEditor({
  draft,
  onDraftChange,
  projectId,
  showStoryInclusionToggles = false,
  includedStoryIndexes,
  onIncludedStoryIndexesChange,
}) {
  return (
    <EpicStoryAccordion
      mode="edit"
      themes={[draft]}
      onChange={(themes) => onDraftChange(themes[0])}
      singleEpicOnly
      projectId={projectId}
      showStoryInclusionToggles={showStoryInclusionToggles}
      includedStoryIndexes={includedStoryIndexes}
      onIncludedStoryIndexesChange={onIncludedStoryIndexesChange}
    />
  );
}
