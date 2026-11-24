import ProjectGitJiraOAuthCard from "@/pages/Project/CreateProject/components/ProjectGitJiraOAuthCard";
import { EditProjectIntegrationsTab } from "./EditProjectIntegrationsTab";
import { EditProjectRepositoriesTab } from "./EditProjectRepositoriesTab";

export function EditProjectGitJiraSection({
  activeTab,
  gitJiraRef,
  project,
  creatorIntegrations,
  loadingCreatorInt,
  validationErrors,
  validationWarnings,
  syncKey,
}) {
  const isGitJiraTab = activeTab === "integrations" || activeTab === "repositories";
  const editSettingsSection = activeTab === "repositories" ? "repositories" : "integrations";

  return (
    <div className={isGitJiraTab ? "max-w-3xl" : "hidden"} aria-hidden={!isGitJiraTab}>
      {activeTab === "integrations" ? <EditProjectIntegrationsTab /> : null}
      {activeTab === "repositories" ? <EditProjectRepositoriesTab projectId={project?.id} /> : null}
      <ProjectGitJiraOAuthCard
        ref={gitJiraRef}
        variant="edit"
        projectId={project.id}
        editProject={project}
        integrationsPayload={creatorIntegrations}
        integrationsLoading={loadingCreatorInt}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        syncKey={syncKey}
        editSettingsSection={editSettingsSection}
      />
    </div>
  );
}
