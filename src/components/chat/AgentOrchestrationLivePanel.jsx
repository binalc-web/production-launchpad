import { useEffect, useMemo, useState } from "react";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import { AgentWorkingStatusRow } from "@/components/chat/AgentWorkingStatusRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAgentTurnElapsed } from "@/hooks/useAgentTurnElapsed";
import { useStickToBottomScroll } from "@/hooks/useStickToBottomScroll";
import { buildAgentProgressStatusLine } from "@/lib/clientLinkAgentTurnTimer";
import { buildClientLinkChatAgentPipelineStatusLabel } from "@/pages/ClientLink/chat/clientLinkAgentStream.util";
import { agentStreamTimelineHasContent } from "@/pages/ClientLink/chat/clientLinkStreamTimeline.util";
import { CheckCircle2, ChevronDown, Loader2, Terminal, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);

function statusBadgeClass(status) {
  switch (status) {
    case "SUCCEEDED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "FAILED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "RUNNING":
    case "PENDING":
      return "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300";
    default:
      return "text-muted-foreground";
  }
}

function OrchestrationPhaseStrip({ phases, runPhase, isActive }) {
  const activeIndex = phases.findIndex((p) => p.key === runPhase);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {phases.map((step, index) => {
        const isCurrent = step.key === runPhase;
        const isDone = activeIndex > index;
        return (
          <Badge
            key={step.key}
            variant="outline"
            className={cn(
              "text-[10px] font-medium",
              isCurrent && isActive && "border-primary/40 bg-primary/10 text-primary",
              isDone && "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {step.label}
          </Badge>
        );
      })}
    </div>
  );
}

/**
 * Shared inline live output for agent-orchestrated flows (deploy, release lock).
 */
export function AgentOrchestrationLivePanel({
  visible,
  title,
  subtitle,
  phases = [],
  agentPhaseKey,
  activeProgressLabel = "In progress…",
  runStatus,
  runPhase,
  runLog,
  commandPreview,
  timeline = [],
  validationChecks = [],
  agentStream = { streamText: "", streamPhase: "", streamTimeline: [] },
  startedAtMs = null,
  pipelineSteps = null,
  progressDetail = "",
  progressDetailPhaseKey = null,
  /** Optional human-readable failure summary when runStatus is FAILED. */
  failureSummary = "",
  logsOpenLabel = "Show logs",
  logsCloseLabel = "Hide logs",
  dismissAriaLabel = "Dismiss output",
  onDismiss,
}) {
  const [logsOpen, setLogsOpen] = useState(false);
  const isActive = ACTIVE_STATUSES.has(runStatus);
  const elapsed = useAgentTurnElapsed(isActive ? startedAtMs : null);

  const { containerRef: timelineScrollRef, onScroll: onTimelineScroll } = useStickToBottomScroll([
    agentStream.streamTimeline,
    agentStream.streamText,
    timeline,
  ]);

  const { containerRef: logsScrollRef, onScroll: onLogsScroll } = useStickToBottomScroll([
    runLog,
    logsOpen,
  ]);

  const phaseLabel = (phase) => {
    const row = phases.find((p) => p.key === phase);
    return row?.label ?? phase ?? "Starting";
  };

  const pipelineLabel = useMemo(() => {
    if (agentPhaseKey && runPhase === agentPhaseKey && isActive) {
      return (
        buildClientLinkChatAgentPipelineStatusLabel({
          streamText: agentStream.streamText,
          streamPhase: agentStream.streamPhase,
          streamTimeline: agentStream.streamTimeline,
        }) || phaseLabel(runPhase)
      );
    }
    if (isActive && runPhase) {
      if (
        progressDetailPhaseKey &&
        runPhase === progressDetailPhaseKey &&
        String(progressDetail ?? "").trim()
      ) {
        return `${phaseLabel(runPhase)} · ${String(progressDetail).trim()}`;
      }
      return phaseLabel(runPhase);
    }
    return isActive ? activeProgressLabel : "";
  }, [
    agentPhaseKey,
    agentStream,
    isActive,
    progressDetail,
    progressDetailPhaseKey,
    runPhase,
    phases,
  ]);

  const progressStatusLine = buildAgentProgressStatusLine({
    label: pipelineLabel,
    elapsed: isActive && elapsed ? elapsed : "",
  });

  const hasAgentStream =
    agentStreamTimelineHasContent(agentStream.streamTimeline) ||
    Boolean(String(agentStream.streamText ?? "").trim());

  const showAgentTimeline = (agentPhaseKey && runPhase === agentPhaseKey) || hasAgentStream;

  useEffect(() => {
    if (!hasAgentStream) setLogsOpen(true);
  }, [hasAgentStream]);

  useEffect(() => {
    if (
      progressDetailPhaseKey &&
      runPhase === progressDetailPhaseKey &&
      String(progressDetail ?? "").trim()
    ) {
      setLogsOpen(true);
    }
  }, [progressDetail, progressDetailPhaseKey, runPhase]);

  if (!visible) return null;

  const validationFromTimeline = timeline.filter((t) => t.type === "validation");

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-start gap-2">
          <Terminal className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {runPhase ? (
            <Badge variant="outline" className="text-[10px]">
              {phaseLabel(runPhase)}
            </Badge>
          ) : null}
          {isActive ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
          <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(runStatus)}`}>
            {runStatus || "Starting…"}
          </Badge>
          {!isActive ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={onDismiss}
              aria-label={dismissAriaLabel}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {runStatus === "FAILED" && String(failureSummary || "").trim() ? (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p className="min-w-0 whitespace-pre-wrap break-words">
              {String(failureSummary).trim()}
            </p>
          </div>
        ) : null}
        {commandPreview ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Command</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] whitespace-pre-wrap break-all text-foreground">
              $ {commandPreview}
            </pre>
          </div>
        ) : null}

        {pipelineSteps ??
          (phases.length > 0 ? (
            <OrchestrationPhaseStrip phases={phases} runPhase={runPhase} isActive={isActive} />
          ) : null)}

        {isActive && progressStatusLine ? (
          <div
            className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
            role="status"
            aria-live="polite"
            aria-label={progressStatusLine}
          >
            <AgentWorkingStatusRow
              text={progressStatusLine}
              showLiveDot={Boolean(agentPhaseKey && runPhase === agentPhaseKey)}
            />
          </div>
        ) : null}

        {showAgentTimeline ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Agent activity</p>
            <div
              ref={timelineScrollRef}
              onScroll={onTimelineScroll}
              className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3"
              role="log"
              aria-live="polite"
            >
              <AgentLiveTimeline
                timeline={agentStream.streamTimeline}
                streamText={agentStream.streamText}
                isActive={isActive && Boolean(agentPhaseKey && runPhase === agentPhaseKey)}
              />
            </div>
          </div>
        ) : null}

        {validationFromTimeline.length > 0 || validationChecks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Validation</p>
            {(validationFromTimeline.length
              ? validationFromTimeline[validationFromTimeline.length - 1].checks
              : validationChecks
            )?.map?.((check) => (
              <div
                key={`${check.name}-${check.url}`}
                className="flex items-start gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs"
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                )}
                <span>
                  {check.name}:{" "}
                  {check.url ? (
                    <a
                      href={check.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {check.url}
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", logsOpen && "rotate-180")}
              />
              {logsOpen ? logsCloseLabel : logsOpenLabel}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre
              ref={logsScrollRef}
              onScroll={onLogsScroll}
              className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-words text-foreground"
            >
              {runLog || "(waiting for output…)"}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export { ACTIVE_STATUSES as ORCHESTRATION_ACTIVE_STATUSES };
