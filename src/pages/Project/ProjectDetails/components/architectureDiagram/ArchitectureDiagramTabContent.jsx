import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useArchitectureDiagram } from "../../hooks/useArchitectureDiagram";
import { ArchitectureDiagramCanvas } from "./ArchitectureDiagramCanvas";
import { ArchitectureDiagramLivePanel } from "./ArchitectureDiagramLivePanel";
import { ArchitectureDiagramStepper } from "./ArchitectureDiagramStepper";
import { formatArchitectureDiagramRunTime } from "./formatArchitectureDiagramRunTime";

/**
 * Backend → Architecture tab: live agent progress + embedded knowledge graph.
 */
export function ArchitectureDiagramTabContent({ project, hasDeveloperRepo, canManage }) {
  const {
    status,
    loading,
    generating,
    starting,
    running,
    error,
    refreshGraph,
    syncGraph,
    livePanelVisible,
    setLivePanelVisible,
    runLog,
    agentStream,
    generationStartedAtMs,
  } = useArchitectureDiagram(project?.id);

  const successToastShownRef = useRef(false);
  const prevStatusRef = useRef(null);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = status?.status ?? null;
    if (prev === "generating" && next === "ready" && !successToastShownRef.current) {
      successToastShownRef.current = true;
      toast.success("Architecture diagram is ready.");
    }
    if (prev && prev !== "failed" && next === "failed" && !livePanelVisible) {
      toast.error(status?.lastError || "Graph generation could not be completed.");
    }
    if (next !== "ready") {
      successToastShownRef.current = false;
    }
    prevStatusRef.current = next;
  }, [livePanelVisible, status?.lastError, status?.status]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  const runTimeLabel = formatArchitectureDiagramRunTime(status);
  const isActiveGeneration = generating || running || status?.status === "generating";
  const hasReadyGraph = status?.status === "ready" && Boolean(status?.embedUrl);
  const showFailedState = status?.status === "failed" && !isActiveGeneration;

  const handleGenerate = async () => {
    try {
      await refreshGraph();
      toast.success(hasReadyGraph ? "Graph refresh started" : "Graph generation started");
    } catch {
      // refreshGraph sets error state
    }
  };

  if (loading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading architecture diagram"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-[min(420px,62vh)] w-full rounded-xl" />
      </div>
    );
  }

  if (!hasDeveloperRepo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <GitBranch className="size-10 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            Add a development repository first, then generate an architecture diagram from your
            codebase.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Architecture</h2>
          <p className="text-sm text-muted-foreground">
            Interactive knowledge graph across your development repositories.
            {status?.developmentRepoCount > 1 ? (
              <span className="block text-xs text-muted-foreground/90">
                {status.developmentRepoCount} repositories configured in project settings.
              </span>
            ) : null}
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
        {canManage ? (
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={starting || isActiveGeneration}
          >
            {starting || isActiveGeneration ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <GitBranch className="mr-2 size-4" />
                {hasReadyGraph ? "Refresh graph" : "Generate graph"}
              </>
            )}
          </Button>
        ) : null}
      </div>

      <ArchitectureDiagramLivePanel
        visible={livePanelVisible && isActiveGeneration}
        runStatus={status?.status}
        runPhase={status?.currentPhase}
        runLog={runLog}
        agentStream={agentStream}
        generationStartedAtMs={generationStartedAtMs}
        onDismiss={() => setLivePanelVisible(false)}
      />

      {status && (isActiveGeneration || showFailedState) ? (
        <div className="space-y-4">
          {(isActiveGeneration && !livePanelVisible) || showFailedState ? (
            <ArchitectureDiagramStepper run={status} />
          ) : null}
          {typeof status.progress === "number" ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, status.progress))}%`,
                }}
              />
            </div>
          ) : isActiveGeneration ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" />
            </div>
          ) : null}
        </div>
      ) : null}

      {isActiveGeneration && !livePanelVisible ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Building the knowledge graph…</p>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                This usually takes a few minutes. Open the live output panel above for live
                progress, or wait here — the diagram will appear when generation finishes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!hasReadyGraph && !isActiveGeneration && !showFailedState ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <GitBranch className="size-10 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              No architecture diagram yet. Generate a graph to map components across your
              development repositories.
            </p>
            {canManage ? (
              <Button type="button" onClick={() => void handleGenerate()} disabled={starting}>
                Generate graph
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(hasReadyGraph || showFailedState) && !isActiveGeneration ? (
        <ArchitectureDiagramCanvas
          projectId={project?.id}
          status={status}
          loading={loading}
          generating={generating}
          error={error}
          refreshGraph={refreshGraph}
          syncGraph={syncGraph}
          canManage={canManage}
          showHeader={false}
        />
      ) : null}
    </div>
  );
}
