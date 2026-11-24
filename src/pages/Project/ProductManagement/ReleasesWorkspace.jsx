import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReleaseManagement from "@/pages/Project/ProjectDetails/components/ReleaseManagement";
import { normalizeReleaseArea } from "./constants";
import { ReleaseProgressStrip } from "./components/ReleaseProgressStrip";

function ReleasesListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading releases">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

function WorkspaceBody({ project, projectName, managementRef, onSnapshotChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const area = normalizeReleaseArea(searchParams.get("area"));
  const [snapshot, setSnapshot] = useState({
    releases: [],
    loading: true,
    revisionSeedProgressByRelease: {},
    canManageReleases: false,
  });

  const handleSnapshotChange = useCallback(
    (next) => {
      setSnapshot(next);
      onSnapshotChange?.(next);
    },
    [onSnapshotChange],
  );

  const setArea = useCallback(
    (nextArea) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "releases");
          next.set("area", nextArea);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const releaseActions = snapshot.canManageReleases ? (
    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
      <Button
        type="button"
        size="sm"
        className="gap-2 h-8"
        onClick={() => managementRef.current?.openCreateReleaseDialog?.()}
      >
        <Plus className="size-3.5" />
        Create Release
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ReleaseProgressStrip
          releases={snapshot.releases}
          loading={snapshot.loading}
          revisionSeedProgressByRelease={snapshot.revisionSeedProgressByRelease}
          onNavigate={setArea}
          onCreateRelease={() => managementRef.current?.openCreateReleaseDialog?.()}
        />
        {releaseActions}
      </div>

      <div className="min-h-[calc(100vh-280px)] overflow-y-auto">
        {snapshot.loading && snapshot.releases.length === 0 ? <ReleasesListSkeleton /> : null}
        <ReleaseManagement
          ref={managementRef}
          embedded
          workspaceMode
          area={area}
          projectId={project.id}
          projectName={projectName}
          project={project}
          onWorkspaceStateChange={handleSnapshotChange}
        />
      </div>
    </div>
  );
}

export const ReleasesWorkspace = forwardRef(function ReleasesWorkspace(
  { project, projectName, onSnapshotChange },
  ref,
) {
  const managementRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      openAddCursorRules: () => managementRef.current?.openAddCursorRules?.(),
      openCreateReleaseDialog: () => managementRef.current?.openCreateReleaseDialog?.(),
    }),
    [],
  );

  if (!project?.id) return null;

  return (
    <WorkspaceBody
      project={project}
      projectName={projectName}
      managementRef={managementRef}
      onSnapshotChange={onSnapshotChange}
    />
  );
});
