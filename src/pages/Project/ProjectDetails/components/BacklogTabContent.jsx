import { BacklogWorkspace } from "@/pages/Project/ProductManagement/BacklogWorkspace";

export function BacklogTabContent({ project }) {
  if (!project?.id) return null;
  return <BacklogWorkspace project={project} />;
}
