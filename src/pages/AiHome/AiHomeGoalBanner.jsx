import { Button } from "@/components/ui/button";
import { isAssistantGoalActive } from "@/lib/assistantGoal";

const PHASE_LABEL = {
  discover: "Discover",
  plan: "Plan",
  build: "Build",
  validate: "Validate",
  ship: "Ship",
  blocked: "Blocked",
};

const MILESTONE_LABEL = {
  implement: "Start implement",
  qa: "Start QA",
  app_deploy: "App / cloud deploy",
  lock: "Lock release",
};

export { isAssistantGoalActive } from "@/lib/assistantGoal";

export function AiHomeGoalBanner({
  goalState,
  allowAllTools = false,
  onCancel,
  onRevokeAllowAll,
  busy,
}) {
  const mode = goalState?.mode;
  const hasGoal = goalState && (mode === "goal" || mode === "loop") && goalState.status;
  if (!hasGoal && !allowAllTools) return null;

  const active = isAssistantGoalActive(goalState);
  const phase = PHASE_LABEL[goalState?.phase] || goalState?.phase || "—";
  const target = goalState?.deployTarget === "app" ? "App deploy" : "Preview";
  const gate = goalState?.milestoneGate ? MILESTONE_LABEL[goalState.milestoneGate] : null;

  return (
    <div className="space-y-2">
      {allowAllTools ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm">
          <p className="text-xs text-foreground">
            All tools allowed for this chat — writes run without confirmation.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0"
            onClick={onRevokeAllowAll}
            disabled={busy}
          >
            Revoke
          </Button>
        </div>
      ) : null}
      {hasGoal ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {goalState.mode === "loop" ? "Keep shipping" : "Goal"} ·{" "}
                {String(goalState.status).replace("_", " ")}
              </p>
              {goalState.text ? (
                <p className="truncate text-sm font-medium text-foreground">{goalState.text}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {phase} · {target}
                {goalState.nextAction ? ` · ${goalState.nextAction}` : ""}
              </p>
              {gate && !allowAllTools ? (
                <p className="text-xs text-amber-800">Waiting on confirmation: {gate}</p>
              ) : null}
              {goalState.lastError ? (
                <p className="text-xs text-destructive">{goalState.lastError}</p>
              ) : null}
            </div>
            {active || goalState.status === "blocked" ? (
              <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
                Stop
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
