import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildDevIdeFileTree, filterDevIdePaths } from "./buildDevIdeFileTree.js";
import { setRepoPathDragData } from "./devIdeDragPath.js";

function FileRow({ name, path, depth, paddingLeft, activePath, onOpenFile }) {
  return (
    <button
      type="button"
      draggable
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted/60 active:cursor-grabbing",
        activePath === path && "bg-muted text-foreground",
      )}
      style={{ paddingLeft }}
      onClick={() => onOpenFile?.(path)}
      onDragStart={(e) => setRepoPathDragData(e, path)}
      title={`${path} — drag into chat to reference`}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{name}</span>
    </button>
  );
}

function TreeFolder({ folder, depth, activePath, onOpenFile }) {
  const [open, setOpen] = useState(false);
  const childFolders = Array.from(folder.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const files = [...folder.files].sort((a, b) => a.name.localeCompare(b.name));

  if (!folder.name) {
    return (
      <>
        {childFolders.map((child) => (
          <TreeFolder
            key={child.name}
            folder={child}
            depth={depth}
            activePath={activePath}
            onOpenFile={onOpenFile}
          />
        ))}
        {files.map(({ name, path }) => (
          <FileRow
            key={path}
            name={name}
            path={path}
            depth={depth}
            paddingLeft={8 + depth * 12}
            activePath={activePath}
            onOpenFile={onOpenFile}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs font-medium hover:bg-muted/60"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {open ? (
          <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{folder.name}</span>
      </button>
      {open ? (
        <>
          {childFolders.map((child) => (
            <TreeFolder
              key={child.name}
              folder={child}
              depth={depth + 1}
              activePath={activePath}
              onOpenFile={onOpenFile}
            />
          ))}
          {files.map(({ name, path }) => (
            <FileRow
              key={path}
              name={name}
              path={path}
              depth={depth + 1}
              paddingLeft={24 + depth * 12}
              activePath={activePath}
              onOpenFile={onOpenFile}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

export function DevIdeFileTree({
  paths,
  loading,
  error,
  activePath,
  onOpenFile,
  truncated = false,
  onRefresh,
  refreshing = false,
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterDevIdePaths(paths, query), [paths, query]);
  const tree = useMemo(() => buildDevIdeFileTree(filtered), [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="shrink-0 border-b border-border px-2 py-2">
        <div className="mb-1.5 flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">Files</p>
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => void onRefresh()}
              disabled={refreshing || loading}
              aria-label="Refresh files"
              title="Refresh files"
            >
              {refreshing || loading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3" aria-hidden />
              )}
            </Button>
          ) : null}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="h-8 pl-7 text-xs"
            aria-label="Search files"
          />
        </div>
        {truncated ? (
          <p className="mt-1.5 px-0.5 text-[10px] text-muted-foreground">
            Tree truncated — some files may be hidden.
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1 pb-8">
        {loading ? (
          <div
            className="space-y-1.5 px-2 py-2"
            role="status"
            aria-busy="true"
            aria-label="Loading files"
          >
            {["w-1/2", "w-2/3", "w-3/5", "w-3/4", "w-1/2", "w-2/3"].map((width, i) => (
              <div key={i} className={cn("flex items-center gap-2", i % 3 !== 0 && "pl-4")}>
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className={`h-3.5 ${width}`} />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="px-2 py-4 text-xs text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            {query.trim() ? "No matching files." : "No files found."}
          </p>
        ) : (
          <TreeFolder folder={tree} depth={0} activePath={activePath} onOpenFile={onOpenFile} />
        )}
      </div>
    </div>
  );
}
