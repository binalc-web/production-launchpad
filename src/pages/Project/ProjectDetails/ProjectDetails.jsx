import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectWorkspaceSkeleton } from "./components/console/ProjectWorkspaceSkeleton";
import { FolderX, Loader2 } from "lucide-react";
import {
  fetchProjectById,
  fetchReleases,
  postMigrateFrontendAgent,
  assertCursorAgentGithubReady,
  fetchCursorAgentGithubReadiness,
  cursorAgentGithubGateMessage,
  migrateGithubAccessFromReadiness,
  parseMigrateGithubAccessError,
  startProjectScratchAgent,
  stopProjectScratchAgent,
  exportProjectLaunchpadZip,
} from "@/api";
import { StopAgentConfirmDialog } from "@/components/agent/StopAgentConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { userCanManageReleasesForProject } from "./components/ReleaseManagement";
import { userCanAccessProjectSettings } from "@/lib/releasePresentation";
import { ProjectJourneyShell } from "./components/ProjectJourneyShell";
import { useProjectJourneyTour } from "./hooks/useProjectJourneyTour";
import { MigrateFrontendRepoAccessDialog } from "./components/MigrateFrontendRepoAccessDialog";
import { CursorAgentGithubGateAlert } from "@/components/agent/CursorAgentGithubGateAlert";
import {
  MigrateFrontendStreamProvider,
  useMigrateFrontendStreamContext,
} from "@/hooks/useMigrateFrontendStream";
import { startMigrateStreamFromHandoff } from "@/lib/migrateFrontendStream.util";
import { ProjectAlertStack } from "./components/ProjectAlertStack";
import { useAuth } from "@/context/AuthContext";
import { userCanManageProjectPromptConfig } from "@/lib/projectPromptAccess";
import { buildProjectClientUrls } from "@/lib/projectClientLinkUrls";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { downloadBlob } from "@/pages/Project/PrdWorkspace/prdExport";
import { SCRATCH_VERSION_STATUS } from "@/constants/scratchVersionStatus";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import {
  applyProjectJourneyResumeToSearchParams,
  readProjectJourneyResume,
  shouldResumeProjectJourney,
} from "@/lib/projectJourneyResume";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";

const SCRATCH_AGENT_STATUS_POLL_MS = 4000;

/** Shown when Build Frontend App or Add Cursor Rules needs a development repo. */
const ADD_DEV_REPO_MIGRATE_FROM_EDIT_PROJECT_HINT =
  "Add a development repository in Project settings.";

function normalizeAgentStatus(status) {
  if (status == null || status === "") return "";
  return String(status).trim().toUpperCase().replace(/\s+/g, "_");
}

function isCursorAgentSuccessTerminal(status) {
  const u = normalizeAgentStatus(status);
  if (!u) return false;
  return (
    u === "FINISHED" ||
    u === "COMPLETED" ||
    u === "COMPLETE" ||
    u === "SUCCEEDED" ||
    u === "SUCCESS" ||
    u === "DONE"
  );
}

function isCursorAgentFailed(status) {
  const u = normalizeAgentStatus(status);
  if (!u) return false;
  return u === "FAILED" || u.includes("FAIL") || u === "ERROR";
}

function isCursorAgentStopped(status) {
  const u = normalizeAgentStatus(status);
  return u === "STOPPED";
}

/** True when status looks like a non-terminal Cursor agent state. */
function isScratchAgentInProgress(status) {
  const u = normalizeAgentStatus(status);
  if (!u) return false;
  if (isCursorAgentSuccessTerminal(u) || isCursorAgentFailed(u) || isCursorAgentStopped(u)) {
    return false;
  }
  return true;
}

const ProjectDetails = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(() => {
    const seeded = location.state?.project;
    return seeded && String(seeded.id) === String(projectId) ? seeded : null;
  });
  const [loading, setLoading] = useState(() => project == null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        if (!project) setLoading(true);
        const data = await fetchProjectById(projectId);
        if (data) setProject(data);
      } catch (error) {
        logger.error("project_details_load", error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed from location.state; refresh by projectId only
  }, [projectId]);

  if (loading) {
    return <ProjectWorkspaceSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FolderX className="size-6" aria-hidden />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">No project found</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            The project you're looking for doesn't exist or you don't have access to it. Check the
            URL or go back to the projects list.
          </p>
          <Button variant="outline" onClick={() => navigate("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MigrateFrontendStreamProvider projectId={project.id}>
      <ProjectDetailsLoaded
        project={project}
        setProject={setProject}
        projectId={projectId}
        location={location}
      />
    </MigrateFrontendStreamProvider>
  );
};

const ProjectDetailsLoaded = ({ project, setProject, projectId, location }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [scratchAgentBannerOpen, setScratchAgentBannerOpen] = useState(() =>
    Boolean(location.state?.scratchAgentRunning),
  );
  const [deferredScratchPrompt, setDeferredScratchPrompt] = useState("");
  const [scratchAgentSubmitting, setScratchAgentSubmitting] = useState(false);
  const [scratchAgentStatusLine, setScratchAgentStatusLine] = useState(null);
  const [stopScratchDialogOpen, setStopScratchDialogOpen] = useState(false);
  const [stopScratchSubmitting, setStopScratchSubmitting] = useState(false);
  const didDelayedScratchStatusRefreshRef = useRef(false);
  const scratchAgentFailureToastShownRef = useRef(false);
  const releaseManagementRef = useRef(null);
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
  const [migrateSubmitting, setMigrateSubmitting] = useState(false);
  const [migrateGitAccessAck, setMigrateGitAccessAck] = useState(false);
  const [migrateUserPrompt, setMigrateUserPrompt] = useState("");
  const [migrateGithubGateLoading, setMigrateGithubGateLoading] = useState(false);
  const [migrateGithubGateMessage, setMigrateGithubGateMessage] = useState(null);
  const [migrateAccessDialogOpen, setMigrateAccessDialogOpen] = useState(false);
  const [migrateAccessPayload, setMigrateAccessPayload] = useState(null);
  const [exportLaunchpadZipLoading, setExportLaunchpadZipLoading] = useState(false);
  const { streamMigrateFrontend, migrateResumeStreamRef } = useMigrateFrontendStreamContext();
  const {
    shouldAutoStart: tourShouldAutoStart,
    startSignal: tourStartSignal,
    startTour: startJourneyTour,
    markCompleted: markJourneyTourCompleted,
    markSkipped: markJourneyTourSkipped,
  } = useProjectJourneyTour();

  const didResumeJourneyRef = useRef(false);

  useEffect(() => {
    didResumeJourneyRef.current = false;
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id || didResumeJourneyRef.current) return;
    const isLaunchpadAdminUser = isLaunchpadAdmin(user?.role);
    if (!shouldResumeProjectJourney(searchParams, { isAdmin: isLaunchpadAdminUser })) return;

    const resume = readProjectJourneyResume(project.id, { isAdmin: isLaunchpadAdminUser });
    if (!resume) return;

    didResumeJourneyRef.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        applyProjectJourneyResumeToSearchParams(next, resume);
        return next;
      },
      { replace: true },
    );
  }, [project?.id, searchParams, setSearchParams, user?.role]);

  useEffect(() => {
    const pid = project?.id;
    if (!migrateDialogOpen || pid == null) {
      setMigrateGithubGateMessage(null);
      setMigrateGithubGateLoading(false);
      return undefined;
    }
    let cancelled = false;
    setMigrateGithubGateLoading(true);
    setMigrateGithubGateMessage(null);
    fetchCursorAgentGithubReadiness(pid)
      .then((data) => {
        if (!cancelled) {
          setMigrateGithubGateMessage(cursorAgentGithubGateMessage(data));
          const accessPayload = migrateGithubAccessFromReadiness(data, {
            gitRepoPath: project?.gitRepoPath,
          });
          if (accessPayload) {
            setMigrateAccessPayload(accessPayload);
            setMigrateAccessDialogOpen(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMigrateGithubGateMessage("Could not check GitHub access. Try again in a moment.");
        }
      })
      .finally(() => {
        if (!cancelled) setMigrateGithubGateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [migrateDialogOpen, project?.id]);

  useEffect(() => {
    const startTour = Boolean(location.state?.startJourneyTour);
    const clearScratch = Boolean(location.state?.scratchAgentRunning);
    if (!startTour && !clearScratch) return;
    if (startTour) startJourneyTour();
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [
    location.pathname,
    location.search,
    location.state?.scratchAgentRunning,
    location.state?.startJourneyTour,
    navigate,
    startJourneyTour,
  ]);

  useEffect(() => {
    if (searchParams.get("editProject") !== "1") return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("editProject");
        return next;
      },
      { replace: true },
    );
    if (userCanAccessProjectSettings(user, project)) {
      navigate(buildProjectSettingsPath(projectId, "integrations"));
    }
  }, [navigate, project, projectId, searchParams, setSearchParams, user]);

  const refreshProject = useCallback(async () => {
    try {
      const data = await fetchProjectById(projectId);
      if (data) setProject(data);
    } catch (error) {
      logger.error("project_details_refresh", error);
    }
  }, [projectId]);

  /** Oldest release id (scratch base release is created first). API returns releases newest-first. */
  const oldestScratchReleaseId = useMemo(() => {
    const r = project?.releases;
    if (!Array.isArray(r) || r.length === 0) return null;
    const ids = r.map((x) => Number(x?.id)).filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return null;
    return Math.min(...ids);
  }, [project?.releases]);

  const showDeferredScratchCard = useMemo(
    () => Array.isArray(project?.releases) && project.releases.length === 0,
    [project?.releases],
  );

  const scratchPreviewBuildingBanner = useMemo(() => {
    if (!project?.fromScratch) return false;
    const s = String(project?.scratchVersionStatus || "").trim();
    return s === SCRATCH_VERSION_STATUS.PREVIEW_BUILDING || s === SCRATCH_VERSION_STATUS.CREATING;
  }, [project?.fromScratch, project?.scratchVersionStatus]);

  const showScratchVersionFailedBanner = useMemo(() => {
    if (!project?.fromScratch) return false;
    if (String(project?.scratchVersionStatus || "").trim() !== "FAILED") return false;
    const hasPublishedVersion = (project?.releases ?? []).some(
      (r) => Array.isArray(r?.versions) && r.versions.length > 0,
    );
    return !hasPublishedVersion;
  }, [project?.fromScratch, project?.scratchVersionStatus, project?.releases]);

  useEffect(() => {
    didDelayedScratchStatusRefreshRef.current = false;
    scratchAgentFailureToastShownRef.current = false;
  }, [projectId]);

  /** Open banner when DB shows a non-terminal scratch agent (shared status for all viewers). */
  useEffect(() => {
    if (!project?.fromScratch || oldestScratchReleaseId == null) {
      return;
    }
    if (String(project?.scratchVersionStatus || "").trim() === "FAILED") {
      setScratchAgentBannerOpen(false);
      setScratchAgentStatusLine(null);
      return;
    }
    if (scratchAgentBannerOpen) return;
    const raw = normalizeAgentStatus(project?.scratchAgentStatus);
    if (!raw) return;
    if (
      isCursorAgentSuccessTerminal(raw) ||
      isCursorAgentFailed(raw) ||
      isCursorAgentStopped(raw)
    ) {
      return;
    }
    setScratchAgentBannerOpen(true);
  }, [
    project?.fromScratch,
    project?.scratchAgentStatus,
    project?.scratchVersionStatus,
    oldestScratchReleaseId,
    scratchAgentBannerOpen,
  ]);

  /** One delayed refresh so first backend poll can populate scratchAgentStatus. */
  useEffect(() => {
    if (didDelayedScratchStatusRefreshRef.current) return;
    if (!project?.fromScratch || oldestScratchReleaseId == null) return;
    if (showDeferredScratchCard) return;
    if (normalizeAgentStatus(project?.scratchAgentStatus)) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      didDelayedScratchStatusRefreshRef.current = true;
      void refreshProject();
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    project?.fromScratch,
    oldestScratchReleaseId,
    project?.scratchAgentStatus,
    showDeferredScratchCard,
    refreshProject,
  ]);

  /** Poll project (DB) for scratchAgentStatus while agent may be running — backend owns Cursor polling. */
  useEffect(() => {
    if (!project?.fromScratch || oldestScratchReleaseId == null) {
      return undefined;
    }
    if (showDeferredScratchCard) return undefined;
    const inProg = isScratchAgentInProgress(project?.scratchAgentStatus);
    const svScratch = String(project?.scratchVersionStatus || "").trim();
    const scratchVersionActive =
      Boolean(project?.fromScratch) &&
      (svScratch === SCRATCH_VERSION_STATUS.PREVIEW_BUILDING ||
        svScratch === SCRATCH_VERSION_STATUS.CREATING);
    if (!inProg && !scratchAgentBannerOpen && !scratchVersionActive) {
      return undefined;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const data = await fetchProjectById(projectId);
        if (cancelled || !data) return;
        setProject(data);
        const raw = normalizeAgentStatus(data?.scratchAgentStatus);
        setScratchAgentStatusLine(raw ? `Status: ${raw}` : null);
        if (isCursorAgentSuccessTerminal(raw)) {
          setScratchAgentBannerOpen(false);
          setScratchAgentStatusLine(null);
          return;
        }
        if (
          isCursorAgentFailed(raw) ||
          isCursorAgentStopped(raw) ||
          String(data?.scratchVersionStatus || "").trim() === "FAILED"
        ) {
          setScratchAgentBannerOpen(false);
          setScratchAgentStatusLine(null);
          if (isCursorAgentFailed(raw) && !scratchAgentFailureToastShownRef.current) {
            scratchAgentFailureToastShownRef.current = true;
            toast.error("Scratch agent ended with an error");
          }
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), SCRATCH_AGENT_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    projectId,
    project?.fromScratch,
    project?.scratchAgentStatus,
    project?.scratchVersionStatus,
    oldestScratchReleaseId,
    showDeferredScratchCard,
    scratchAgentBannerOpen,
  ]);

  const handleConfirmStopScratchAgent = async () => {
    const pid = project?.id ?? projectId;
    if (pid == null) return;
    setStopScratchSubmitting(true);
    try {
      const data = await stopProjectScratchAgent(pid);
      if (data) setProject(data);
      setScratchAgentBannerOpen(false);
      setScratchAgentStatusLine(null);
      toast.success("Agent stopped; workspace changes were discarded.");
    } catch (error) {
      const msg = error?.error || error?.message || "Could not stop the agent";
      const notRunning = typeof msg === "string" && msg.toLowerCase().includes("not running");
      if (notRunning) {
        setScratchAgentBannerOpen(false);
        setScratchAgentStatusLine(null);
        void refreshProject();
        toast.info("Agent already finished. Refreshed project status.");
      } else {
        toast.error(msg);
      }
    } finally {
      setStopScratchSubmitting(false);
      setStopScratchDialogOpen(false);
    }
  };

  const handleStartDeferredScratchAgent = async () => {
    const text = deferredScratchPrompt.trim();
    if (!text) {
      toast.error("Enter a prompt for the Cursor agent");
      return;
    }
    const pid = project?.id;
    if (pid == null) {
      toast.error("Project is not loaded yet");
      return;
    }
    setScratchAgentSubmitting(true);
    try {
      await startProjectScratchAgent(pid, text);
      scratchAgentFailureToastShownRef.current = false;
      toast.success("Cursor agent started");
      setDeferredScratchPrompt("");
      const slug = String(project?.slug || "").trim();
      if (slug) {
        navigate(`/projects/${encodeURIComponent(slug)}`, { replace: true });
        return;
      }
      setScratchAgentBannerOpen(true);
      await refreshProject();
    } catch (e) {
      const msg =
        (typeof e === "object" && e && e.error) || (e && e.message) || "Failed to start agent";
      toast.error(msg);
    } finally {
      setScratchAgentSubmitting(false);
    }
  };

  const canMigrateFrontend =
    Boolean(String(project?.developmentRepoUrl || "").trim()) &&
    Boolean(String(project?.gitRepoPath || "").trim());

  const hasLaunchpadRepo = Boolean(String(project?.gitRepoPath || "").trim());

  const handleExportLaunchpadZip = async () => {
    const pid = project?.id;
    if (pid == null) {
      toast.error("Project is not loaded");
      return;
    }
    if (exportLaunchpadZipLoading) return;
    setExportLaunchpadZipLoading(true);
    try {
      const { blob, filename } = await exportProjectLaunchpadZip(pid);
      downloadBlob(blob, filename);
      toast.success("Preview export downloaded");
    } catch (e) {
      const msg =
        (typeof e === "object" && e && e.error) ||
        (e && e.message) ||
        "Failed to export preview repository";
      toast.error(msg, { duration: 12000 });
    } finally {
      setExportLaunchpadZipLoading(false);
    }
  };

  const handleConfirmMigrateFrontend = async () => {
    const pid = project?.id;
    if (pid == null) {
      toast.error("Project is not loaded");
      return;
    }
    if (!migrateGitAccessAck) {
      toast.error("Confirm that the linked GitHub account can push to the launchpad repository.");
      return;
    }
    setMigrateSubmitting(true);
    try {
      await assertCursorAgentGithubReady(pid);
      await refreshProject();
      const data = await postMigrateFrontendAgent(pid, {
        userPrompt: migrateUserPrompt.trim() || undefined,
      });
      const agentId = data?.id != null ? String(data.id).trim() : "";
      const releases = await fetchReleases(pid);
      const activeRel =
        releases.find((r) => String(r?.status || "").toLowerCase() === "active") || releases[0];
      const releaseId = activeRel?.id;
      toast.success(
        agentId
          ? "Build Frontend App started. Watch progress in the live panel."
          : "Build Frontend App started.",
      );
      if (releaseId && agentId) {
        void startMigrateStreamFromHandoff(
          { releaseId, agentId },
          streamMigrateFrontend,
          migrateResumeStreamRef,
        );
      }
      setMigrateDialogOpen(false);
      setMigrateGitAccessAck(false);
      setMigrateUserPrompt("");
    } catch (e) {
      const accessPayload = parseMigrateGithubAccessError(e, {
        gitRepoPath: project?.gitRepoPath,
      });
      if (accessPayload) {
        setMigrateAccessPayload(accessPayload);
        setMigrateAccessDialogOpen(true);
      }
      const msg =
        accessPayload?.error ||
        (typeof e === "object" && e && e.error) ||
        (e && e.message) ||
        "Failed to start agent";
      toast.error(msg, { duration: 12000 });
    } finally {
      setMigrateSubmitting(false);
    }
  };

  const projectName = project?.name || "Project";
  const projectDescription = String(project?.description ?? "").trim();

  const { clientUrl, previewOnlyUrl, linksDisabledHint } = useMemo(
    () => buildProjectClientUrls(project),
    [project],
  );

  const canManageReleases = useMemo(
    () => (project ? userCanManageReleasesForProject(user, project) : user?.role === "admin"),
    [user, project],
  );
  const hasDeveloperRepo = useMemo(
    () => Boolean(String(project?.developmentRepoUrl ?? "").trim()),
    [project?.developmentRepoUrl],
  );
  const canManagePrompts = useMemo(
    () => (project ? userCanManageProjectPromptConfig(user, project) : false),
    [user, project],
  );

  const migrateFrontendDisabledHint = useMemo(() => {
    if (canMigrateFrontend) return "";
    const hasDev = Boolean(String(project?.developmentRepoUrl ?? "").trim());
    const hasGit = Boolean(String(project?.gitRepoPath ?? "").trim());
    if (!hasDev) {
      return ADD_DEV_REPO_MIGRATE_FROM_EDIT_PROJECT_HINT;
    }
    if (!hasGit) {
      return "Set the launchpad repository path (gitRepoPath) in Project settings to start Build Frontend App.";
    }
    return "";
  }, [canMigrateFrontend, project?.developmentRepoUrl, project?.gitRepoPath]);

  const exportLaunchpadZipDisabledHint = useMemo(() => {
    if (hasLaunchpadRepo) return "";
    return "Set the launchpad repository path (gitRepoPath) in Project settings to export the preview.";
  }, [hasLaunchpadRepo]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <ProjectJourneyShell
        project={project}
        projectName={projectName}
        projectDescription={projectDescription || undefined}
        clientUrl={clientUrl}
        previewOnlyUrl={previewOnlyUrl}
        releaseManagementRef={releaseManagementRef}
        onProjectUpdated={refreshProject}
        canManageReleases={canManageReleases}
        hasDeveloperRepo={hasDeveloperRepo}
        hasLaunchpadRepo={hasLaunchpadRepo}
        canManagePrompts={canManagePrompts}
        addCursorRulesDisabledHint={ADD_DEV_REPO_MIGRATE_FROM_EDIT_PROJECT_HINT}
        canMigrateFrontend={canMigrateFrontend}
        onMigrateFrontend={() => setMigrateDialogOpen(true)}
        migrateFrontendDisabledHint={migrateFrontendDisabledHint}
        onExportLaunchpadZip={handleExportLaunchpadZip}
        exportLaunchpadZipDisabledHint={exportLaunchpadZipDisabledHint}
        exportLaunchpadZipLoading={exportLaunchpadZipLoading}
        tourShouldAutoStart={tourShouldAutoStart}
        tourStartSignal={tourStartSignal}
        onTourSkip={markJourneyTourSkipped}
        onTourFinish={markJourneyTourCompleted}
        onStartJourneyTour={startJourneyTour}
        showDeferredScratchCard={showDeferredScratchCard}
        scratchAgentBannerOpen={scratchAgentBannerOpen}
        scratchAgentStatusLine={scratchAgentStatusLine}
        scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
        showScratchVersionFailedBanner={showScratchVersionFailedBanner}
        reviewPortalDisabled={!clientUrl}
        previewOnlyDisabled={!previewOnlyUrl}
        linksDisabledHint={linksDisabledHint}
        topBanner={
          <ProjectAlertStack
            showDeferredScratchCard={showDeferredScratchCard}
            deferredScratchPrompt={deferredScratchPrompt}
            onDeferredScratchPromptChange={setDeferredScratchPrompt}
            onStartDeferredScratchAgent={handleStartDeferredScratchAgent}
            scratchAgentSubmitting={scratchAgentSubmitting}
            scratchAgentBannerOpen={scratchAgentBannerOpen}
            scratchAgentStatusLine={scratchAgentStatusLine}
            onStopScratchAgent={() => setStopScratchDialogOpen(true)}
            stopScratchSubmitting={stopScratchSubmitting}
            scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
            showScratchVersionFailedBanner={showScratchVersionFailedBanner}
          />
        }
      />

      <StopAgentConfirmDialog
        open={stopScratchDialogOpen}
        onOpenChange={setStopScratchDialogOpen}
        onConfirm={handleConfirmStopScratchAgent}
        confirming={stopScratchSubmitting}
      />

      <Dialog
        open={migrateDialogOpen}
        onOpenChange={(open) => {
          setMigrateDialogOpen(open);
          if (!open) {
            setMigrateGitAccessAck(false);
            setMigrateUserPrompt("");
          }
        }}
      >
        <DialogContent
          showCloseButton={!migrateSubmitting}
          className="flex max-h-[min(90dvh,720px)] flex-col gap-4 overflow-hidden sm:max-w-lg"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Build Frontend App?</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <DialogDescription className="text-left space-y-2">
              <span className="block text-slate-700">
                This starts a Cursor cloud agent with your <strong>development</strong> repo and{" "}
                <strong>launchpad</strong> repo (both on{" "}
                <code className="rounded bg-slate-100 px-1">main</code>
                ). Only the <strong>launchpad</strong> repository will receive commits and a new
                branch.
              </span>
              <span className="block text-amber-900 font-medium">
                The agent is instructed to remove backend usage, authentication, and live API calls
                from the launchpad app and replace them with dummy data. Review the result before
                merging.
              </span>
              <span className="block text-sm text-slate-600">
                The platform checks that your linked GitHub account can read both repos and{" "}
                <strong>push</strong> to launchpad before starting the agent. If that check passes
                but Cursor still cannot push, confirm you are using the correct OAuth user below.
              </span>
            </DialogDescription>
            <div className="space-y-2">
              <Label
                htmlFor="migrate-frontend-user-prompt"
                className="text-sm font-medium text-slate-800"
              >
                Additional instructions (optional)
              </Label>
              <Textarea
                id="migrate-frontend-user-prompt"
                value={migrateUserPrompt}
                onChange={(e) => setMigrateUserPrompt(e.target.value)}
                placeholder="e.g. Preserve custom CSS modules; exclude the admin package…"
                rows={3}
                className="resize-y text-sm min-h-[72px] text-slate-900"
                disabled={migrateSubmitting}
                maxLength={4000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (
                      migrateGitAccessAck &&
                      !migrateSubmitting &&
                      !migrateGithubGateLoading &&
                      !migrateGithubGateMessage
                    ) {
                      void handleConfirmMigrateFrontend();
                    }
                  }
                }}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-3 text-left text-sm text-slate-800">
              <Checkbox
                checked={migrateGitAccessAck}
                onCheckedChange={(v) => setMigrateGitAccessAck(v === true)}
                disabled={migrateSubmitting}
                className="mt-0.5"
              />
              <span>
                I confirm the GitHub account linked to this project can <strong>push</strong> to the
                launchpad repository (
                <code className="rounded bg-white px-1 text-xs">
                  {String(project?.gitRepoPath || "").trim() || "gitRepoPath"}
                </code>
                ).
              </span>
            </label>
            <CursorAgentGithubGateAlert
              loading={migrateGithubGateLoading}
              message={migrateGithubGateMessage}
            />
          </div>
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={migrateSubmitting}
              onClick={() => setMigrateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                migrateSubmitting ||
                !migrateGitAccessAck ||
                migrateGithubGateLoading ||
                Boolean(migrateGithubGateMessage)
              }
              onClick={() => void handleConfirmMigrateFrontend()}
            >
              {migrateSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "Start agent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MigrateFrontendRepoAccessDialog
        open={migrateAccessDialogOpen}
        onOpenChange={setMigrateAccessDialogOpen}
        payload={migrateAccessPayload}
        fallbackGitRepoPath={project?.gitRepoPath}
      />
    </div>
  );
};

export default ProjectDetails;
