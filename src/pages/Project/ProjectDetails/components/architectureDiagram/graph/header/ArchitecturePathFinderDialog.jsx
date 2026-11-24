import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { findShortestPath } from "../layout/searchGraphNodes.js";

/**
 * Pick two nodes and highlight the shortest path between them.
 */
export function ArchitecturePathFinderDialog({
  open,
  onOpenChange,
  graph,
  startNodeId,
  endNodeId,
  pathNodeIds,
  onSelectNode,
  onComputePath,
  onClear,
}) {
  const nodeOptions = useMemo(
    () =>
      (graph?.nodes ?? [])
        .filter((node) => node.name)
        .slice(0, 200)
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [graph],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Find path between nodes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs text-muted-foreground">
            Start node
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={startNodeId ?? ""}
              onChange={(event) => onSelectNode("start", event.target.value || null)}
            >
              <option value="">Select start</option>
              {nodeOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            End node
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={endNodeId ?? ""}
              onChange={(event) => onSelectNode("end", event.target.value || null)}
            >
              <option value="">Select end</option>
              {nodeOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={onComputePath}>
              Find path
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClear}>
              Clear
            </Button>
          </div>
          {pathNodeIds.length > 0 ? (
            <p className="text-xs text-muted-foreground">Path length: {pathNodeIds.length} nodes</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { findShortestPath };
