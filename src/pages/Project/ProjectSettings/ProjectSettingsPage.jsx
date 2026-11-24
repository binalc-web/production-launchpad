import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchProjectById } from "@/api";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { toast } from "sonner";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { forgetProjectId } from "@/lib/lastProject";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { userCanAccessProjectSettings } from "@/lib/releasePresentation";
import DeleteProjectDialog from "@/pages/Project/components/DeleteProjectDialog";
import { SETTINGS_TABS, normalizeSettingsTab, SETTINGS_TAB_IDS } from "./constants";
import { useEditProjectForm } from "./hooks/useEditProjectForm";
import { EditProjectGeneralTab } from "./components/EditProjectGeneralTab";
import { EditProjectTeamTab } from "./components/EditProjectTeamTab";
import { EditProjectGitJiraSection } from "./components/EditProjectGitJiraSection";
import { EditProjectBackendTab } from "./components/EditProjectBackendTab";
import { SentryIntegrationSection } from "./components/SentryIntegrationSection";
import { ProjectSettingsSaveBar } from "./components/ProjectSettingsSaveBar";
import { ServerlessCompatibilityAlert } from "@/pages/Project/ProjectDetails/components/ServerlessCompatibilityAlert";
import { buildProjectBackendCodePath } from "@/lib/onboardPreviewUrl";
import { persistServerlessCompatibilityFixHandoff } from "@/utils/serverlessCompatibilityFixHandoff.util";
import { buildUiPreferenceScope, readUiPreference, writeUiPreference } from "@/lib/uiPreferences";

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const activeTab = normalizeSettingsTab(searchParams.get("tab"));

  const settingsScope = useMemo(() => buildUiPreferenceScope({ projectId }), [projectId]);

  // Legacy Project Settings → Code Snippet moved to console sidebar.
  useEffect(() => {
    if (!projectId) return;
    const rawTab = String(searchParams.get("tab") ?? "")
      .trim()
      .toLowerCase();
    if (rawTab !== "code-snippet") return;
    navigate(`/projects/details/${encodeURIComponent(projectId)}?section=code-snippet`, {
      replace: true,
    });
  }, [navigate, projectId, searchParams]);

  useEffect(() => {
    if (!projectId || searchParams.get("tab")) return;
    const storedTab = readUiPreference(settingsScope, "settingsTab", {
      defaultValue: "general",
      allowed: SETTINGS_TAB_IDS,
    });
    if (storedTab === "general") return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", storedTab);
        return next;
      },
      { replace: true },
    );
  }, [projectId, searchParams, setSearchParams, settingsScope]);

  const setActiveTab = useCallback(
    (tab) => {
      const normalized = normalizeSettingsTab(tab);
      writeUiPreference(settingsScope, "settingsTab", normalized);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (normalized === "general") {
            next.delete("tab");
          } else {
            next.set("tab", normalized);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, settingsScope],
  );

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchProjectById(projectId);
      if (!data) {
        toast.error("Project not found");
        navigate("/projects");
        return;
      }
      setProject(data);
    } catch (err) {
      logger.error("project_settings_load", err);
      toast.error("Could not load project");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  }, [navigate, projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const canAccessProjectSettings = useMemo(
    () => userCanAccessProjectSettings(user, project),
    [user, project],
  );

  const handleSaved = useCallback(async () => {
    await loadProject();
    navigate(buildProjectDetailsPathWithResume(projectId, { isAdmin }));
  }, [loadProject, navigate, projectId, isAdmin]);

  const handleCancel = useCallback(() => {
    navigate(buildProjectDetailsPathWithResume(projectId, { isAdmin }));
  }, [navigate, projectId, isAdmin]);

  const handleProjectDeleted = useCallback(
    (deletedId) => {
      forgetProjectId(deletedId);
      navigate("/projects", { replace: true });
    },
    [navigate],
  );

  const form = useEditProjectForm({
    project,
    active: Boolean(project),
    onSaved: handleSaved,
    onValidationTabChange: setActiveTab,
  });

  const canManageProjectStatus = useMemo(() => {
    if (!user || !project) return false;
    if (isLaunchpadAdmin(user.role)) return true;
    const creatorId = project?.createdBy?.id ?? project?.createdById;
    if (creatorId == null) return false;
    return Number(user.id) === Number(creatorId);
  }, [user, project]);

  const handleCreatorTransferred = useCallback(async () => {
    await loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (loading || !project || canAccessProjectSettings) return;
    toast.error("You do not have access to Project settings.");
    navigate(buildProjectDetailsPathWithResume(projectId, { isAdmin }), { replace: true });
  }, [canAccessProjectSettings, isAdmin, loading, navigate, project, projectId]);

  if (loading) {
    return (
      <PageShell>
        <div
          className="space-y-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading project settings"
        >
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <div className="flex gap-1 lg:w-64 lg:flex-col">
              {SETTINGS_TABS.map((tab) => (
                <Skeleton key={tab.id} className="h-8 w-24 lg:w-full" />
              ))}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full max-w-xl" />
                </div>
              ))}
              <Skeleton className="h-24 w-full max-w-xl" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!project || !canAccessProjectSettings) return null;

  return (
    <PageShell>
      <PageHeader
        title="Project settings"
        description={project.name ? `Configure ${project.name}` : undefined}
      />

      <form onSubmit={form.handleSubmit}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="vertical"
          className="flex flex-col gap-6 lg:flex-row lg:gap-8"
        >
          <div className="min-w-0 shrink-0 lg:w-64">
            <TabsList
              variant="line"
              aria-label="Project settings sections"
              className="flex w-full min-w-0 flex-row gap-0.5 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none sm:w-full lg:flex-col lg:items-stretch lg:overflow-hidden"
            >
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "h-auto min-w-0 flex-none rounded-md border-0 px-2.5 py-1.5 text-[13.5px] font-medium shadow-none after:hidden sm:flex-1 lg:h-auto lg:w-full lg:flex-none lg:justify-start lg:whitespace-normal lg:text-left",
                      isActive
                        ? "!bg-primary/10 !text-primary hover:!bg-primary/10 hover:!text-primary"
                        : "!bg-transparent text-muted-foreground hover:!bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground/70",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 lg:break-words">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="min-w-0 flex-1">
            <TabsContent value="general" className="mt-0 outline-none">
              <EditProjectGeneralTab
                project={project}
                projectName={form.projectName}
                onNameChange={form.setProjectName}
                projectDescription={form.projectDescription}
                onDescriptionChange={form.setProjectDescription}
                projectIsActive={form.projectIsActive}
                onProjectIsActiveChange={form.setProjectIsActive}
                canManageProjectStatus={canManageProjectStatus}
                onRequestDeleteProject={
                  canManageProjectStatus ? () => setDeleteDialogOpen(true) : undefined
                }
                validationErrors={form.validationErrors}
              />
            </TabsContent>

            <TabsContent value="team" className="mt-0 outline-none">
              <EditProjectTeamTab
                project={project}
                assignedUserEmailTags={form.assignedUserEmailTags}
                onAssignedUserEmailTagsChange={form.setAssignedUserEmailTags}
                stakeholderEmailTags={form.stakeholderEmailTags}
                onStakeholderEmailTagsChange={form.setStakeholderEmailTags}
                settingsAccessEmailTags={form.settingsAccessEmailTags}
                onSettingsAccessEmailTagsChange={form.setSettingsAccessEmailTags}
                assignedHubSuggestions={form.assignedHubSuggestions}
                validationErrors={form.validationErrors}
                canManageProjectCreator={canManageProjectStatus}
                onProjectCreatorTransferred={handleCreatorTransferred}
              />
            </TabsContent>

            <TabsContent value="integrations" className="mt-0 outline-none" />
            <TabsContent value="repositories" className="mt-0 outline-none" />

            <EditProjectGitJiraSection
              activeTab={activeTab}
              gitJiraRef={form.gitJiraRef}
              project={project}
              creatorIntegrations={form.creatorIntegrations}
              loadingCreatorInt={form.loadingCreatorInt}
              validationErrors={form.validationErrors}
              validationWarnings={form.validationWarnings}
              syncKey={project?.id != null ? String(project.id) : "__closed__"}
            />

            {activeTab === "integrations" ? (
              <SentryIntegrationSection projectId={project.id} />
            ) : null}

            <TabsContent value="backend" className="mt-0 outline-none">
              <EditProjectBackendTab
                project={project}
                backendLockAgentMode={form.backendLockAgentMode}
                onBackendLockAgentModeChange={form.setBackendLockAgentMode}
                backendInfraStack={form.backendInfraStack}
                onBackendInfraStackChange={(next) => {
                  form.setBackendInfraStack(next);
                  if (next === "none") form.setBackendDeployMode("server");
                }}
                backendDeployMode={form.backendDeployMode}
                onBackendDeployModeChange={form.setBackendDeployMode}
                backendCloudDeployConfig={form.backendCloudDeployConfig}
                onBackendCloudDeployConfigChange={form.setBackendCloudDeployConfig}
                awsAuthMode={form.awsAuthMode}
                onAwsAuthModeChange={form.setAwsAuthMode}
              />
            </TabsContent>
          </div>
        </Tabs>

        {form.serverlessCompatibilityError ? (
          <div className="mt-8">
            <ServerlessCompatibilityAlert
              error={form.serverlessCompatibilityError}
              canFix={Boolean(String(project?.developmentRepoUrl ?? "").trim())}
              onFix={() => {
                if (!project?.id || !form.serverlessCompatibilityError) return;
                persistServerlessCompatibilityFixHandoff(
                  project.id,
                  form.serverlessCompatibilityError,
                );
                const path = buildProjectBackendCodePath(project.id);
                if (path) navigate(path);
              }}
            />
          </div>
        ) : null}

        <ProjectSettingsSaveBar
          saving={form.saving}
          checkingServerlessCompatibility={form.checkingServerlessCompatibility}
          onCancel={handleCancel}
        />
      </form>

      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        project={project}
        onProjectDeleted={handleProjectDeleted}
      />
    </PageShell>
  );
}
