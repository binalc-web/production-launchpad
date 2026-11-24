import {
  AGENT_PROVIDERS,
  agentProviderLabel,
  normalizeAgentProvider,
} from "@/constants/agentProvider";
import { getCursorModelLabel } from "@/constants/cursorModelCatalog";
import { cn } from "@/lib/utils";

function ModelChip({ children, title, className }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function partTooltip(modelRouter) {
  const lines = [
    `FE plan: ${getCursorModelLabel(modelRouter.frontendPlanModelId)}`,
    `FE build: ${getCursorModelLabel(modelRouter.frontendBuildModelId)}`,
    `BE plan: ${getCursorModelLabel(modelRouter.backendPlanModelId)}`,
    `BE build: ${getCursorModelLabel(modelRouter.backendBuildModelId)}`,
    `Cloud plan: ${getCursorModelLabel(modelRouter.cloudPlanModelId)}`,
    `Cloud build: ${getCursorModelLabel(modelRouter.cloudBuildModelId)}`,
  ];
  return lines.join("\n");
}

/**
 * Read-only effective model-router chips for the project detail header.
 * @param {{ dense?: boolean }} [props] — dense = console top bar (sidebar colors, compact)
 */
export function ProjectDetailsModelBadge({ modelRouter, dense = false }) {
  if (!modelRouter || typeof modelRouter !== "object") return null;

  const mode = typeof modelRouter.mode === "string" ? modelRouter.mode : "fixed";
  const scopeSuffix = modelRouter.scope === "project" ? " (project)" : " (platform)";
  const chipClass = dense
    ? "max-w-[9rem] rounded-md border-sidebar-border/70 bg-sidebar-accent/50 px-1.5 py-0 text-[10px] font-medium leading-5 text-sidebar-foreground/85"
    : undefined;

  if (normalizeAgentProvider(modelRouter.agentProvider) === AGENT_PROVIDERS.OPENCODE) {
    const ocPlan = getCursorModelLabel(modelRouter.opencodePlanModelId);
    const ocBuild = getCursorModelLabel(modelRouter.opencodeBuildModelId);
    const title = `Agent runtime: ${agentProviderLabel(AGENT_PROVIDERS.OPENCODE)}\nPlan: ${ocPlan}\nBuild: ${ocBuild}`;
    return (
      <div className="flex min-w-0 shrink items-center gap-1 overflow-hidden" title={title}>
        <ModelChip className={chipClass} title={title}>
          {agentProviderLabel(AGENT_PROVIDERS.OPENCODE)}
        </ModelChip>
        <ModelChip className={chipClass} title={title}>
          {ocPlan === ocBuild ? ocPlan : `${ocPlan} / ${ocBuild}`}
        </ModelChip>
      </div>
    );
  }

  if (mode === "self_select") {
    return (
      <ModelChip className={chipClass} title={`Model routing: self-select${scopeSuffix}`}>
        Self-select
      </ModelChip>
    );
  }

  if (mode === "fixed_by_part") {
    return (
      <ModelChip className={chipClass} title={`${partTooltip(modelRouter)}${scopeSuffix}`}>
        By part
      </ModelChip>
    );
  }

  const planLabel = getCursorModelLabel(modelRouter.planModelId);
  const buildLabel = getCursorModelLabel(modelRouter.buildModelId);

  if (planLabel === buildLabel) {
    return (
      <ModelChip className={chipClass} title={`Plan & build${scopeSuffix}`}>
        {planLabel}
      </ModelChip>
    );
  }

  if (dense) {
    return (
      <div
        className="flex min-w-0 shrink items-center gap-1 overflow-hidden"
        title={`Plan: ${planLabel}\nBuild: ${buildLabel}${scopeSuffix}`}
      >
        <ModelChip className={chipClass} title={`Plan model${scopeSuffix}`}>
          <span className="text-sidebar-foreground/55">Plan</span> {planLabel}
        </ModelChip>
        <ModelChip className={chipClass} title={`Build model${scopeSuffix}`}>
          <span className="text-sidebar-foreground/55">Build</span> {buildLabel}
        </ModelChip>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <ModelChip title={`Plan model${scopeSuffix}`}>Plan: {planLabel}</ModelChip>
      <ModelChip title={`Build model${scopeSuffix}`}>Build: {buildLabel}</ModelChip>
    </div>
  );
}
