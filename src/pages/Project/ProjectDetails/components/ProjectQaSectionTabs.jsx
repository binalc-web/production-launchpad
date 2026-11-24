import { ProjectQaExportPanel } from "./ProjectQaExportPanel";
import { ProjectQaReportsPanel } from "./ProjectQaReportsPanel";
import { ProjectQaAppConfigurationPanel } from "./ProjectQaAppConfigurationPanel";
import { QaChatWorkspace } from "./QaChatWorkspace";
import { cn } from "@/lib/utils";

/**
 * QA section content — reports, export, or QA App configuration (sidebar navigation).
 * @param {{
 *   projectId?: number | string | null,
 *   project?: object | null,
 *   embedded?: boolean,
 *   activeTab?: "reports" | "chat" | "export" | "configuration",
 *   onNavigateToFeedback?: () => void,
 *   className?: string,
 * }} props
 */
export function ProjectQaSectionTabs({
  projectId,
  project = null,
  embedded = false,
  activeTab = "reports",
  onNavigateToFeedback,
  className,
}) {
  if (activeTab === "chat") {
    return (
      <div className={cn("min-w-0", className)}>
        <QaChatWorkspace projectId={projectId} />
      </div>
    );
  }

  if (activeTab === "export") {
    return (
      <div className={cn("min-w-0", className)}>
        <ProjectQaExportPanel embedded={embedded} projectId={projectId} />
      </div>
    );
  }

  if (activeTab === "configuration") {
    return (
      <div className={cn("min-w-0", className)}>
        <ProjectQaAppConfigurationPanel
          embedded={embedded}
          projectId={projectId}
          project={project}
        />
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <ProjectQaReportsPanel
        embedded={embedded}
        projectId={projectId}
        onNavigateToFeedback={onNavigateToFeedback}
      />
    </div>
  );
}
