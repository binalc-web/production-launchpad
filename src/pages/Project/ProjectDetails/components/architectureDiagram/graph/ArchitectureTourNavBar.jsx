import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Floating Previous / Next controls on the graph canvas during an active tour.
 * Keeps navigation visible when the sidebar panel is below the fold.
 */
export function ArchitectureTourNavBar({
  stepTitle,
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onStop,
  isFirst,
  isLast,
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4"
      role="navigation"
      aria-label="Tour navigation"
    >
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 text-xs"
          onClick={onPrev}
          disabled={isFirst}
        >
          Previous
        </Button>

        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="truncate text-xs font-medium text-foreground">{stepTitle}</p>
          <p className="text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          className="shrink-0 text-xs"
          onClick={isLast ? onStop : onNext}
        >
          {isLast ? "Finish" : "Next"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onStop}
          title="Exit tour"
          aria-label="Exit tour"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
