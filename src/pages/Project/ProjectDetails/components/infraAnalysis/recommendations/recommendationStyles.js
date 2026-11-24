import { Activity, Clock, DollarSign, KeyRound, Scale, Shield } from "lucide-react";

/** Severity pill Tailwind classes (InfraPilot reference). */
export const SEVERITY_PILL_CLASS = {
  critical: "bg-red-500/15 text-red-900 dark:text-red-200",
  high: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  medium: "bg-blue-500/10 text-blue-900 dark:text-blue-200",
  low: "bg-muted text-muted-foreground",
};

/** Outline badge classes for full-mode cards. */
export const SEVERITY_BADGE_CLASS = {
  critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  medium:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  low: "border-border bg-muted text-muted-foreground",
};

export const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Lucide icon per suggestion category. */
export const CATEGORY_ICONS = {
  security: Shield,
  reliability: Scale,
  scalability: Activity,
  observability: Clock,
  cost: DollarSign,
  monitoring: Clock,
  default: KeyRound,
};

export function normalizeSeverity(severity) {
  const key = String(severity ?? "medium").toLowerCase();
  return SEVERITY_PILL_CLASS[key] ? key : "medium";
}

export function categoryIcon(category) {
  const key = String(category ?? "").toLowerCase();
  return CATEGORY_ICONS[key] ?? CATEGORY_ICONS.default;
}

export function compareBySeverity(a, b) {
  const sa = SEVERITY_ORDER[normalizeSeverity(a?.severity)] ?? 99;
  const sb = SEVERITY_ORDER[normalizeSeverity(b?.severity)] ?? 99;
  if (sa !== sb) return sa - sb;
  return String(a?.title ?? "").localeCompare(String(b?.title ?? ""));
}
