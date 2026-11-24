import { createContext, useContext } from "react";
import { useProjectAgentAnalyticsStream } from "../hooks/useProjectAgentAnalyticsStream";

const ProjectAgentAnalyticsContext = createContext(null);

/** Admin-only provider: mounts SSE for the whole project layout. */
export function ProjectAgentAnalyticsProvider({ projectId, enabled, children }) {
  const analytics = useProjectAgentAnalyticsStream(projectId, { enabled });
  return (
    <ProjectAgentAnalyticsContext.Provider value={analytics}>
      {children}
    </ProjectAgentAnalyticsContext.Provider>
  );
}

export function useProjectAgentAnalyticsContext() {
  return useContext(ProjectAgentAnalyticsContext);
}
