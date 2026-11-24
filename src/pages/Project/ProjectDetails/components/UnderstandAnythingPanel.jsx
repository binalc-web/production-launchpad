import { ArchitectureDiagramCanvas } from "./architectureDiagram/ArchitectureDiagramCanvas";
import { useUnderstandGraph } from "../hooks/useBackendCodeChat";

/**
 * @deprecated Use Architecture tab (ArchitectureDiagramTabContent) instead.
 */
export function UnderstandAnythingPanel({ projectId, canManage, className }) {
  const hook = useUnderstandGraph(projectId, { autoGenerate: false });
  return (
    <ArchitectureDiagramCanvas {...hook} canManage={canManage} className={className} showHeader />
  );
}
