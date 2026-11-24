/** Shared with ReleaseScopePanel confirm / start implement. */
export const SCOPE_IMPLEMENT_EXECUTION = {
  SEQUENTIAL: "sequential",
  BATCH: "batch",
};

export const SCOPE_IMPLEMENT_BATCH_MODE = {
  SINGLE_AGENT_SHARED_PR: "single_agent_shared_pr",
  PARALLEL_AGENTS_SEPARATE_PRS: "parallel_agents_separate_prs",
  SEQUENTIAL_AGENTS_SHARED_PR: "sequential_agents_shared_pr",
};

export const SCOPE_IMPLEMENT_RUN_MODE = {
  ONE_AT_A_TIME: "one_at_a_time",
  ALL_SEQUENTIAL: "all_sequential",
  ALL_PARALLEL: "all_parallel",
  ALL_COMBINED: "all_combined",
};

const DEVELOPMENT_TARGET = "development";

function isDevelopmentImplementTarget(target) {
  return target === DEVELOPMENT_TARGET;
}

/** Map UI run mode → API execution / batchMode (Application). */
export function runModeToApiPayload(runMode) {
  if (runMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_PARALLEL) {
    return {
      execution: SCOPE_IMPLEMENT_EXECUTION.BATCH,
      batchMode: SCOPE_IMPLEMENT_BATCH_MODE.PARALLEL_AGENTS_SEPARATE_PRS,
    };
  }
  if (runMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_SEQUENTIAL) {
    return {
      execution: SCOPE_IMPLEMENT_EXECUTION.BATCH,
      batchMode: SCOPE_IMPLEMENT_BATCH_MODE.SEQUENTIAL_AGENTS_SHARED_PR,
    };
  }
  if (runMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_COMBINED) {
    return {
      execution: SCOPE_IMPLEMENT_EXECUTION.BATCH,
      batchMode: SCOPE_IMPLEMENT_BATCH_MODE.SINGLE_AGENT_SHARED_PR,
    };
  }
  return { execution: SCOPE_IMPLEMENT_EXECUTION.SEQUENTIAL };
}

/**
 * Preview always starts sequential (force-merge to main). Application uses the chosen run mode.
 * @param {string|undefined|null} target
 * @param {string} implementRunMode
 */
export function scopeImplementStartApiPayload(target, implementRunMode) {
  if (!isDevelopmentImplementTarget(target)) {
    return { execution: SCOPE_IMPLEMENT_EXECUTION.SEQUENTIAL };
  }
  return runModeToApiPayload(implementRunMode);
}

/**
 * @param {string|undefined|null} target
 * @param {string} implementRunMode
 */
export function scopeImplementStartToastMessage(target, implementRunMode) {
  if (!isDevelopmentImplementTarget(target)) {
    return "Implement queue started — one agent for all stories (follow-ups after the first), force-merge to preview main";
  }
  if (implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ONE_AT_A_TIME) {
    return "Implement queue started — one agent per story, separate PRs";
  }
  if (implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_SEQUENTIAL) {
    return "Implement started — one agent, follow-ups per story, one shared PR";
  }
  if (implementRunMode === SCOPE_IMPLEMENT_RUN_MODE.ALL_PARALLEL) {
    return "Parallel implement started — one agent per story";
  }
  return "Implement agent started — combined prompt for all items";
}

/**
 * Active-run status line. Preview never mentions PRs.
 * @param {{
 *   target?: string|null,
 *   isSequentialSharedPrRun: boolean,
 *   isSequentialSeparatePrRun: boolean,
 *   isParallelBatchRun: boolean,
 *   isCombinedBatchRun: boolean,
 * }} args
 */
export function scopeImplementActiveRunStatusMessage({
  target,
  isSequentialSharedPrRun,
  isSequentialSeparatePrRun,
  isParallelBatchRun,
  isCombinedBatchRun,
}) {
  if (!isDevelopmentImplementTarget(target)) {
    if (isParallelBatchRun) {
      return "Multiple Cursor agents are running in parallel — each force-merges to preview main.";
    }
    if (isCombinedBatchRun) {
      return "A single Cursor agent is implementing all selected items in one combined prompt (force-merge to preview main).";
    }
    return "Agents run one at a time on the same agent (follow-ups after the first) — each story force-merges to preview main.";
  }
  if (isSequentialSharedPrRun) {
    return "Agents run one at a time in queue order — one shared pull request with a separate commit per story.";
  }
  if (isSequentialSeparatePrRun) {
    return "Agents run one at a time in queue order — each story gets its own pull request.";
  }
  if (isParallelBatchRun) {
    return "Multiple Cursor agents are running in parallel — one scope item per agent with separate pull requests.";
  }
  if (isCombinedBatchRun) {
    return "A single Cursor agent is implementing all selected items in one combined prompt (single PR).";
  }
  return "Implementation is in progress.";
}
