import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ClientInfoProvider } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { ReleasesTabContent } from "./ReleasesTabContent";
import { ReleasesSnapshotContext, useSeedReleasesSnapshot } from "@/pages/Project/ProductManagement/ReleasesSnapshotContext";
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
import { BackendCodeTabContent } from "./BackendCodeTabContent";
import { CloudInfraTabContent } from "./CloudInfraTabContent";
import { InfraAnalysisTabContent } from "./infraAnalysis/InfraAnalysisTabContent";
import { ArchitectureDiagramTabContent } from "./architectureDiagram/ArchitectureDiagramTabContent";
import { EnvironmentTabContent } from "./EnvironmentTabContent";
import { CodeSnippetTabContent } from "./CodeSnippetTabContent";
import { ProjectManagementTabContent } from "./ProjectManagementTabContent";
import { BacklogTabContent } from "./BacklogTabContent";
import { ProjectDetailsSidebar } from "./ProjectDetailsSidebar";
import { ProjectDiscoveryBridgeProvider } from "@/pages/Project/hooks/useProjectDiscoveryBridge";
import {
  DEFAULT_SECTION,
  isLegacyPromptSkillsSection,
  normalizeSection,
  PROJECT_SECTIONS,
} from "../constants/projectSections";
import {
  BACKLOG_AREAS,
  CLOUD_INFRA_AREAS,
  BACKEND_AREAS,
  WEB_APP_AREAS,
  DISCOVERY_AREAS,
  RELEASE_AREAS,
  normalizeCloudInfraArea,
  normalizeBackendArea,
  normalizeWebAppArea,
} from "@/pages/Project/ProductManagement/constants";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
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

/** Main workspace column — renders shared release-lock live panel above active section. */
function ProjectDetailsWorkspaceContent({
  activeSection,
  activeBackendArea,
  activeWebAppArea,
  project,
  projectName,
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
  clientUrl,
  previewOnlyUrl,
  feedbackSummary,
  feedbackReloadSignal,
  activeCloudInfraArea,
  navigateToFeedback,
  onNavigateInfraAnalysis,
  onReleasesSnapshotChange,
}) {
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

  return (
    <div className="min-w-0 flex-1">
      {showReleaseLockPanel ? (
        <div className="mb-4">
          <ReleaseLockLivePanel
            visible
            runStatus={lockRunStatus}
            runPhase={lockRunPhase}
            runLog={lockRunLog}
            agentStream={lockAgentStream}
            lockStartedAtMs={lockStartedAtMs}
            onDismiss={dismissLockPanel}
          />
        </div>
      ) : null}

      {showMigrateFrontendPanel ? (
        <div className="mb-4">
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
        </div>
      ) : null}

      {activeSection === "discovery" ? (
        <div className="min-w-0 outline-none">
          <ProjectManagementTabContent project={project} />
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
          onSnapshotChange={onReleasesSnapshotChange}
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

      <SectionPanel visible={activeSection === "web-app" && activeWebAppArea === "agent-config"}>
        <ProjectAgentConfigTabContent
          side="frontend"
          project={project}
          hasRepo={hasLaunchpadRepo}
          canManage={canManagePrompts}
        />
      </SectionPanel>

      <SectionPanel visible={activeSection === "backend" && activeBackendArea === "backend-code"}>
        <BackendCodeTabContent
          project={project}
          onProjectUpdated={onProjectUpdated}
          canManageReleases={canManageReleases}
          hasDeveloperRepo={hasDeveloperRepo}
          addCursorRulesDisabledHint={addCursorRulesDisabledHint}
        />
      </SectionPanel>

      <SectionPanel visible={activeSection === "backend" && activeBackendArea === "agent-config"}>
        <ProjectAgentConfigTabContent
          side="backend"
          project={project}
          hasRepo={hasDeveloperRepo}
          canManage={canManagePrompts}
        />
      </SectionPanel>

      <SectionPanel visible={activeSection === "backend" && activeBackendArea === "architecture"}>
        <ArchitectureDiagramTabContent
          project={project}
          canManage={canManageReleases && hasDeveloperRepo}
          hasDeveloperRepo={hasDeveloperRepo}
        />
      </SectionPanel>

      <SectionPanel visible={activeSection === "cloud-infra" && activeCloudInfraArea === "deploy"}>
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
          onNavigate={onNavigateInfraAnalysis}
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
          activeTab={searchParams.get("area") === "export-test-cases" ? "export" : "reports"}
          onTabChange={(tab) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set("section", "qa-reports");
              if (tab === "export") next.set("area", "export-test-cases");
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

      <SectionPanel visible={activeSection === "environment"}>
        <EnvironmentTabContent project={project} hasDeveloperRepo={hasDeveloperRepo} />
      </SectionPanel>
    </div>
  );
}

export function ProjectDetailsShell({
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
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSection = searchParams.get("section");
  const activeSection = normalizeSection(rawSection);
  const activeSectionLabel =
    PROJECT_SECTIONS.find((s) => s.id === activeSection)?.label ?? "Product Strategy";
  const [feedbackReloadSignal, setFeedbackReloadSignal] = useState(0);
  const [releasesSnapshot, setReleasesSnapshot] = useState({
    releases: [],
    loading: true,
    revisionSeedProgressByRelease: {},
    canManageReleases: false,
  });
  useSeedReleasesSnapshot(project?.id, canManageReleases, setReleasesSnapshot);
  const feedbackSummary = useMemo(
    () => buildFeedbackProjectSummary(project, projectName),
    [project, projectName],
  );

  const hubProjectId = useMemo(() => {
    if (project?.projectId == null || !String(project.projectId).trim()) return null;
    return String(project.projectId).trim();
  }, [project?.projectId]);

  const activeCloudInfraArea = normalizeCloudInfraArea(searchParams.get("area"));
  const activeWebAppArea = normalizeWebAppArea(
    isLegacyPromptSkillsSection(rawSection) ? "agent-config" : searchParams.get("area"),
  );
  const activeBackendArea = normalizeBackendArea(searchParams.get("area"));

  const setSection = useCallback(
    (section) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", section);
          const area = next.get("area");
          const isDiscoveryArea = DISCOVERY_AREAS.some((a) => a.id === area);
          const isBacklogArea = BACKLOG_AREAS.some((a) => a.id === area);
          const isReleaseArea = RELEASE_AREAS.some((a) => a.id === area);

          if (section === "discovery") {
            if (!area || isReleaseArea || isBacklogArea) next.set("area", "capture");
            next.delete("release");
          } else if (section === "backlog") {
            const jiraReady = isProjectJiraBacklogReady(project);
            if (!area || isDiscoveryArea || isReleaseArea) {
              next.set("area", jiraReady ? "suggestions" : "board");
            } else if (jiraReady && area === "board") {
              next.set("area", "suggestions");
            }
            next.delete("profile");
            next.delete("release");
          } else if (section === "releases") {
            if (!area || isDiscoveryArea || isBacklogArea) next.set("area", "overview");
            next.delete("profile");
            next.delete("qstep");
          } else if (section === "cloud-infra") {
            const isCloudInfraArea = CLOUD_INFRA_AREAS.some((a) => a.id === area);
            if (!area || isDiscoveryArea || isBacklogArea || isReleaseArea) {
              next.set("area", "deploy");
            } else if (!isCloudInfraArea) {
              next.set("area", "deploy");
            }
            next.delete("profile");
            next.delete("release");
          } else if (section === "backend") {
            const isBackendArea = BACKEND_AREAS.some((a) => a.id === area);
            if (!area || isDiscoveryArea || isBacklogArea || isReleaseArea) {
              next.set("area", "backend-code");
            } else if (!isBackendArea) {
              next.set("area", "backend-code");
            }
            next.delete("profile");
            next.delete("release");
          } else if (section === "web-app") {
            const isWebAppArea = WEB_APP_AREAS.some((a) => a.id === area);
            if (!area || isDiscoveryArea || isBacklogArea || isReleaseArea) {
              next.set("area", "preview");
            } else if (!isWebAppArea) {
              next.set("area", "preview");
            }
            next.delete("profile");
            next.delete("release");
          } else {
            next.delete("area");
            next.delete("profile");
            next.delete("qstep");
            next.delete("release");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, project],
  );

  const navigateToFeedback = useCallback(() => {
    setSection("feedback");
    setFeedbackReloadSignal((n) => n + 1);
  }, [setSection]);

  /** Legacy shell adapter: journey-style navigate → cloud deploy (infra chat). */
  const navigateInfraAnalysisToChat = useCallback(
    (stageId, opts = {}) => {
      if (stageId !== "cloud" || opts.area !== "deploy") return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", "cloud-infra");
          next.set("area", "deploy");
          next.delete("profile");
          next.delete("release");
          next.delete("qstep");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const sidebar = (
    <ProjectDetailsSidebar
      activeSection={activeSection}
      onSectionChange={setSection}
      project={project}
    />
  );

  const layout = (
    <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
      <div className="hidden w-[240px] shrink-0 lg:block">
        <div className="sticky top-4 rounded-lg bg-muted/30 py-2">{sidebar}</div>
      </div>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Menu className="size-4" />
              <span>
                Sections
                <span className="text-muted-foreground"> · {activeSectionLabel}</span>
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Project sections</SheetTitle>
              <SheetDescription>Navigate project workspace sections</SheetDescription>
            </SheetHeader>
            {sidebar}
          </SheetContent>
        </Sheet>
      </div>

      <ProjectDetailsWorkspaceContent
        activeSection={activeSection}
        activeBackendArea={activeBackendArea}
        activeWebAppArea={activeWebAppArea}
        project={project}
        projectName={projectName}
        releaseManagementRef={releaseManagementRef}
        onProjectUpdated={onProjectUpdated}
        canManageReleases={canManageReleases}
        hasDeveloperRepo={hasDeveloperRepo}
        hasLaunchpadRepo={hasLaunchpadRepo}
        canManagePrompts={canManagePrompts}
        addCursorRulesDisabledHint={addCursorRulesDisabledHint}
        canMigrateFrontend={canMigrateFrontend}
        onMigrateFrontend={onMigrateFrontend}
        migrateFrontendDisabledHint={migrateFrontendDisabledHint}
        onExportLaunchpadZip={onExportLaunchpadZip}
        exportLaunchpadZipDisabledHint={exportLaunchpadZipDisabledHint}
        exportLaunchpadZipLoading={exportLaunchpadZipLoading}
        clientUrl={clientUrl}
        previewOnlyUrl={previewOnlyUrl}
        feedbackSummary={feedbackSummary}
        feedbackReloadSignal={feedbackReloadSignal}
        activeCloudInfraArea={activeCloudInfraArea}
        navigateToFeedback={navigateToFeedback}
        onNavigateInfraAnalysis={navigateInfraAnalysisToChat}
        onReleasesSnapshotChange={setReleasesSnapshot}
      />
    </div>
  );

  const shell = (
    <ReleasesSnapshotContext.Provider value={releasesSnapshot}>
      <ReleaseLockStreamProvider projectId={project.id}>{layout}</ReleaseLockStreamProvider>
    </ReleasesSnapshotContext.Provider>
  );

  return (
    <section aria-label="Project workspace" className="min-w-0">
      <ClientInfoProvider projectId={project.id} hubProjectId={hubProjectId}>
        <ProjectDiscoveryBridgeProvider>{shell}</ProjectDiscoveryBridgeProvider>
      </ClientInfoProvider>
    </section>
  );
}

export { DEFAULT_SECTION, normalizeSection };
