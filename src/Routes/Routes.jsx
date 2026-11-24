import { Fragment } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes as RouterRoutes,
  useParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "@/pages/Authentication/LoginPage";
import AuthCallbackPage from "@/pages/Authentication/AuthCallbackPage";
import { MainLayout } from "@/layouts/MainLayout";
import ProjectDetails from "@/pages/Project/ProjectDetails";
import ProjectSettingsPage from "@/pages/Project/ProjectSettings/ProjectSettingsPage";
import Projects from "@/pages/Project/Projects";
import CreateProject from "@/pages/Project/CreateProject";
import IntegrationsCallbackPage from "@/pages/Integrations/IntegrationsCallbackPage";
import IntegrationsSettingsPage from "@/pages/Integrations/IntegrationsSettingsPage";
import { ClientLink } from "@/pages/ClientLink";
import { DiscoveryQuestionnairePublic } from "@/pages/DiscoveryQuestionnaire/DiscoveryQuestionnairePublic";
import ReleaseRoadmapPage from "@/pages/ReleaseRoadmap";
import JobsPage from "@/pages/Jobs";
import CreateJob from "@/pages/Jobs/CreateJob";
import JobDetails from "@/pages/Jobs/JobDetails";
import EditJob from "@/pages/Jobs/EditJob";
import PromptManagementPage from "@/pages/PromptManagement/PromptManagementPage";
import DeploymentsPage from "@/pages/Deployments/DeploymentsPage";
import CostAnalyticsPage from "@/pages/CostAnalytics/CostAnalyticsPage";
import PlatformAnalyticsPage from "@/pages/PlatformAnalytics/PlatformAnalyticsPage";
import QaAnalyticsPortfolioPage from "@/pages/QaAnalytics/QaAnalyticsPortfolioPage";
import ModelRouterPage from "@/pages/ModelRouter/ModelRouterPage";
import CursorApiKeysPage from "@/pages/CursorApiKeys/CursorApiKeysPage";
import AiHomePage from "@/pages/AiHome/AiHomePage";
import NotificationCenterPage from "@/pages/Notifications/NotificationCenterPage";
import NotificationPreferencesPage from "@/pages/Notifications/NotificationPreferencesPage";
import { ProjectWorkspaceSkeleton } from "@/pages/Project/ProjectDetails/components/console/ProjectWorkspaceSkeleton";

/**
 * Remount project-scoped pages when :projectId changes so no state (loaded project,
 * mounted sections, forms) from the previous project survives a switch.
 */
function ProjectScoped({ children }) {
  const { projectId } = useParams();
  return <Fragment key={projectId ?? ""}>{children}</Fragment>;
}

export const Routes = () => {
  const { user, loading } = useAuth();

  const publicRoutes = [
    { path: "/login", element: <LoginPage />, publicOnly: false },
    {
      path: "/auth/callback",
      element: <AuthCallbackPage />,
      publicOnly: false,
    },
    {
      path: "/integrations/callback",
      element: <IntegrationsCallbackPage />,
      publicOnly: false,
    },
  ];

  const privateRoutes = [
    { path: "/chat", element: <AiHomePage /> },
    { path: "/projects", element: <Projects /> },
    { path: "/projects/onboarding/:method?", element: <CreateProject /> },
    {
      path: "/projects/details/:projectId",
      element: (
        <ProjectScoped>
          <ProjectDetails />
        </ProjectScoped>
      ),
    },
    {
      path: "/projects/details/:projectId/settings",
      element: (
        <ProjectScoped>
          <ProjectSettingsPage />
        </ProjectScoped>
      ),
    },
    {
      path: "/projects/roadmap/:projectId",
      element: (
        <ProjectScoped>
          <ReleaseRoadmapPage />
        </ProjectScoped>
      ),
    },
    { path: "/settings/integrations", element: <IntegrationsSettingsPage /> },
    { path: "/settings/notifications", element: <NotificationPreferencesPage /> },
    { path: "/notifications", element: <NotificationCenterPage /> },
    { path: "/prompt-management", element: <PromptManagementPage /> },
    { path: "/deployments", element: <DeploymentsPage /> },
    { path: "/cost-analytics", element: <CostAnalyticsPage /> },
    { path: "/platform-analytics", element: <PlatformAnalyticsPage /> },
    { path: "/qa-analytics", element: <QaAnalyticsPortfolioPage /> },
    { path: "/model-router", element: <ModelRouterPage /> },
    { path: "/cursor-api-keys", element: <CursorApiKeysPage /> },
    { path: "/jobs", element: <JobsPage /> },
    { path: "/jobs/new", element: <CreateJob /> },
    { path: "/jobs/:id/edit", element: <EditJob /> },
    { path: "/jobs/:id", element: <JobDetails /> },
  ];

  if (loading) {
    return (
      <div className="flex min-h-svh w-full bg-muted/40">
        <ProjectWorkspaceSkeleton />
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <RouterRoutes>
        {publicRoutes.map((route, index) => (
          <Route
            key={index}
            path={route.path}
            element={
              route.publicOnly === false ? (
                route.element
              ) : !user ? (
                route.element
              ) : (
                <Navigate to="/projects" replace />
              )
            }
          />
        ))}

        <Route element={<MainLayout />}>
          {privateRoutes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={user ? route.element : <Navigate to="/login" replace />}
            />
          ))}
        </Route>

        <Route path="/projects/:projectSlug" element={<ClientLink />} />
        <Route path="/q/:publicPath" element={<DiscoveryQuestionnairePublic />} />
        <Route path="/:publicPath" element={<DiscoveryQuestionnairePublic />} />

        <Route path="*" element={<Navigate to={user ? "/projects" : "/login"} replace />} />
      </RouterRoutes>
    </BrowserRouter>
  );
};
