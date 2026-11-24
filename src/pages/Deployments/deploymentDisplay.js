import { cn } from "@/lib/utils";

export function deploymentStatusBadgeClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "success") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (value === "failed") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  if (value === "draft") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function formatDeploymentType(type) {
  const value = String(type || "").toLowerCase();
  if (value === "github") return "GitHub";
  if (value === "manual") return "Manual";
  return type || "—";
}

export function formatDeployedAt(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function truncateSummary(summary, max = 72) {
  const text = String(summary || "").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
