import {
  Bot,
  Brain,
  ChevronRight,
  Cloud,
  Code2,
  GitBranch,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_PROVIDERS,
  agentProviderForAgentId,
  agentProviderLabel,
} from "@/constants/agentProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/pages/Project/ProductManagement/components/EmptyState";
import {
  SOURCE_LABELS,
  computeCursorAgentUsageCostUsd,
  formatAgentCreatedAt,
  formatRunTimeMs,
  formatTokens,
  formatUsd,
  getAgentRunLastActivityAt,
  getAgentRunLiveActivityLabel,
  getAgentRunDisplayStatus,
  getCursorModelLabel,
  isAgentRunActive,
  runCliDurationMs,
  runTokenTotal,
  statusBadgeClass,
} from "../agentAnalyticsDisplay";

const SOURCE_ICONS = {
  client_link: MessageSquare,
  scratch: Sparkles,
  backend_lock: GitBranch,
  understand_graph: Code2,
  backend_code_chat: Code2,
  backend_code_preview: Code2,
  cloud_deploy: Cloud,
  qa_automation: ShieldCheck,
  qa_automation_chat: ShieldCheck,
  feedback_ai_fix: Wrench,
  scope_implement: GitBranch,
  scope_implement_item: GitBranch,
  infra_analysis: Cloud,
  infra_analysis_chat: Cloud,
  infra_analysis_chat_preview: Cloud,
  migrate_frontend: GitBranch,
  project_dev_agent: Bot,
  cloud_debug_chat: Cloud,
  job_automation: Wrench,
  project_memory: Brain,
};

function getSourceIcon(source) {
  return SOURCE_ICONS[source] || Bot;
}

function RunsListSkeleton() {
  return (
    <div
      className="divide-y divide-border/60"
      role="status"
      aria-busy="true"
      aria-label="Loading agent runs"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

function AgentRunRow({ run, onOpenDetail, onStop, stoppingAgentId }) {
  const status = getAgentRunDisplayStatus(run);
  const active = isAgentRunActive(run);
  const tokenTotal = runTokenTotal(run.usageTotals);
  const modelId =
    (typeof run?.model === "string" && run.model.trim()) ||
    (typeof run?.modelId === "string" && run.modelId.trim()) ||
    null;
  const modelLabel = getCursorModelLabel(modelId || "Auto");
  const usageCostUsd = computeCursorAgentUsageCostUsd(run.usageTotals, modelId);
  const runTimeLabel = formatRunTimeMs(runCliDurationMs(run));
  const lastActivityAt = formatAgentCreatedAt(getAgentRunLastActivityAt(run), {
    includeSeconds: active,
  });
  const liveActivityLabel = active ? getAgentRunLiveActivityLabel(run) : null;
  const SourceIcon = getSourceIcon(run.source);
  const sourceLabel = SOURCE_LABELS[run.source] || String(run.source || "Agent");
  const title = run.label || sourceLabel;
  const agentId = String(run.cursorAgentId ?? "").trim();
  const isStopping = Boolean(agentId && stoppingAgentId === agentId);

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 border-b border-border/50 px-4 py-3.5 last:border-b-0",
        active && "bg-primary/[0.03]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpenDetail(run.cursorAgentId, run)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 text-left transition-colors",
          "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border",
              active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/30 text-muted-foreground",
            )}
          >
            <SourceIcon className="size-4" aria-hidden />
          </div>
          {active ? (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-primary">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">{title}</p>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
              {sourceLabel}
            </Badge>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
              {modelLabel}
            </Badge>
            {agentProviderForAgentId(agentId) === AGENT_PROVIDERS.OPENCODE ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                {agentProviderLabel(AGENT_PROVIDERS.OPENCODE)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {run.cursorAgentId}
          </p>
          {liveActivityLabel ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{liveActivityLabel}</p>
          ) : null}
        </div>

        <div className="hidden shrink-0 items-center gap-5 lg:flex">
          <Badge
            variant="outline"
            className={cn("shrink-0 justify-center text-xs", statusBadgeClass(status))}
          >
            {status}
          </Badge>
          <div className="w-16 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tokens</p>
            <p className="text-sm font-medium tabular-nums">
              {tokenTotal > 0 ? formatTokens(tokenTotal) : "—"}
            </p>
            {usageCostUsd > 0 ? (
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {formatUsd(usageCostUsd)}
              </p>
            ) : null}
          </div>
          <div className="w-16 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Runtime</p>
            <p className="text-sm tabular-nums text-muted-foreground">{runTimeLabel ?? "—"}</p>
          </div>
          <div className="w-28 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Updated</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {lastActivityAt ? (
                <span title={lastActivityAt.full}>{lastActivityAt.compact}</span>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          aria-hidden
        />
      </button>

      {active && onStop && agentId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isStopping}
          aria-label={`Stop agent ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onStop(run);
          }}
        >
          <Square className="size-3.5 fill-current" aria-hidden />
          <span className="hidden sm:inline">{isStopping ? "Stopping…" : "Stop"}</span>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Agent runs list for the project analytics tab.
 */
export function AgentRunsTable({
  runs,
  onOpenDetail,
  onStop,
  stoppingAgentId = null,
  emptyMessage = "No agent runs yet.",
  filteredEmptyMessage = "No runs match your filters.",
  hasActiveFilters = false,
  connected = false,
  bootstrapStatus = null,
}) {
  const isFilteredEmpty = runs.length === 0 && hasActiveFilters;
  const isConnecting = !connected && runs.length === 0 && !hasActiveFilters;
  const activeInView = runs.filter((run) => isAgentRunActive(run)).length;
  const bootstrapMessage = !connected && bootstrapStatus?.message ? bootstrapStatus.message : null;

  return (
    <Card className="gap-0 overflow-hidden border-border/60 py-0 shadow-sm">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Agent activity</CardTitle>
            <Badge variant="secondary" className="tabular-nums">
              {runs.length}
            </Badge>
          </div>
          {activeInView > 0 ? (
            <p className="text-xs text-muted-foreground">{activeInView} active in view</p>
          ) : bootstrapMessage ? (
            <p className="max-w-md truncate text-xs text-muted-foreground" title={bootstrapMessage}>
              {bootstrapMessage}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sorted by latest activity</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isConnecting ? (
          <RunsListSkeleton />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={isFilteredEmpty ? "No matching agents" : "No agents yet"}
            description={isFilteredEmpty ? filteredEmptyMessage : emptyMessage}
            className="mx-4 my-6 border border-dashed border-border/60 bg-muted/10 shadow-none"
          />
        ) : (
          <div className="divide-y divide-border/60">
            {runs.map((run) => (
              <AgentRunRow
                key={run.cursorAgentId}
                run={run}
                onOpenDetail={onOpenDetail}
                onStop={onStop}
                stoppingAgentId={stoppingAgentId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
