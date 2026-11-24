import {
  CalendarDays,
  CheckCircle,
  ChevronDown,
  History,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EpicStoryPreviewDialog } from "@/components/ReleaseSuggestions/EpicStoryPreviewDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT,
  isReleaseLockPending,
  normalizeBackendAgentStatus,
} from "@/lib/backendAgentStatus";
import {
  RELEASE_STATUS_OPTIONS,
  formatChangelogTimestamp,
  formatChangelogScalar,
  changelogFieldLabel,
  formatReadableDate,
  isLockedReleaseMissingActualShipDate,
  isReleaseLocked,
  normalizeReleaseStatus,
  releaseCardAccentBarClass,
  releaseStatusPresentation,
} from "@/lib/releasePresentation";
import { ReleaseBackendSyncSkippedBadge } from "@/components/release/ReleaseBackendSyncSkippedBadge";
import { ReleaseTagsBadges } from "@/components/release/ReleaseTagsInput";
import { hasSkipLockAgentOperations } from "@/lib/releaseLockPresentation";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import { RELEASE_LIFECYCLE } from "@/constants/releaseLifecycleGuide";
import { ReleaseRevisionEmptyState } from "@/pages/Project/ProjectDetails/components/ReleaseRevisionEmptyState";
import { Package, Info } from "lucide-react";

function collectReleaseTags(releaseList) {
  const map = new Map();
  for (const r of releaseList || []) {
    for (const raw of Array.isArray(r?.tags) ? r.tags : []) {
      const tag = String(raw || "").trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!map.has(key)) map.set(key, tag);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function releaseMatchesSearch(release, query) {
  if (!query) return true;
  if (
    String(release?.name || "")
      .toLowerCase()
      .includes(query)
  ) {
    return true;
  }
  const tags = Array.isArray(release?.tags) ? release.tags : [];
  return tags.some((t) =>
    String(t || "")
      .toLowerCase()
      .includes(query),
  );
}

function releaseHasAnyTag(release, selectedLower) {
  if (!selectedLower.size) return true;
  const tags = Array.isArray(release?.tags) ? release.tags : [];
  return tags.some((t) => selectedLower.has(String(t || "").toLowerCase()));
}

export function ReleasesOverviewPanel({
  displayReleases,
  releases,
  workspaceMode,
  area,
  listTitle,
  canManageReleases,
  canEditRelease,
  activeRelease,
  project,
  revisionSeedProgressByRelease,
  migrateFrontendProgressByRelease,
  changelogByRelease,
  changelogLoadingId,
  loadChangelog,
  openEditRelease,
  requestStatusChange,
  setAddRevisionRelease,
  statusUpdatingId,
  statusConfirm,
  revertBaselineSubmitting,
  openCreateReleaseDialog,
  setRevertBaselineDialog,
  setRevertBaselineReason,
  layoutVariant = "default",
  highlightReleaseId = null,
  onDismissHighlightRelease,
  onNavigateToActiveScope,
  onManageReleaseScope,
}) {
  const [releaseSearch, setReleaseSearch] = useState("");
  const [tagFilter, setTagFilter] = useState([]);

  const showHeader = !workspaceMode;
  const isActiveSidebar = layoutVariant === "active-sidebar";
  const emptyActive = workspaceMode && area === "active" && displayReleases.length === 0;
  const showFilters = !isActiveSidebar && (area === "overview" || !workspaceMode);

  const availableTags = useMemo(() => collectReleaseTags(releases), [releases]);

  const selectedTagKeys = useMemo(
    () => new Set(tagFilter.map((t) => String(t).toLowerCase())),
    [tagFilter],
  );

  const filteredReleases = useMemo(() => {
    const q = releaseSearch.trim().toLowerCase();
    return (displayReleases || []).filter(
      (r) => releaseMatchesSearch(r, q) && releaseHasAnyTag(r, selectedTagKeys),
    );
  }, [displayReleases, releaseSearch, selectedTagKeys]);

  const filtersActive = Boolean(releaseSearch.trim()) || tagFilter.length > 0;

  const toggleTagFilter = (tag) => {
    const key = String(tag).toLowerCase();
    setTagFilter((prev) => {
      const has = prev.some((t) => String(t).toLowerCase() === key);
      if (has) return prev.filter((t) => String(t).toLowerCase() !== key);
      return [...prev, tag];
    });
  };

  const clearFilters = () => {
    setReleaseSearch("");
    setTagFilter([]);
  };

  const releaseControlHeight = "h-9";
  const releaseActionBtnClass = (compact) =>
    cn(releaseControlHeight, "gap-2", compact ? "w-full justify-center" : "w-fit");
  const releaseSelectTriggerClass = cn(
    releaseControlHeight,
    "w-full border-border bg-card transition-colors hover:border-slate-300 hover:bg-muted/90",
  );

  /** Manage scope + Edit — inline with the release title row (scope hidden on Active release tab). */
  const renderReleaseTitleActions = (
    release,
    backendPlanAgentRunning,
    { includeManageScope = true } = {},
  ) => (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {includeManageScope && onManageReleaseScope && canEditRelease ? (
        isReleaseLocked(release) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className={cn(releaseActionBtnClass(false), "cursor-not-allowed")}
                >
                  <Layers className="size-3.5" />
                  Manage scope
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-left leading-snug">
              Locked releases cannot change scope.
            </TooltipContent>
          </Tooltip>
        ) : backendPlanAgentRunning ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className={cn(releaseActionBtnClass(false), "cursor-not-allowed")}
                >
                  <Layers className="size-3.5" />
                  Manage scope
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-left leading-snug">
              {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={releaseActionBtnClass(false)}
            onClick={() => onManageReleaseScope(release.id)}
          >
            <Layers className="size-3.5" />
            Manage scope
          </Button>
        )
      ) : null}
      {canEditRelease &&
        (backendPlanAgentRunning ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  className={cn(
                    releaseActionBtnClass(false),
                    "bg-muted/70 text-muted-foreground ring-1 ring-slate-200/60 opacity-90",
                    "cursor-not-allowed",
                  )}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-left leading-snug">
              {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn(
              releaseActionBtnClass(false),
              "bg-muted/70 text-foreground ring-1 ring-slate-200/60",
            )}
            onClick={() => openEditRelease(release)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ))}
    </div>
  );

  if (emptyActive) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Package className="size-12 mb-4 opacity-40" aria-hidden />
        <h3 className="text-lg font-medium text-foreground mb-2">No active release</h3>
        <p className="text-sm max-w-md mb-4">
          Set a release to Active from Overview to enable revisions and the live client build.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        workspaceMode ? "space-y-4" : "rounded-xl border border-border bg-card shadow-sm",
        isActiveSidebar && "min-w-0",
      )}
    >
      {showHeader ? (
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{listTitle}</h3>
        </div>
      ) : workspaceMode && area === "active" && !isActiveSidebar ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h3 className="min-w-0 text-sm font-semibold text-foreground">{listTitle}</h3>
          {displayReleases[0]
            ? renderReleaseTitleActions(
                displayReleases[0],
                isReleaseLockPending(displayReleases[0]),
                { includeManageScope: false },
              )
            : null}
        </div>
      ) : null}
      <div className={cn(showHeader ? "p-6" : workspaceMode ? "" : "p-6")}>
        {showFilters && (releases?.length > 0 || displayReleases?.length > 0) ? (
          <div className="mb-5 space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={releaseSearch}
                  onChange={(e) => setReleaseSearch(e.target.value)}
                  placeholder="Search releases by name or tag…"
                  className="h-9 border-border bg-background pl-9"
                  aria-label="Search releases"
                />
              </div>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="size-3.5" />
                  Clear filters
                </Button>
              ) : null}
            </div>
            {availableTags.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Filter by tag
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const active = selectedTagKeys.has(tag.toLowerCase());
                    return (
                      <button
                        key={tag.toLowerCase()}
                        type="button"
                        onClick={() => toggleTagFilter(tag)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                        aria-pressed={active}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {filtersActive ? (
              <p className="text-xs text-muted-foreground">
                Showing {filteredReleases.length} of {displayReleases.length} release
                {displayReleases.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ) : null}

        {displayReleases.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
            <div className="mb-4 opacity-50 text-muted-foreground">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Releases Found</h3>
            <p className="mb-6">Create your first release to get started.</p>
            {canManageReleases && (
              <Button className="text-white" onClick={openCreateReleaseDialog}>
                Create Release
              </Button>
            )}
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
            <Search className="mb-3 size-10 opacity-40" aria-hidden />
            <h3 className="mb-1 text-base font-medium text-foreground">No matching releases</h3>
            <p className="mb-4 max-w-sm text-sm">Try a different search or clear tag filters.</p>
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 gap-6", !isActiveSidebar && "lg:grid-cols-2")}>
            {filteredReleases.map((release) => {
              const statusUi = releaseStatusPresentation(release);
              const backendPlanAgentRunning = isReleaseLockPending(release);
              const missingShipDate = isLockedReleaseMissingActualShipDate(release);
              const compactCard = isActiveSidebar;
              const isOverviewCard = area === "overview";
              return (
                <div
                  key={release.id}
                  className={cn(
                    "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm shadow-slate-200/40 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60",
                    missingShipDate &&
                      "border-amber-300/90 ring-1 ring-amber-200/70 dark:border-amber-800/60 dark:ring-amber-900/40",
                  )}
                >
                  <div
                    className={`h-1 w-full shrink-0 ${releaseCardAccentBarClass(release)}`}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "flex flex-col border-b border-border",
                      compactCard ? "gap-3 px-4 py-4" : "gap-4 px-5 py-5 sm:px-6",
                    )}
                  >
                    {isOverviewCard ? (
                      <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
                        <div className="min-w-0 max-w-full flex-1">
                          <h4
                            className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl"
                            title={release.name}
                          >
                            {release.name}
                          </h4>
                          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                            {release.isMvp ? (
                              <Badge className="w-fit bg-primary font-bold text-white">MVP</Badge>
                            ) : null}
                            <ReleaseTagsBadges
                              tags={release.tags}
                              activeTags={tagFilter}
                              onTagClick={showFilters ? toggleTagFilter : undefined}
                            />
                          </div>
                        </div>
                        {renderReleaseTitleActions(release, backendPlanAgentRunning)}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "flex min-w-0 flex-col gap-4",
                        !compactCard && "lg:flex-row lg:items-start lg:justify-between",
                      )}
                    >
                      <div className="flex min-w-0 w-full flex-col items-start gap-2.5">
                        {!isOverviewCard ? (
                          <div className="flex min-w-0 w-full items-center gap-2">
                            <h4
                              className={cn(
                                "min-w-0 flex-1 truncate font-semibold tracking-tight text-foreground",
                                compactCard ? "text-base" : "text-lg sm:text-xl",
                              )}
                              title={release.name}
                            >
                              {release.name}
                            </h4>
                            {release.isMvp ? (
                              <Badge className="shrink-0 bg-primary font-bold text-white">
                                MVP
                              </Badge>
                            ) : null}
                            <ReleaseTagsBadges
                              tags={release.tags}
                              className="shrink-0"
                              activeTags={tagFilter}
                              onTagClick={showFilters ? toggleTagFilter : undefined}
                            />
                            {renderReleaseTitleActions(release, backendPlanAgentRunning, {
                              includeManageScope: false,
                            })}
                          </div>
                        ) : null}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "inline-flex w-fit max-w-full shrink-0 items-center gap-2 rounded-full px-3 py-1 text-left text-xs font-semibold",
                                statusUi.pillClass,
                              )}
                            >
                              <span
                                className={`size-2 shrink-0 rounded-full ${statusUi.dotClass}`}
                                aria-hidden
                              />
                              <span className={cn(!compactCard && "truncate")}>
                                {statusUi.label}
                              </span>
                              {normalizeReleaseStatus(release) === "active" && (
                                <Sparkles
                                  className="size-3.5 shrink-0 text-emerald-600/80"
                                  aria-hidden
                                />
                              )}
                              {isReleaseLocked(release) && (
                                <Lock className="size-3.5 shrink-0 text-rose-600/80" aria-hidden />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="max-w-[280px] text-left leading-snug"
                          >
                            {statusUi.hint}
                          </TooltipContent>
                        </Tooltip>
                        {isReleaseLocked(release) && hasSkipLockAgentOperations(release) ? (
                          <ReleaseBackendSyncSkippedBadge />
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          "flex min-w-0 w-full flex-col gap-3",
                          !compactCard && "lg:max-w-md lg:items-end",
                        )}
                      >
                        <div
                          className={cn(
                            "flex w-full flex-col gap-2",
                            !compactCard &&
                              "sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:justify-end",
                          )}
                        >
                          <div
                            className={cn(
                              "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 ring-1",
                              compactCard ? "w-full text-xs" : "w-full sm:w-auto",
                              missingShipDate
                                ? "bg-amber-50/80 text-amber-950 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-50 dark:ring-amber-800/60"
                                : "bg-muted/70 text-foreground ring-slate-200/60",
                            )}
                          >
                            <CalendarDays
                              className={cn(
                                "size-3.5 shrink-0",
                                missingShipDate
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground",
                              )}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                "min-w-0 font-semibold text-foreground",
                                compactCard && "text-xs leading-snug wrap-break-word",
                              )}
                            >
                              <time dateTime={release.startDate ?? undefined}>
                                {formatReadableDate(release.startDate)}
                              </time>
                              <span className="mx-1 font-normal text-muted-foreground">→</span>
                              <time dateTime={release.releaseDate ?? undefined}>
                                {formatReadableDate(release.releaseDate)}
                              </time>
                            </span>
                          </div>
                          {isReleaseLocked(release) ? (
                            <div
                              className={cn(
                                "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-xs ring-1",
                                compactCard ? "w-full" : "w-full sm:w-auto",
                                missingShipDate
                                  ? "bg-amber-50/80 font-medium text-amber-950 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-50 dark:ring-amber-800/60"
                                  : "bg-muted/50 text-muted-foreground ring-border/60",
                              )}
                            >
                              <span className="text-muted-foreground">Shipped</span>
                              <time
                                dateTime={release.actualReleaseDate ?? undefined}
                                className={
                                  missingShipDate
                                    ? "font-semibold text-amber-800 dark:text-amber-200"
                                    : "font-semibold text-foreground"
                                }
                              >
                                {missingShipDate
                                  ? "Not set"
                                  : formatReadableDate(release.actualReleaseDate)}
                              </time>
                            </div>
                          ) : null}
                        </div>
                        {revisionSeedProgressByRelease[release.id] ||
                        migrateFrontendProgressByRelease[release.id] ? (
                          <div className="flex w-full flex-wrap items-center justify-end gap-2">
                            {revisionSeedProgressByRelease[release.id] ? (
                              <span className="inline-flex max-w-full min-w-0 flex-[1_1_12rem] flex-col gap-0.5 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-2 py-1 text-[11px] font-medium text-emerald-950 sm:max-w-[min(100%,18rem)]">
                                <span className="inline-flex items-center gap-1.5">
                                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                                  <span className="min-w-0 leading-tight wrap-break-word">
                                    {RELEASE_LIFECYCLE.ongoingSeed.headline}:{" "}
                                    {normalizeBackendAgentStatus(
                                      revisionSeedProgressByRelease[release.id]?.lastStatus,
                                    )}
                                  </span>
                                </span>
                                <span className="pl-5.5 text-[10px] font-normal leading-snug text-emerald-900/85">
                                  {RELEASE_LIFECYCLE.ongoingSeed.detail}
                                </span>
                              </span>
                            ) : null}
                            {migrateFrontendProgressByRelease[release.id] ? (
                              <span className="inline-flex max-w-full min-w-0 flex-[1_1_12rem] flex-col gap-0.5 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[11px] font-medium text-amber-950 sm:max-w-[min(100%,18rem)]">
                                <span className="inline-flex items-center gap-1.5">
                                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                                  <span className="min-w-0 leading-tight wrap-break-word">
                                    {migrateFrontendProgressByRelease[release.id]?.pipeline
                                      ?.headline ??
                                      `Build Frontend App: ${normalizeBackendAgentStatus(
                                        migrateFrontendProgressByRelease[release.id]?.lastStatus,
                                      )}`}
                                  </span>
                                </span>
                                {migrateFrontendProgressByRelease[release.id]?.pipeline?.detail ? (
                                  <span className="pl-5.5 text-[10px] font-normal leading-snug text-amber-900/85">
                                    {migrateFrontendProgressByRelease[release.id].pipeline.detail}
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {missingShipDate ? (
                      <Alert className="border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        <TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="text-amber-950 dark:text-amber-50">
                          Actual ship date missing
                        </AlertTitle>
                        <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm">
                              This release is locked but has no ship date. Add one so the roadmap
                              shows when it went live.
                            </span>
                            {canEditRelease && !backendPlanAgentRunning ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="shrink-0 border-amber-300/80 bg-white hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-950"
                                onClick={() => openEditRelease(release, { focusShipDate: true })}
                              >
                                Add ship date
                              </Button>
                            ) : null}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {highlightReleaseId != null &&
                    Number(release.id) === Number(highlightReleaseId) ? (
                      <Alert className="border-primary/30 bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle>Next steps for this release</AlertTitle>
                        <AlertDescription>
                          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm">
                            <li>
                              Set status to <strong>Active</strong> using the control below.
                            </li>
                            <li>
                              Add stories in <strong>Release scope</strong> on the Active release
                              tab.
                            </li>
                          </ol>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {onNavigateToActiveScope ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => onNavigateToActiveScope(release.id)}
                              >
                                Go to Release scope
                              </Button>
                            ) : null}
                            {onDismissHighlightRelease ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={onDismissHighlightRelease}
                              >
                                Dismiss
                              </Button>
                            ) : null}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <EpicStoryPreviewDialog
                      description={release.description}
                      releaseDescription={release.releaseDescription}
                      jiraReleaseSync={release.jiraReleaseSync}
                      variant="management"
                    />

                    {canManageReleases && (
                      <Collapsible
                        defaultOpen={false}
                        onOpenChange={(open) => {
                          if (
                            open &&
                            !changelogByRelease[release.id] &&
                            changelogLoadingId !== release.id
                          ) {
                            loadChangelog(release.id);
                          }
                        }}
                      >
                        <CollapsibleTrigger
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40/80 px-3 text-left text-xs font-medium text-foreground hover:bg-muted/80",
                            releaseControlHeight,
                          )}
                        >
                          <History className="size-3.5 shrink-0" />
                          Change history
                          <ChevronDown className="ml-auto size-4 shrink-0 opacity-60" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          {changelogLoadingId === release.id ? (
                            <div
                              className="space-y-3"
                              role="status"
                              aria-busy="true"
                              aria-label="Loading changelog"
                            >
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-md" />
                              ))}
                            </div>
                          ) : (
                            <ul className="max-h-80 space-y-3 overflow-y-auto pr-0.5">
                              {(changelogByRelease[release.id] || []).length === 0 ? (
                                <li className="rounded-md border border-dashed border-border bg-muted/40/80 px-3 py-4 text-center text-sm text-muted-foreground">
                                  No changes recorded yet.
                                </li>
                              ) : (
                                (changelogByRelease[release.id] || []).map((log) => (
                                  <li
                                    key={log.id}
                                    className="overflow-hidden rounded-lg border border-border/90 bg-card shadow-sm"
                                  >
                                    <div className="flex flex-col gap-1 border-b border-border bg-muted/40/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                      <span className="text-sm font-semibold text-foreground">
                                        {log.changedBy?.name || log.changedByEmail || "Unknown"}
                                      </span>
                                      <time
                                        className="text-xs text-muted-foreground"
                                        dateTime={log.createdAt}
                                      >
                                        {formatChangelogTimestamp(log.createdAt)}
                                      </time>
                                    </div>
                                    <div className="px-3 py-2">
                                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        Reason
                                      </p>
                                      <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                                        {log.reason}
                                      </p>
                                    </div>
                                    {log.changes &&
                                    typeof log.changes === "object" &&
                                    Object.keys(log.changes).length > 0 ? (
                                      <div className="border-t border-border px-2 py-2">
                                        <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                          What changed
                                        </p>
                                        <div className="overflow-x-auto rounded-md border border-border">
                                          <table className="w-full min-w-[280px] text-left text-xs">
                                            <thead>
                                              <tr className="border-b border-border bg-muted/40/80 text-slate-600">
                                                <th className="px-2 py-1.5 font-semibold">Field</th>
                                                <th className="px-2 py-1.5 font-semibold">
                                                  Before
                                                </th>
                                                <th className="px-2 py-1.5 font-semibold">After</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {Object.entries(log.changes).map(([key, val]) => {
                                                const isDiff =
                                                  val &&
                                                  typeof val === "object" &&
                                                  "from" in val &&
                                                  "to" in val;
                                                return (
                                                  <tr
                                                    key={key}
                                                    className="border-b border-slate-50 last:border-0"
                                                  >
                                                    <td className="px-2 py-2 align-top font-medium text-foreground">
                                                      {changelogFieldLabel(key)}
                                                    </td>
                                                    <td className="px-2 py-2 align-top text-slate-600">
                                                      {isDiff
                                                        ? formatChangelogScalar(val.from)
                                                        : formatChangelogScalar(val)}
                                                    </td>
                                                    <td className="px-2 py-2 align-top text-foreground">
                                                      {isDiff ? formatChangelogScalar(val.to) : "—"}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ) : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {canManageReleases && (
                      <div className="border-t border-border pt-4">
                        <div
                          className={cn(
                            "grid grid-cols-1 gap-4",
                            !compactCard && "sm:grid-cols-2 sm:items-end sm:gap-5",
                          )}
                        >
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Set status
                            </span>
                            {isReleaseLocked(release) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex w-full">
                                    <Select value={normalizeReleaseStatus(release)} disabled>
                                      <SelectTrigger
                                        className={cn(
                                          releaseSelectTriggerClass,
                                          "cursor-not-allowed bg-muted/90 text-muted-foreground opacity-90 shadow-none hover:border-border hover:bg-muted/90",
                                        )}
                                      >
                                        <SelectValue placeholder="Status" />
                                      </SelectTrigger>
                                      <SelectContent align="start">
                                        {RELEASE_STATUS_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[280px] text-left leading-snug"
                                >
                                  This release is locked! You cannot unlock it. You can still view
                                  this release by selecting a version from the client link.
                                </TooltipContent>
                              </Tooltip>
                            ) : backendPlanAgentRunning ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex w-full">
                                    <Select value={normalizeReleaseStatus(release)} disabled>
                                      <SelectTrigger
                                        className={cn(
                                          releaseControlHeight,
                                          "w-full cursor-not-allowed border-amber-200/80 bg-amber-50/50 text-amber-950/70 opacity-90 shadow-none",
                                        )}
                                      >
                                        <SelectValue placeholder="Status" />
                                      </SelectTrigger>
                                      <SelectContent align="start">
                                        {RELEASE_STATUS_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[280px] text-left leading-snug"
                                >
                                  {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Select
                                value={normalizeReleaseStatus(release)}
                                onValueChange={(v) => requestStatusChange(release.id, v)}
                                disabled={
                                  statusUpdatingId === release.id ||
                                  statusConfirm?.releaseId === release.id
                                }
                              >
                                <SelectTrigger className={releaseSelectTriggerClass}>
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                  {RELEASE_STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Add revision
                            </span>
                            {isReleaseLocked(release) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex w-full">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled
                                      className={cn(
                                        releaseActionBtnClass(true),
                                        "cursor-not-allowed rounded-lg border border-dashed border-border bg-muted/40/90 font-medium text-muted-foreground shadow-none",
                                      )}
                                    >
                                      <Plus
                                        className="size-4 shrink-0 opacity-60"
                                        strokeWidth={2}
                                      />
                                      Add revision
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[260px] text-center leading-snug"
                                >
                                  Locked releases cannot receive new revisions. View this release
                                  from the client link version selector.
                                </TooltipContent>
                              </Tooltip>
                            ) : backendPlanAgentRunning ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex w-full">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled
                                      className={cn(
                                        releaseActionBtnClass(true),
                                        "cursor-not-allowed rounded-lg border border-dashed border-amber-200/80 bg-amber-50/50 font-medium text-amber-950/60 shadow-none",
                                      )}
                                    >
                                      <Plus
                                        className="size-4 shrink-0 opacity-60"
                                        strokeWidth={2}
                                      />
                                      Add revision
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[260px] text-center leading-snug"
                                >
                                  {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="default"
                                className={releaseActionBtnClass(true)}
                                onClick={() => setAddRevisionRelease(release)}
                              >
                                <Plus className="size-4 text-white" strokeWidth={2.25} />
                                Add revision
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex flex-1 flex-col pt-2 pb-5",
                      compactCard ? "px-4 pb-4" : "px-5 pb-5 sm:px-6 sm:pb-6",
                    )}
                  >
                    {release.versions.length === 0 ? (
                      <ReleaseRevisionEmptyState
                        release={release}
                        releases={releases}
                        canManageReleases={canManageReleases}
                        projectSlug={project?.slug}
                        onAddRevision={(r) => setAddRevisionRelease(r)}
                      />
                    ) : null}
                    {release.versions.length > 0 ? (
                      <Collapsible
                        defaultOpen={false}
                        className="rounded-lg border border-border bg-card"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "group flex w-full text-left hover:bg-muted/40 data-[state=open]:rounded-b-none",
                              releaseControlHeight,
                              compactCard
                                ? "h-auto min-h-9 flex-col items-start gap-1 px-3 py-2.5"
                                : "h-auto min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5",
                            )}
                          >
                            <span className="text-sm font-medium text-foreground">
                              Revision history
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {release.versions.length} revision
                              {release.versions.length !== 1 ? "s" : ""}
                              <span className="mx-1.5 text-border">·</span>
                              <span className="text-muted-foreground">Latest</span>
                              <span className="ml-1 text-foreground">
                                {formatProjectVersionLabel(release.versions[0].version)}
                              </span>
                            </span>
                            <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 border-t border-border p-4 pt-3">
                            {release.versions.filter(Boolean).map((version) => (
                              <div
                                key={version.id ?? version.version}
                                className={cn(
                                  "flex min-w-0 gap-3 rounded-lg p-3 transition-colors hover:border-primary",
                                  compactCard
                                    ? "flex-col"
                                    : "flex-col sm:flex-row sm:items-center sm:justify-between",
                                  version.isActive
                                    ? "border border-primary bg-primary/10"
                                    : "border border-border bg-card",
                                )}
                              >
                                <div className="min-w-0 flex flex-col gap-2">
                                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="font-mono text-sm font-medium text-foreground">
                                      {formatProjectVersionLabel(version.version)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(version.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {/* <div className="flex items-start gap-2 w-full">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                                          RoadMap Items:
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          {version.roadmapItems.map((item) => (
                                            <Badge
                                              key={item.id}
                                              className="rounded-md"
                                            >
                                              {item.title}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div> */}
                                </div>
                                <div
                                  className={cn(
                                    "flex shrink-0",
                                    compactCard
                                      ? "w-full"
                                      : "flex-col items-end gap-2 sm:flex-row sm:items-center",
                                  )}
                                >
                                  {canManageReleases &&
                                    String(version.gitTag || "").trim() !== "" && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span
                                            className={cn("inline-flex", compactCard && "w-full")}
                                          >
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className={cn(
                                                "gap-1.5",
                                                compactCard && "w-full justify-center",
                                              )}
                                              disabled={
                                                backendPlanAgentRunning ||
                                                !activeRelease ||
                                                revertBaselineSubmitting ||
                                                (normalizeReleaseStatus(release) === "active" &&
                                                  version.isActive)
                                              }
                                              onClick={() => {
                                                if (!activeRelease) return;
                                                setRevertBaselineReason("");
                                                setRevertBaselineDialog({
                                                  version,
                                                  baselineSourceReleaseName: release.name,
                                                });
                                              }}
                                            >
                                              <RotateCcw className="size-3.5" aria-hidden />
                                              {compactCard ? "Revert" : "Revert to Revision"}
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        {backendPlanAgentRunning ? (
                                          <TooltipContent side="top" className="max-w-[280px]">
                                            {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                          </TooltipContent>
                                        ) : normalizeReleaseStatus(release) === "active" &&
                                          version.isActive ? (
                                          <TooltipContent side="top" className="max-w-[260px]">
                                            The live build already matches this revision. Pick an
                                            earlier revision to roll back.
                                          </TooltipContent>
                                        ) : !activeRelease ? (
                                          <TooltipContent side="top" className="max-w-[260px]">
                                            Set a release to <strong>Active</strong> first. New
                                            commits are created on{" "}
                                            <code className="text-xs">main</code> and a new revision
                                            is added only to the active release.
                                          </TooltipContent>
                                        ) : (
                                          <TooltipContent side="top" className="max-w-[280px]">
                                            Revert commits on the platform branch so the tree
                                            matches this revision, then tag a new revision on{" "}
                                            <strong>{activeRelease.name}</strong>.
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    )}
                                  {version.isActive && (
                                    <Badge className="bg-primary text-primary-foreground">
                                      <CheckCircle size={14} /> Active
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
