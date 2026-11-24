/** Launchpad Infra Analysis pipeline steps shown in the UI stepper. */
export const INFRA_ANALYSIS_STEPS = [
  {
    id: "launch",
    label: "Workspace",
    description: "Clone development repositories",
  },
  {
    id: "graphify",
    label: "Knowledge graph",
    description: "Map the combined codebase",
  },
  {
    id: "deep_read",
    label: "Deep read",
    description: "Review infrastructure and runtime",
  },
  {
    id: "infra_json",
    label: "Architecture",
    description: "Build diagram and suggestions",
  },
];

/** Full pipeline including persistence — shown as numbered steps in the live panel. */
export const INFRA_ANALYSIS_PIPELINE_STEPS = [
  ...INFRA_ANALYSIS_STEPS,
  {
    id: "applying",
    label: "Saving results",
    description: "Store analysis and diagram",
  },
];

/** Map backend phase to active step index (0-based). Completed runs return step count. */
export function resolveInfraAnalysisActiveStepIndex(currentPhase, status) {
  if (String(status ?? "").toLowerCase() === "completed") {
    return INFRA_ANALYSIS_PIPELINE_STEPS.length;
  }
  const idx = INFRA_ANALYSIS_PIPELINE_STEPS.findIndex(
    (step) => step.id === String(currentPhase ?? ""),
  );
  return idx >= 0 ? idx : 0;
}

/** Resolve visual state for a pipeline step. */
export function resolveInfraAnalysisStepState(
  index,
  activeIndex,
  { failed = false, completed = false } = {},
) {
  if (completed || index < activeIndex) return "done";
  if (failed && index === activeIndex) return "failed";
  if (index === activeIndex) return "active";
  return "pending";
}

/** Whether the run is still in progress. */
export function isInfraAnalysisRunning(run) {
  if (!run) return false;
  return run.status === "queued" || run.status === "running";
}
