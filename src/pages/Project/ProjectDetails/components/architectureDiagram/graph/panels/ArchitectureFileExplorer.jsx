import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { isGraphUiNode } from "../constants.js";

function buildFileTree(nodes) {
  const root = { name: "", children: new Map(), files: [] };

  for (const node of nodes) {
    if (!node.filePath) continue;
    const parts = node.filePath.split("/").filter(Boolean);
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        cursor.files.push({ name: part, node });
      } else {
        if (!cursor.children.has(part)) {
          cursor.children.set(part, { name: part, children: new Map(), files: [] });
        }
        cursor = cursor.children.get(part);
      }
    }
  }

  return root;
}

function TreeFolder({ folder, depth, onOpenFile }) {
  const [open, setOpen] = useState(depth < 2);
  const childFolders = Array.from(folder.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const files = [...folder.files].sort((a, b) => a.name.localeCompare(b.name));

  if (!folder.name) {
    return (
      <>
        {childFolders.map((child) => (
          <TreeFolder key={child.name} folder={child} depth={depth} onOpenFile={onOpenFile} />
        ))}
        {files.map(({ name, node }) => (
          <button
            key={node.id}
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted/60"
            style={{ paddingLeft: 8 + depth * 12 }}
            onDoubleClick={() => onOpenFile?.(node.id)}
          >
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{name}</span>
          </button>
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
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span>{folder.name}</span>
      </button>
      {open ? (
        <>
          {childFolders.map((child) => (
            <TreeFolder key={child.name} folder={child} depth={depth + 1} onOpenFile={onOpenFile} />
          ))}
          {files.map(({ name, node }) => (
            <button
              key={node.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted/60",
              )}
              style={{ paddingLeft: 24 + depth * 12 }}
              onDoubleClick={() => onOpenFile?.(node.id)}
            >
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{name}</span>
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}

/**
 * FILES tab — browse graph files by path.
 */
export function ArchitectureFileExplorer({ graph, onOpenFile }) {
  const fileNodes = useMemo(
    () => (graph?.nodes ?? []).filter((node) => node.filePath && isGraphUiNode(node)),
    [graph?.nodes],
  );
  const tree = useMemo(() => buildFileTree(fileNodes), [fileNodes]);
  const fileCount = fileNodes.length;

  if (!fileCount) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No file paths in this graph.
      </div>
    );
  }

  return (
    <div className="p-2 pb-10">
      <p className="mb-2 px-2 text-[11px] text-muted-foreground">
        Double-click a file to open it in the graph.
      </p>
      <TreeFolder folder={tree} depth={0} onOpenFile={onOpenFile} />
    </div>
  );
}
