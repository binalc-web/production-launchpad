import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReleasesSnapshot } from "@/pages/Project/ProductManagement/ReleasesSnapshotContext";
import { getActiveRelease } from "@/pages/Project/ProductManagement/utils/releaseWorkflowStatus";
import {
  navigateToApplicationImplement,
  navigateToPreviewImplement,
  navigateToReleases,
} from "@/lib/releaseNavigation";
import { ReleaseScopePanel } from "../ReleaseScopePanel";

/**
 * Preview or App repositories implement page — forced target, links back to scope.
 */
export function ConsoleImplementPage({ project, canManageReleases, forcedTarget }) {
  const [, setSearchParams] = useSearchParams();
  const snapshot = useReleasesSnapshot();
  const active = getActiveRelease(snapshot?.releases);
  const loading = Boolean(snapshot?.loading) && !active;

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading active release">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Activate a release in Release Management before implementing.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => navigateToReleases(setSearchParams, "active")}
        >
          Open Active release
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ReleaseScopePanel
        release={active}
        project={project}
        canEdit={canManageReleases}
        viewMode="implement"
        forcedImplementTarget={forcedTarget}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="link"
          className="h-auto px-0"
          onClick={() => navigateToReleases(setSearchParams, "active")}
        >
          Edit scope in Release Management
        </Button>
        {forcedTarget === "platform" ? (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0"
            onClick={() => navigateToApplicationImplement(setSearchParams)}
          >
            Need the customer app? Open App repositories → Implement
          </Button>
        ) : (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0"
            onClick={() => navigateToPreviewImplement(setSearchParams)}
          >
            Need preview-only? Open Preview → Implement
          </Button>
        )}
      </div>
    </div>
  );
}
