import { FileDiff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { setRepoPathDragData } from "./devIdeDragPath.js";

function FileRowsSkeleton({ label }) {
  return (
    <div className="space-y-1.5 px-2 py-2" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded-sm" />
          <Skeleton className="h-3.5 flex-1" />
        </div>
      ))}
    </div>
  );
}

function statusLetter(status) {
  switch (status) {
    case "added":
      return "A";
    case "removed":
      return "D";
    case "renamed":
      return "R";
    case "editing":
      return "…";
    default:
      return "M";
  }
}

function statusClass(status) {
  switch (status) {
    case "added":
      return "text-emerald-600 dark:text-emerald-400";
    case "removed":
      return "text-destructive";
    case "renamed":
      return "text-sky-600 dark:text-sky-400";
    case "editing":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-amber-700 dark:text-amber-300";
  }
}

function fileName(path) {
  const parts = String(path || "").split("/");
  return parts[parts.length - 1] || path;
}

function parentDir(path) {
  const parts = String(path || "").split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

/**
 * Source-control style changed files list (working tree or commit review).
 */
export function DevIdeChangesPanel({
  files,
  loading,
  error,
  base,
  head,
  truncated,
  activePath,
  onOpenFile,
  title = "Changes",
  subtitle,
  emptyLabel = "No changes vs base",
  onClear,
  onRefresh,
  refreshing = false,
}) {
  const count = files.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="shrink-0 border-b border-border px-2 py-2">
        {onClear ? (
          <button
            type="button"
            className="mb-1 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            ← Changes
          </button>
        ) : null}
        <div className="flex items-center gap-1">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[11px] font-medium text-foreground">
            {title}
            {count > 0 ? (
              <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[10px] text-muted-foreground">
                {count > 99 ? "99+" : count}
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
              aria-label="Refresh changes"
              title="Refresh changes"
            >
              {refreshing || loading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3" aria-hidden />
              )}
            </Button>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
        {base || head ? (
          <p
            className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
            title={`${base}...${head}`}
          >
            {base || "?"}...{head || "?"}
          </p>
        ) : null}
        {truncated ? (
          <p className="mt-1 text-[10px] text-muted-foreground">List truncated by GitHub.</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1 pb-8">
        {loading ? (
          <FileRowsSkeleton label="Loading changes" />
        ) : error ? (
          <p className="px-2 py-4 text-xs text-destructive">{error}</p>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <FileDiff className="size-6 text-muted-foreground/60" aria-hidden />
            <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          </div>
        ) : (
          <ul className="m-0 list-none space-y-0.5 p-0">
            {files.map((file) => {
              const path = file.path;
              const active = activePath === path;
              const parent = parentDir(path);
              const additions = Number(file.additions) || 0;
              const deletions = Number(file.deletions) || 0;
              return (
                <li key={`${file.status}:${path}`}>
                  <button
                    type="button"
                    draggable
                    className={cn(
                      "flex w-full cursor-grab items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:bg-muted/60 active:cursor-grabbing",
                      active && "bg-muted text-foreground",
                    )}
                    title={`${path} — drag into chat to reference`}
                    onClick={() => onOpenFile?.(file)}
                    onDragStart={(e) => setRepoPathDragData(e, path)}
                  >
                    <span
                      className={cn(
                        "w-3 shrink-0 text-center font-mono text-[10px] font-semibold",
                        statusClass(file.status),
                      )}
                    >
                      {statusLetter(file.status)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-foreground">{fileName(path)}</span>
                      {parent ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">{parent}</span>
                      ) : null}
                    </span>
                    {file.status !== "editing" && (additions > 0 || deletions > 0) ? (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {additions > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{additions}
                          </span>
                        ) : null}
                        {deletions > 0 ? (
                          <span className="ml-1 text-destructive">-{deletions}</span>
                        ) : null}
                      </span>
                    ) : null}
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
