import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDeployMap } from "@/api";
import {
  writeProjectJourneyResume,
  readProjectJourneyResume,
  projectJourneyLocationFromSearchParams,
  rememberedAreaForStage,
} from "@/lib/projectJourneyResume";
import { writeLastProjectId } from "@/lib/lastProject";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import { ClientInfoProvider } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { ReleasesTabContent } from "./ReleasesTabContent";
import {
  ReleasesSnapshotContext,
  useSeedReleasesSnapshot,
} from "@/pages/Project/ProductManagement/ReleasesSnapshotContext";
import {
  ReleaseLockStreamProvider,
  useReleaseLockStreamContext,
} from "../context/ReleaseLockStreamContext";
import { useMigrateFrontendStreamContext } from "@/hooks/useMigrateFrontendStream";
import { ReleaseLockLivePanel } from "./ReleaseLockLivePanel";
import { MigrateFrontendLivePanel } from "./MigrateFrontendLivePanel";
import { WebAppPreviewTabContent } from "./WebAppPreviewTabContent";
import { ProjectAgentConfigTabContent } from "./ProjectAgentConfigTabContent";
import { ProjectClientFeedbackPanel } from "@/pages/ClientFeedbacks/ProjectClientFeedbackPanel";
import { ProjectQaSectionTabs } from "./ProjectQaSectionTabs";
import { ProjectQaAnalyticsPanel } from "@/pages/QaAnalytics/ProjectQaAnalyticsPanel";
import { BackendCodeTabContent } from "./BackendCodeTabContent";
import { CloudInfraTabContent } from "./CloudInfraTabContent";
import { InfraAnalysisTabContent } from "./infraAnalysis/InfraAnalysisTabContent";
import { CloudDebugTabContent } from "./CloudDebugTabContent";
import { ArchitectureDiagramTabContent } from "./architectureDiagram/ArchitectureDiagramTabContent";
import { EnvironmentTabContent } from "./EnvironmentTabContent";
import { CodeSnippetTabContent } from "./CodeSnippetTabContent";
import { CollaborationTabContent } from "./CollaborationTabContent";
import { AgentAnalyticsTabContent } from "./AgentAnalyticsTabContent";
import { ProjectAutomationsPanel } from "./ProjectAutomationsPanel";
import JobsPage from "@/pages/Jobs/JobsPage";
import { ProjectManagementTabContent } from "./ProjectManagementTabContent";
import { ProjectDiscoveryBridgeProvider } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import { BacklogTabContent } from "./BacklogTabContent";
import { ProjectJourneyTour, useTourSidebar } from "./ProjectJourneyTour";
import { ProjectConsoleSidebar } from "./console/ProjectConsoleSidebar";
import { ProjectConsoleCollapsedRail } from "./console/ProjectConsoleCollapsedRail";
import { WorkspaceTopBar } from "./console/WorkspaceTopBar";
import { useProjectSidebarOpen } from "./console/projectSidebarState";
import { ConsoleImplementPage } from "./console/ConsoleImplementPage";
import { activeAreaForStage, navForStage, normalizeStage } from "../constants/projectStages";
import { navForServicePage, resolveConsoleLocation } from "../constants/projectServices";
import {
  normalizeSection,
  DEFAULT_SECTION,
  isLegacyPromptSkillsSection,
} from "../constants/projectSections";
import { AGENT_ANALYTICS_SECTION } from "../constants/projectAgentAnalyticsSection";
import { PROJECT_AUTOMATIONS_SECTION } from "../constants/projectAutomationsSection";
import { ALL_PROJECT_REPORTS_SECTION } from "../constants/projectAllReportsSection";
import { QA_ANALYTICS_SECTION } from "../constants/projectQaAnalyticsSection";
import { useAuth } from "@/context/AuthContext";
import { userCanAccessProjectSettings } from "@/lib/releasePresentation";
import {
  ProjectAgentAnalyticsProvider,
  useProjectAgentAnalyticsContext,
} from "../context/ProjectAgentAnalyticsContext";
import {
  normalizeCloudInfraArea,
  normalizeBackendArea,
  normalizeWebAppArea,
} from "@/pages/Project/ProductManagement/constants";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { SectionPanel } from "./SectionPanel";

function buildFeedbackProjectSummary(project, projectName) {
  const jc = project?.jiraConnection;
  if (!jc && !projectName) return null;
  let jiraSiteHost = "";
  if (jc?.jiraBaseUrl) {
    try {
      jiraSiteHost = new URL(jc.jiraBaseUrl).host;
    } catch {
      jiraSiteHost = String(jc.jiraBaseUrl);
    }
  }
  return {
    projectName,
    jiraProjectKey: jc?.jiraProjectKey ?? null,
    jiraProjectDisplayName: null,
    jiraConnectionId: jc?.id ?? null,
    jiraConnectionLabel: jc?.atlassianAccountEmail ?? null,
    jiraSiteHost: jiraSiteHost || null,
  };
}

function JourneyLayout({
  project,
  projectName,
  clientUrl,
  previewOnlyUrl,
  releaseManagementRef,
  onProjectUpdated,
  canManageReleases,
  hasDeveloperRepo,
  hasLaunchpadRepo,
  canManagePrompts,
  addCursorRulesDisabledHint,
  canMigrateFrontend,
  onMigrateFrontend,
  migrateFrontendDisabledHint,
  onExportLaunchpadZip,
  exportLaunchpadZipDisabledHint,
  exportLaunchpadZipLoading,
  feedbackSummary,
  feedbackReloadSignal,
  navigateToFeedback,
  onFeedbackSectionActivate,
  onSnapshotChange,
  isAdmin,
  onNavigateAgentAnalytics,
  onNavigateAllReports,
  onNavigateCollaboration,
  agentAnalyticsActiveCount,
  projectDescription = null,
  onStartJourneyTour,
  showDeferredScratchCard = false,
  scratchAgentBannerOpen = false,
  scratchAgentStatusLine = null,
  scratchPreviewBuildingBanner = false,
  showScratchVersionFailedBanner = false,
  reviewPortalDisabled = false,
  previewOnlyDisabled = false,
  linksDisabledHint = "",
  topBanner = null,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tourActive, tourExpandServiceId, tourStepId } = useTourSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deployEnvironmentCount, setDeployEnvironmentCount] = useState(0);
  const [, setAutomationsCount] = useState(0);
  const areasByStageRef = useRef({});
  const lastProfileRef = useRef("company");
  const hydratedProjectIdRef = useRef(null);

  useEffect(() => {
    if (project?.id) writeLastProjectId(project.id);
  }, [project?.id]);

  const rawSection = searchParams.get("section");
  const activeSection = normalizeSection(rawSection, { isAdmin });
  const rawArea = searchParams.get("area");
  const activeStage = normalizeStage(activeSection, rawArea);
  const activeArea = activeAreaForStage(activeStage, activeSection, rawArea);
  const activeCloudInfraArea = normalizeCloudInfraArea(rawArea);
  const activeWebAppArea = normalizeWebAppArea(
    isLegacyPromptSkillsSection(rawSection) ? "agent-config" : rawArea,
  );
  const activeBackendArea = normalizeBackendArea(rawArea);

  const {
    visible: lockPanelVisible,
    releaseId: lockReleaseId,
    runStatus: lockRunStatus,
    runPhase: lockRunPhase,
    runLog: lockRunLog,
    agentStream: lockAgentStream,
    startedAtMs: lockStartedAtMs,
    dismissLockPanel,
  } = useReleaseLockStreamContext();

  const {
    livePanelVisible: migratePanelVisible,
    liveReleaseId: migrateLiveReleaseId,
    runStatus: migrateRunStatus,
    runPhase: migrateRunPhase,
    runLog: migrateRunLog,
    agentStream: migrateAgentStream,
    migrateStartedAtMs,
    platformSyncDetail: migratePlatformSyncDetail,
    migrateDevLayoutMeta,
    dismissLivePanel: dismissMigratePanel,
  } = useMigrateFrontendStreamContext();

  const showReleaseLockPanel =
    lockPanelVisible &&
    lockReleaseId &&
    (activeSection === "releases" ||
      (activeSection === "backend" && activeBackendArea === "backend-code"));

  const showMigrateFrontendPanel =
    migratePanelVisible &&
    migrateLiveReleaseId &&
    (activeSection === "releases" ||
      (activeSection === "web-app" && activeWebAppArea === "preview"));

  const activeProfile = searchParams.get("profile") || "company";
  const agentAnalyticsView = activeSection === AGENT_ANALYTICS_SECTION.id;
  const allReportsView = activeSection === ALL_PROJECT_REPORTS_SECTION.id;
  const collaborationView = activeSection === "collaboration";
  const qaAnalyticsView = activeSection === "qa-analytics";
  const overlayView = agentAnalyticsView || allReportsView || collaborationView || qaAnalyticsView;
  const overlayKey = agentAnalyticsView
    ? "agent-analytics"
    : allReportsView
      ? "all-reports"
      : collaborationView
        ? "collaboration"
        : qaAnalyticsView
          ? "qa-analytics"
          : null;
  const overlayLabel = agentAnalyticsView
    ? AGENT_ANALYTICS_SECTION.label
    : allReportsView
      ? ALL_PROJECT_REPORTS_SECTION.label
      : collaborationView
        ? "Team Activity"
        : qaAnalyticsView
          ? QA_ANALYTICS_SECTION.label
          : null;

  const [sidebarOpen, setSidebarOpen] = useProjectSidebarOpen(true);
  const [expandSettingsOnOpen, setExpandSettingsOnOpen] = useState(false);

  useEffect(() => {
    if (tourActive) setSidebarOpen(true);
  }, [tourActive, setSidebarOpen]);

  const hasDeployEnvironments = deployEnvironmentCount > 0;

  useEffect(() => {
    const projectId = project?.id;
    if (!projectId) {
      setDeployEnvironmentCount(0);
      return undefined;
    }

    let cancelled = false;
    getDeployMap(projectId)
      .then((data) => {
        if (!cancelled) {
          const count = Array.isArray(data?.environments) ? data.environments.length : 0;
          setDeployEnvironmentCount(count);
        }
      })
      .catch(() => {
        if (!cancelled) setDeployEnvironmentCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;

    if (hydratedProjectIdRef.current !== project.id) {
      const resume = readProjectJourneyResume(project.id, { isAdmin });
      areasByStageRef.current = resume?.areasByStage ?? {};
      lastProfileRef.current = resume?.lastProfile ?? resume?.profile ?? "company";
      hydratedProjectIdRef.current = project.id;
    }

    if (!overlayView && activeArea) {
      areasByStageRef.current = { ...areasByStageRef.current, [activeStage]: activeArea };
    }
    if (!overlayView && activeStage === "profiles") {
      lastProfileRef.current = activeProfile;
    }

    const location = projectJourneyLocationFromSearchParams(searchParams);
    writeProjectJourneyResume(
      project.id,
      {
        ...location,
        areasByStage: areasByStageRef.current,
        lastProfile: lastProfileRef.current,
      },
      { isAdmin },
    );
  }, [project?.id, searchParams, isAdmin, overlayView, activeArea, activeStage, activeProfile]);

  const { serviceId, pageId } = resolveConsoleLocation(activeSection, rawArea);

  const setConsoleNav = useCallback(
    (nextServiceId, nextPageId) => {
      const { section, area } = navForServicePage(nextServiceId, nextPageId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", section);
          if (area) next.set("area", area);
          else next.delete("area");

          if (nextPageId === "profiles") {
            next.set("profile", lastProfileRef.current || next.get("profile") || "company");
          } else if (nextServiceId !== "product-strategy" || nextPageId !== "profiles") {
            next.delete("profile");
          }

          if (!(section === "releases" && area === "active")) next.delete("scopeReleaseId");
          next.delete("qstep");
          next.delete("release");
          if (area !== "qa-chat") next.delete("chat");
          if (nextPageId !== "capture") next.delete("filter");
          return next;
        },
        { replace: true },
      );
      if (section === "feedback") {
        onFeedbackSectionActivate?.();
      }
    },
    [setSearchParams, onFeedbackSectionActivate],
  );

  const onStatusNavigate = useCallback(
    ({ section, area } = {}) => {
      if (!section) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", section);
          if (area) next.set("area", area);
          else next.delete("area");
          if (!(section === "releases" && area === "active")) next.delete("scopeReleaseId");
          if (section !== "discovery") next.delete("profile");
          next.delete("qstep");
          next.delete("release");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setStage = useCallback(
    (stageId, opts = {}) => {
      const jiraReady = isProjectJiraBacklogReady(project);
      const areaOpt =
        opts.area !== undefined
          ? opts.area
          : rememberedAreaForStage(areasByStageRef.current, stageId);
      const { section, area } = navForStage(stageId, {
        area: areaOpt,
        jiraReady,
        hasDeployEnvironments,
      });

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", section);
          if (area) next.set("area", area);
          else next.delete("area");

          if (stageId === "profiles") {
            if (opts.profile) next.set("profile", opts.profile);
            else next.set("profile", lastProfileRef.current || next.get("profile") || "company");
          } else {
            next.delete("profile");
          }

          if (stageId !== "capture") next.delete("filter");
          if (!(section === "releases" && area === "active")) {
            next.delete("scopeReleaseId");
          }
          next.delete("qstep");
          next.delete("release");
          return next;
        },
        { replace: true },
      );

      if (section === "feedback") {
        onFeedbackSectionActivate?.();
      }
    },
    [setSearchParams, project, hasDeployEnvironments, onFeedbackSectionActivate],
  );

  const setProfileNav = useCallback(
    (profileId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "discovery");
          next.set("area", "profiles");
          next.set("profile", profileId || "company");
          next.delete("filter");
          next.delete("qstep");
          next.delete("release");
          next.delete("scopeReleaseId");
          return next;
        },
        { replace: true },
      );
      lastProfileRef.current = profileId || "company";
    },
    [setSearchParams],
  );

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
            projectName={projectName}
            serviceId={serviceId}
            pageId={pageId}
            activeProfile={activeProfile}
            overlayKey={overlayKey}
            forceExpandSettings={expandSettingsOnOpen}
            isAdmin={isAdmin}
            canAccessProjectSettings={userCanAccessProjectSettings(user, project)}
            agentAnalyticsActiveCount={agentAnalyticsActiveCount}
            onNavigateServicePage={(nextServiceId, nextPageId) => {
              setExpandSettingsOnOpen(false);
              setConsoleNav(nextServiceId, nextPageId);
            }}
            onNavigateProfile={setProfileNav}
            onNavigateCollaboration={() => {
              setExpandSettingsOnOpen(false);
              onNavigateCollaboration?.();
            }}
            onNavigateAllReports={() => {
              setExpandSettingsOnOpen(false);
              onNavigateAllReports?.();
            }}
            onNavigateAgentAnalytics={() => {
              setExpandSettingsOnOpen(false);
              onNavigateAgentAnalytics?.();
            }}
            onNavigateQaAnalytics={() => {
              setExpandSettingsOnOpen(false);
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("section", QA_ANALYTICS_SECTION.id);
                  next.delete("area");
                  next.delete("profile");
                  next.delete("release");
                  return next;
                },
                { replace: true },
              );
            }}
            onEditProject={
              userCanAccessProjectSettings(user, project)
                ? () => navigate(buildProjectSettingsPath(project.id))
                : undefined
            }
            tourExpandServiceId={tourExpandServiceId}
            tourActive={tourActive}
            tourStepId={tourStepId}
            onOpenReviewPortal={() => {
              if (!clientUrl) return;
              window.open(clientUrl, "_blank", "noopener,noreferrer");
            }}
            onOpenPreviewOnly={() => {
              if (!previewOnlyUrl) return;
              window.open(previewOnlyUrl, "_blank", "noopener,noreferrer");
            }}
            reviewPortalDisabled={reviewPortalDisabled}
            previewOnlyDisabled={previewOnlyDisabled}
          />
        </>
      ) : (
        <ProjectConsoleCollapsedRail
          project={project}
          projectName={projectName}
          serviceId={serviceId}
          overlayKey={overlayKey}
          onExpand={() => setSidebarOpen(true)}
          onServiceClick={(nextServiceId, nextPageId) => {
            setExpandSettingsOnOpen(false);
            setConsoleNav(nextServiceId, nextPageId);
            setSidebarOpen(true);
          }}
          onSettingsClick={() => {
            setExpandSettingsOnOpen(true);
            setSidebarOpen(true);
          }}
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WorkspaceTopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          project={project}
          projectName={projectName}
          serviceId={overlayView ? null : serviceId}
          pageId={overlayView ? null : pageId}
          overlayLabel={overlayLabel}
          isAdmin={isAdmin}
          onStatusNavigate={onStatusNavigate}
          onEditProject={
            userCanAccessProjectSettings(user, project)
              ? () => navigate(buildProjectSettingsPath(project.id))
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
          reviewPortalDisabled={reviewPortalDisabled}
          previewOnlyDisabled={previewOnlyDisabled}
          showDeferredScratchCard={showDeferredScratchCard}
          scratchAgentBannerOpen={scratchAgentBannerOpen}
          scratchAgentStatusLine={scratchAgentStatusLine}
          scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
          showScratchVersionFailedBanner={showScratchVersionFailedBanner}
        />
        {topBanner ? <div className="shrink-0 px-4 pt-3 md:px-5">{topBanner}</div> : null}
        <div
          data-console-content
          className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/40 p-3 sm:p-4 md:p-5"
        >
          <div className="min-w-0 space-y-5 rounded-lg bg-card p-3 sm:p-4 md:p-6">
            {showReleaseLockPanel ? (
              <ReleaseLockLivePanel
                visible
                runStatus={lockRunStatus}
                runPhase={lockRunPhase}
                runLog={lockRunLog}
                agentStream={lockAgentStream}
                lockStartedAtMs={lockStartedAtMs}
                onDismiss={dismissLockPanel}
              />
            ) : null}

            {showMigrateFrontendPanel ? (
              <MigrateFrontendLivePanel
                visible
                runStatus={migrateRunStatus}
                runPhase={migrateRunPhase}
                runLog={migrateRunLog}
                agentStream={migrateAgentStream}
                migrateStartedAtMs={migrateStartedAtMs}
                platformSyncDetail={migratePlatformSyncDetail}
                migrateDevLayoutMeta={migrateDevLayoutMeta}
                onDismiss={dismissMigratePanel}
              />
            ) : null}

            {activeSection === "discovery" ? (
              <div className="min-w-0 outline-none">
                <ProjectManagementTabContent project={project} chromeless />
              </div>
            ) : null}

            <SectionPanel visible={activeSection === "backlog"}>
              <BacklogTabContent project={project} />
            </SectionPanel>

            <SectionPanel visible={activeSection === "releases"}>
              <ReleasesTabContent
                ref={releaseManagementRef}
                project={project}
                projectName={projectName}
                onSnapshotChange={onSnapshotChange}
              />
            </SectionPanel>

            <SectionPanel visible={activeSection === "web-app" && activeWebAppArea === "preview"}>
              <WebAppPreviewTabContent
                projectId={project?.id}
                clientUrl={clientUrl}
                previewOnlyUrl={previewOnlyUrl}
                canMigrateFrontend={canMigrateFrontend}
                onMigrateFrontend={onMigrateFrontend}
                migrateFrontendDisabledHint={migrateFrontendDisabledHint}
                hasLaunchpadRepo={hasLaunchpadRepo}
                onExportLaunchpadZip={onExportLaunchpadZip}
                exportLaunchpadZipDisabledHint={exportLaunchpadZipDisabledHint}
                exportLaunchpadZipLoading={exportLaunchpadZipLoading}
              />
            </SectionPanel>

            <SectionPanel visible={activeSection === "web-app" && activeWebAppArea === "implement"}>
              <ConsoleImplementPage
                project={project}
                canManageReleases={canManageReleases}
                forcedTarget="platform"
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "web-app" && activeWebAppArea === "agent-config"}
            >
              <ProjectAgentConfigTabContent
                side="frontend"
                project={project}
                hasRepo={hasLaunchpadRepo}
                canManage={canManagePrompts}
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "backend" && activeBackendArea === "backend-code"}
            >
              <BackendCodeTabContent
                project={project}
                onProjectUpdated={onProjectUpdated}
                canManageReleases={canManageReleases}
                hasDeveloperRepo={hasDeveloperRepo}
                addCursorRulesDisabledHint={addCursorRulesDisabledHint}
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "backend" && activeBackendArea === "implement"}
            >
              <ConsoleImplementPage
                project={project}
                canManageReleases={canManageReleases}
                forcedTarget="development"
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "backend" && activeBackendArea === "agent-config"}
            >
              <ProjectAgentConfigTabContent
                side="backend"
                project={project}
                hasRepo={hasDeveloperRepo}
                canManage={canManagePrompts}
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "backend" && activeBackendArea === "architecture"}
            >
              <ArchitectureDiagramTabContent
                project={project}
                canManage={canManageReleases && hasDeveloperRepo}
                hasDeveloperRepo={hasDeveloperRepo}
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "cloud-infra" && activeCloudInfraArea === "deploy"}
            >
              <CloudInfraTabContent
                project={project}
                onProjectUpdated={onProjectUpdated}
                hasDeveloperRepo={hasDeveloperRepo}
                canManageReleases={canManageReleases}
                addCursorRulesDisabledHint={addCursorRulesDisabledHint}
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "cloud-infra" && activeCloudInfraArea === "infra-analysis"}
            >
              <InfraAnalysisTabContent
                project={project}
                hasDeveloperRepo={hasDeveloperRepo}
                onNavigate={setStage}
              />
            </SectionPanel>

            <SectionPanel
              visible={activeSection === "cloud-infra" && activeCloudInfraArea === "debugging"}
            >
              <CloudDebugTabContent
                project={project}
                hasDeveloperRepo={hasDeveloperRepo}
                onNavigate={setStage}
              />
            </SectionPanel>

            <SectionPanel visible={activeSection === "feedback"}>
              <ProjectClientFeedbackPanel
                embedded
                projectId={project.id}
                projectName={projectName}
                projectSummary={feedbackSummary}
                reloadSignal={feedbackReloadSignal}
              />
            </SectionPanel>

            <SectionPanel visible={activeSection === "qa-reports"}>
              <ProjectQaSectionTabs
                embedded
                projectId={project.id}
                project={project}
                activeTab={
                  rawArea === "export-test-cases"
                    ? "export"
                    : rawArea === "qa-app-configuration"
                      ? "configuration"
                      : rawArea === "qa-chat"
                        ? "chat"
                        : "reports"
                }
                onTabChange={(tab) => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("section", "qa-reports");
                    if (tab === "export") next.set("area", "export-test-cases");
                    else if (tab === "configuration") next.set("area", "qa-app-configuration");
                    else if (tab === "chat") next.set("area", "qa-chat");
                    else next.delete("area");
                    return next;
                  });
                }}
                onNavigateToFeedback={navigateToFeedback}
              />
            </SectionPanel>

            <SectionPanel visible={activeSection === "code-snippet"}>
              <CodeSnippetTabContent
                project={project}
                hasDeveloperRepo={hasDeveloperRepo}
                onProjectUpdated={onProjectUpdated}
              />
            </SectionPanel>

            <SectionPanel visible={activeSection === "qa-analytics"}>
              <ProjectQaAnalyticsPanel embedded projectId={project.id} />
            </SectionPanel>

            <SectionPanel visible={activeSection === "environment"}>
              <EnvironmentTabContent project={project} hasDeveloperRepo={hasDeveloperRepo} />
            </SectionPanel>

            <SectionPanel visible={activeSection === "collaboration"}>
              <CollaborationTabContent project={project} />
            </SectionPanel>

            {isAdmin ? (
              <SectionPanel visible={activeSection === AGENT_ANALYTICS_SECTION.id}>
                <AgentAnalyticsTabContent project={project} onProjectUpdated={onProjectUpdated} />
              </SectionPanel>
            ) : null}

            <SectionPanel visible={activeSection === PROJECT_AUTOMATIONS_SECTION.id}>
              <ProjectAutomationsPanel
                projectId={project.id}
                onAutomationsCountChange={setAutomationsCount}
              />
            </SectionPanel>

            {isAdmin ? (
              <SectionPanel visible={activeSection === ALL_PROJECT_REPORTS_SECTION.id}>
                <JobsPage embedded />
              </SectionPanel>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectJourneyShell({
  project,
  projectName,
  projectDescription = null,
  clientUrl,
  previewOnlyUrl,
  releaseManagementRef,
  onProjectUpdated,
  canManageReleases,
  hasDeveloperRepo,
  hasLaunchpadRepo,
  canManagePrompts,
  addCursorRulesDisabledHint,
  canMigrateFrontend,
  onMigrateFrontend,
  migrateFrontendDisabledHint,
  onExportLaunchpadZip,
  exportLaunchpadZipDisabledHint,
  exportLaunchpadZipLoading,
  tourShouldAutoStart = false,
  tourStartSignal = 0,
  onTourSkip,
  onTourFinish,
  onStartJourneyTour,
  showDeferredScratchCard = false,
  scratchAgentBannerOpen = false,
  scratchAgentStatusLine = null,
  scratchPreviewBuildingBanner = false,
  showScratchVersionFailedBanner = false,
  reviewPortalDisabled = false,
  previewOnlyDisabled = false,
  linksDisabledHint = "",
  topBanner = null,
}) {
  const { user } = useAuth();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const [feedbackReloadSignal, setFeedbackReloadSignal] = useState(0);
  const [releasesSnapshot, setReleasesSnapshot] = useState({
    releases: [],
    loading: true,
    revisionSeedProgressByRelease: {},
    canManageReleases: false,
  });
  const [, setSearchParams] = useSearchParams();

  useSeedReleasesSnapshot(project?.id, canManageReleases, setReleasesSnapshot);

  const feedbackSummary = useMemo(
    () => buildFeedbackProjectSummary(project, projectName),
    [project, projectName],
  );

  const hubProjectId = useMemo(() => {
    if (project?.projectId == null || !String(project.projectId).trim()) return null;
    return String(project.projectId).trim();
  }, [project?.projectId]);

  const bumpFeedbackReloadSignal = useCallback(() => {
    setFeedbackReloadSignal((n) => n + 1);
  }, []);

  const navigateToFeedback = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", "feedback");
        next.delete("area");
        next.delete("profile");
        return next;
      },
      { replace: true },
    );
    bumpFeedbackReloadSignal();
  }, [setSearchParams, bumpFeedbackReloadSignal]);

  const navigateToAgentAnalytics = useCallback(() => {
    if (!isAdmin) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", AGENT_ANALYTICS_SECTION.id);
        next.delete("area");
        next.delete("profile");
        next.delete("release");
        return next;
      },
      { replace: true },
    );
  }, [isAdmin, setSearchParams]);

  const navigateToAllReports = useCallback(() => {
    if (!isAdmin) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", ALL_PROJECT_REPORTS_SECTION.id);
        next.delete("area");
        next.delete("profile");
        next.delete("release");
        return next;
      },
      { replace: true },
    );
  }, [isAdmin, setSearchParams]);

  const navigateToCollaboration = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", "collaboration");
        next.delete("area");
        next.delete("profile");
        next.delete("release");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (
      !isAdmin &&
      (section === AGENT_ANALYTICS_SECTION.id || section === ALL_PROJECT_REPORTS_SECTION.id)
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", DEFAULT_SECTION);
          return next;
        },
        { replace: true },
      );
    }
  }, [isAdmin, setSearchParams]);

  const journeyInnerProps = {
    project,
    projectName,
    projectDescription,
    clientUrl,
    previewOnlyUrl,
    releaseManagementRef,
    onProjectUpdated,
    canManageReleases,
    hasDeveloperRepo,
    hasLaunchpadRepo,
    canManagePrompts,
    addCursorRulesDisabledHint,
    canMigrateFrontend,
    onMigrateFrontend,
    migrateFrontendDisabledHint,
    onExportLaunchpadZip,
    exportLaunchpadZipDisabledHint,
    exportLaunchpadZipLoading,
    feedbackSummary,
    feedbackReloadSignal,
    navigateToFeedback,
    onFeedbackSectionActivate: bumpFeedbackReloadSignal,
    onSnapshotChange: setReleasesSnapshot,
    isAdmin,
    onNavigateAgentAnalytics: navigateToAgentAnalytics,
    onNavigateAllReports: navigateToAllReports,
    onNavigateCollaboration: navigateToCollaboration,
    onStartJourneyTour,
    showDeferredScratchCard,
    scratchAgentBannerOpen,
    scratchAgentStatusLine,
    scratchPreviewBuildingBanner,
    showScratchVersionFailedBanner,
    reviewPortalDisabled,
    previewOnlyDisabled,
    linksDisabledHint,
    topBanner,
  };

  return (
    <section aria-label="Project workspace" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ClientInfoProvider projectId={project.id} hubProjectId={hubProjectId}>
        <ProjectDiscoveryBridgeProvider>
          <ReleasesSnapshotContext.Provider value={releasesSnapshot}>
            <ReleaseLockStreamProvider projectId={project.id}>
              <ProjectAgentAnalyticsProvider projectId={project.id} enabled={isAdmin}>
                <ProjectJourneyTour
                  shouldAutoStart={tourShouldAutoStart}
                  startSignal={tourStartSignal}
                  onSkip={onTourSkip}
                  onFinish={onTourFinish}
                >
                  <ProjectJourneyInner {...journeyInnerProps} />
                </ProjectJourneyTour>
              </ProjectAgentAnalyticsProvider>
            </ReleaseLockStreamProvider>
          </ReleasesSnapshotContext.Provider>
        </ProjectDiscoveryBridgeProvider>
      </ClientInfoProvider>
    </section>
  );
}

function ProjectJourneyInner(props) {
  const analytics = useProjectAgentAnalyticsContext();
  return <JourneyLayout {...props} agentAnalyticsActiveCount={analytics?.activeCount ?? 0} />;
}
