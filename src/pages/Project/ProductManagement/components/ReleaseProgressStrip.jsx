import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatReadableDate, normalizeReleaseStatus } from "@/lib/releasePresentation";
import {
  getActiveRelease,
  getReleaseNextAction,
  getReleaseStatusCounts,
  isReleaseNextActionDismissible,
} from "../utils/releaseWorkflowStatus";

function formatStatusSummary(counts) {
  const parts = [];
  if (counts.draft) parts.push(`${counts.draft} draft`);
  if (counts.active) parts.push(`${counts.active} active`);
  if (counts.locked) parts.push(`${counts.locked} locked`);
  if (counts.skip) parts.push(`${counts.skip} skip`);
  return parts.length ? parts.join(" · ") : "No releases";
}

export function ReleaseProgressStrip({
  releases = [],
  loading = false,
  revisionSeedProgressByRelease = {},
  onNavigate,
  onCreateRelease,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const counts = getReleaseStatusCounts(releases);
  const active = getActiveRelease(releases);
  const nextAction = getReleaseNextAction(releases, revisionSeedProgressByRelease);
  const showCta =
    !dismissed && !isReleaseNextActionDismissible(releases, revisionSeedProgressByRelease);

  const handleGo = () => {
    if (nextAction.action === "create") {
      onCreateRelease?.();
      return;
    }
    if (nextAction.action) onNavigate?.(nextAction.action);
  };

  const nextShip = releases
    .filter((r) => normalizeReleaseStatus(r) === "draft" || normalizeReleaseStatus(r) === "active")
    .map((r) => r.releaseDate)
    .filter(Boolean)
    .sort()[0];

  return (
    <div className="relative flex flex-col gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:gap-4 flex-1 min-w-0">
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {loading ? (
          <Skeleton
            className="h-8 w-32"
            role="status"
            aria-busy="true"
            aria-label="Loading release status"
          />
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground">
            {formatStatusSummary(counts)}
          </span>
        )}
      </div>

      {!dismissed && showCta ? (
        <div className="flex flex-1 items-center justify-between gap-2 min-w-0 rounded-lg bg-primary/5 border border-primary/15 px-3 py-1.5">
          <p className="text-xs sm:text-sm truncate">
            <span className="font-medium text-primary">Next: </span>
            {nextAction.text}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {nextAction.action ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                onClick={handleGo}
              >
                Go
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss suggestion"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden sm:block" />
      )}

      {active || nextShip ? (
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen} className="shrink-0">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs gap-1">
              {active ? `${active.name} active` : "Stats"}
              {active?.versions?.length != null ? ` · ${active.versions.length} rev` : ""}
              <ChevronDown
                className={cn("size-3.5 transition-transform", statsOpen && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 sm:pt-0 sm:absolute sm:right-4 sm:top-full sm:z-20 sm:mt-1 sm:w-64 sm:rounded-lg sm:border sm:bg-popover sm:p-3 sm:shadow-md">
            <div className="space-y-2 text-xs">
              {active ? (
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-muted-foreground">Active release</span>
                  <p className="font-semibold truncate">{active.name}</p>
                </div>
              ) : null}
              {nextShip ? (
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="text-muted-foreground">Next target ship</span>
                  <p className="font-semibold">{formatReadableDate(nextShip)}</p>
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
