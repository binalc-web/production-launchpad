import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isGraphUiNode, nodeTypeColor, SUB_FILE_NODE_TYPES } from "../constants.js";
import { normalizeEdges } from "../layout/graphIndexes.js";

/**
 * INFO tab — selected node metadata and connections.
 */
export function ArchitectureNodeInfo({ node, graph, onNavigateToNode }) {
  const childNodes = useMemo(() => {
    if (!node || !graph) return [];
    const children = [];
    for (const edge of normalizeEdges(graph.edges)) {
      if (edge.source !== node.id || edge.type !== "contains") continue;
      const child = graph.nodes?.find((n) => n.id === edge.target);
      if (child && SUB_FILE_NODE_TYPES.has(child.type) && isGraphUiNode(child))
        children.push(child);
    }
    return children.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [node, graph]);

  const connections = useMemo(() => {
    if (!node || !graph) return [];
    const childIds = new Set(childNodes.map((child) => child.id));
    const items = [];
    for (const edge of normalizeEdges(graph.edges)) {
      if (edge.source === node.id) {
        const target = graph.nodes?.find((n) => n.id === edge.target);
        if (
          !target ||
          !isGraphUiNode(target) ||
          (edge.type === "contains" && childIds.has(target.id))
        ) {
          continue;
        }
        items.push({ edge, other: target, direction: "out" });
      } else if (edge.target === node.id) {
        const source = graph.nodes?.find((n) => n.id === edge.source);
        if (!source || !isGraphUiNode(source)) continue;
        items.push({ edge, other: source, direction: "in" });
      }
    }
    return items;
  }, [node, graph, childNodes]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
        <p>Select a node in the graph to see details.</p>
      </div>
    );
  }

  const barColor = nodeTypeColor(node.type);

  return (
    <div className="space-y-4 px-4 pt-4 pb-10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" style={{ borderColor: barColor, color: barColor }}>
          {String(node.type || "node").toUpperCase()}
        </Badge>
        {node.complexity ? (
          <Badge variant="secondary" className="capitalize">
            {node.complexity}
          </Badge>
        ) : null}
      </div>
      <div>
        <h3 className="arch-graph-heading text-lg font-semibold text-foreground">
          {node.name || node.id}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {node.summary || "No summary available."}
        </p>
      </div>
      {node.filePath ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            File path
          </p>
          <code className="block break-all rounded bg-muted px-2 py-1 text-xs text-foreground">
            {node.filePath}
          </code>
        </div>
      ) : null}
      {node.tags?.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {childNodes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Defined in this file ({childNodes.length})
          </p>
          <ul className="space-y-1">
            {childNodes.map((child) => {
              const childColor = nodeTypeColor(child.type);
              return (
                <li key={child.id}>
                  <button
                    type="button"
                    className="w-full rounded-md border border-border px-2 py-2 text-left text-xs hover:bg-muted/60"
                    onClick={() => onNavigateToNode?.(child.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase"
                        style={{ borderColor: childColor, color: childColor }}
                      >
                        {child.type}
                      </Badge>
                      <span className="font-medium text-foreground">{child.name}</span>
                      {child.complexity ? (
                        <span className="ml-auto capitalize text-muted-foreground">
                          {child.complexity}
                        </span>
                      ) : null}
                    </div>
                    {child.summary ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {child.summary}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {connections.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Connections
          </p>
          <ul className="space-y-1">
            {connections.map(({ edge, other, direction }) => (
              <li key={`${edge.id}-${other.id}`}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md border border-border px-2 py-1.5 text-left text-xs hover:bg-muted/60",
                  )}
                  onClick={() => onNavigateToNode?.(other.id)}
                >
                  <span className="text-muted-foreground">{direction === "out" ? "→" : "←"} </span>
                  <span className="font-medium text-foreground">{other.name || other.id}</span>
                  {edge.type ? <span className="text-muted-foreground"> · {edge.type}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
