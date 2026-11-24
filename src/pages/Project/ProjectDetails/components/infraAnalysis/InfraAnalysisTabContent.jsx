import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  consumeInfraAnalysisStream,
  getLatestProjectInfraAnalysis,
  runProjectInfraAnalysis,
} from "@/api";
import { runSseWithReconnect } from "@/lib/sseStreamReconnect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Loader2, Radar } from "lucide-react";
import { formatInfraAnalysisRunTime } from "./formatInfraAnalysisRunTime.js";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { persistInfraAnalysisFixHandoff } from "@/utils/infraAnalysisFixHandoff.util";
import {
  applyDeployAgentStreamUpdate,
  emptyDeployAgentStreamState,
} from "../cloudDeployAgentStream.util";
import { InfraAnalysisDiagram } from "./InfraAnalysisDiagram";
import { InfraAnalysisInsightsPanel } from "./InfraAnalysisInsightsPanel";
import { InfraAnalysisLivePanel } from "./InfraAnalysisLivePanel";
import { InfraAnalysisRtoRpoPanel } from "./InfraAnalysisRtoRpoPanel.jsx";
import { InfraAnalysisStepper } from "./InfraAnalysisStepper";
import { InfraAnalysisSuggestionsPanel } from "./InfraAnalysisSuggestionsPanel";
import { isInfraAnalysisRunning } from "./infraAnalysisSteps";
import {
  buildNodeLabelMap,
  resolveRelatedNodeLabels,
} from "./recommendations/resolveNodeLabels.js";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

function InfraAnalysisSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading infra analysis">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,22rem)] xl:items-start">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[360px] w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Cloud Infra → Infra Analysis tab: SSE live updates with reconnect.
 */
export function InfraAnalysisTabContent({ project, hasDeveloperRepo, onNavigate }) {
  const [selectedDiagramNodeId, setSelectedDiagramNodeId] = useState(null);
  const [diagramFocusNodeId, setDiagramFocusNodeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState(null);
  const [livePanelVisible, setLivePanelVisible] = useState(false);
  const [activeRunId, setActiveRunId] = useState(null);
  const [runLog, setRunLog] = useState("");
  const [agentStream, setAgentStream] = useState(emptyDeployAgentStreamState);
  const [analysisStartedAtMs, setAnalysisStartedAtMs] = useState(null);

  const failureToastShownRef = useRef(false);
  const streamAbortRef = useRef(null);
  const streamingRef = useRef(false);

  const applyRunState = useCallback((nextRun) => {
    if (!nextRun) return;
    setRun(nextRun);
    if (nextRun.status !== "failed") {
      failureToastShownRef.current = false;
    }
  }, []);

  const loadLatest = useCallback(async () => {
    if (!project?.id) return null;
    try {
      const data = await getLatestProjectInfraAnalysis(project.id);
      const nextRun = data?.run ?? null;
      applyRunState(nextRun);
      return nextRun;
    } catch (err) {
      logger.error("Failed to load infra analysis", err);
      toast.error((typeof err === "object" && err?.error) || "Could not load analysis");
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyRunState, project?.id]);

  const stopStream = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    streamingRef.current = false;
  }, []);

  useEffect(
    () => () => {
      stopStream();
    },
    [stopStream],
  );

  const appendRunLogLine = useCallback((phase, message) => {
    const line = message ? `[${phase}] ${message}\n` : `[${phase}]\n`;
    setRunLog((prev) => prev + line);
  }, []);

  const handleStreamEvent = useCallback(
    (evt) => {
      if (!evt || typeof evt !== "object") return;

      if (evt.type === "connected") {
        if (evt.currentPhase) {
          setRun((prev) =>
            prev
              ? {
                  ...prev,
                  currentPhase: evt.currentPhase,
                  status: evt.status ?? prev.status,
                  progress: evt.progress ?? prev.progress,
                }
              : prev,
          );
        }
      }

      if (evt.type === "phase") {
        setRun((prev) =>
          prev
            ? {
                ...prev,
                currentPhase: evt.phase ?? prev.currentPhase,
                progress: typeof evt.progress === "number" ? evt.progress : prev.progress,
              }
            : prev,
        );
        if (evt.phase) {
          appendRunLogLine(evt.phase, evt.message ?? "");
        }
      }

      if (evt.type === "agent_update") {
        setAgentStream((prev) => applyDeployAgentStreamUpdate(prev, evt));
      }

      if (evt.type === "terminal") {
        stopStream();
        if (evt.status === "completed") {
          toast.success("Analysis complete.");
        } else if (evt.status === "failed") {
          toast.error(evt.failureMessage || "Analysis could not be completed.");
        }
        void loadLatest().then((nextRun) => {
          if (nextRun && TERMINAL_STATUSES.has(nextRun.status)) {
            setLivePanelVisible(false);
          }
        });
      }
    },
    [appendRunLogLine, loadLatest, stopStream],
  );

  const streamRun = useCallback(
    (projectId, runId) => {
      stopStream();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      streamingRef.current = true;

      void (async () => {
        try {
          await runSseWithReconnect({
            signal: controller.signal,
            onEvent: handleStreamEvent,
            connect: ({ onEvent, signal }) =>
              consumeInfraAnalysisStream(projectId, runId, { signal, onEvent }),
          });
          const nextRun = await loadLatest();
          if (nextRun && TERMINAL_STATUSES.has(nextRun.status)) {
            setLivePanelVisible(false);
          }
        } catch (err) {
          if (err?.name === "AbortError") return;
          logger.error("Infra analysis stream failed", err);
          toast.error("Live connection lost. Refresh the page to see progress.");
        } finally {
          streamingRef.current = false;
        }
      })();
    },
    [handleStreamEvent, loadLatest, stopStream],
  );

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  useEffect(() => {
    if (!project?.id || loading) return undefined;

    let cancelled = false;

    const resumeLatestRun = async () => {
      try {
        const data = await getLatestProjectInfraAnalysis(project.id);
        if (cancelled) return;
        const latestRun = data?.run;
        if (!latestRun?.id || !isInfraAnalysisRunning(latestRun)) return;

        setActiveRunId(latestRun.id);
        applyRunState(latestRun);
        setLivePanelVisible(true);
        setAnalysisStartedAtMs(
          latestRun.startedAt ? new Date(latestRun.startedAt).getTime() : Date.now(),
        );
        streamRun(project.id, latestRun.id);
      } catch (err) {
        logger.error("Failed to resume infra analysis run", err);
      }
    };

    void resumeLatestRun();

    return () => {
      cancelled = true;
    };
  }, [applyRunState, loading, project?.id, streamRun]);

  useEffect(() => {
    if (run?.status !== "failed" || failureToastShownRef.current) return;
    if (livePanelVisible) return;
    failureToastShownRef.current = true;
    toast.error(run.failureMessage || "Analysis could not be completed");
  }, [livePanelVisible, run?.failureMessage, run?.status]);

  const handleRunAnalysis = async () => {
    if (!project?.id) return;
    setStarting(true);
    setRunLog("");
    setAgentStream(emptyDeployAgentStreamState());
    setLivePanelVisible(true);
    setAnalysisStartedAtMs(Date.now());
    try {
      const data = await runProjectInfraAnalysis(project.id, {});
      setActiveRunId(data.id);
      applyRunState(data);
      toast.success("Analysis started");
      streamRun(project.id, data.id);
    } catch (err) {
      setLivePanelVisible(false);
      toast.error((typeof err === "object" && err?.error) || "Could not start analysis");
    } finally {
      setStarting(false);
    }
  };

  const running = isInfraAnalysisRunning(run);
  const result = run?.result ?? null;
  const showResults = run?.status === "completed" && result;
  const runTimeLabel = formatInfraAnalysisRunTime(run);

  useEffect(() => {
    setSelectedDiagramNodeId(null);
    setDiagramFocusNodeId(null);
  }, [run?.id, result?.architectureGraph]);

  const focusDiagramNodeIds = useCallback((nodeIds) => {
    const ids = Array.isArray(nodeIds) ? nodeIds : [];
    const firstId = ids.length ? String(ids[0]) : null;
    if (!firstId) return;
    setSelectedDiagramNodeId(firstId);
    setDiagramFocusNodeId(firstId);
  }, []);

  const nodeLabelMap = useMemo(
    () => buildNodeLabelMap(result?.architectureGraph),
    [result?.architectureGraph],
  );

  const handleFixSuggestion = useCallback(
    (item) => {
      if (!project?.id || !item) return;
      const relatedIds = Array.isArray(item.relatedNodeIds) ? item.relatedNodeIds : [];
      const relatedNodeLabels = resolveRelatedNodeLabels(relatedIds, nodeLabelMap).map(
        (node) => node.label,
      );
      persistInfraAnalysisFixHandoff(project.id, {
        title: item.title,
        detail: item.detail,
        description: item.description,
        reason: item.reason,
        severity: item.severity,
        category: item.category,
        actionType: item.actionType,
        affectedFiles: item.affectedFiles,
        relatedNodeIds: relatedIds,
        relatedNodeLabels,
      });
      onNavigate?.("cloud", { area: "deploy" });
      toast.message("Opening infra chat…");
    },
    [nodeLabelMap, onNavigate, project?.id],
  );

  if (loading) return <InfraAnalysisSkeleton />;

  if (!hasDeveloperRepo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Radar className="size-10 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            Add a development repository first, then run infra analysis to map architecture across
            your repos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Infra Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Combined architecture graph and infrastructure suggestions across development
            repositories.
          </p>
          {runTimeLabel ? (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              <span>{runTimeLabel.label}</span>
              {runTimeLabel.relative ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{runTimeLabel.relative}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={() => void handleRunAnalysis()}
          disabled={starting || running}
        >
          {starting || running ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Radar className="mr-2 size-4" />
              Run analysis
            </>
          )}
        </Button>
      </div>

      <InfraAnalysisLivePanel
        visible={livePanelVisible && Boolean(activeRunId)}
        runStatus={run?.status}
        runPhase={run?.currentPhase}
        runLog={runLog}
        agentStream={agentStream}
        analysisStartedAtMs={analysisStartedAtMs}
        onDismiss={() => setLivePanelVisible(false)}
      />

      {run && (running || run.status === "failed") ? (
        <div className="space-y-4">
          {!livePanelVisible ? <InfraAnalysisStepper run={run} /> : null}
          {typeof run.progress === "number" ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, run.progress))}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {!run && !showResults ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Radar className="size-10 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              No analysis yet. Run analysis to generate an architecture diagram, suggestions, and
              insights for this project.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {showResults ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,22rem)] xl:items-start">
          <div className="min-w-0 space-y-6">
            <InfraAnalysisInsightsPanel
              insightsSnapshot={result.insightsSnapshot}
              executiveSummary={result.executiveSummary}
              architectureGraph={result.architectureGraph}
              selectedNodeId={selectedDiagramNodeId}
              onFocusDiagram={focusDiagramNodeIds}
              onFixSuggestion={handleFixSuggestion}
              afterKpis={
                <InfraAnalysisDiagram
                  architectureGraph={result.architectureGraph}
                  selectedNodeId={selectedDiagramNodeId}
                  focusNodeId={diagramFocusNodeId}
                  onSelectedNodeChange={setSelectedDiagramNodeId}
                />
              }
            />
          </div>
          <div className="min-w-0 space-y-6 xl:sticky xl:top-4 xl:self-start">
            <InfraAnalysisRtoRpoPanel rtoRpo={result.insightsSnapshot?.rtoRpo} />
            <InfraAnalysisSuggestionsPanel
              projectId={project?.id}
              suggestions={result.suggestions}
              architectureGraph={result.architectureGraph}
              selectedNodeId={selectedDiagramNodeId}
              onSelectedNodeChange={setSelectedDiagramNodeId}
              onFocusDiagramNodes={focusDiagramNodeIds}
              onFixSuggestion={handleFixSuggestion}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
