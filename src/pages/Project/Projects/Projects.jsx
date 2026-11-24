import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { searchProjects } from "@/api/index";
import { ServerConnectionEmptyState } from "@/components/common/ServerConnectionEmptyState";
import { CreateProjectButton } from "@/pages/Project/CreateProject";
import { EmptyState } from "@/pages/Project/ProductManagement/components/EmptyState";
import { ProjectWorkspaceSkeleton } from "@/pages/Project/ProjectDetails/components/console/ProjectWorkspaceSkeleton";
import { resolveProjectsHomePath, writeLastProjectId } from "@/lib/lastProject";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { isApiConnectionError } from "@/utils/apiErrors";

/**
 * `/projects` is not a listing page — redirect to last worked project (resume URL)
 * or onboarding when the user has no projects.
 */
const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setConnectionError(false);
      setError(null);

      try {
        const data = await searchProjects({ includeInactive: true });
        if (cancelled) return;
        const projects = Array.isArray(data) ? data : [];
        let role = user?.role;
        if (!role) {
          try {
            role = JSON.parse(localStorage.getItem("user") || "{}")?.role ?? null;
          } catch {
            role = null;
          }
        }
        const path = resolveProjectsHomePath(projects, {
          isAdmin: isLaunchpadAdmin(role),
        });
        const match = path.match(/^\/projects\/details\/([^/?]+)/);
        if (match?.[1]) writeLastProjectId(decodeURIComponent(match[1]));
        navigate(path, { replace: true });
      } catch (err) {
        if (cancelled) return;
        if (isApiConnectionError(err)) {
          setConnectionError(true);
          return;
        }
        setError(
          typeof err?.message === "string"
            ? err.message
            : typeof err?.error === "string"
              ? err.error
              : "Failed to open project",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRetrying(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally once per mount / manual retry — do not re-run when user.role hydrates.
  }, [navigate, retryKey]);

  const handleRetry = () => {
    setRetrying(true);
    setRetryKey((key) => key + 1);
  };

  if (connectionError) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] flex-1 items-center justify-center">
        <ServerConnectionEmptyState onRetry={handleRetry} retrying={retrying || loading} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] flex-1 items-center justify-center px-4">
        <EmptyState
          icon={AlertCircle}
          title="Couldn't open your project"
          description={error}
          action={<CreateProjectButton />}
          className="max-w-lg border-border/60 bg-muted/20"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-1 overflow-hidden rounded-lg">
      <ProjectWorkspaceSkeleton />
    </div>
  );
};

export default Projects;
