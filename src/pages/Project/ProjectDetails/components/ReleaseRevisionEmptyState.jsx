import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RELEASE_LIFECYCLE } from "@/constants/releaseLifecycleGuide";
import { getLatestPriorBaseline, normalizeReleaseStatus } from "@/lib/releaseLifecycle";
import { formatProjectVersionLabel } from "@/lib/utils";
import { Plus } from "lucide-react";

export function ReleaseRevisionEmptyState({
  release,
  releases = [],
  canManageReleases,
  onAddRevision,
  projectSlug,
}) {
  if (!release) return null;

  const status = normalizeReleaseStatus(release);
  const isDraft = status === "draft";
  const prior = getLatestPriorBaseline(releases, {
    excludeReleaseId: release.id,
  });
  const copy = RELEASE_LIFECYCLE.emptyState;

  return (
    <Alert className="border-dashed border-slate-200 bg-slate-50/80">
      <AlertTitle className="text-sm font-semibold text-slate-900">
        {copy.title}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-sm leading-relaxed text-slate-700">
        <ol className="list-decimal space-y-1.5 pl-4">
          {isDraft ? <li>{copy.activateFirst}</li> : null}
          <li>{copy.addRevision}</li>
          <li>{copy.openClientLink}</li>
        </ol>
        {prior ? (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-slate-800">
            {copy.recommendedFromPrior(
              prior.priorReleaseName,
              formatProjectVersionLabel(prior.baselineVersionLabel),
            )}
          </p>
        ) : null}
        {canManageReleases ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => onAddRevision?.(release)}
            >
              <Plus className="size-3.5" aria-hidden />
              Add revision
            </Button>
            {projectSlug ? (
              <Button type="button" size="sm" variant="outline" asChild>
                <a
                  href={`/projects/${encodeURIComponent(String(projectSlug).trim())}?c=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open client link
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
