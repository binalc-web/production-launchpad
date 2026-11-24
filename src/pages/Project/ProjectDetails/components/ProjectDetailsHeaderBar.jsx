import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectDetailsPageActions } from "./ProjectDetailsPageActions";
import { ProjectDetailsStatusChips } from "./ProjectDetailsStatusChips";
import { ProjectDetailsStatusStrip } from "./ProjectDetailsStatusBar";
import { ProjectDetailsModelBadge } from "./ProjectDetailsModelBadge";

function HeaderDescription({ description }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const descRef = useRef(null);

  useEffect(() => {
    setModalOpen(false);
  }, [description]);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setCanToggle(el.scrollHeight > el.clientHeight + 1);
  }, [description]);

  if (!description) return null;

  return (
    <div className="mt-1 space-y-1">
      <p
        ref={descRef}
        className="line-clamp-2 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground"
      >
        {description}
      </p>
      {canToggle ? (
        <>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm font-medium text-primary"
            aria-haspopup="dialog"
            onClick={() => setModalOpen(true)}
          >
            Read more
          </Button>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="flex max-h-[min(90vh,40rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
              <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
                <DialogTitle>Description</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

export function ProjectDetailsHeaderBar({
  project,
  projectName,
  projectDescription,
  onStatusNavigate,
  showDeferredScratchCard,
  scratchAgentBannerOpen,
  scratchAgentStatusLine,
  scratchPreviewBuildingBanner,
  showScratchVersionFailedBanner,
  onEditProject,
  onOpenReviewPortal,
  onOpenPreviewOnly,
  reviewPortalDisabled,
  previewOnlyDisabled,
  linksDisabledHint,
  onStartJourneyTour,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-foreground">
                {projectName}
              </h1>
              <ProjectDetailsModelBadge modelRouter={project?.modelRouter} />
              <ProjectDetailsStatusChips
                showDeferredScratchCard={showDeferredScratchCard}
                scratchAgentBannerOpen={scratchAgentBannerOpen}
                scratchAgentStatusLine={scratchAgentStatusLine}
                scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
                showScratchVersionFailedBanner={showScratchVersionFailedBanner}
              />
            </div>
            <HeaderDescription description={projectDescription} />
          </div>

          <div className="flex shrink-0 justify-start lg:justify-end">
            <ProjectDetailsPageActions
              onEditProject={onEditProject}
              onOpenReviewPortal={onOpenReviewPortal}
              onOpenPreviewOnly={onOpenPreviewOnly}
              reviewPortalDisabled={reviewPortalDisabled}
              previewOnlyDisabled={previewOnlyDisabled}
              linksDisabledHint={linksDisabledHint}
              onStartJourneyTour={onStartJourneyTour}
            />
          </div>
        </div>
      </div>

      <ProjectDetailsStatusStrip project={project} onNavigate={onStatusNavigate} />
    </div>
  );
}
