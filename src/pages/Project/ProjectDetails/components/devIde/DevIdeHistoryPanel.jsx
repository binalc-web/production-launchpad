import { GitCommitHorizontal, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function DevIdeHistorySkeleton() {
  return (
    <ul
      className="m-0 list-none space-y-0.5 p-0"
      role="status"
      aria-busy="true"
      aria-label="Loading history"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-1 px-1.5 py-1.5">
          <span className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 flex-1" />
          </span>
          <Skeleton className="h-2.5 w-24" />
        </li>
      ))}
    </ul>
  );
}

function formatCommitDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Recent commits list for the IDE History pane.
 */
export function DevIdeHistoryPanel({
  commits,
  loading,
  error,
  selectedSha,
  onSelectCommit,
  onRefresh,
  refreshing = false,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="shrink-0 border-b border-border px-2 py-2">
        <div className="flex items-center gap-1">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[11px] font-medium text-foreground">
            History
            {commits.length > 0 ? (
              <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[10px] text-muted-foreground">
                {commits.length > 99 ? "99+" : commits.length}
              </span>
            ) : null}
          </p>
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => void onRefresh()}
              disabled={refreshing || loading}
              aria-label="Refresh history"
              title="Refresh history"
            >
              {refreshing || loading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3" aria-hidden />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1 pb-8">
        {loading ? (
          <DevIdeHistorySkeleton />
        ) : error ? (
          <p className="px-2 py-4 text-xs text-destructive">{error}</p>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <GitCommitHorizontal className="size-6 text-muted-foreground/60" aria-hidden />
            <p className="text-xs text-muted-foreground">No commits yet</p>
          </div>
        ) : (
          <ul className="m-0 list-none space-y-0.5 p-0">
            {commits.map((commit) => {
              const sha = commit.sha || "";
              const active = selectedSha && selectedSha === sha;
              const dateLabel = formatCommitDate(commit.committedAt);
              return (
                <li key={sha || commit.shaShort}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded px-1.5 py-1.5 text-left text-xs hover:bg-muted/60",
                      active && "bg-muted text-foreground",
                    )}
                    title={commit.messageFirstLine || sha}
                    onClick={() => onSelectCommit?.(commit)}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {commit.shaShort || sha.slice(0, 7)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {commit.messageFirstLine || "(no message)"}
                      </span>
                    </span>
                    {(commit.authorName || dateLabel) && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {[commit.authorName, dateLabel].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
