import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Compass, ExternalLink, Maximize2, PencilLine } from "lucide-react";

const LINK_BUTTON_CLASS =
  "h-9 gap-2 rounded-none border-r border-border px-3 transition-colors duration-200";

export function ProjectDetailsPageActions({
  onEditProject,
  onOpenReviewPortal,
  onOpenPreviewOnly,
  reviewPortalDisabled,
  previewOnlyDisabled,
  linksDisabledHint,
  onStartJourneyTour,
}) {
  const showSettings = typeof onEditProject === "function";
  const reviewPortalButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={LINK_BUTTON_CLASS}
      disabled={reviewPortalDisabled}
      title={
        reviewPortalDisabled
          ? linksDisabledHint
          : "Open the full client portal with version picker, chat, and feedback tools."
      }
      onClick={onOpenReviewPortal}
    >
      <ExternalLink className="size-4 shrink-0" aria-hidden />
      <span className="hidden md:inline">Review portal</span>
      <span className="md:hidden">Review</span>
    </Button>
  );

  const previewOnlyButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 gap-2 rounded-l-none px-3 transition-colors duration-200"
      disabled={previewOnlyDisabled}
      title={
        previewOnlyDisabled
          ? linksDisabledHint
          : "Open the app preview without header controls, chat, or device frame."
      }
      onClick={onOpenPreviewOnly}
    >
      <Maximize2 className="size-4 shrink-0" aria-hidden />
      <span className="hidden md:inline">Preview only</span>
      <span className="md:hidden">Preview</span>
    </Button>
  );

  return (
    <div className="inline-flex max-w-full shrink-0 flex-wrap items-center rounded-lg border border-border bg-background shadow-xs sm:flex-nowrap">
      {showSettings ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2 rounded-r-none border-r border-border px-3 transition-colors duration-200"
          onClick={onEditProject}
        >
          <PencilLine className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Project settings</span>
          <span className="sm:hidden">Settings</span>
        </Button>
      ) : null}

      {onStartJourneyTour ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={LINK_BUTTON_CLASS}
          title="Replay the project workflow tour"
          onClick={onStartJourneyTour}
        >
          <Compass className="size-4 shrink-0" aria-hidden />
          <span className="hidden md:inline">Tour</span>
        </Button>
      ) : null}

      {reviewPortalDisabled ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex">{reviewPortalButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {linksDisabledHint}
          </TooltipContent>
        </Tooltip>
      ) : (
        reviewPortalButton
      )}

      {previewOnlyDisabled ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex">{previewOnlyButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {linksDisabledHint}
          </TooltipContent>
        </Tooltip>
      ) : (
        previewOnlyButton
      )}
    </div>
  );
}
