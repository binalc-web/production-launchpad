/** Full release-lock mode labels (matches ReleaseLockBackendAgentCard select items). */
export const BACKEND_LOCK_AGENT_MODE_DESCRIPTIONS = {
  plan: "Plan — backend plan document",
  code_auto: "Code + auto merge — implement and merge to base branch",
  code_pr: "Code + PR — implement and open a pull request",
};

/** Short inline labels for compact lock-dialog summaries. */
export const BACKEND_LOCK_AGENT_MODE_SHORT_LABELS = {
  plan: "Plan",
  code_auto: "Code + auto merge",
  code_pr: "Code + PR",
};

/** Development repo row input mode labels (matches ProjectGitJiraOAuthCard). */
export const DEV_REPO_INPUT_MODE_LABELS = {
  pick: "Link an existing repository",
  manual: "Enter repository path manually",
  auto: "Create new repository",
};

/** @param {string | null | undefined} value */
export function normalizeBackendLockAgentModeForDisplay(value) {
  const normalized = String(value ?? "code_auto")
    .trim()
    .toLowerCase();
  if (normalized === "code" || normalized === "code_auto") return "code_auto";
  if (normalized === "code_pr") return "code_pr";
  return "plan";
}

/** @param {string | null | undefined} mode */
export function formatBackendLockAgentModeDescription(mode) {
  const normalized = normalizeBackendLockAgentModeForDisplay(mode);
  return (
    BACKEND_LOCK_AGENT_MODE_DESCRIPTIONS[normalized] ??
    BACKEND_LOCK_AGENT_MODE_DESCRIPTIONS.code_auto
  );
}

/** @param {string | null | undefined} inputMode */
export function formatDevRepoInputModeLabel(inputMode) {
  const key = String(inputMode ?? "manual")
    .trim()
    .toLowerCase();
  if (key === "pick" || key === "auto") {
    return DEV_REPO_INPUT_MODE_LABELS[key];
  }
  return DEV_REPO_INPUT_MODE_LABELS.manual;
}

/** @param {string | null | undefined} mode */
export function formatBackendLockAgentModeShort(mode) {
  const normalized = normalizeBackendLockAgentModeForDisplay(mode);
  return (
    BACKEND_LOCK_AGENT_MODE_SHORT_LABELS[normalized] ??
    BACKEND_LOCK_AGENT_MODE_SHORT_LABELS.code_auto
  );
}

/**
 * One-line repo summary for compact lock dialogs.
 * @param {{ path?: string, ref?: string }} row
 */
export function formatDevRepoRowCompact(row) {
  const path = String(row?.path ?? "").trim();
  const ref = String(row?.ref ?? "main").trim() || "main";
  if (!path) return "";
  return `${path} @ ${ref}`;
}

/** True when this release was locked without dev-repo sync or backend plan agent. */
export function hasSkipLockAgentOperations(release) {
  return Boolean(release?.skipLockAgentOperations);
}
