import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LaunchpadLogo } from "@/components/common/LaunchpadLogo";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { readLastProjectId } from "@/lib/lastProject";
import { buildProjectChatPath } from "../../lib/consoleQuickNavCatalog";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { ServicesMegaMenu } from "./ServicesMegaMenu";
import { ConsoleSettingsMenu } from "./ConsoleSettingsMenu";
import { ConsoleProjectSettingsMenu } from "./ConsoleProjectSettingsMenu";
import { ConsoleQuickNav } from "./ConsoleQuickNav";
import { ConsoleProjectLine } from "./ConsoleProjectLine";
import { ProjectDetailsStatusStrip } from "../ProjectDetailsStatusBar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { userCanAccessProjectSettings } from "@/lib/releasePresentation";

function logoHref(projectId) {
  if (projectId) {
    return buildProjectDetailsPathWithResume(projectId);
  }
  const last = readLastProjectId();
  if (last) return buildProjectDetailsPathWithResume(last);
  return "/projects";
}

/**
 * Single-row console top bar:
 * Left: Logo → Services | Center: project → status (scrolls) | Right: Switcher → Account
 * Project chat: floating FAB (bottom-right) opens /chat with this project.
 */
export function ConsoleTopBar({
  project,
  projectName,
  projectDescription = null,
  serviceId = null,
  isAdmin = false,
  showServices = true,
  projectHref = null,
  showBackToProject = false,
  showStatusStrip = true,
  onStatusNavigate,
  agentAnalyticsActiveCount = 0,
  agentAnalyticsActive = false,
  collaborationActive = false,
  onNavigateService,
  onNavigateCollaboration,
  onNavigateAgentAnalytics,
  onEditProject,
  onStartJourneyTour,
  onOpenReviewPortal,
  onOpenPreviewOnly,
  reviewPortalDisabled = false,
  previewOnlyDisabled = false,
  showDeferredScratchCard = false,
  scratchAgentBannerOpen = false,
  scratchAgentStatusLine = null,
  scratchPreviewBuildingBanner = false,
  showScratchVersionFailedBanner = false,
  className,
}) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const embed = searchParams.get("embed") === "1";
  const projectId = project?.id ?? null;
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);
  const backHref =
    projectHref ||
    (projectId ? buildProjectDetailsPathWithResume(projectId) : logoHref(null));
  const showCenter = Boolean(projectId || projectName || (showStatusStrip && project));

  return (
    <>
      <header
        data-tour="console-top-bar"
        className={cn(
          "grid h-12 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground",
          className,
        )}
      >
        <div className="flex min-w-0 items-center justify-start gap-2">
          <Link
            to={logoHref(projectId)}
            target={embed ? "_top" : undefined}
            className="flex shrink-0 items-center rounded-md px-1 py-0.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label="Go to project"
          >
            <LaunchpadLogo
              alt="Launchpad"
              className="h-7 w-auto max-w-[6.5rem] object-contain sm:max-w-[7.5rem]"
            />
          </Link>

          {showServices ? (
            <>
              <div className="h-5 w-px shrink-0 bg-sidebar-border" aria-hidden />
              <ServicesMegaMenu
                serviceId={serviceId}
                onNavigateService={onNavigateService}
              />
            </>
          ) : null}
        </div>

        {showCenter ? (
          <div className="flex min-w-0 items-center justify-center gap-2 overflow-x-auto overflow-y-visible px-2">
            <div
              data-tour="console-project-info-bar"
              className="flex h-9 min-w-0 max-w-full items-center gap-2 overflow-x-auto rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {projectId || projectName ? (
                <div className="flex min-w-0 max-w-[min(100%,28rem)] shrink items-center">
                  <ConsoleProjectLine
                    project={project}
                    projectName={projectName}
                    projectDescription={projectDescription}
                    href={showBackToProject ? backHref : null}
                    showDeferredScratchCard={showDeferredScratchCard}
                    scratchAgentBannerOpen={scratchAgentBannerOpen}
                    scratchAgentStatusLine={scratchAgentStatusLine}
                    scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
                    showScratchVersionFailedBanner={showScratchVersionFailedBanner}
                    className="min-w-0 overflow-hidden"
                  />
                </div>
              ) : null}

              {showStatusStrip && project ? (
                <>
                  {projectId || projectName ? (
                    <div className="h-5 w-px shrink-0 bg-sidebar-border" aria-hidden />
                  ) : null}
                  <ProjectDetailsStatusStrip
                    project={project}
                    onNavigate={onStatusNavigate}
                    dense
                    className="min-w-0"
                  />
                </>
              ) : null}

              {projectId ? (
                <>
                  {projectId || projectName || (showStatusStrip && project) ? (
                    <div className="h-5 w-px shrink-0 bg-sidebar-border" aria-hidden />
                  ) : null}
                  <ConsoleProjectSettingsMenu
                    projectId={projectId}
                    project={project}
                    isAdmin={isAdmin}
                    canAccessProjectSettings={canAccessProjectSettings}
                    agentAnalyticsActiveCount={agentAnalyticsActiveCount}
                    agentAnalyticsActive={agentAnalyticsActive}
                    collaborationActive={collaborationActive}
                    onNavigateCollaboration={onNavigateCollaboration}
                    onNavigateAgentAnalytics={onNavigateAgentAnalytics}
                    onEditProject={onEditProject}
                    onStartJourneyTour={onStartJourneyTour}
                    onOpenReviewPortal={onOpenReviewPortal}
                    onOpenPreviewOnly={onOpenPreviewOnly}
                    reviewPortalDisabled={reviewPortalDisabled}
                    previewOnlyDisabled={previewOnlyDisabled}
                    className="border-0 bg-transparent hover:bg-sidebar-accent"
                  />
                </>
              ) : null}
            </div>
            {projectId ? (
              <ConsoleQuickNav
                projectId={projectId}
                project={project}
                isAdmin={isAdmin}
                canAccessProjectSettings={canAccessProjectSettings}
                onEditProject={onEditProject}
                onStartJourneyTour={onStartJourneyTour}
                onOpenReviewPortal={onOpenReviewPortal}
                onOpenPreviewOnly={onOpenPreviewOnly}
                reviewPortalDisabled={reviewPortalDisabled}
                previewOnlyDisabled={previewOnlyDisabled}
              />
            ) : null}
          </div>
        ) : (
          <div className="min-w-0" />
        )}

        <div className="flex shrink-0 items-center justify-end gap-2 pl-1">
          {showBackToProject && backHref ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Link to={backHref}>
                <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Back to project</span>
                <span className="sm:hidden">Project</span>
              </Link>
            </Button>
          ) : null}
          <ProjectSwitcher projectId={projectId} projectName={projectName || project?.name} />
          <NotificationBell />
          <ConsoleSettingsMenu isAdmin={isAdmin} />
        </div>
      </header>

      {projectId && !embed ? (
        <Button
          type="button"
          size="icon"
          asChild
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
        >
          <Link
            to={buildProjectChatPath(projectId)}
            aria-label={`Open ${projectName || project?.name || "Project"} chat`}
            title={`${projectName || project?.name || "Project"} chat`}
          >
            <MessageSquare className="size-6" aria-hidden />
          </Link>
        </Button>
      ) : null}
    </>
  );
}
