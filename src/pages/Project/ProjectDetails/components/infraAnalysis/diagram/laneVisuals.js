/** Lane background styles per infrastructure tier column. */

const LANE_STYLES = {
  entry: {
    containerClass:
      "border-2 border-sky-400/80 bg-sky-50/25 shadow-[inset_4px_0_0_0_rgba(14,165,233,0.55)] dark:border-sky-500/50 dark:bg-sky-950/10",
    ribbonClass: "border-sky-400/50 bg-sky-500/15 text-sky-800 dark:text-sky-200",
    labelClass: "text-sky-700 dark:text-sky-200",
  },
  workloads: {
    containerClass:
      "border-2 border-violet-400/80 bg-violet-50/20 shadow-[inset_4px_0_0_0_rgba(139,92,246,0.5)] dark:border-violet-500/50 dark:bg-violet-950/10",
    ribbonClass: "border-violet-400/50 bg-violet-500/15 text-violet-800 dark:text-violet-200",
    labelClass: "text-violet-700 dark:text-violet-200",
  },
  data: {
    containerClass:
      "border-2 border-amber-400/80 bg-amber-50/20 shadow-[inset_4px_0_0_0_rgba(245,158,11,0.5)] dark:border-amber-500/50 dark:bg-amber-950/10",
    ribbonClass: "border-amber-400/50 bg-amber-500/15 text-amber-900 dark:text-amber-200",
    labelClass: "text-amber-800 dark:text-amber-200",
  },
  async: {
    containerClass:
      "border-orange-300/70 bg-orange-50/55 shadow-[inset_4px_0_0_0_rgba(249,115,22,0.5)] dark:border-orange-500/35 dark:bg-orange-950/20",
    ribbonClass: "border-orange-400/50 bg-orange-500/15 text-orange-900 dark:text-orange-200",
    labelClass: "text-orange-800 dark:text-orange-200",
  },
  operations: {
    containerClass:
      "border-2 border-slate-400/85 bg-slate-50/25 shadow-[inset_4px_0_0_0_rgba(100,116,139,0.45)] dark:border-slate-500/50 dark:bg-slate-900/12",
    ribbonClass: "border-slate-400/50 bg-slate-500/12 text-slate-700 dark:text-slate-200",
    labelClass: "text-slate-600 dark:text-slate-200",
  },
  external: {
    containerClass:
      "border-teal-300/70 bg-teal-50/55 shadow-[inset_4px_0_0_0_rgba(20,184,166,0.5)] dark:border-teal-500/35 dark:bg-teal-950/20",
    ribbonClass: "border-teal-400/50 bg-teal-500/15 text-teal-800 dark:text-teal-200",
    labelClass: "text-teal-800 dark:text-teal-200",
  },
};

const OUTER_STYLE = {
  containerClass:
    "border-slate-200/80 border-dashed bg-slate-50/40 dark:border-slate-500/50 dark:bg-slate-950/15",
  ribbonClass:
    "border-slate-400/60 bg-white/95 text-slate-700 shadow-sm backdrop-blur-sm dark:border-slate-500/50 dark:bg-slate-900/90 dark:text-slate-100",
  labelClass: "text-slate-700 dark:text-slate-100",
};

export const TIER_LABELS = {
  users: "Users & clients",
  ingress: "Ingress & network",
  auth: "Security & auth",
  compute: "Compute & APIs",
  data: "Data stores",
  observability: "Observability",
  cicd: "CI/CD & delivery",
  other: "Other services",
};

export const TIER_TO_LANE = {
  users: "entry",
  ingress: "external",
  auth: "operations",
  compute: "workloads",
  data: "data",
  observability: "operations",
  cicd: "async",
  other: "operations",
};

export function laneVisualForLayerKey(layerKey) {
  if (layerKey.startsWith("lane-")) {
    const laneId = layerKey.slice("lane-".length);
    return LANE_STYLES[laneId] ?? OUTER_STYLE;
  }
  return OUTER_STYLE;
}
