import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { getLayerColor } from "../constants.js";

function PortalNodeComponent({ data }) {
  const color = getLayerColor(data.layerColorIndex ?? 0);

  return (
    <button
      type="button"
      className={cn(
        "arch-graph-node rounded-lg border border-dashed bg-card/80 px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/60",
      )}
      style={{ width: 220, borderColor: color.border }}
      onClick={(event) => {
        event.stopPropagation();
        data.onNavigate?.(data.targetLayerId);
      }}
    >
      <Handle type="target" position={Position.Top} className="!size-1.5 !bg-muted-foreground" />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        External layer
      </p>
      <p className="truncate text-sm font-medium text-foreground">{data.targetLayerName}</p>
      <p className="text-[11px] text-muted-foreground">{data.connectionCount} connections</p>
      <Handle type="source" position={Position.Bottom} className="!size-1.5 !bg-muted-foreground" />
    </button>
  );
}

export const PortalNode = memo(PortalNodeComponent);
