import { useCallback, useMemo, useState } from "react";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { stopProjectAgentAnalyticsRun } from "@/api";
import { Badge } from "@/components/ui/badge";
import { StopAgentConfirmDialog } from "@/components/agent/StopAgentConfirmDialog";
import { useProjectAgentAnalyticsContext } from "../context/ProjectAgentAnalyticsContext";
import { AgentAnalyticsKpiStrip } from "@/pages/AgentAnalytics/components/AgentAnalyticsKpiStrip";
import { AgentRunDetailSheet } from "@/pages/AgentAnalytics/components/AgentRunDetailSheet";
import { AgentRunsTable } from "@/pages/AgentAnalytics/components/AgentRunsTable";
import { AgentAnalyticsToolbar } from "@/pages/AgentAnalytics/components/AgentAnalyticsToolbar";
import {
  AGENT_ANALYTICS_HORIZONS,
  DEFAULT_AGENT_ANALYTICS_HORIZON,
  buildPeriodTokenTrends,
  filterAgentRuns,
  getAgentAnalyticsPeriodBounds,
  getAgentRunDisplayStatus,
  isAgentRunActive,
  isRunInFinishedPeriod,
  rollupPeriodTokenTotals,
  sortAgentRuns,
  SOURCE_LABELS,
} from "@/pages/AgentAnalytics/agentAnalyticsDisplay";
import { ProjectBudgetAdminCard } from "./ProjectBudgetAdminCard";
import { ProjectModelRouterCard } from "./ProjectModelRouterCard";
import { ProjectClientLinkVoiceCard } from "./ProjectClientLinkVoiceCard";
import { ProjectMemoryKnowledgeCard } from "./ProjectMemoryKnowledgeCard";
import { ProjectStuckGitOpsAdminCard } from "./ProjectStuckGitOpsAdminCard";
import { buildUiPreferenceScope } from "@/lib/uiPreferences";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";

const AGENT_ANALYTICS_UI_SCHEMA = {
  horizon: {
    defaultValue: DEFAULT_AGENT_ANALYTICS_HORIZON,
    allowed: Object.keys(AGENT_ANALYTICS_HORIZONS),
  },
  statusFilter: {
    defaultValue: "__all",
    allowed: ["__all", "active", "finished", "completed", "failed"],
  },
  sourceFilter: {
    defaultValue: "__all",
    allowed: ["__all", ...Object.keys(SOURCE_LABELS)],
  },
  search: { defaultValue: "", type: "string" },
};

/**
 * Admin-only live dashboard for all Cursor agents linked to a project.
 */
export function AgentAnalyticsTabContent({ project, onProjectUpdated }) {
  const analytics = useProjectAgentAnalyticsContext();
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [stopTargetRun, setStopTargetRun] = useState(null);
  const [stopClearFollowups, setStopClearFollowups] = useState(false);
  const [stoppingAgentId, setStoppingAgentId] = useState(null);
  const analyticsScope = useMemo(
    () => buildUiPreferenceScope({ projectId: project?.id }),
    [project?.id],
  );
  const [prefs, setPref] = usePageUiPreferences(analyticsScope, AGENT_ANALYTICS_UI_SCHEMA, {
    debouncedKeys: ["search"],
  });
  const horizon = prefs.horizon;
  const statusFilter = prefs.statusFilter;
  const sourceFilter = prefs.sourceFilter;
  const search = prefs.search;
  const setHorizon = useCallback((value) => setPref("horizon", value), [setPref]);
  const setStatusFilter = useCallback((value) => setPref("statusFilter", value), [setPref]);
  const setSourceFilter = useCallback((value) => setPref("sourceFilter", value), [setPref]);
  const setSearch = useCallback((value) => setPref("search", value), [setPref]);

  const hasActiveFilters =
    horizon !== DEFAULT_AGENT_ANALYTICS_HORIZON ||
    statusFilter !== "__all" ||
    sourceFilter !== "__all" ||
    search.trim().length > 0;

  const allRuns = useMemo(
    () => (Array.isArray(analytics?.runs) ? analytics.runs : []),
    [analytics?.runs],
  );

  const overviewStats = useMemo(() => {
    const { currentStart, currentEnd } = getAgentAnalyticsPeriodBounds(horizon);
    let totalAgents = 0;
    let failedCount = 0;

    for (const run of allRuns) {
      const active = isAgentRunActive(run);
      if (!active && !isRunInFinishedPeriod(run, currentStart, currentEnd)) continue;
      totalAgents += 1;
      if (!active) {
        const status = getAgentRunDisplayStatus(run);
        if (status.includes("FAIL") || status === "STOPPED") failedCount += 1;
      }
    }

    return { totalAgents, failedCount };
  }, [allRuns, horizon]);

  const { currentPeriod, trends, priorLabel } = useMemo(() => {
    const bounds = getAgentAnalyticsPeriodBounds(horizon);
    const current = rollupPeriodTokenTotals(allRuns, bounds.currentStart, bounds.currentEnd);
    const previous = rollupPeriodTokenTotals(allRuns, bounds.previousStart, bounds.previousEnd);
    return {
      currentPeriod: current,
      trends: buildPeriodTokenTrends(current, previous),
      priorLabel:
        AGENT_ANALYTICS_HORIZONS[horizon]?.priorLabel ??
        AGENT_ANALYTICS_HORIZONS[DEFAULT_AGENT_ANALYTICS_HORIZON].priorLabel,
    };
  }, [allRuns, horizon]);

  const runs = useMemo(() => {
    const filtered = filterAgentRuns(allRuns, {
      horizon,
      statusFilter,
      sourceFilter,
      search,
    });
    return sortAgentRuns(filtered);
  }, [allRuns, horizon, statusFilter, sourceFilter, search]);

  const recentAgents = useMemo(() => sortAgentRuns(allRuns).slice(0, 4), [allRuns]);

  const openDetail = useCallback((agentId, run) => {
    setSelectedAgentId(String(agentId ?? "").trim() || null);
    setSelectedRun(run ?? null);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedAgentId(null);
    setSelectedRun(null);
  }, []);

  const requestStopAgent = useCallback((run, opts = {}) => {
    const id = String(run?.cursorAgentId ?? "").trim();
    if (!id) return;
    const queued = Number(run?.followupQueueDepth) > 0;
    const clearFollowups = opts.clearFollowups === true;
    if (clearFollowups) {
      if (!isAgentRunActive(run) && !queued) return;
    } else if (!isAgentRunActive(run)) {
      return;
    }
    setStopClearFollowups(clearFollowups);
    setStopTargetRun(run);
    setStopConfirmOpen(true);
  }, []);

  const handleConfirmStopAgent = useCallback(async () => {
    const agentId = String(stopTargetRun?.cursorAgentId ?? "").trim();
    const projectId = project?.id ?? stopTargetRun?.projectId ?? null;
    if (!agentId || projectId == null) {
      setStopConfirmOpen(false);
      setStopTargetRun(null);
      return;
    }
    setStoppingAgentId(agentId);
    try {
      const result = await stopProjectAgentAnalyticsRun(projectId, agentId, {
        clearFollowups: stopClearFollowups,
      });
      if (result?.ok === false) {
        throw new Error(result?.error || "Could not stop the agent.");
      }
      toast.success(
        stopClearFollowups
          ? "Agent stopped. Queued follow-ups were cancelled. Workspace changes were kept."
          : "Agent stopped. Queued follow-ups were kept. Workspace changes were kept.",
      );
      setStopConfirmOpen(false);
      setStopTargetRun(null);
    } catch (error) {
      const msg = error?.error || error?.message || "Could not stop the agent.";
      toast.error(typeof msg === "string" ? msg : "Could not stop the agent.");
    } finally {
      setStoppingAgentId(null);
    }
  }, [project?.id, stopClearFollowups, stopTargetRun]);

  /** Prefer live SSE row so drawer status/timeline track run_update. */
  const liveSelectedRun = useMemo(() => {
    const id = String(selectedAgentId ?? "").trim();
    if (!id) return null;
    return allRuns.find((run) => run.cursorAgentId === id) ?? selectedRun;
  }, [allRuns, selectedAgentId, selectedRun]);

  return (
    <div className="space-y-5">
      <ProjectBudgetAdminCard project={project} onBudgetUpdated={onProjectUpdated} />
      <ProjectModelRouterCard project={project} />
      <ProjectClientLinkVoiceCard project={project} />
      <ProjectMemoryKnowledgeCard project={project} />
      <ProjectStuckGitOpsAdminCard project={project} />

      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Bot className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">AI Agents</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Monitor live agent runs, usage, and health across this project.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge variant="outline" className="tabular-nums">
            {overviewStats.totalAgents} total
          </Badge>
          <Badge
            variant="outline"
            className={
              (analytics?.activeCount ?? 0) > 0
                ? "border-primary/30 bg-primary/10 text-primary tabular-nums"
                : "tabular-nums"
            }
          >
            {analytics?.activeCount ?? 0} active
          </Badge>
        </div>
      </div>

      <AgentAnalyticsKpiStrip
        activeCount={analytics?.activeCount ?? 0}
        totalAgents={overviewStats.totalAgents}
        failedCount={overviewStats.failedCount}
        connected={analytics?.connected ?? false}
        bootstrapStatus={analytics?.bootstrapStatus ?? null}
        streamError={analytics?.streamError ?? null}
        currentPeriod={currentPeriod}
        trends={trends}
        priorLabel={priorLabel}
        showTrends
      />

      {recentAgents.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          <span className="text-xs font-medium text-muted-foreground">Recently updated</span>
          {recentAgents.map((run) => {
            const label = run.label || SOURCE_LABELS[run.source] || String(run.source || "Agent");
            const active = isAgentRunActive(run);
            return (
              <button
                key={run.cursorAgentId}
                type="button"
                onClick={() => openDetail(run.cursorAgentId, run)}
                className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                {active ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                ) : null}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <AgentAnalyticsToolbar
        horizon={horizon}
        onHorizonChange={setHorizon}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        search={search}
        onSearchChange={setSearch}
        resultCount={runs.length}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] xl:items-start">
        <AgentRunsTable
          runs={runs}
          onOpenDetail={openDetail}
          onStop={requestStopAgent}
          stoppingAgentId={stoppingAgentId}
          hasActiveFilters={hasActiveFilters}
          connected={analytics?.connected ?? false}
          bootstrapStatus={analytics?.bootstrapStatus ?? null}
          emptyMessage="No agent runs yet. Start an agent from Client Link, Backend, QA, or Infra to see it here."
          filteredEmptyMessage="No runs match your filters. Try clearing search or filters."
        />

        {recentAgents.length > 0 ? (
          <aside className="hidden space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 xl:block xl:sticky xl:top-4 xl:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent agents
            </p>
            <ul className="space-y-2">
              {recentAgents.map((run) => {
                const label =
                  run.label || SOURCE_LABELS[run.source] || String(run.source || "Agent");
                const active = isAgentRunActive(run);
                const status = getAgentRunDisplayStatus(run);
                return (
                  <li key={run.cursorAgentId}>
                    <button
                      type="button"
                      onClick={() => openDetail(run.cursorAgentId, run)}
                      className="flex w-full flex-col gap-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40"
                    >
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        {active ? (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                        ) : null}
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{status}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}
      </div>

      <AgentRunDetailSheet
        selectedAgentId={selectedAgentId}
        selectedRun={liveSelectedRun}
        projectId={project?.id}
        getRunStream={analytics?.getRunStream}
        onStop={requestStopAgent}
        stopping={
          Boolean(selectedAgentId) &&
          stoppingAgentId != null &&
          stoppingAgentId === String(selectedAgentId)
        }
        onClose={closeDetail}
      />

      <StopAgentConfirmDialog
        open={stopConfirmOpen}
        onOpenChange={(open) => {
          setStopConfirmOpen(open);
          if (!open) setStopTargetRun(null);
        }}
        confirming={stoppingAgentId != null}
        title={stopClearFollowups ? "Stop agent and queued follow-ups?" : "Stop this agent run?"}
        description={
          stopClearFollowups
            ? "This stops the running agent and cancels queued follow-ups. Workspace and git changes are kept."
            : "This stops the running agent only. Queued follow-ups stay in the queue. Workspace and git changes are kept."
        }
        confirmLabel={stopClearFollowups ? "Stop & clear queue" : "Stop agent"}
        onConfirm={handleConfirmStopAgent}
      />
    </div>
  );
}
