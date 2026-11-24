import React from "react";
import { EpicStoryAccordion } from "./EpicStoryAccordion";

/**
 * Release create/edit: structured theme tree. Pass-through to `EpicStoryAccordion` in edit mode; when
 * `disabled`, renders the same tree read-only (same component as Jira structure preview).
 *
 * @param {object} props
 * @param {Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>} props.themes
 * @param {(themes: Array<unknown>) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {object} [props.jiraReleaseSync]
 * @param {boolean} [props.showReleaseScopeToggles]
 * @param {Set<string>} [props.excludedPaths]
 * @param {(updater: (prev: Set<string>) => Set<string>) => void} [props.onExcludedPathsChange]
 * @param {string|number} [props.projectId] — enables AI-assist chat in edit mode
 */
export function EpicStoryEditor({
  disabled = false,
  className,
  themes,
  onChange,
  jiraReleaseSync,
  showReleaseScopeToggles,
  excludedPaths,
  onExcludedPathsChange,
  projectId,
}) {
  if (disabled) {
    return (
      <div className={className}>
        <EpicStoryAccordion
          mode="read"
          themes={themes}
          jiraReleaseSync={jiraReleaseSync}
          className="space-y-4"
        />
      </div>
    );
  }

  return (
    <EpicStoryAccordion
      mode="edit"
      themes={themes}
      onChange={onChange}
      jiraReleaseSync={jiraReleaseSync}
      showReleaseScopeToggles={showReleaseScopeToggles}
      excludedPaths={excludedPaths}
      onExcludedPathsChange={onExcludedPathsChange}
      className={className}
      projectId={projectId}
    />
  );
}
