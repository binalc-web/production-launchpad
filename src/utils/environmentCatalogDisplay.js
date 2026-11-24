const LAYER_LABELS = {
  frontend: "Frontend",
  backend: "Backend",
  shared: "Shared",
  infrastructure: "Infrastructure",
  unknown: "Unknown",
};

const LAYER_BADGE_CLASS = {
  frontend:
    "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  backend:
    "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300",
  shared:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  infrastructure:
    "border-border bg-muted/50 text-muted-foreground",
  unknown: "text-muted-foreground",
};

/**
 * @param {string | null | undefined} layer
 */
export function getEnvVariableLayerLabel(layer) {
  return LAYER_LABELS[layer] ?? LAYER_LABELS.unknown;
}

/**
 * @param {string | null | undefined} layer
 */
export function getEnvVariableLayerBadgeClass(layer) {
  return LAYER_BADGE_CLASS[layer] ?? LAYER_BADGE_CLASS.unknown;
}

/**
 * @param {Array<{ repoLabel?: string, directory?: string, details?: string | null }> | null | undefined} sourceDetails
 */
export function formatVariableRepoSummary(sourceDetails) {
  if (!sourceDetails?.length) return "—";
  return sourceDetails
    .map((row) => row.repoLabel || row.directory || "Unknown repo")
    .join(", ");
}
