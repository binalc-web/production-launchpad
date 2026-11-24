import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDurationMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n < 1000) return `${Math.round(n)}ms`;
  const sec = Math.round(n / 100) / 10;
  return `${sec}s`;
}

/** Small badge when the CLI emits a terminal result event. */
export function AgentResultBadge({ status, durationMs, className }) {
  const success = status !== "error";
  const durationLabel = formatDurationMs(durationMs);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        success
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {success ? (
        <CheckCircle2 className="size-3 shrink-0" aria-hidden />
      ) : (
        <XCircle className="size-3 shrink-0" aria-hidden />
      )}
      <span>{success ? "Run complete" : "Run failed"}</span>
      {durationLabel ? (
        <span className="text-muted-foreground">· {durationLabel}</span>
      ) : null}
    </div>
  );
}
