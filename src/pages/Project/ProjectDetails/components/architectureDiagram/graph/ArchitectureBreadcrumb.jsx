import { cn } from "@/lib/utils";
import { getLayerColor } from "./constants.js";

/**
 * Breadcrumb navigation for overview / layer-detail.
 */
export function ArchitectureBreadcrumb({ navigationLevel, activeLayerName, onBack }) {
  if (navigationLevel === "overview") {
    return (
      <div className="arch-breadcrumb inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
        Project overview
      </div>
    );
  }

  return (
    <div className="arch-breadcrumb inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
      <button type="button" className="font-medium text-primary hover:underline" onClick={onBack}>
        Project
      </button>
      <span className="text-muted-foreground">›</span>
      <span className="font-semibold text-foreground">{activeLayerName}</span>
      <span className="text-[10px] text-muted-foreground">(Esc to go back)</span>
    </div>
  );
}

/**
 * Layer color legend with counts.
 */
export function ArchitectureLayerLegend({ layers, navigationLevel, activeLayerId }) {
  if (!layers?.length) return null;

  return (
    <div className="arch-layer-legend flex flex-wrap items-center gap-3 text-xs">
      <span className="font-medium text-muted-foreground">Layers</span>
      {layers.map((layer, index) => {
        const color = getLayerColor(index);
        const isActive = navigationLevel === "layer-detail" && layer.id === activeLayerId;
        const count = Array.isArray(layer.nodeIds) ? layer.nodeIds.length : 0;
        return (
          <div
            key={layer.id}
            className={cn(
              "flex items-center gap-1.5",
              !isActive && navigationLevel === "layer-detail" && "opacity-50",
            )}
          >
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: color.label }}
            />
            <span
              className={cn(isActive ? "font-medium text-foreground" : "text-muted-foreground")}
            >
              {layer.name} ({count})
            </span>
          </div>
        );
      })}
    </div>
  );
}
