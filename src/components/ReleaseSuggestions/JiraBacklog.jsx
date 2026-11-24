import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { JiraProjectBadge } from "@/components/jira/JiraProjectBadge";
import { ExternalLink, Loader2, Search } from "lucide-react";

function JiraIssuesSkeleton() {
  return (
    <div
      className="space-y-2 rounded-md border border-border bg-background p-2"
      role="status"
      aria-busy="true"
      aria-label="Loading Jira issues"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-2 px-2 py-2">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const JiraBacklog = ({ jiraBacklog, sourcesLoading }) => {
  if (!jiraBacklog) return null;

  const {
    backlogDisabled,
    refresh,
    loading: jiraLoading,
    loadingMore = false,
    hasMore = false,
    projectKey,
    sentinelRef,
    refreshDisabled,
    typeFilters = {},
    summarySearch = {},
    error: jiraError,
    tickets: jiraTickets = [],
    selectedKeys = [],
    toggleKey,
    toggleSelectAll,
  } = jiraBacklog;

  if (backlogDisabled) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-muted/10 p-4">
        <h3 className="text-sm font-semibold text-foreground">Jira backlog</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Jira backlog is unavailable until this project has a linked Jira OAuth connection and a
          Jira project key set in Project settings.
        </p>
      </section>
    );
  }

  const {
    includeEpic,
    setIncludeEpic,
    includeStory,
    setIncludeStory,
    includeTask,
    setIncludeTask,
  } = typeFilters;

  const searchActive = Boolean(summarySearch.value?.trim());

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Jira backlog</h3>
          <JiraProjectBadge projectKey={projectKey} />
        </div>
        <p className="text-xs text-muted-foreground">
          Epic, Story, and Task. Search loads from Jira; scroll for more issues.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 gap-y-2">
        <span className="text-xs font-medium text-muted-foreground">Types</span>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={includeEpic}
            onCheckedChange={(v) => setIncludeEpic(v === true)}
            aria-label="Include Epics"
          />
          Epic
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={includeStory}
            onCheckedChange={(v) => setIncludeStory(v === true)}
            aria-label="Include Stories"
          />
          Story
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={includeTask}
            onCheckedChange={(v) => setIncludeTask(v === true)}
            aria-label="Include Tasks"
          />
          Task
        </label>
      </div>
      <div className="space-y-1.5 w-full">
        <Label htmlFor={summarySearch.id} className="text-xs">
          Key / summary search
        </Label>
        <div className="flex w-full items-center gap-2">
          <Input
            id={summarySearch.id}
            value={summarySearch.value}
            onChange={(e) => summarySearch.onChange(e.target.value)}
            placeholder="Issue key or summary (searches Jira)"
            className="h-9 flex-1 min-w-0 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 transition-colors duration-200"
            disabled={jiraLoading || refreshDisabled || sourcesLoading}
            onClick={refresh}
            aria-label="Refresh Jira search"
          >
            {jiraLoading && !loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>
      {jiraError ? <p className="text-xs text-destructive">{jiraError}</p> : null}

      {jiraTickets.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {jiraTickets.length} issue{jiraTickets.length === 1 ? "" : "s"} loaded
              {hasMore ? "+" : ""} · {selectedKeys.length} selected
            </span>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={toggleSelectAll}
            >
              {selectedKeys.length === jiraTickets.length ? "Clear selection" : "Select all loaded"}
            </Button>
          </div>
          <ul className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2 m-0 list-none">
            {jiraTickets.map((t) => {
              const checked = selectedKeys.includes(t.key);
              return (
                <li
                  key={t.key}
                  className={cn(
                    "flex gap-2 rounded-md border border-transparent px-2 py-2 transition-colors duration-200",
                    checked && "border-primary/30 bg-primary/5",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleKey(t.key)}
                    aria-label={`Select ${t.key}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {t.key}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {t.type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{t.status}</span>
                    </div>
                    <p className="text-sm text-foreground leading-snug">{t.summary}</p>
                    {t.url ? (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Open in Jira
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
            <li ref={sentinelRef} className="h-1 list-none" aria-hidden />
          </ul>
          {loadingMore ? (
            <div
              className="space-y-2"
              role="status"
              aria-busy="true"
              aria-label="Loading more Jira issues"
            >
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : null}
          {!hasMore && !loadingMore && jiraTickets.length > 0 ? (
            <p className="text-xs text-muted-foreground">End of list</p>
          ) : null}
        </div>
      ) : jiraLoading ? (
        <JiraIssuesSkeleton />
      ) : !jiraError ? (
        <p className="text-xs text-muted-foreground">
          {searchActive
            ? "No Epic, Story, or Task issues matched your search."
            : "No issues loaded yet."}
        </p>
      ) : null}
    </section>
  );
};
