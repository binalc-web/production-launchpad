import { cn } from "@/lib/utils";
import { laneVisualForLayerKey } from "./laneVisuals.js";

/** Lane background group behind a tier column. */
export function InfraAnalysisGroupNode({ data }) {
  const layerKey = data.layerKey ?? "";
  const visual = laneVisualForLayerKey(layerKey);

  return (
    <div
      className={cn(
        "pointer-events-none flex h-full w-full flex-col rounded-2xl border border-slate-200/80 bg-slate-50/40 px-6 py-5 motion-reduce:transition-none",
        visual.containerClass,
      )}
    >
      <span
        className={cn(
          "mb-3 inline-flex w-fit max-w-full items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm",
          visual.ribbonClass,
        )}
      >
        <span className={visual.labelClass}>{data.label}</span>
      </span>
    </div>
  );
}
