/** Architecture diagram (Understand-Anything) pipeline steps. */
export const ARCHITECTURE_DIAGRAM_PIPELINE_STEPS = [
  {
    id: "launch",
    label: "Workspace",
    description: "Prepare workspace on development repositories",
  },
  {
    id: "scan",
    label: "Repository scan",
    description: "Discover files across development repositories",
  },
  { id: "analyze", label: "File analysis", description: "Build knowledge graph batches" },
  { id: "merge", label: "Merge graph", description: "Combine analysis into graph JSON" },
  {
    id: "commit",
    label: "Commit artifacts",
    description: "Check in .understand-anything to development repositories",
  },
  { id: "sync", label: "Sync diagram", description: "Load graph into platform" },
];

export function resolveArchitectureDiagramActiveStepIndex(currentPhase, status) {
  const st = String(status ?? "").toLowerCase();
  if (st === "ready") return ARCHITECTURE_DIAGRAM_PIPELINE_STEPS.length;
  if (st === "failed") {
    const idx = ARCHITECTURE_DIAGRAM_PIPELINE_STEPS.findIndex(
      (step) => step.id === String(currentPhase ?? ""),
    );
    return idx >= 0 ? idx : 0;
  }
  const idx = ARCHITECTURE_DIAGRAM_PIPELINE_STEPS.findIndex(
    (step) => step.id === String(currentPhase ?? ""),
  );
  return idx >= 0 ? idx : 0;
}

export function resolveArchitectureDiagramStepState(
  index,
  activeIndex,
  { failed = false, completed = false } = {},
) {
  if (completed || index < activeIndex) return "done";
  if (failed && index === activeIndex) return "failed";
  if (index === activeIndex) return "active";
  return "pending";
}

export function isArchitectureDiagramRunning(statusLike) {
  if (!statusLike) return false;
  const st = typeof statusLike === "object" ? statusLike.status : statusLike;
  return String(st ?? "").toLowerCase() === "generating";
}

export function mapArchitectureStatusForLivePanel(status) {
  switch (String(status ?? "").toLowerCase()) {
    case "ready":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "generating":
      return "RUNNING";
    default:
      return status ?? null;
  }
}
