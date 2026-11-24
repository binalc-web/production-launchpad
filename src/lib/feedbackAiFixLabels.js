const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export const AI_FIX_PHASE_LABELS = {
  QUEUED: "Queued",
  WAITING_TO_START: "Waiting to Start",
  PREPARING_CONTEXT: "Preparing Context",
  CLONING_REPOSITORY: "Cloning Repository",
  CREATING_AGENT: "Creating Agent",
  ANALYZING_ISSUE: "Analyzing Issue",
  GENERATING_FIX: "Generating Fix",
  APPLYING_CHANGES: "Applying Changes",
  RUNNING_VALIDATION: "Running Validation",
  CREATING_PULL_REQUEST: "Creating Pull Request",
  MERGING_TO_MAIN: "Merging to target branch",
  DEPLOYING: "Deploying",
  AWAITING_QUESTIONS: "Awaiting Clarifying Answers",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/** Agent work shared by all Fix with AI variations. */
export const AI_FIX_AGENT_CORE_PHASES = [
  "QUEUED",
  "WAITING_TO_START",
  "PREPARING_CONTEXT",
  "CLONING_REPOSITORY",
  "CREATING_AGENT",
  "GENERATING_FIX",
  "APPLYING_CHANGES",
  "RUNNING_VALIDATION",
];

/** Master order for mapping live statuses onto a variation-specific timeline. */
export const AI_FIX_MASTER_PHASE_ORDER = [
  "QUEUED",
  "WAITING_TO_START",
  "PREPARING_CONTEXT",
  "CLONING_REPOSITORY",
  "CREATING_AGENT",
  "ANALYZING_ISSUE",
  "GENERATING_FIX",
  "APPLYING_CHANGES",
  "RUNNING_VALIDATION",
  "CREATING_PULL_REQUEST",
  "MERGING_TO_MAIN",
  "DEPLOYING",
];

/** @deprecated Use getAiFixPhaseOrder for variation-specific timelines. */
export const AI_FIX_PHASE_ORDER = [
  ...AI_FIX_AGENT_CORE_PHASES,
  "ANALYZING_ISSUE",
  "CREATING_PULL_REQUEST",
  "COMPLETED",
];

/** Feedback sources whose AI fix runs on the development repository. */
export const DEV_REPO_FEEDBACK_SOURCES = Object.freeze([
  "CODE_SNIPPET",
  "QA_REPORT",
  "SENTRY",
  "VISUAL_TEST",
]);

/**
 * @param {unknown} feedbackSource
 * @returns {boolean}
 */
export function isDevRepoFeedbackSource(feedbackSource) {
  return DEV_REPO_FEEDBACK_SOURCES.includes(String(feedbackSource || "").toUpperCase());
}

/**
 * Workflow steps shown for a given merge action and feedback source.
 * @param {{ mergeAction?: string, feedbackSource?: string, isBulkBatch?: boolean }} [opts]
 * @returns {string[]}
 */
export function getAiFixPhaseOrder({
  mergeAction = "fix_and_merge",
  feedbackSource = "",
  isBulkBatch = false,
} = {}) {
  const phases = [...AI_FIX_AGENT_CORE_PHASES];
  const source = String(feedbackSource || "").toUpperCase();
  const action = String(mergeAction || "fix_and_merge");

  // fix_only opens a pull request (no merge). Client-link previews stay unmerged.
  if (action === "fix_only") {
    if (source !== "CLIENT_LINK") {
      phases.push("CREATING_PULL_REQUEST");
    }
    return phases;
  }

  if (source === "CLIENT_LINK") {
    phases.push("MERGING_TO_MAIN");
  } else if (isBulkBatch) {
    phases.push("CREATING_PULL_REQUEST");
  } else {
    phases.push("MERGING_TO_MAIN");
  }

  if (action === "fix_merge_deploy") {
    phases.push("DEPLOYING");
  }

  return phases;
}

/**
 * @param {object|null|undefined} item
 * @returns {string}
 */
export function resolveAiFixMergeAction(item) {
  const fromMeta = item?.metadata?.aiFixOptions?.mergeAction;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  const fromResult = item?.aiFixResult?.mergeAction;
  if (typeof fromResult === "string" && fromResult.trim()) {
    return fromResult.trim();
  }
  return "fix_and_merge";
}

/**
 * Map a live status onto the visible phase list (handles agent-only phases during fix_only).
 * @param {string|null|undefined} status
 * @param {string[]} visiblePhases
 * @returns {number}
 */
export function resolveTimelinePhaseIndex(status, visiblePhases) {
  if (!status || !visiblePhases.length) return -1;
  const normalized = String(status);
  const direct = visiblePhases.indexOf(normalized);
  if (direct >= 0) return direct;

  const masterIdx = AI_FIX_MASTER_PHASE_ORDER.indexOf(normalized);
  if (masterIdx < 0) return -1;

  let best = -1;
  for (let i = 0; i < visiblePhases.length; i += 1) {
    const phaseMasterIdx = AI_FIX_MASTER_PHASE_ORDER.indexOf(visiblePhases[i]);
    if (phaseMasterIdx >= 0 && phaseMasterIdx <= masterIdx) {
      best = i;
    }
  }
  return best;
}

export function isAiFixRunning(status) {
  return Boolean(status && !TERMINAL.has(String(status)));
}

export function isAiFixCompleted(status) {
  return String(status || "") === "COMPLETED";
}

export function isAiFixFailed(status) {
  const s = String(status || "");
  return s === "FAILED" || s === "CANCELLED";
}

/** @param {string|null|undefined} aiFixError @param {string|null|undefined} status */
export function formatFeedbackAiFixFailureMessage(aiFixError, status) {
  const err = String(aiFixError || "").trim();
  if (err) return err;
  const s = String(status || "");
  if (s === "FAILED") {
    return "Fix with AI failed. No detailed error was saved — retry or check backend logs.";
  }
  if (s === "CANCELLED") {
    return "Fix with AI was cancelled.";
  }
  return "";
}

/**
 * @param {object|null|undefined} item
 * @param {Array<{ id?: string, deployment?: { deployedAt?: string|null } }>|null|undefined} deployEnvironments
 */
export function isFeedbackAiFixDeployed(item, deployEnvironments) {
  if (!isAiFixCompleted(item?.aiFixStatus)) return false;

  const result =
    item?.aiFixResult && typeof item.aiFixResult === "object" ? item.aiFixResult : null;
  const envs = Array.isArray(deployEnvironments) ? deployEnvironments : [];
  const production = envs.find(
    (e) =>
      String(e?.id || "")
        .trim()
        .toLowerCase() === "production",
  );
  const deployedAtRaw = production?.deployment?.deployedAt;
  const completedAtRaw = result?.completedAt || item?.aiFixUpdatedAt;
  if (!deployedAtRaw || !completedAtRaw) return false;

  const deployedAt = new Date(deployedAtRaw);
  const completedAt = new Date(completedAtRaw);
  if (Number.isNaN(deployedAt.getTime()) || Number.isNaN(completedAt.getTime())) {
    return false;
  }
  return deployedAt.getTime() >= completedAt.getTime();
}

/** @param {string|Date|null|undefined} value */
export function formatAiFixCompletedAt(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}/${month}/${year} · ${time}`;
}

export function getAiFixPhaseLabel(status) {
  if (!status) return "";
  return AI_FIX_PHASE_LABELS[status] || String(status).replace(/_/g, " ");
}

/** @param {object|null|undefined} result */
export function formatAiFixShortCommit(result) {
  const hash =
    (typeof result?.commitHash === "string" && result.commitHash) ||
    (typeof result?.branchHeadSha === "string" && result.branchHeadSha) ||
    "";
  if (!hash) return null;
  return hash.length > 8 ? hash.slice(0, 8) : hash;
}

/** @param {object|null|undefined} result */
export function formatAiFixBranchLabel(result) {
  if (!result || typeof result !== "object") return null;
  const branch =
    (typeof result.branchName === "string" && result.branchName.trim()) ||
    (typeof result.sourceBranch === "string" && result.sourceBranch.trim()) ||
    null;
  if (branch) return branch;
  if (result.targetBranch && result.mergeMode === "launchpad_main") {
    return `main (${formatAiFixShortCommit(result) || "merged"})`;
  }
  if (result.sourceBranch && result.targetBranch) {
    return `${result.sourceBranch} → ${result.targetBranch}`;
  }
  return result.targetBranch || result.sourceBranch || null;
}

/**
 * Browse URL for an agent branch on GitHub or Bitbucket.
 * @param {{ repositoryUrl?: string|null, branchName?: string|null, sourceBranch?: string|null }|null|undefined} result
 * @returns {string|null}
 */
export function formatAiFixBranchBrowseUrl(result) {
  const repoUrl = String(result?.repositoryUrl || "")
    .trim()
    .replace(/\/$/, "");
  const branch =
    (typeof result?.branchName === "string" && result.branchName.trim()) ||
    (typeof result?.sourceBranch === "string" && result.sourceBranch.trim()) ||
    "";
  if (!repoUrl || !branch) return null;
  if (repoUrl.includes("bitbucket.org")) {
    return `${repoUrl}/branch/${encodeURIComponent(branch)}`;
  }
  return `${repoUrl}/tree/${encodeURIComponent(branch)}`;
}

/**
 * Browse URL for a merge/fix commit on GitHub or Bitbucket.
 * @param {{ repositoryUrl?: string|null, commitHash?: string|null, branchHeadSha?: string|null }|null|undefined} result
 * @returns {string|null}
 */
export function formatAiFixCommitBrowseUrl(result) {
  const repoUrl = String(result?.repositoryUrl || "")
    .trim()
    .replace(/\/$/, "");
  const sha =
    (typeof result?.commitHash === "string" && result.commitHash.trim()) ||
    (typeof result?.branchHeadSha === "string" && result.branchHeadSha.trim()) ||
    "";
  if (!repoUrl || !sha) return null;
  return `${repoUrl}/commit/${encodeURIComponent(sha)}`;
}
