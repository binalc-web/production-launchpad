import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { STAGE_GUIDE_COPY } from "../constants/stageGuideCopy";

/** On-demand "About this service" info icon — reveals title/description on click. */
export function StageAboutPopover({ stageId, className, align = "start" }) {
  const copy = STAGE_GUIDE_COPY[stageId];
  if (!copy) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-6 shrink-0 text-foreground/70 hover:bg-muted hover:text-foreground",
            className,
          )}
          aria-label={`About ${copy.title}`}
        >
          <Info className="size-3.5" strokeWidth={2.25} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 space-y-1">
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.description}</p>
      </PopoverContent>
    </Popover>
  );
}
