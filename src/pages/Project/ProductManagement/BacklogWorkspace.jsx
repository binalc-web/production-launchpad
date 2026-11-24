import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeBacklogArea } from "./constants";
import { BacklogBoardPanel } from "./panels/BacklogBoardPanel";
import { BacklogSuggestionsPanel } from "./panels/BacklogSuggestionsPanel";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import { navigateToReleases } from "@/lib/releaseNavigation";
import { useReleasesSnapshot } from "./ReleasesSnapshotContext";
import { normalizeReleaseStatus } from "@/lib/releasePresentation";
import { JOURNEY_WORKSPACE_MIN_H } from "./ProductManagementWorkspace";

export function BacklogWorkspace({ project }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const snapshot = useReleasesSnapshot();
  const jiraReady = isProjectJiraBacklogReady(project);
  const area = normalizeBacklogArea(searchParams.get("area"), { jiraReady });
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);

  const goToSuggestions = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", "backlog");
        next.set("area", "suggestions");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleApplied = useCallback(() => {
    setBoardRefreshKey((n) => n + 1);
    if (!jiraReady) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "backlog");
          next.set("area", "board");
          return next;
        },
        { replace: true },
      );
    }
  }, [jiraReady, setSearchParams]);

  const activeRelease =
    (snapshot.releases ?? []).find((r) => normalizeReleaseStatus(r) === "active") ?? null;
  const showScopeBanner =
    activeRelease && Number(activeRelease.scopeItemCount ?? 0) === 0 && !snapshot.loading;

  return (
    <div className="space-y-4">
      {showScopeBanner && area !== "suggestions" ? (
        <Alert className="border-primary/25 bg-primary/5">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              Active release <strong>{activeRelease.name}</strong> has no scope yet. Add stories
              here, then assign them in Release scope.
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => navigateToReleases(setSearchParams, "active")}
            >
              Open Release scope
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className={cn(JOURNEY_WORKSPACE_MIN_H, "overflow-y-auto")}>
        {area === "suggestions" ? (
          <BacklogSuggestionsPanel
            isActive
            projectId={project.id}
            project={project}
            onApplied={handleApplied}
            scopeNotice={
              showScopeBanner
                ? {
                    releaseName: activeRelease.name,
                    onOpen: () => navigateToReleases(setSearchParams, "active"),
                  }
                : null
            }
          />
        ) : (
          <BacklogBoardPanel
            key={boardRefreshKey}
            projectId={project.id}
            jiraReady={jiraReady}
            onOpenSuggestions={goToSuggestions}
          />
        )}
      </div>
    </div>
  );
}
