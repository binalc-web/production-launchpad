import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isAssistantFollowActive,
  isAssistantGoalActive,
  truncateAssistantId,
} from "@/lib/assistantGoal";

/**
 * Dedicated in-progress surface for follow (and goal waits when no separate goal banner owns it).
 * Renders outside chat bubbles so Status/Session/Next action are not buried in prose.
 */
export function AiHomeInProgressCard({ goalState, onStop, busy }) {
  const follow = isAssistantFollowActive(goalState);
  const goal = isAssistantGoalActive(goalState);
  // When a delivery goal is active, the goal banner owns the wait — avoid a second card
  // unless we only have follow mode.
  if (!follow) return null;
  if (goal) return null;

  const label = goalState?.label || "In progress";
  const title = goalState?.text || `${label} in progress`;
  const detailId =
    goalState?.detail ||
    goalState?.resume?.runId ||
    goalState?.resume?.agentId ||
    goalState?.resume?.projectId ||
    "";
  const compact = truncateAssistantId(detailId);
  const next = goalState?.nextAction || "Polling…";

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin text-foreground/70" aria-hidden />
            In progress · {label}
          </p>
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {next}
            {compact ? ` · ${compact}` : ""}
          </p>
          {goalState?.lastError ? (
            <p className="text-xs text-destructive">{goalState.lastError}</p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onStop} disabled={busy}>
          Stop
        </Button>
      </div>
    </div>
  );
}
