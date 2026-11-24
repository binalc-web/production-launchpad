import { ProjectConventionsCard } from "@/pages/Project/ProjectDetails/components/ProjectConventionsCard";

export function EditProjectRepositoriesTab({ projectId }) {
  return (
    <div className="mb-6 max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">App repositories</h2>
        <p className="text-sm text-muted-foreground">
          Configure where preview builds and application agent work live. Connect GitHub or
          Bitbucket on the <span className="font-medium text-foreground">Integrations</span> tab
          before linking repositories here.
        </p>
      </div>

      {projectId ? <ProjectConventionsCard projectId={projectId} variant="settings" /> : null}
    </div>
  );
}
