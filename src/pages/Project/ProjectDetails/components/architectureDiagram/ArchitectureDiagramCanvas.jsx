import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GitBranch, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ArchitectureGraphView } from "./graph/ArchitectureGraphView.jsx";
import { useArchitectureGraph } from "./graph/useArchitectureGraph.js";

function formatElapsedSince(isoTimestamp) {
  if (!isoTimestamp) return null;
  const started = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(started)) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

function DiagramCanvasSkeleton({ label }) {
  return (
    <div
      className="flex h-[min(420px,62vh)] flex-col gap-3 p-4"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="w-full flex-1 rounded-lg" />
    </div>
  );
}

/**
 * Native architecture knowledge graph canvas (React Flow).
 */
export function ArchitectureDiagramCanvas({
  projectId,
  status,
  loading,
  generating,
  error,
  refreshGraph,
  syncGraph,
  canManage,
  className,
  showHeader = true,
}) {
  const isGenerating = generating || status?.status === "generating";
  const isReady = status?.status === "ready";
  const generationStartedAt = status?.startedAt ?? status?.updatedAt;

  const {
    graph,
    domainGraph,
    loading: graphLoading,
    error: graphError,
    reload: reloadGraph,
    changedNodeIds,
    affectedNodeIds,
  } = useArchitectureGraph(projectId, isReady);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!isReady) return;
    void reloadGraph();
  }, [isReady, status?.lastSyncedAt, status?.hasDiffOverlay, reloadGraph]);

  const body = (
    <div className="relative w-full">
      {loading && !isReady ? <DiagramCanvasSkeleton label="Loading diagram" /> : null}

      {isGenerating && !isReady ? (
        <div className="flex h-[min(420px,62vh)] flex-col items-center justify-center gap-3 bg-background/85 px-6 text-center text-sm text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Building the knowledge graph…</p>
            <p className="text-xs leading-relaxed">
              {formatElapsedSince(generationStartedAt)
                ? `Running for ${formatElapsedSince(generationStartedAt)}. This often takes a few minutes.`
                : "Scanning your development repositories. This often takes a few minutes."}
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void syncGraph().then(() => reloadGraph())}
            >
              Check repository for graph
            </Button>
          ) : null}
        </div>
      ) : null}

      {isReady ? (
        <div className="relative">
          {graphLoading && !graph ? <DiagramCanvasSkeleton label="Loading graph data" /> : null}
          {graph ? (
            <ArchitectureGraphView
              graph={graph}
              domainGraph={domainGraph}
              projectId={projectId}
              changedNodeIds={changedNodeIds}
              affectedNodeIds={affectedNodeIds}
            />
          ) : null}
          {!graphLoading && !graph && !graphError ? (
            <div className="flex h-[min(360px,50vh)] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
              <p>Graph data is not available yet.</p>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void syncGraph().then(() => reloadGraph())}
                >
                  Sync from development repositories
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !isGenerating && status?.status === "failed" ? (
        <div className="flex h-[min(360px,50vh)] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <p>{status?.lastError || "Knowledge graph is unavailable."}</p>
          {canManage ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void syncGraph().then(() => reloadGraph())}
              >
                Sync from development repositories
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void refreshGraph()}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!showHeader) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card className={cn("overflow-hidden border-border shadow-sm", className)}>
      <div className="flex flex-row items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Architecture diagram</p>
            {isReady ? (
              <p className="text-xs text-muted-foreground">
                Click a layer to explore files and connections.
              </p>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void syncGraph().then(() => reloadGraph())}
            >
              Sync
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isGenerating}
              onClick={() => void refreshGraph().then(() => reloadGraph())}
            >
              {isGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh graph
            </Button>
          </div>
        ) : null}
      </div>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
}
