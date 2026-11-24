import { ProductManagementWorkspace } from "@/pages/Project/ProductManagement/ProductManagementWorkspace";

export function ProjectManagementTabContent({ project, chromeless = false }) {
  if (!project?.id) return null;

  return <ProductManagementWorkspace chromeless={chromeless} />;
}
