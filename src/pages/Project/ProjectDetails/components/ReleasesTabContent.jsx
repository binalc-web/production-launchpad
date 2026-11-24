import { forwardRef } from "react";
import { ReleasesWorkspace } from "@/pages/Project/ProductManagement/ReleasesWorkspace";

export const ReleasesTabContent = forwardRef(function ReleasesTabContent(
  { project, projectName, onSnapshotChange },
  ref,
) {
  if (!project?.id) return null;

  return (
    <ReleasesWorkspace
      ref={ref}
      project={project}
      projectName={projectName}
      onSnapshotChange={onSnapshotChange}
    />
  );
});
