import { Button } from "@/components/ui/button";
import { CLIENT_LINK_LIFECYCLE } from "@/constants/releaseLifecycleGuide";
import { buildReleaseManagementDetailsPath } from "@/lib/releaseNavigation";
import { ExternalLink, Lock } from "lucide-react";

export function ClientLinkChatBlockedGuide({
  projectId,
  showDashboardLink = true,
  stakeholderMode = false,
  reason = "no_active_version",
}) {
  const copy = CLIENT_LINK_LIFECYCLE.chatBlocked;
  const steps =
    reason === "awaiting_first_revision"
      ? CLIENT_LINK_LIFECYCLE.activeReleaseAwaitingRevision.steps
      : stakeholderMode
        ? CLIENT_LINK_LIFECYCLE.noActiveOverlay.stakeholderSteps
        : CLIENT_LINK_LIFECYCLE.noActiveOverlay.steps;
  const why =
    reason === "awaiting_first_revision"
      ? copy.awaitingFirstRevisionWhy
      : copy.why;
  const stepsTitle =
    reason === "awaiting_first_revision"
      ? CLIENT_LINK_LIFECYCLE.activeReleaseAwaitingRevision.stepsTitle
      : copy.stepsTitle;

  const dashboardHref = buildReleaseManagementDetailsPath(projectId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Lock className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {copy.title}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {why}
            </p>
          </div>
        </div>

        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {copy.readOnlyHint}
        </p>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {stepsTitle}
          </p>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-foreground">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        {showDashboardLink && dashboardHref && !stakeholderMode ? (
          <Button
            type="button"
            variant="default"
            className="w-full gap-2"
            asChild
          >
            <a href={dashboardHref} target="_blank" rel="noopener noreferrer">
              {copy.openDashboard}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
