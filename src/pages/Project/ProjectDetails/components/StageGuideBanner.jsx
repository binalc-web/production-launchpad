import { cn } from "@/lib/utils";
import { STAGE_GUIDE_COPY } from "../constants/stageGuideCopy";
import { StageAboutPopover } from "./StageAboutPopover";

/** Compact on-demand stage guide for small screens — icon reveals title/description. */
export function StageGuideBanner({ stageId, className }) {
  const copy = STAGE_GUIDE_COPY[stageId];
  if (!copy) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StageAboutPopover stageId={stageId} />
      <span className="text-sm font-medium text-foreground">{copy.title}</span>
    </div>
  );
}
