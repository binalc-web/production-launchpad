import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function ContainerNodeComponent({ id, data, width, height }) {
  const nodeWidth = width ?? data.width ?? 360;
  const nodeHeight = height ?? data.height ?? 120;

  return (
    <div
      className={cn(
        "arch-graph-node arch-container-node overflow-hidden rounded-xl border bg-card/40 shadow-sm transition-all",
        data.isExpanded || data.isFocusedViaChild
          ? "border-primary/60 ring-1 ring-primary/30"
          : "border-primary/25",
        data.isDiffAffected && "border-amber-500/70",
      )}
      style={{ width: nodeWidth, height: nodeHeight }}
    >
      <Handle type="target" position={Position.Top} className="!size-1.5 !bg-muted-foreground" />
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left"
        onClick={(event) => {
          event.stopPropagation();
          data.onToggle?.(data.containerId ?? id);
        }}
      >
        {data.isExpanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span
          className="truncate text-sm font-medium"
          style={{ color: data.layerColor || "var(--foreground)" }}
        >
          {data.name}
        </span>
        {data.searchHitCount > 0 ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
            {data.searchHitCount}
          </span>
        ) : null}
        <span className="ml-auto text-[11px] text-muted-foreground">{data.childCount}</span>
      </button>
      {!data.isExpanded ? (
        <p className="px-3 py-2 text-[11px] text-muted-foreground">
          Click to expand {data.childCount} items
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!size-1.5 !bg-muted-foreground" />
    </div>
  );
}

export const ContainerNode = memo(ContainerNodeComponent);
