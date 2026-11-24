import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { EnsureClientInfoProvider } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { ProjectConsoleCollapsedRail } from "@/pages/Project/ProjectDetails/components/console/ProjectConsoleCollapsedRail";
import { ProjectConsoleSidebar } from "@/pages/Project/ProjectDetails/components/console/ProjectConsoleSidebar";
import { useProjectSidebarOpen } from "@/pages/Project/ProjectDetails/components/console/projectSidebarState";
import { WorkspaceTopBar } from "@/pages/Project/ProjectDetails/components/console/WorkspaceTopBar";
import {
  ProjectAgentAnalyticsProvider,
  useProjectAgentAnalyticsContext,
} from "@/pages/Project/ProjectDetails/context/ProjectAgentAnalyticsContext";
import { AGENT_ANALYTICS_SECTION } from "@/pages/Project/ProjectDetails/constants/projectAgentAnalyticsSection";
import { ALL_PROJECT_REPORTS_SECTION } from "@/pages/Project/ProjectDetails/constants/projectAllReportsSection";
import { QA_ANALYTICS_SECTION } from "@/pages/Project/ProjectDetails/constants/projectQaAnalyticsSection";
import {
  ADMIN_CONSOLE_LINKS,
  DEFAULT_PAGE_BY_SERVICE,
  navForServicePage,
  PLATFORM_CONSOLE_LINKS,
} from "@/pages/Project/ProjectDetails/constants/projectServices";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import { resolveCurrentProjectId, writeLastProjectId } from "@/lib/lastProject";
import { buildProjectClientUrls } from "@/lib/projectClientLinkUrls";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { fetchProjectById, searchProjects } from "@/api/index";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { userCanAccessProjectSettings } from "@/lib/releasePresentation";

function pathnameMatchesRoute(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolvePlatformChromeContext(pathname) {
  if (/^\/projects\/details\/[^/]+\/settings/.test(pathname)) {
    return {
      overlayLabel: "Project settings",
      overlayKey: "project-settings",
      forceExpandSettings: true,
      projectSettingsActive: true,
    };
  }

  if (pathname === "/jobs" || pathname.startsWith("/jobs/")) {
    return {
      overlayLabel: pathname === "/jobs" ? ALL_PROJECT_REPORTS_SECTION.label : "Jobs",
      overlayKey: "all-reports",
      forceExpandAdmin: true,
      activeAdminHref: "/jobs",
    };
  }

  const adminLink = ADMIN_CONSOLE_LINKS.find((link) => pathnameMatchesRoute(pathname, link.href));
  if (adminLink) {
    return {
      overlayLabel: adminLink.label,
      forceExpandAdmin: true,
      activeAdminHref: adminLink.href,
    };
  }

  const platformLink = PLATFORM_CONSOLE_LINKS.find((link) =>
    pathnameMatchesRoute(pathname, link.href),
  );
  if (platformLink) {
    return { overlayLabel: platformLink.label };
  }

  if (pathnameMatchesRoute(pathname, "/notifications")) {
    return { overlayLabel: "Notifications" };
  }

  if (/^\/projects\/roadmap\//.test(pathname)) {
    return { overlayLabel: "Roadmap" };
  }

  return {};
}

function workspacePath(projectId, section) {
  const base = `/projects/details/${encodeURIComponent(projectId)}`;
  if (!section) return base;
  const qs = new URLSearchParams();
  qs.set("section", section);
  return `${base}?${qs.toString()}`;
}

function PlatformConsoleChromeLayout({
  children,
  project,
  projectId,
  isAdmin,
  user,
  routeContext,
}) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useProjectSidebarOpen(true);
  const { clientUrl, previewOnlyUrl } = buildProjectClientUrls(project);
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);

  const goToServicePage = useCallback(
    (nextServiceId, nextPageId) => {
      if (!projectId) return;
      const pageId = nextPageId ?? DEFAULT_PAGE_BY_SERVICE[nextServiceId];
      const { section, area } = navForServicePage(nextServiceId, pageId);
      const qs = new URLSearchParams();
      qs.set("section", section);
      if (area) qs.set("area", area);
      navigate(`/projects/details/${encodeURIComponent(projectId)}?${qs.toString()}`);
    },
    [navigate, projectId],
  );

  const goToProjectSection = useCallback(
    (section) => {
      if (!projectId || !section) return;
      navigate(workspacePath(projectId, section));
    },
    [navigate, projectId],
  );

  const onStatusNavigate = useCallback(
    ({ section, area } = {}) => {
      if (!projectId || !section) return;
      const qs = new URLSearchParams();
      qs.set("section", section);
      if (area) qs.set("area", area);
      navigate(`/projects/details/${encodeURIComponent(projectId)}?${qs.toString()}`);
    },
    [navigate, projectId],
  );

  const onStartJourneyTour = useCallback(() => {
    if (!projectId) return;
    navigate(buildProjectDetailsPathWithResume(projectId, { isAdmin }), {
      state: { startJourneyTour: true },
    });
  }, [isAdmin, navigate, projectId]);

  const analytics = useProjectAgentAnalyticsContext();
  const agentAnalyticsActiveCount = analytics?.activeCount ?? 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 items-stretch">
      {sidebarOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
          <ProjectConsoleSidebar
            className="fixed inset-y-0 left-0 z-50 shadow-xl lg:relative lg:z-auto lg:shadow-none"
            project={project}
            projectName={project?.name}
            overlayKey={routeContext.overlayKey ?? null}
            forceExpandSettings={routeContext.forceExpandSettings ?? false}
            forceExpandAdmin={routeContext.forceExpandAdmin ?? false}
            projectSettingsActive={routeContext.projectSettingsActive ?? false}
            activeAdminHref={routeContext.activeAdminHref ?? null}
            isAdmin={isAdmin}
            canAccessProjectSettings={canAccessProjectSettings}
            agentAnalyticsActiveCount={agentAnalyticsActiveCount}
            onNavigateServicePage={goToServicePage}
            onNavigateCollaboration={() => goToProjectSection("collaboration")}
            onNavigateAllReports={() => navigate("/jobs")}
            onNavigateAgentAnalytics={() => goToProjectSection(AGENT_ANALYTICS_SECTION.id)}
            onNavigateQaAnalytics={() => goToProjectSection(QA_ANALYTICS_SECTION.id)}
            onEditProject={
              projectId && canAccessProjectSettings
                ? () => navigate(buildProjectSettingsPath(projectId))
                : undefined
            }
            onOpenReviewPortal={() => {
              if (!clientUrl) return;
              window.open(clientUrl, "_blank", "noopener,noreferrer");
            }}
            onOpenPreviewOnly={() => {
              if (!previewOnlyUrl) return;
              window.open(previewOnlyUrl, "_blank", "noopener,noreferrer");
            }}
            reviewPortalDisabled={!clientUrl}
            previewOnlyDisabled={!previewOnlyUrl}
          />
        </>
      ) : (
        <ProjectConsoleCollapsedRail
          project={project}
          projectName={project?.name}
          overlayKey={routeContext.overlayKey ?? null}
          onExpand={() => setSidebarOpen(true)}
          onServiceClick={(nextServiceId, nextPageId) => {
            goToServicePage(nextServiceId, nextPageId);
            setSidebarOpen(true);
          }}
          onSettingsClick={() => {
            if (projectId && canAccessProjectSettings) {
              navigate(buildProjectSettingsPath(projectId));
              return;
            }
            setSidebarOpen(true);
          }}
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WorkspaceTopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          project={project}
          projectName={project?.name}
          overlayLabel={routeContext.overlayLabel ?? null}
          activeAdminHref={routeContext.activeAdminHref ?? null}
          isAdmin={isAdmin}
          onStatusNavigate={onStatusNavigate}
          onEditProject={
            projectId && canAccessProjectSettings
              ? () => navigate(buildProjectSettingsPath(projectId))
              : undefined
          }
          onStartJourneyTour={onStartJourneyTour}
          onOpenReviewPortal={() => {
            if (!clientUrl) return;
            window.open(clientUrl, "_blank", "noopener,noreferrer");
          }}
          onOpenPreviewOnly={() => {
            if (!previewOnlyUrl) return;
            window.open(previewOnlyUrl, "_blank", "noopener,noreferrer");
          }}
          reviewPortalDisabled={!clientUrl}
          previewOnlyDisabled={!previewOnlyUrl}
        />
        <div
          data-console-content
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/40 p-4 md:p-5"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Platform routes (project settings, admin tools, account settings) using the
 * same sidebar + workspace top bar as the project console.
 */
export function PlatformConsoleChrome({ children }) {
  const { pathname } = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const projectId = useMemo(() => resolveCurrentProjectId(pathname, params), [pathname, params]);
  const [project, setProject] = useState(null);
  const routeContext = useMemo(() => resolvePlatformChromeContext(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setProject(null);
      return undefined;
    }
    setProject((prev) => (prev && String(prev.id) === String(projectId) ? prev : null));
    (async () => {
      try {
        const data = await fetchProjectById(projectId);
        if (!cancelled && data) {
          setProject(data);
          writeLastProjectId(projectId);
          return;
        }
      } catch {
        /* fall through */
      }
      try {
        const list = await searchProjects({ includeInactive: true });
        if (cancelled) return;
        const found = (Array.isArray(list) ? list : []).find(
          (p) => String(p.id) === String(projectId),
        );
        setProject(found ?? null);
      } catch {
        if (!cancelled) setProject(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const layout = (
    <PlatformConsoleChromeLayout
      project={project}
      projectId={projectId}
      isAdmin={isAdmin}
      user={user}
      routeContext={routeContext}
    >
      {children}
    </PlatformConsoleChromeLayout>
  );

  if (!projectId) {
    return layout;
  }

  return (
    <EnsureClientInfoProvider projectId={projectId}>
      <ProjectAgentAnalyticsProvider projectId={projectId} enabled={isAdmin}>
        {layout}
      </ProjectAgentAnalyticsProvider>
    </EnsureClientInfoProvider>
  );
}
