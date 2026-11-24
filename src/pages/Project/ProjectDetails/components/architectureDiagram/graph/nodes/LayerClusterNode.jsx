import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { getLayerColor } from "../constants.js";

const complexityClass = {
  simple: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  complex: "text-red-600 dark:text-red-400",
};

function LayerClusterNodeComponent({ data }) {
  const color = getLayerColor(data.layerColorIndex ?? 0);
  const complexity = complexityClass[data.aggregateComplexity] ?? complexityClass.simple;

  return (
    <div
      className={cn(
        "arch-graph-node arch-layer-cluster group relative cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md",
      )}
      style={{ width: 300 }}
      onClick={() => data.onDrillIn?.(data.layerId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") data.onDrillIn?.(data.layerId);
      }}
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-xl"
        style={{ backgroundColor: color.label }}
      />
      <Handle type="target" position={Position.Top} className="!size-2 !bg-muted-foreground" />
      <div className="px-4 py-4 pl-5">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: color.label }}
          >
            Layer
          </span>
          <span className={cn("text-[10px] font-mono capitalize", complexity)}>
            {data.aggregateComplexity}
          </span>
        </div>
        <div className="arch-graph-heading mb-1 text-lg font-semibold text-foreground">
          {data.layerName}
        </div>
        <p className="mb-3 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
          {data.layerDescription || "Explore files and connections in this layer."}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {data.fileCount} file{data.fileCount !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Click to explore →
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!size-2 !bg-muted-foreground" />
    </div>
  );
}

export const LayerClusterNode = memo(LayerClusterNodeComponent);
