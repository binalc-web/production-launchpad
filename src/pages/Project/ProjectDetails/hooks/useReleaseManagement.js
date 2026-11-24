import { createContext, useContext } from "react";

/**
 * Context for release management state shared between workspace shell and panels.
 * Populated by ReleaseManagement when workspaceMode is enabled.
 */
export const ReleaseManagementContext = createContext(null);

export function useReleaseManagement() {
  const ctx = useContext(ReleaseManagementContext);
  if (!ctx) {
    throw new Error("useReleaseManagement must be used within ReleaseManagement");
  }
  return ctx;
}
