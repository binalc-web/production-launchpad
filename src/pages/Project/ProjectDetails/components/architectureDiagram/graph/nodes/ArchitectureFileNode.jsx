import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { nodeTypeColor, NODE_HEIGHT, NODE_WIDTH } from "../constants.js";

const complexityClass = {
  simple: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  complex: "text-red-600 dark:text-red-400",
};

function ArchitectureFileNodeComponent({ id, data }) {
  const barColor = nodeTypeColor(data.nodeType);
  const complexity = complexityClass[data.complexity] ?? complexityClass.simple;
  const isSubFile = data.nodeType === "class";
  const cardWidth = isSubFile ? NODE_WIDTH - 24 : NODE_WIDTH;

  return (
    <div
      className={cn(
        "arch-graph-node arch-file-node relative cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200",
        isSubFile && "border-dashed",
        data.isSelected && "ring-2 ring-primary arch-node-glow",
        data.isDiffChanged && "ring-2 ring-amber-500",
        data.isDiffAffected && "ring-1 ring-blue-500",
        data.isTourHighlighted && "ring-2 ring-amber-500 arch-tour-glow",
        data.isSelectionFaded && "opacity-35",
        data.isTourFaded && "opacity-35",
        data.isNeighbor &&
          !data.isSelected &&
          !data.isTourHighlighted &&
          "opacity-90 ring-1 ring-primary/40",
      )}
      style={{ width: cardWidth, height: NODE_HEIGHT, minHeight: NODE_HEIGHT }}
      onClick={(e) => {
        e.stopPropagation();
        data.onNodeClick?.(id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") data.onNodeClick?.(id);
      }}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: barColor }} />
      <Handle type="target" position={Position.Top} className="!size-1.5 !bg-muted-foreground" />
      <div className="px-3 py-3 pl-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: barColor }}
          >
            {String(data.nodeType || "file")}
          </span>
          <span className={cn("text-[10px] font-mono capitalize", complexity)}>
            {data.complexity}
          </span>
        </div>
        <div className="arch-graph-heading mb-1 truncate text-sm font-semibold text-foreground">
          {data.label}
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {data.summary || "—"}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!size-1.5 !bg-muted-foreground" />
    </div>
  );
}

export const ArchitectureFileNode = memo(ArchitectureFileNodeComponent);
