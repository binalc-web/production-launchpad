import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import { agentStreamTimelineHasContent } from "@/pages/ClientLink/chat/clientLinkStreamTimeline.util";
import {
  SOURCE_LABELS,
  buildCursorAgentUsageCostBreakdown,
  formatModelSelectReason,
  formatTokens,
  formatUsd,
  getAgentRunDisplayStatus,
  getCursorModelLabel,
  isAgentRunActive,
  resolveCursorAgentTokenRates,
  statusBadgeClass,
} from "../agentAnalyticsDisplay";
import { agentRunTurnLabel, resolveAgentRunDetailTurns } from "../agentRunDetailTurns.util";

function UsageSkeleton() {
  return (
    <div
      className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
      role="status"
      aria-busy="true"
      aria-label="Loading token usage"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * @param {{ usageTotals: object|null, modelId: string|null, modelLabel: string, title?: string }} props
 */
function UsageCostBlock({ usageTotals, modelId, modelLabel, title = "Token usage & cost" }) {
  const usageBreakdown = buildCursorAgentUsageCostBreakdown(usageTotals, modelId);
  const hasUsage = usageBreakdown.rows.some((row) => row.tokens > 0);
  if (!hasUsage) return null;
  const rateFootnote = resolveCursorAgentTokenRates(modelId);

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatUsd(usageBreakdown.totalCostUsd)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 text-right font-medium">Tokens</th>
              <th className="pb-2 pr-3 text-right font-medium">Rate / 1M</th>
              <th className="pb-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {usageBreakdown.rows.map((row) =>
              row.tokens > 0 ? (
                <tr key={row.key}>
                  <td className="py-2 pr-3 text-foreground">{row.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                    {formatTokens(row.tokens)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                    {formatUsd(row.rate)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-foreground">
                    {formatUsd(row.costUsd)}
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Rates for {modelLabel}: input ${rateFootnote.input.toFixed(2)} · output $
        {rateFootnote.output.toFixed(2)} · cache read ${rateFootnote.cacheRead.toFixed(2)} · cache
        write ${rateFootnote.cacheWrite.toFixed(2)} per 1M tokens
      </p>
    </div>
  );
}

/**
 * @param {{ turn: object, isLatestActive: boolean, modelId: string|null, modelLabel: string }} props
 */
function AgentRunTurnSection({ turn, isLatestActive, modelId, modelLabel }) {
  const label = agentRunTurnLabel(turn);
  const prompt = typeof turn?.prompt === "string" ? turn.prompt.trim() : "";
  const streamTimeline = Array.isArray(turn?.streamTimeline) ? turn.streamTimeline : [];
  const assistantText = typeof turn?.assistantText === "string" ? turn.assistantText.trim() : "";
  const hasTimeline = agentStreamTimelineHasContent(streamTimeline);
  const hasOutput = hasTimeline || Boolean(assistantText);
  const turnUsage = turn?.usage
    ? {
        inputTokens: turn.usage.inputTokens,
        outputTokens: turn.usage.outputTokens,
        cacheReadTokens: turn.usage.cacheReadTokens,
        cacheWriteTokens: turn.usage.cacheWriteTokens,
      }
    : null;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {isLatestActive ? (
          <Badge variant="outline" className="text-[10px]">
            Live
          </Badge>
        ) : null}
      </div>

      {prompt ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Prompt
          </p>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="whitespace-pre-wrap text-sm text-foreground">{prompt}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Agent output
        </p>
        {hasTimeline ? (
          <AgentLiveTimeline
            timeline={streamTimeline}
            streamText={assistantText}
            isActive={isLatestActive}
            assistantVariant="plain"
          />
        ) : assistantText ? (
          <div className="rounded-md bg-muted/20 px-3 py-2">
            <p className="whitespace-pre-wrap text-sm text-foreground">{assistantText}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No output recorded for this turn.</p>
        )}
      </div>

      <UsageCostBlock
        usageTotals={turnUsage}
        modelId={modelId}
        modelLabel={modelLabel}
        title="Turn cost"
      />

      {!prompt && !hasOutput ? (
        <p className="text-sm text-muted-foreground">No activity recorded for this turn.</p>
      ) : null}
    </div>
  );
}

/**
 * One tab per turn (Original, Follow-up 1, …). Follows the newest turn while the agent works,
 * until the user opens an earlier tab.
 * @param {{
 *   agentId?: string|null,
 *   turns: object[],
 *   isActive: boolean,
 *   queuedFollowups: number,
 *   modelId: string|null,
 *   modelLabel: string,
 * }} props
 */
function AgentRunTurnTabs({ agentId, turns, isActive, queuedFollowups, modelId, modelLabel }) {
  const [pickedValue, setPickedValue] = useState(null);

  useEffect(() => {
    setPickedValue(null);
  }, [agentId]);

  const tabs = turns.map((turn, i) => ({
    value: `turn-${turn.index ?? i}`,
    turn,
    isLatestActive: isActive && i === turns.length - 1,
  }));
  const latestValue = tabs[tabs.length - 1].value;
  const activeValue =
    pickedValue && tabs.some((tab) => tab.value === pickedValue) ? pickedValue : latestValue;

  const queuedLabels = Array.from(
    { length: queuedFollowups },
    (_, k) => `Follow-up ${turns.length + k}`,
  );

  if (tabs.length === 1 && queuedLabels.length === 0) {
    return (
      <AgentRunTurnSection
        turn={tabs[0].turn}
        isLatestActive={tabs[0].isLatestActive}
        modelId={modelId}
        modelLabel={modelLabel}
      />
    );
  }

  return (
    <Tabs
      value={activeValue}
      onValueChange={(value) => setPickedValue(value === latestValue ? null : value)}
    >
      <div className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-background/95 px-1 py-1 backdrop-blur">
        <TabsList variant="segmented-compact" className="w-max max-w-none sm:w-max">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {agentRunTurnLabel(tab.turn)}
              {tab.isLatestActive ? (
                <span
                  className="size-1.5 animate-pulse rounded-full bg-primary"
                  role="img"
                  aria-label="Running"
                />
              ) : null}
            </TabsTrigger>
          ))}
          {queuedLabels.map((label) => (
            <TabsTrigger key={label} value={label} disabled title="Waiting in the follow-up queue">
              {label}
              <span className="text-[10px] font-normal text-muted-foreground">Queued</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <AgentRunTurnSection
            turn={tab.turn}
            isLatestActive={tab.isLatestActive}
            modelId={modelId}
            modelLabel={modelLabel}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/**
 * Full-length agent activity body for the analytics View Details drawer.
 * @param {object} props
 * @param {object|null|undefined} props.selectedRun
 * @param {object|null|undefined} props.detail - API run detail payload
 * @param {{ streamText?: string, streamPhase?: string, streamTimeline?: object[] }} props.selectedStream
 * @param {boolean} [props.detailLoading]
 */
export function AgentRunDetailActivity({
  selectedRun,
  detail,
  selectedStream,
  detailLoading = false,
}) {
  const isActive = isAgentRunActive(selectedRun);
  const turns = resolveAgentRunDetailTurns(detail, selectedStream, isActive);
  const displayStatus = getAgentRunDisplayStatus(selectedRun);
  const sourceLabel = SOURCE_LABELS[selectedRun?.source] || selectedRun?.source || "Unknown source";
  const phaseLabel =
    typeof selectedStream?.streamPhase === "string"
      ? selectedStream.streamPhase.trim()
      : typeof detail?.streamPhase === "string"
        ? detail.streamPhase.trim()
        : "";

  const modelId =
    (typeof detail?.agent?.model === "string" && detail.agent.model.trim()) ||
    (typeof detail?.run?.model === "string" && detail.run.model.trim()) ||
    (typeof detail?.usage?.model === "string" && detail.usage.model.trim()) ||
    (typeof selectedRun?.model === "string" && selectedRun.model.trim()) ||
    null;
  const modelLabel = getCursorModelLabel(modelId || "Auto");
  const selectReason = formatModelSelectReason(
    detail?.modelSelectReason || detail?.run?.modelSelectReason || selectedRun?.modelSelectReason,
  );

  const pipelineDetail =
    (typeof detail?.agent?.migrateFrontendPipeline?.detail === "string" &&
      detail.agent.migrateFrontendPipeline.detail.trim()) ||
    (typeof detail?.agent?.summary === "string" && detail.agent.summary.trim()) ||
    (typeof selectedRun?.pipelineDetail === "string" && selectedRun.pipelineDetail.trim()) ||
    "";
  const pipelineHeadline =
    (typeof detail?.agent?.migrateFrontendPipeline?.headline === "string" &&
      detail.agent.migrateFrontendPipeline.headline.trim()) ||
    "";

  const queuedFollowups = Math.max(
    0,
    Math.floor(Number(detail?.followupQueueDepth ?? selectedRun?.followupQueueDepth ?? 0) || 0),
  );

  const usageTotals =
    detail?.usage?.totals ?? detail?.usageTotals ?? selectedRun?.usageTotals ?? null;
  const showUsageSkeleton =
    detailLoading &&
    !buildCursorAgentUsageCostBreakdown(usageTotals, modelId).rows.some((r) => r.tokens > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{sourceLabel}</span>
        <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(displayStatus)}`}>
          {displayStatus}
        </Badge>
        <Badge variant="secondary" className="text-[10px] font-medium">
          Model: {modelLabel}
        </Badge>
        {selectReason ? (
          <span className="max-w-full text-xs text-muted-foreground">{selectReason}</span>
        ) : null}
      </div>

      {showUsageSkeleton ? <UsageSkeleton /> : null}

      <UsageCostBlock
        usageTotals={usageTotals}
        modelId={modelId}
        modelLabel={modelLabel}
        title="Total token usage & cost"
      />

      {pipelineHeadline || pipelineDetail ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
          {pipelineHeadline ? (
            <p className="text-sm font-medium text-foreground">{pipelineHeadline}</p>
          ) : null}
          {pipelineDetail ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pipelineDetail}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Agent activity</p>
          {phaseLabel && isActive ? (
            <p className="text-xs text-muted-foreground">{phaseLabel}</p>
          ) : null}
        </div>

        {turns.length > 0 ? (
          <AgentRunTurnTabs
            agentId={selectedRun?.cursorAgentId}
            turns={turns}
            isActive={isActive}
            queuedFollowups={queuedFollowups}
            modelId={modelId}
            modelLabel={modelLabel}
          />
        ) : detailLoading ? (
          <div
            className="space-y-2"
            role="status"
            aria-busy="true"
            aria-label="Loading agent activity"
          >
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : !pipelineDetail ? (
          <p className="text-sm text-muted-foreground">No activity recorded for this run.</p>
        ) : null}
      </div>
    </div>
  );
}
