import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bot,
  CircleAlert,
  DollarSign,
  Minus,
  Radio,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { computeCursorAgentUsageCostUsd, formatTokens, formatUsd } from "../agentAnalyticsDisplay";

function TrendBadge({ trend, priorLabel, showTrends }) {
  const trendDirection = trend?.direction;
  const deltaPct = trend?.deltaPct;

  if (!showTrends || !trendDirection) return null;

  if (trendDirection === "new") {
    return <span className="text-[11px] font-medium text-primary">new</span>;
  }
  if (trendDirection === "flat" || deltaPct === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        0%
      </span>
    );
  }
  if (trendDirection === "up") {
    return (
      <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary">
        <ArrowUp className="size-3" aria-hidden />
        {deltaPct}%
      </span>
    );
  }
  if (trendDirection === "down") {
    return (
      <span className="flex items-center gap-0.5 text-[11px] font-medium text-destructive">
        <ArrowDown className="size-3" aria-hidden />
        {Math.abs(deltaPct)}%
      </span>
    );
  }
  return null;
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sublabel,
  trend,
  priorLabel,
  showTrends,
  accent,
  loading = false,
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 shadow-sm",
        accent,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </div>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        {!loading ? (
          <TrendBadge trend={trend} priorLabel={priorLabel} showTrends={showTrends} />
        ) : null}
      </div>
      <div>
        {loading ? (
          <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            {sublabel ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</p>
            ) : null}
            {showTrends && priorLabel && trend?.direction && trend.direction !== "new" ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">vs {priorLabel}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * KPI strip for agent analytics (optional period-over-period trends).
 */
export function AgentAnalyticsKpiStrip({
  activeCount,
  totalAgents = 0,
  failedCount = 0,
  connected = false,
  bootstrapStatus = null,
  streamError = null,
  currentPeriod = {},
  trends = {},
  priorLabel,
  showTrends = false,
}) {
  const cacheTokens =
    Number(currentPeriod.cacheTokens) ||
    (Number(currentPeriod.cacheReadTokens) || 0) + (Number(currentPeriod.cacheWriteTokens) || 0);
  const totalTokens =
    (Number(currentPeriod.inputTokens) || 0) +
    (Number(currentPeriod.outputTokens) || 0) +
    cacheTokens;
  const estimatedCostUsd = computeCursorAgentUsageCostUsd(currentPeriod);
  const inputCostUsd = computeCursorAgentUsageCostUsd({ inputTokens: currentPeriod.inputTokens });
  const outputCostUsd = computeCursorAgentUsageCostUsd({
    outputTokens: currentPeriod.outputTokens,
  });
  const cacheCostUsd = computeCursorAgentUsageCostUsd({
    cacheReadTokens: currentPeriod.cacheReadTokens,
    cacheWriteTokens: currentPeriod.cacheWriteTokens,
  });

  const streamBadgeLabel = connected
    ? "Live stream"
    : streamError || bootstrapStatus?.message || "Starting live updates…";
  const streamDisconnected = !connected && Boolean(streamError);
  const metricsLoading = !connected && !streamError;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Overview
        </p>
        <Badge
          variant="outline"
          className={
            connected
              ? "gap-1.5 border-primary/30 bg-primary/10 text-primary"
              : streamDisconnected
                ? "gap-1.5 max-w-full border-destructive/30 bg-destructive/10 text-destructive"
                : "gap-1.5 max-w-full text-muted-foreground"
          }
          title={streamBadgeLabel}
        >
          <Radio
            className={cn(
              "size-3 shrink-0",
              connected && "text-primary",
              streamDisconnected && "text-destructive",
            )}
            aria-hidden
          />
          <span className="truncate">{streamBadgeLabel}</span>
        </Badge>
        {!connected && bootstrapStatus?.progress?.total > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {bootstrapStatus.progress.current} / {bootstrapStatus.progress.total}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={Bot}
          label="Total agents"
          value={totalAgents}
          sublabel="In selected period"
          loading={metricsLoading}
        />
        <MetricTile
          icon={Activity}
          label="Active now"
          value={activeCount ?? 0}
          sublabel={activeCount > 0 ? "Running agents" : "No active runs"}
          accent={activeCount > 0 ? "border-primary/20 bg-primary/[0.02]" : undefined}
          loading={metricsLoading}
        />
        <MetricTile
          icon={CircleAlert}
          label="Failed"
          value={failedCount}
          sublabel="Terminal failures"
          accent={failedCount > 0 ? "border-destructive/20 bg-destructive/[0.02]" : undefined}
          loading={metricsLoading}
        />
        <MetricTile
          icon={Zap}
          label="Input tokens"
          value={formatTokens(currentPeriod.inputTokens)}
          sublabel={inputCostUsd > 0 ? formatUsd(inputCostUsd) : undefined}
          trend={trends.inputTokens}
          priorLabel={priorLabel}
          showTrends={showTrends}
          loading={metricsLoading}
        />
        <MetricTile
          icon={Sparkles}
          label="Output tokens"
          value={formatTokens(currentPeriod.outputTokens)}
          sublabel={outputCostUsd > 0 ? formatUsd(outputCostUsd) : undefined}
          trend={trends.outputTokens}
          priorLabel={priorLabel}
          showTrends={showTrends}
          loading={metricsLoading}
        />
        <MetricTile
          icon={Activity}
          label="Total usage"
          value={formatTokens(totalTokens)}
          sublabel={
            cacheCostUsd > 0
              ? `${formatTokens(cacheTokens)} cache · ${formatUsd(cacheCostUsd)}`
              : `${formatTokens(cacheTokens)} cache`
          }
          trend={trends.cacheTokens}
          priorLabel={priorLabel}
          showTrends={showTrends}
          loading={metricsLoading}
        />
        <MetricTile
          icon={DollarSign}
          label="Estimated cost"
          value={formatUsd(estimatedCostUsd)}
          sublabel="Per-model token pricing"
          trend={trends.estimatedCostUsd}
          priorLabel={priorLabel}
          showTrends={showTrends}
          accent={estimatedCostUsd > 0 ? "border-primary/20 bg-primary/[0.02]" : undefined}
          loading={metricsLoading}
        />
      </div>
    </div>
  );
}
