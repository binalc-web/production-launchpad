import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Compass,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { useDocumentTheme } from "@/hooks/useDocumentTheme";
import { userCanAccessProjectSettings } from "@/lib/releasePresentation";
import { getService } from "../../constants/projectServices";
import { buildProjectChatPath } from "../../lib/consoleQuickNavCatalog";
import { ProjectDetailsStatusStrip } from "../ProjectDetailsStatusBar";
import { ProjectDetailsModelBadge } from "../ProjectDetailsModelBadge";
import { ProjectDetailsStatusChips } from "../ProjectDetailsStatusChips";
import { ConsoleQuickNav } from "./ConsoleQuickNav";
import { AssistantHelpMenu } from "./AssistantHelpMenu";

/**
 * Slim workspace content top bar: breadcrumb, status metrics, ⌘K, notifications.
 */
export function WorkspaceTopBar({
  project,
  projectName,
  serviceId = null,
  pageId = null,
  overlayLabel = null,
  activeAdminHref = null,
  isAdmin = false,
  onStatusNavigate,
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
  sidebarOpen = true,
  onToggleSidebar,
  className,
}) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useDocumentTheme();
  const themeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  const embed = searchParams.get("embed") === "1";
  const projectId = project?.id ?? null;
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);

  const isAdminRoute = Boolean(activeAdminHref);
  const service = serviceId ? getService(serviceId) : null;
  const page = service?.pages?.find((p) => p.id === pageId) ?? service?.pages?.[0];
  const title = overlayLabel || page?.label || service?.label || "Console";
  const breadcrumbRoot = isAdminRoute ? "Admin" : projectName || project?.name || "Project";

  return (
    <>
      <header
        data-tour="workspace-top-bar"
        className={cn(
          "flex h-12 shrink-0 items-center gap-2 overflow-hidden border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground md:gap-3 md:px-4",
          className,
        )}
      >
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-100 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" aria-hidden />
            ) : (
              <PanelLeftOpen className="size-4" aria-hidden />
            )}
          </button>
        ) : null}

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[13.5px]"
        >
          <span className="truncate font-semibold text-sidebar-foreground md:hidden" title={title}>
            {title}
          </span>
          <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-hidden md:flex">
            <span
              className={cn(
                "truncate",
                overlayLabel || (service && !isAdminRoute)
                  ? "text-muted-foreground/70"
                  : "font-semibold text-sidebar-foreground",
              )}
            >
              {breadcrumbRoot}
            </span>
            {service && !overlayLabel && !isAdminRoute ? (
              <>
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
                <span
                  className={cn(
                    "truncate",
                    page ? "text-muted-foreground" : "font-semibold text-sidebar-foreground",
                  )}
                >
                  {service.label}
                </span>
              </>
            ) : null}
            {overlayLabel ? (
              <>
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
                <span className="truncate font-semibold text-sidebar-foreground">
                  {overlayLabel}
                </span>
              </>
            ) : page ? (
              <>
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
                <span className="truncate font-semibold text-sidebar-foreground">{title}</span>
              </>
            ) : null}
            <ProjectDetailsStatusChips
              showDeferredScratchCard={showDeferredScratchCard}
              scratchAgentBannerOpen={scratchAgentBannerOpen}
              scratchAgentStatusLine={scratchAgentStatusLine}
              scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
              showScratchVersionFailedBanner={showScratchVersionFailedBanner}
            />
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          {project ? (
            <div className="hidden items-center gap-1 font-mono sm:flex">
              <ProjectDetailsStatusStrip
                project={project}
                onNavigate={onStatusNavigate}
                dense
                className="min-w-0"
                {...(project?.modelRouter
                  ? {
                      itemAddons: {
                        "ai-budget": (
                          <ProjectDetailsModelBadge modelRouter={project.modelRouter} dense />
                        ),
                      },
                    }
                  : {})}
              />
            </div>
          ) : null}

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
              wideTrigger
            />
          ) : null}

          {!embed ? <AssistantHelpMenu /> : null}

          {onStartJourneyTour ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStartJourneyTour}
              title="Replay the project tour"
              aria-label="Tour"
              data-tour="workspace-tour-button"
              className="h-8 shrink-0 gap-1.5 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Compass className="size-4 shrink-0" aria-hidden />
              <span className="hidden text-xs font-medium sm:inline">Tour</span>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            title={themeLabel}
            aria-label={themeLabel}
            className="size-8 shrink-0 p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isDark ? (
              <Sun className="size-4" aria-hidden />
            ) : (
              <Moon className="size-4" aria-hidden />
            )}
          </Button>

          <NotificationBell />
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
