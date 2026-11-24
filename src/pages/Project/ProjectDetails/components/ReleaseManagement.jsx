import {
  createRelease,
  fetchCursorAgentById,
  fetchReleaseChangelog,
  fetchMigrateFrontendHistory,
  fetchReleases,
  patchRelease,
  regenerateReleaseReviewSummary,
  revertActiveReleaseToBaseline,
  startMigrateFrontend,
  assertCursorAgentGithubReady,
  cursorAgentGithubGateMessage,
  fetchCursorAgentGithubReadiness,
  migrateGithubAccessFromReadiness,
  parseMigrateGithubAccessError,
  updateReleaseStatus,
  exportProjectLaunchpadZip,
} from "@/api";
import { downloadBlob } from "@/pages/Project/PrdWorkspace/prdExport";
import { SCRATCH_VERSION_STATUS } from "@/constants/scratchVersionStatus";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH,
  isPlausibleDevRepoPath,
} from "@/lib/releaseLockForm";
import { ReleaseLockDevRepoSummary } from "@/components/release/ReleaseLockDevRepoSummary";
import { ReleaseBackendSyncSkippedBadge } from "@/components/release/ReleaseBackendSyncSkippedBadge";
import { SkipBackendLockAgentCheckbox } from "@/components/release/SkipBackendLockAgentCheckbox";
import { isYorkInternalClientLinkEmail } from "@/lib/clientLinkVerifiedEmail";
import { hasSkipLockAgentOperations } from "@/lib/releaseLockPresentation";
import { MigrateFrontendRepoAccessDialog } from "./MigrateFrontendRepoAccessDialog";
import { useMigrateFrontendStreamContext } from "@/hooks/useMigrateFrontendStream";
import { useReleaseLockStreamContext } from "../context/ReleaseLockStreamContext";
import { startMigrateStreamFromHandoff } from "@/lib/migrateFrontendStream.util";
import { BackendPlanAgentStatusBanner } from "@/components/release/BackendPlanAgentStatusBanner";
import {
  BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT,
  classifyCursorAgentPollTerminal,
  isBackendAgentFailureTerminal,
  isBackendAgentPollActive,
  isBackendAgentSuccessTerminal,
  isReleaseBackendAgentFailed,
  isReleaseBackendAgentRunning,
  isReleaseEffectivelyLocked,
  isReleaseLockPending,
  normalizeBackendAgentStatus,
  shouldPollReleaseBackendLockCompletion,
} from "@/lib/backendAgentStatus";
import { getReleaseDescriptionExampleThemes } from "@/lib/releaseDescriptionExampleDraft";
import {
  buildEffectiveReleaseDescriptionResult,
  pruneReleaseDescriptionExcludedPaths,
} from "@/lib/releaseDescriptionEffective";
import { createEmptyThemes, themesToMarkdown } from "@/lib/releaseDescriptionThemes";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import {
  computeReleaseDescriptionIntegrity,
  normalizeReleaseDescriptionForIntegrity,
} from "@/utils/releaseDescriptionIntegrity";
import { format, startOfDay } from "date-fns";
import { navigateToReleaseScope, navigateToReleases } from "@/lib/releaseNavigation";
import {
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Download,
  History,
  ArrowLeftRight,
  Info,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ProjectCursorRulesDialogs } from "./ProjectCursorRulesDialogs";
import { useProjectCursorRules } from "../hooks/useProjectCursorRules";
import { ReleaseAddRevisionDialog } from "./ReleaseAddRevisionDialog";
import { CreateReleaseDialog } from "./CreateReleaseDialog";
import { EditReleaseDialog } from "./EditReleaseDialog";
import { ReleaseScopePanel } from "./ReleaseScopePanel";
import { ReleaseRevisionEmptyState } from "./ReleaseRevisionEmptyState";
import { RELEASE_LIFECYCLE } from "@/constants/releaseLifecycleGuide";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CursorAgentGithubGateAlert } from "@/components/agent/CursorAgentGithubGateAlert";
import { EpicStoryPreviewDialog } from "@/components/ReleaseSuggestions/EpicStoryPreviewDialog";
import { JiraConnectionStatusControl } from "@/components/integrations/JiraConnectionStatusControl";
import {
  RELEASE_STATUS_OPTIONS,
  changelogFieldLabel,
  compareReleaseTuples,
  formatChangelogScalar,
  formatChangelogTimestamp,
  formatReadableDate,
  getSuggestedPatchReleaseNameFromList,
  isReleaseLocked,
  maxReleaseTupleFromList,
  normalizeReleaseStatus,
  parseReleaseNameToTuple,
  releaseCardAccentBarClass,
  releaseStatusLabel,
  releaseStatusPresentation,
  userCanAccessProjectSettings,
  userCanManageReleasesForProject,
} from "@/lib/releasePresentation";
import { ReleaseRoadmapPanel } from "@/pages/Project/ProductManagement/panels/ReleaseRoadmapPanel";
import { ReleasesOverviewPanel } from "@/pages/Project/ProductManagement/panels/ReleasesOverviewPanel";
import { ReleaseManagementContext } from "../hooks/useReleaseManagement";

export { userCanManageReleasesForProject };

function ReleaseManagementSkeleton({ showHeader }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading releases">
      {showHeader ? (
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-36" />
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4 rounded-2xl border border-slate-200/90 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryListSkeleton({ label }) {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

const ReleaseManagement = forwardRef(function ReleaseManagement(
  {
    projectId,
    projectName,
    project,
    embedded = false,
    workspaceMode = false,
    area = "overview",
    onWorkspaceStateChange,
  },
  ref,
) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageReleases = project
    ? userCanManageReleasesForProject(user, project)
    : user?.role === "admin";
  /** Edit release uses the same gate as Create Release. */
  const canEditRelease = canManageReleases;

  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addRevisionRelease, setAddRevisionRelease] = useState(null);
  const [revisionSeedProgressByRelease, setRevisionSeedProgressByRelease] = useState({});
  const revisionSeedResumePollRef = useRef(new Set());
  /** Cursor agent already terminal — do not resume poll when releases still list ongoingRevisionSeed. */
  const revisionSeedTerminalAgentsRef = useRef(new Set());
  const [creating, setCreating] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [backendPlanRetryReleaseId, setBackendPlanRetryReleaseId] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusConfirmSubmitting, setStatusConfirmSubmitting] = useState(false);

  const [revertBaselineDialog, setRevertBaselineDialog] = useState(null);
  const [revertBaselineReason, setRevertBaselineReason] = useState("");
  const [revertBaselineSubmitting, setRevertBaselineSubmitting] = useState(false);

  const [newRelease, setNewRelease] = useState({
    name: "",
    releaseDescription: "",
    themes: createEmptyThemes(),
    startDate: null,
    releaseDate: null,
    actualReleaseDate: null,
    actualReleaseNotes: "",
    isMvp: false,
    tags: [],
    clientReleaseNote: "",
  });
  const [appliedReleaseDescriptionIntegrity, setAppliedReleaseDescriptionIntegrity] =
    useState(null);
  /** Create flow: excluded epic/story paths; full draft is `newRelease.themes`. */
  const [createReleaseExcludedPaths, setCreateReleaseExcludedPaths] = useState(() => new Set());
  const [editDialog, setEditDialog] = useState(null);
  const [highlightReleaseId, setHighlightReleaseId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [aiSummaryRegenerating, setAiSummaryRegenerating] = useState(false);

  const [changelogByRelease, setChangelogByRelease] = useState({});
  const [changelogLoadingId, setChangelogLoadingId] = useState(null);
  const [migrateHistoryByRelease, setMigrateHistoryByRelease] = useState({});
  const [migrateHistoryLoadingId, setMigrateHistoryLoadingId] = useState(null);

  const latestReleaseTuple = useMemo(() => maxReleaseTupleFromList(releases), [releases]);

  const suggestedPatchReleaseName = useMemo(
    () => getSuggestedPatchReleaseNameFromList(releases),
    [releases],
  );

  const activeRelease = useMemo(
    () => releases.find((r) => normalizeReleaseStatus(r) === "active") ?? null,
    [releases],
  );

  const scopeReleaseIdParam = searchParams.get("scopeReleaseId");

  const scopeRelease = useMemo(() => {
    if (scopeReleaseIdParam) {
      const found = releases.find((r) => Number(r.id) === Number(scopeReleaseIdParam));
      if (found) return found;
    }
    return activeRelease;
  }, [releases, scopeReleaseIdParam, activeRelease]);

  const displayReleases = useMemo(() => {
    if (!workspaceMode || area === "overview") return releases;
    if (area === "active") return scopeRelease ? [scopeRelease] : [];
    return releases;
  }, [workspaceMode, area, releases, scopeRelease]);

  useEffect(() => {
    onWorkspaceStateChange?.({
      releases,
      loading,
      revisionSeedProgressByRelease,
      canManageReleases,
    });
  }, [releases, loading, revisionSeedProgressByRelease, canManageReleases, onWorkspaceStateChange]);

  const hasDeveloperRepo = Boolean(String(project?.developmentRepoUrl ?? "").trim());

  const cursorRules = useProjectCursorRules({
    projectId,
    hasDeveloperRepo,
    canOpen: canManageReleases,
  });

  const jiraEpicsStoriesReady = useMemo(() => {
    if (!project?.jiraConnectionId) return false;
    return Boolean(String(project?.jiraConnection?.jiraProjectKey ?? "").trim());
  }, [project?.jiraConnectionId, project?.jiraConnection?.jiraProjectKey]);

  const [migrateFrontendConfirmRelease, setMigrateFrontendConfirmRelease] = useState(null);
  const [migrateFrontendSubmitting, setMigrateFrontendSubmitting] = useState(false);
  const [migrateReleasePickerOpen, setMigrateReleasePickerOpen] = useState(false);
  const [migratePickerReleaseId, setMigratePickerReleaseId] = useState("");
  const [migrateConfirmAcknowledged, setMigrateConfirmAcknowledged] = useState(false);
  /** `"__new__"` = create next revision; else numeric ProjectVersion id string. */
  const [migrateSelectedProjectVersionId, setMigrateSelectedProjectVersionId] = useState("__new__");
  const [migrateUserPrompt, setMigrateUserPrompt] = useState("");
  const [migrateGithubGateMessage, setMigrateGithubGateMessage] = useState(null);
  const [migrateGithubGateLoading, setMigrateGithubGateLoading] = useState(false);
  const [migrateAccessDialogOpen, setMigrateAccessDialogOpen] = useState(false);
  const [migrateAccessPayload, setMigrateAccessPayload] = useState(null);
  const [exportRevisionLoadingId, setExportRevisionLoadingId] = useState(null);
  const [lockGithubGateMessage, setLockGithubGateMessage] = useState(null);
  const [lockGithubGateLoading, setLockGithubGateLoading] = useState(false);

  const {
    migrateFrontendProgressByRelease,
    liveReleaseId: migrateLiveReleaseId,
    runStatus: migrateRunStatus,
    streamMigrateFrontend,
    migrateResumeStreamRef,
    setMigrateFrontendProgressByRelease,
    registerReleaseReloaders,
    reconcileMigrateLiveFromReleases,
  } = useMigrateFrontendStreamContext();

  const {
    resetLockStreamState,
    showLockPanel,
    registerReleaseReloaders: registerLockStreamReloaders,
    registerLockRetryState,
  } = useReleaseLockStreamContext();

  const lastRelease = latestReleaseTuple ? latestReleaseTuple.map(String).join(".") : null;

  const openCreateReleaseDialog = useCallback(() => {
    if (!canManageReleases) return;
    setAppliedReleaseDescriptionIntegrity(null);
    setCreateReleaseExcludedPaths(new Set());
    setNewRelease({
      name: suggestedPatchReleaseName,
      releaseDescription: "",
      themes: createEmptyThemes(),
      startDate: null,
      releaseDate: null,
      actualReleaseDate: null,
      actualReleaseNotes: "",
      isMvp: false,
      tags: [],
      clientReleaseNote: "",
    });
    setShowCreateForm(true);
  }, [canManageReleases, suggestedPatchReleaseName]);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchReleases(projectId);
      setReleases(data);
    } catch (err) {
      setError(err.message || "Failed to load releases");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadReleasesSilent = useCallback(async () => {
    try {
      const data = await fetchReleases(projectId);
      setReleases(data);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    registerReleaseReloaders({ loadReleases, loadReleasesSilent });
    registerLockStreamReloaders({ loadReleasesSilent });
  }, [registerReleaseReloaders, registerLockStreamReloaders, loadReleases, loadReleasesSilent]);

  /** Resume migrate SSE when releases load after onboarding redirect (belt-and-suspenders). */
  useEffect(() => {
    if (!Array.isArray(releases) || releases.length === 0) return;
    reconcileMigrateLiveFromReleases(releases);
    void (async () => {
      for (const rel of releases) {
        const ongoingAgentId = rel?.ongoingMigrateFrontend?.agentId;
        if (!ongoingAgentId) continue;
        if (Number(migrateLiveReleaseId) === Number(rel.id) && migrateRunStatus === "RUNNING") {
          continue;
        }
        await startMigrateStreamFromHandoff(
          { releaseId: rel.id, agentId: ongoingAgentId },
          streamMigrateFrontend,
          migrateResumeStreamRef,
        );
      }
    })();
  }, [
    releases,
    migrateLiveReleaseId,
    migrateRunStatus,
    streamMigrateFrontend,
    migrateResumeStreamRef,
    reconcileMigrateLiveFromReleases,
  ]);

  const pollRevisionSeedAgent = useCallback(
    async (releaseId, agentId) => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      for (;;) {
        try {
          const data = await fetchCursorAgentById(agentId);
          const st = data?.status != null ? String(data.status) : "";
          setRevisionSeedProgressByRelease((prev) => ({
            ...prev,
            [releaseId]: { agentId, lastStatus: st },
          }));

          const outcome = classifyCursorAgentPollTerminal(data);
          if (outcome) {
            revisionSeedTerminalAgentsRef.current.add(`seed:${releaseId}:${agentId}`);
            if (outcome === "success") {
              toast.success(
                "Revision agent finished. Reload the client link (or wait a few seconds) to see the updated preview.",
              );
            } else if (outcome === "failed") {
              toast.error(`Revision agent did not succeed (${normalizeBackendAgentStatus(st)}).`);
            }
            setRevisionSeedProgressByRelease((prev) => {
              const next = { ...prev };
              delete next[releaseId];
              return next;
            });
            await loadReleases();
            if (outcome === "success") {
              setTimeout(() => {
                loadReleases().catch(() => {});
              }, 5000);
              setTimeout(() => {
                loadReleases().catch(() => {});
              }, 20000);
            }
            return;
          }
        } catch (err) {
          toast.error(err?.error || err?.message || "Failed to poll revision agent");
          setRevisionSeedProgressByRelease((prev) => {
            const next = { ...prev };
            delete next[releaseId];
            return next;
          });
          return;
        }
        await delay(5000);
      }
    },
    [loadReleases],
  );

  useEffect(() => {
    if (!Array.isArray(releases) || releases.length === 0) return;
    for (const rel of releases) {
      const o = rel?.ongoingRevisionSeed;
      if (!o?.agentId) continue;
      const dedupeKey = `seed:${rel.id}:${o.agentId}`;
      if (revisionSeedTerminalAgentsRef.current.has(dedupeKey)) continue;
      if (revisionSeedResumePollRef.current.has(dedupeKey)) continue;
      revisionSeedResumePollRef.current.add(dedupeKey);
      void pollRevisionSeedAgent(rel.id, o.agentId).finally(() => {
        revisionSeedResumePollRef.current.delete(dedupeKey);
      });
    }
  }, [releases, pollRevisionSeedAgent]);

  useEffect(() => {
    if (migrateFrontendConfirmRelease?.id == null) return;
    setMigrateConfirmAcknowledged(false);
    setMigrateUserPrompt("");
    const versions = Array.isArray(migrateFrontendConfirmRelease.versions)
      ? migrateFrontendConfirmRelease.versions
      : [];
    const tagged = versions.filter((v) => String(v?.gitTag || "").trim());
    if (!tagged.length) {
      setMigrateSelectedProjectVersionId("__new__");
      return;
    }
    const active = tagged.find((v) => v.isActive);
    const sorted = [...tagged].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    const pick = active ?? sorted[0];
    setMigrateSelectedProjectVersionId(pick?.id != null ? String(pick.id) : "__new__");
  }, [migrateFrontendConfirmRelease?.id]);

  useEffect(() => {
    if (!projectId || !migrateFrontendConfirmRelease) {
      setMigrateGithubGateMessage(null);
      setMigrateGithubGateLoading(false);
      return undefined;
    }
    let cancelled = false;
    setMigrateGithubGateLoading(true);
    setMigrateGithubGateMessage(null);
    fetchCursorAgentGithubReadiness(projectId)
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
  }, [projectId, migrateFrontendConfirmRelease?.id]);

  useEffect(() => {
    if (
      !projectId ||
      statusConfirm?.toStatus !== "locked" ||
      statusConfirm?.skipLockAgentOperations
    ) {
      setLockGithubGateMessage(null);
      setLockGithubGateLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLockGithubGateLoading(true);
    setLockGithubGateMessage(null);
    fetchCursorAgentGithubReadiness(projectId)
      .then((data) => {
        if (!cancelled) {
          setLockGithubGateMessage(cursorAgentGithubGateMessage(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLockGithubGateMessage("Could not check GitHub access. Try again in a moment.");
        }
      })
      .finally(() => {
        if (!cancelled) setLockGithubGateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    statusConfirm?.toStatus,
    statusConfirm?.releaseId,
    statusConfirm?.skipLockAgentOperations,
  ]);

  const confirmMigrateReleasePicker = useCallback(() => {
    const id = Number(migratePickerReleaseId);
    const rel = releases.find((r) => Number(r.id) === id);
    if (!rel) {
      toast.error("Choose a release.");
      return;
    }
    setMigrateReleasePickerOpen(false);
    setMigrateFrontendConfirmRelease(rel);
  }, [migratePickerReleaseId, releases]);

  const submitMigrateFrontend = useCallback(async () => {
    const rel = migrateFrontendConfirmRelease;
    if (!rel?.id) return;
    if (!migrateConfirmAcknowledged) {
      toast.error("Check the confirmation box before starting.");
      return;
    }
    if (migrateGithubGateMessage) {
      toast.error(migrateGithubGateMessage);
      return;
    }
    setMigrateFrontendSubmitting(true);
    try {
      await assertCursorAgentGithubReady(projectId);
      const pvRaw =
        migrateSelectedProjectVersionId && migrateSelectedProjectVersionId !== "__new__"
          ? Number(migrateSelectedProjectVersionId)
          : null;
      const projectVersionId =
        pvRaw != null && Number.isInteger(pvRaw) && pvRaw > 0 ? pvRaw : undefined;
      const data = await startMigrateFrontend(projectId, rel.id, {
        projectVersionId,
        migrateFrontend: migrateConfirmAcknowledged,
        userPrompt: migrateUserPrompt.trim() || undefined,
      });
      const agentId = data?.agentId;
      if (!agentId) {
        toast.error("Build Frontend App started but no run id was returned.");
        setMigrateFrontendConfirmRelease(null);
        return;
      }
      setMigrateFrontendConfirmRelease(null);
      setMigrateFrontendProgressByRelease((prev) => ({
        ...prev,
        [rel.id]: { agentId, lastStatus: SCRATCH_VERSION_STATUS.CREATING },
      }));
      toast.success(
        "Build Frontend App started. The developer repository is read-only; changes apply only to your platform repo.",
      );
      void startMigrateStreamFromHandoff(
        { releaseId: rel.id, agentId: String(agentId) },
        streamMigrateFrontend,
        migrateResumeStreamRef,
      );
    } catch (err) {
      const accessPayload = parseMigrateGithubAccessError(err, {
        gitRepoPath: project?.gitRepoPath,
      });
      if (accessPayload) {
        setMigrateAccessPayload(accessPayload);
        setMigrateAccessDialogOpen(true);
      }
      const raw =
        accessPayload?.error || (typeof err === "object" && err && err.error) || err?.message || "";
      toast.error(
        raw
          ? String(raw)
          : "Could not start Build Frontend App. Check GitHub access on the platform repo, confirm the release has a resolvable version tag, then retry.",
      );
    } finally {
      setMigrateFrontendSubmitting(false);
    }
  }, [
    migrateFrontendConfirmRelease,
    migrateConfirmAcknowledged,
    migrateSelectedProjectVersionId,
    migrateUserPrompt,
    migrateGithubGateMessage,
    projectId,
    streamMigrateFrontend,
    migrateResumeStreamRef,
    setMigrateFrontendProgressByRelease,
  ]);

  const handleExportRevisionZip = useCallback(
    async (version) => {
      const versionId = version?.id;
      if (projectId == null || versionId == null) {
        toast.error("Project or revision is not available");
        return;
      }
      if (!String(version?.gitTag || "").trim()) {
        toast.error("This revision has no git tag to export");
        return;
      }
      if (exportRevisionLoadingId != null) return;
      setExportRevisionLoadingId(versionId);
      try {
        const { blob, filename } = await exportProjectLaunchpadZip(projectId, {
          versionId: Number(versionId),
        });
        downloadBlob(blob, filename);
        toast.success(
          `Exported ${formatProjectVersionLabel(version.version) || "revision"} as ZIP`,
        );
      } catch (e) {
        const msg =
          (typeof e === "object" && e && e.error) ||
          (e && e.message) ||
          "Failed to export revision";
        toast.error(String(msg), { duration: 12000 });
      } finally {
        setExportRevisionLoadingId(null);
      }
    },
    [projectId, exportRevisionLoadingId],
  );

  const submitRevertActiveToBaseline = useCallback(async () => {
    if (!revertBaselineDialog || !activeRelease) return;
    const reason = revertBaselineReason.trim();
    if (reason.length < 3) {
      toast.error("Enter a short reason (at least 3 characters).");
      return;
    }
    setRevertBaselineSubmitting(true);
    try {
      const result = await revertActiveReleaseToBaseline(projectId, activeRelease.id, {
        baselineProjectVersionId: revertBaselineDialog.version.id,
        reason,
      });
      const label = formatProjectVersionLabel(result?.version);
      toast.success(
        label
          ? `New revision ${label} is building and will go live when ready.`
          : "Revert completed; active release updated.",
      );
      setRevertBaselineDialog(null);
      setRevertBaselineReason("");
      await loadReleases();
    } catch (err) {
      const msg = (typeof err === "object" && err && err.error) || err?.message || "Revert failed";
      toast.error(String(msg));
    } finally {
      setRevertBaselineSubmitting(false);
    }
  }, [revertBaselineDialog, activeRelease, revertBaselineReason, projectId, loadReleases]);

  useEffect(() => {
    if (projectId) {
      loadReleases();
    }
  }, [projectId, loadReleases]);

  useEffect(() => {
    if (!canManageReleases) {
      setShowCreateForm(false);
      setEditDialog(null);
      setRevertBaselineDialog(null);
    }
  }, [canManageReleases]);

  useImperativeHandle(
    ref,
    () => ({
      openAddCursorRules: cursorRules.openAddCursorRules,
      openCreateReleaseDialog,
    }),
    [cursorRules.openAddCursorRules, openCreateReleaseDialog],
  );

  useEffect(() => {
    setCreateReleaseExcludedPaths((prev) => {
      const next = pruneReleaseDescriptionExcludedPaths(newRelease.themes, prev);
      if (prev.size === next.size) {
        let unchanged = true;
        for (const k of prev) {
          if (!next.has(k)) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) return prev;
      }
      return next;
    });
  }, [newRelease.themes]);

  const needsLockCompletionPoll = useMemo(
    () => shouldPollReleaseBackendLockCompletion(releases),
    [releases],
  );

  useEffect(() => {
    if (!projectId || !needsLockCompletionPoll) return undefined;
    const intervalId = setInterval(() => void loadReleasesSilent(), 4000);
    return () => clearInterval(intervalId);
  }, [projectId, needsLockCompletionPoll, loadReleasesSilent]);

  const loadChangelog = async (releaseId) => {
    setChangelogLoadingId(releaseId);
    try {
      const data = await fetchReleaseChangelog(releaseId);
      setChangelogByRelease((prev) => ({ ...prev, [releaseId]: data }));
    } catch (err) {
      toast.error(err.error || "Failed to load history");
    } finally {
      setChangelogLoadingId(null);
    }
  };

  const loadMigrateHistory = async (releaseId) => {
    setMigrateHistoryLoadingId(releaseId);
    try {
      const data = await fetchMigrateFrontendHistory(releaseId);
      const runs = Array.isArray(data?.runs) ? data.runs : Array.isArray(data) ? data : [];
      setMigrateHistoryByRelease((prev) => ({ ...prev, [releaseId]: runs }));
    } catch (err) {
      toast.error(err.error || "Failed to load Build Frontend App history");
    } finally {
      setMigrateHistoryLoadingId(null);
    }
  };

  const openEditRelease = (release, { focusShipDate = false } = {}) => {
    if (!canEditRelease) return;
    if (isReleaseLockPending(release)) return;
    setEditDialog({
      id: release.id,
      name: release.name ?? "",
      releaseDescription: release.releaseDescription ?? "",
      isMvp: !!release.isMvp,
      tags: Array.isArray(release.tags) ? [...release.tags] : [],
      startDate: release.startDate ? new Date(release.startDate) : null,
      releaseDate: release.releaseDate ? new Date(release.releaseDate) : null,
      actualReleaseDate: release.actualReleaseDate ? new Date(release.actualReleaseDate) : null,
      actualReleaseNotes: release.actualReleaseNotes ?? "",
      clientReleaseNote: release.clientReleaseNote ?? "",
      clientReviewAiSummary: release.clientReviewAiSummary ?? "",
      clientReviewAiSummaryAt: release.clientReviewAiSummaryAt ?? null,
      showClientReviewSummary: release.showClientReviewSummary !== false,
      clientReviewAiGenerationContext: release.clientReviewAiGenerationContext ?? "",
      isLocked: isReleaseLocked(release),
      isSkipped: normalizeReleaseStatus(release) === "skip",
      reason: "",
      focusShipDate,
    });
  };

  const handleManageReleaseScope = useCallback(
    (releaseId) => {
      const rid =
        releaseId != null
          ? Number(releaseId)
          : editDialog?.id != null
            ? Number(editDialog.id)
            : activeRelease?.id;
      if (!Number.isInteger(rid) || rid < 1) return;
      setEditDialog(null);
      setHighlightReleaseId(null);
      navigateToReleaseScope(setSearchParams, rid);
    },
    [setSearchParams, editDialog?.id, activeRelease?.id],
  );

  const handleRegenerateClientReviewSummary = async () => {
    if (!editDialog?.id) return;
    setAiSummaryRegenerating(true);
    try {
      const data = await regenerateReleaseReviewSummary(editDialog.id, {
        clientReviewAiGenerationContext: editDialog.clientReviewAiGenerationContext ?? "",
      });
      if (data.ok) {
        toast.success("Review checklist updated");
      } else {
        toast.error(data.error || "Could not generate checklist");
      }
      const rel = data.release;
      if (rel && editDialog && Number(rel.id) === Number(editDialog.id)) {
        setEditDialog((prev) =>
          prev
            ? {
                ...prev,
                clientReviewAiSummary: rel.clientReviewAiSummary ?? "",
                clientReviewAiSummaryAt: rel.clientReviewAiSummaryAt ?? null,
                showClientReviewSummary: rel.showClientReviewSummary !== false,
                clientReviewAiGenerationContext: rel.clientReviewAiGenerationContext ?? "",
              }
            : prev,
        );
      }
      await loadReleases();
    } catch (err) {
      toast.error(err.error || err.message || "Failed to generate checklist");
    } finally {
      setAiSummaryRegenerating(false);
    }
  };

  const saveEditRelease = async (e) => {
    e.preventDefault();
    if (!editDialog) return;
    const noteTrimmed = editDialog.clientReleaseNote.trim() || null;
    const reviewSummaryTrimmed = editDialog.clientReviewAiSummary.trim() || null;
    const aiContextTrimmed = editDialog.clientReviewAiGenerationContext.trim() || null;
    const clientLinkPayload = {
      clientReleaseNote: noteTrimmed,
      clientReviewAiSummary: reviewSummaryTrimmed,
      showClientReviewSummary: editDialog.showClientReviewSummary === true,
      clientReviewAiGenerationContext: aiContextTrimmed,
    };
    const shipPayload = editDialog.isSkipped
      ? {}
      : {
          actualReleaseDate: editDialog.actualReleaseDate
            ? format(editDialog.actualReleaseDate, "yyyy-MM-dd")
            : null,
          actualReleaseNotes: editDialog.actualReleaseNotes.trim() || null,
        };
    const payload = editDialog.isLocked
      ? { ...clientLinkPayload, ...shipPayload }
      : {
          releaseDescription: editDialog.releaseDescription.trim() || null,
          isMvp: editDialog.isMvp,
          tags: Array.isArray(editDialog.tags) ? editDialog.tags : [],
          startDate: editDialog.startDate ? format(editDialog.startDate, "yyyy-MM-dd") : null,
          releaseDate: editDialog.releaseDate ? format(editDialog.releaseDate, "yyyy-MM-dd") : null,
          ...shipPayload,
          ...clientLinkPayload,
          reason: editDialog.reason.trim(),
        };
    try {
      setEditSaving(true);
      await patchRelease(editDialog.id, payload);
      toast.success(
        editDialog.isLocked
          ? editDialog.isSkipped
            ? "Client link notes saved"
            : "Release updated (client link and/or ship fields)"
          : "Release updated",
      );
      const rid = editDialog.id;
      setEditDialog(null);
      await loadReleases();
      setChangelogByRelease((prev) => {
        const next = { ...prev };
        delete next[rid];
        return next;
      });
    } catch (err) {
      toast.error(err.error || "Failed to update release");
    } finally {
      setEditSaving(false);
    }
  };

  const submitCreateRelease = useCallback(
    async (releaseData) => {
      const releaseName = releaseData.name;
      try {
        setCreating(true);
        const created = await createRelease(releaseData);
        setAppliedReleaseDescriptionIntegrity(null);
        setCreateReleaseExcludedPaths(new Set());
        setNewRelease({
          name: "",
          releaseDescription: "",
          themes: createEmptyThemes(),
          startDate: null,
          releaseDate: null,
          actualReleaseDate: null,
          actualReleaseNotes: "",
          isMvp: false,
          tags: [],
          clientReleaseNote: "",
        });
        setShowCreateForm(false);
        await loadReleases();
        const createdId = created?.id != null ? Number(created.id) : null;
        if (createdId != null) {
          setHighlightReleaseId(createdId);
        }
        navigateToReleases(setSearchParams, "overview");
        toast.success(`Release "${releaseName}" created`, {
          description:
            "Set it Active, then add stories in Release scope on the Active release tab.",
          action: {
            label: "View release",
            onClick: () => {
              navigateToReleases(setSearchParams, "overview");
              if (createdId != null) setHighlightReleaseId(createdId);
            },
          },
        });
      } catch (err) {
        const errorMessage = err.error || "Failed to create release";
        setError(errorMessage);
        toast.error(`${errorMessage}`);
      } finally {
        setCreating(false);
      }
    },
    [loadReleases, setSearchParams],
  );

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    const name = newRelease.name.trim();
    if (!name) return;
    if (!newRelease.startDate) {
      toast.error("Schedule start date is required.");
      return;
    }
    if (!newRelease.releaseDate) {
      toast.error("Target release date is required.");
      return;
    }
    if (newRelease.releaseDate < newRelease.startDate) {
      toast.error("Target release date must be on or after the schedule start date.");
      return;
    }
    const submitted = parseReleaseNameToTuple(name);
    if (!submitted) {
      toast.error("Use dot-separated numbers with at least two segments (e.g. 1.0.0, 1.1.0).");
      return;
    }
    if (latestReleaseTuple && compareReleaseTuples(submitted, latestReleaseTuple) <= 0) {
      const latestStr = latestReleaseTuple.map(String).join(".");
      const projectLabel =
        (typeof projectName === "string" && projectName.trim()) ||
        (typeof project?.name === "string" && project.name.trim()) ||
        "this project";
      toast.error(
        `For "${projectLabel}", release number must be greater than the latest: ${latestStr} (e.g. 1.0.3, 1.1.0, or 2.0.0).`,
      );
      return;
    }

    const basePayload = {
      projectId: Number(projectId),
      name,
      startDate: newRelease.startDate ? format(newRelease.startDate, "yyyy-MM-dd") : null,
      releaseDate: newRelease.releaseDate ? format(newRelease.releaseDate, "yyyy-MM-dd") : null,
      actualReleaseDate: newRelease.actualReleaseDate
        ? format(newRelease.actualReleaseDate, "yyyy-MM-dd")
        : null,
      actualReleaseNotes: newRelease.actualReleaseNotes.trim() || null,
      isMvp: newRelease.isMvp,
      tags: Array.isArray(newRelease.tags) ? newRelease.tags : [],
      clientReleaseNote: newRelease.clientReleaseNote.trim() || null,
    };

    const releaseData = {
      ...basePayload,
      releaseDescription: newRelease.releaseDescription.trim() || null,
    };

    await submitCreateRelease(releaseData);
  };

  const requestStatusChange = (releaseId, newStatus) => {
    const rel = releases.find((r) => r.id === releaseId);
    if (!rel || normalizeReleaseStatus(rel) === newStatus) return;
    if (isReleaseLocked(rel)) return;
    if (isReleaseLockPending(rel)) return;
    setStatusConfirm({
      releaseId,
      releaseName: rel.name,
      fromStatus: normalizeReleaseStatus(rel),
      toStatus: newStatus,
      statusReason: "",
      lockDevelopmentRepoUrl: "",
      skipLockAgentOperations: false,
      userPrompt: "",
    });
  };

  const retryBackendPlanAgentLock = useCallback(
    async (release) => {
      if (!projectId || !release?.id || !canManageReleases) return;
      if (lockGithubGateMessage) {
        toast.error(lockGithubGateMessage);
        return;
      }
      const submodulePath =
        release.developerSubmodulePath?.trim() || DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH;
      try {
        setBackendPlanRetryReleaseId(release.id);
        resetLockStreamState();
        await assertCursorAgentGithubReady(projectId);
        await updateReleaseStatus(release.id, "locked", {
          reason: "Retry backend plan agent after failure.",
          developerSubmodulePath: submodulePath,
        });
        toast.success("Retrying backend plan agent — the release will lock when it finishes.");
        await loadReleases();
      } catch (err) {
        toast.error(err?.error || err?.message || "Failed to retry backend plan agent");
      } finally {
        setBackendPlanRetryReleaseId(null);
      }
    },
    [projectId, canManageReleases, lockGithubGateMessage, resetLockStreamState, loadReleases],
  );

  useEffect(() => {
    registerLockRetryState({
      onRetry: canManageReleases ? retryBackendPlanAgentLock : null,
      retryReleaseId: backendPlanRetryReleaseId,
      retryDisabled: lockGithubGateLoading || Boolean(lockGithubGateMessage),
    });
  }, [
    registerLockRetryState,
    canManageReleases,
    backendPlanRetryReleaseId,
    lockGithubGateLoading,
    lockGithubGateMessage,
    retryBackendPlanAgentLock,
  ]);

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    const { releaseId, toStatus } = statusConfirm;
    if (toStatus === "active") {
      const otherActive = releases.find(
        (r) => r.id !== releaseId && normalizeReleaseStatus(r) === "active",
      );
      if (otherActive) return;
    }
    const reason = (statusConfirm.statusReason || "").trim();
    if (toStatus !== "locked" && !reason) {
      toast.error("Please enter a reason for this status change.");
      return;
    }

    if (toStatus === "locked" && !statusConfirm.skipLockAgentOperations && lockGithubGateMessage) {
      toast.error(lockGithubGateMessage);
      return;
    }

    try {
      setStatusConfirmSubmitting(true);
      setStatusUpdatingId(releaseId);
      if (toStatus === "locked") {
        if (
          !statusConfirm.skipLockAgentOperations &&
          !hasDeveloperRepo &&
          !isPlausibleDevRepoPath(statusConfirm.lockDevelopmentRepoUrl)
        ) {
          toast.error("Enter a valid development repository (e.g. github.com/org/your-repo).");
          return;
        }
        if (!statusConfirm.skipLockAgentOperations) {
          await assertCursorAgentGithubReady(projectId);
        }
        const lockResult = await updateReleaseStatus(releaseId, "locked", {
          reason: "",
          developerSubmodulePath: DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH,
          ...(statusConfirm.skipLockAgentOperations
            ? { skipLockAgentOperations: true }
            : !hasDeveloperRepo
              ? {
                  developmentRepoUrl: (statusConfirm.lockDevelopmentRepoUrl || "").trim(),
                }
              : {}),
          ...(!statusConfirm.skipLockAgentOperations && (statusConfirm.userPrompt || "").trim()
            ? { userPrompt: (statusConfirm.userPrompt || "").trim() }
            : {}),
        });
        const lockedRelease = lockResult?.release ?? null;
        if (lockedRelease && isReleaseLockPending(lockedRelease)) {
          resetLockStreamState();
          showLockPanel(releaseId);
        }
      } else {
        await updateReleaseStatus(releaseId, toStatus, reason);
      }
      toast.success(`Release status set to ${toStatus}`);
      setStatusConfirm(null);
      await loadReleases();
    } catch (err) {
      toast.error(err.error || "Failed to update release status");
      setError(err.error || "Failed to update release status");
    } finally {
      setStatusConfirmSubmitting(false);
      setStatusUpdatingId(null);
    }
  };

  /** Another release is already Active — must lock it before this one can become Active (frontend guard). */
  const conflictingActiveRelease = useMemo(() => {
    if (!statusConfirm || statusConfirm.toStatus !== "active") return null;
    return (
      releases.find(
        (r) => r.id !== statusConfirm.releaseId && normalizeReleaseStatus(r) === "active",
      ) ?? null
    );
  }, [statusConfirm, releases]);

  const blockActivateUntilOtherLocked = !!conflictingActiveRelease;

  const lockMissingDevelopmentRepo =
    statusConfirm?.toStatus === "locked" &&
    !statusConfirm?.skipLockAgentOperations &&
    !hasDeveloperRepo &&
    !isPlausibleDevRepoPath(statusConfirm?.lockDevelopmentRepoUrl);

  const statusConfirmUserIsYorkInternal = isYorkInternalClientLinkEmail(user?.email);

  if (loading && !workspaceMode) {
    return <ReleaseManagementSkeleton showHeader={!embedded} />;
  }

  if (loading) {
    return null;
  }

  const releaseActions = canManageReleases ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button className="gap-2 text-white" onClick={openCreateReleaseDialog}>
        <Plus />
        Create Release
      </Button>
    </div>
  ) : null;

  const listTitle =
    workspaceMode && area === "active"
      ? scopeRelease
        ? scopeRelease.id === activeRelease?.id
          ? `Active release · ${scopeRelease.name}`
          : `Release scope · ${scopeRelease.name}`
        : "Active release"
      : `All Releases (${releases.length})`;

  const overviewProps = {
    displayReleases,
    releases,
    workspaceMode,
    area,
    listTitle,
    canManageReleases,
    canEditRelease,
    activeRelease,
    project,
    revisionSeedProgressByRelease,
    migrateFrontendProgressByRelease,
    changelogByRelease,
    changelogLoadingId,
    loadChangelog,
    openEditRelease,
    requestStatusChange,
    setAddRevisionRelease,
    statusUpdatingId,
    statusConfirm,
    revertBaselineSubmitting,
    openCreateReleaseDialog,
    setRevertBaselineDialog,
    setRevertBaselineReason,
    highlightReleaseId,
    onDismissHighlightRelease: () => setHighlightReleaseId(null),
    onNavigateToActiveScope: (releaseId) => {
      handleManageReleaseScope(releaseId);
    },
    onManageReleaseScope: handleManageReleaseScope,
  };

  const mainContent =
    workspaceMode && area === "roadmap" ? (
      <ReleaseRoadmapPanel releases={releases} />
    ) : workspaceMode && area === "active" && scopeRelease ? (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0">
          <ReleasesOverviewPanel {...overviewProps} layoutVariant="active-sidebar" />
        </div>
        <ReleaseScopePanel
          release={scopeRelease}
          project={project}
          canEdit={canEditRelease}
          viewMode="scope"
        />
      </div>
    ) : (
      <ReleasesOverviewPanel {...overviewProps} />
    );

  return (
    <ReleaseManagementContext.Provider value={overviewProps}>
      <div>
        {embedded && !workspaceMode ? (
          releaseActions ? (
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              {releaseActions}
            </div>
          ) : null
        ) : !embedded ? (
          <PageHeader title="Release Management">{releaseActions}</PageHeader>
        ) : null}

        {releases.some((r) => isReleaseBackendAgentFailed(r)) ? (
          <div className="mb-4 space-y-2" role="region" aria-label="Backend plan agent status">
            {releases.map((r) =>
              isReleaseBackendAgentFailed(r) ? (
                <BackendPlanAgentStatusBanner
                  key={r.id}
                  release={r}
                  onRetry={canManageReleases ? () => void retryBackendPlanAgentLock(r) : undefined}
                  retryLoading={backendPlanRetryReleaseId === r.id}
                  retryDisabled={lockGithubGateLoading || Boolean(lockGithubGateMessage)}
                />
              ) : null,
            )}
          </div>
        ) : null}

        <MigrateFrontendRepoAccessDialog
          open={migrateAccessDialogOpen}
          onOpenChange={setMigrateAccessDialogOpen}
          payload={migrateAccessPayload}
          fallbackGitRepoPath={project?.gitRepoPath}
        />

        <div className={workspaceMode ? "flex flex-col gap-4" : "flex flex-col gap-6"}>
          {workspaceMode ? (
            mainContent
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">{listTitle}</h3>
              </div>
              <div className="p-6">
                {displayReleases.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 flex flex-col items-center">
                    <div className="mb-4 opacity-50 text-slate-400">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-700 mb-2">No Releases Found</h3>
                    <p className="mb-6">Create your first release to get started.</p>
                    {canManageReleases && (
                      <Button className="text-white" onClick={openCreateReleaseDialog}>
                        Create Release
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {releases.map((release) => {
                      const statusUi = releaseStatusPresentation(release);
                      const backendPlanAgentRunning = isReleaseLockPending(release);
                      return (
                        <div
                          key={release.id}
                          className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/40 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60"
                        >
                          <div
                            className={`h-1 w-full shrink-0 ${releaseCardAccentBarClass(release)}`}
                            aria-hidden
                          />
                          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6 sm:py-5">
                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <div className="flex min-w-0 flex-col items-start gap-2">
                                <div className="flex min-w-0 max-w-full items-center gap-2">
                                  <h4 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                                    {release.name}
                                  </h4>
                                  {release.isMvp ? (
                                    <Badge className="bg-primary font-bold text-white">MVP</Badge>
                                  ) : null}
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className={`inline-flex max-w-full shrink-0 items-center gap-2 rounded-full px-3 py-1 text-left text-xs font-semibold ${statusUi.pillClass}`}
                                    >
                                      <span
                                        className={`size-2 shrink-0 rounded-full ${statusUi.dotClass}`}
                                        aria-hidden
                                      />
                                      <span className="truncate">{statusUi.label}</span>
                                      {normalizeReleaseStatus(release) === "active" && (
                                        <Sparkles
                                          className="size-3.5 shrink-0 text-emerald-600/80"
                                          aria-hidden
                                        />
                                      )}
                                      {isReleaseLocked(release) && (
                                        <Lock
                                          className="size-3.5 shrink-0 text-rose-600/80"
                                          aria-hidden
                                        />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    className="max-w-[280px] text-left leading-snug"
                                  >
                                    {statusUi.hint}
                                  </TooltipContent>
                                </Tooltip>
                                {isReleaseLocked(release) && hasSkipLockAgentOperations(release) ? (
                                  <ReleaseBackendSyncSkippedBadge />
                                ) : null}
                              </div>
                              <div className="flex min-w-0 w-full flex-col items-stretch gap-2 border-t border-slate-100/80 pt-3 text-xs sm:ml-auto sm:w-auto sm:min-w-0 sm:flex-1 sm:items-end sm:border-t-0 sm:pt-0">
                                <div className="flex w-full justify-end">
                                  <div className="flex max-w-full min-w-0 items-center gap-2 rounded-lg bg-slate-100/70 px-3 py-2 text-slate-700 ring-1 ring-slate-200/60">
                                    <CalendarDays
                                      className="size-3.5 shrink-0 text-slate-500"
                                      aria-hidden
                                    />
                                    <span className="min-w-0 font-semibold text-slate-900">
                                      <time dateTime={release.startDate ?? undefined}>
                                        {formatReadableDate(release.startDate)}
                                      </time>
                                      <span className="mx-1 font-normal text-slate-400">→</span>
                                      <time dateTime={release.releaseDate ?? undefined}>
                                        {formatReadableDate(release.releaseDate)}
                                      </time>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
                                  {canEditRelease &&
                                    (backendPlanAgentRunning ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex">
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="sm"
                                              disabled
                                              className="w-fit cursor-not-allowed gap-2 bg-slate-100/70 text-slate-400 ring-1 ring-slate-200/60 opacity-90"
                                            >
                                              <Pencil className="size-3.5" />
                                              Edit
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[280px] text-left leading-snug"
                                        >
                                          {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="w-fit gap-2 bg-slate-100/70 text-slate-700 ring-1 ring-slate-200/60"
                                        onClick={() => openEditRelease(release)}
                                      >
                                        <Pencil className="size-3.5" />
                                        Edit
                                      </Button>
                                    ))}
                                  {revisionSeedProgressByRelease[release.id] ? (
                                    <span className="inline-flex max-w-full min-w-0 flex-[1_1_12rem] flex-col gap-0.5 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-2 py-1 text-[11px] font-medium text-emerald-950 sm:max-w-[min(100%,18rem)]">
                                      <span className="inline-flex items-center gap-1.5">
                                        <Loader2
                                          className="size-3.5 shrink-0 animate-spin"
                                          aria-hidden
                                        />
                                        <span className="min-w-0 leading-tight wrap-break-word">
                                          {RELEASE_LIFECYCLE.ongoingSeed.headline}:{" "}
                                          {normalizeBackendAgentStatus(
                                            revisionSeedProgressByRelease[release.id]?.lastStatus,
                                          )}
                                        </span>
                                      </span>
                                      <span className="pl-5.5 text-[10px] font-normal leading-snug text-emerald-900/85">
                                        {RELEASE_LIFECYCLE.ongoingSeed.detail}
                                      </span>
                                    </span>
                                  ) : null}
                                  {migrateFrontendProgressByRelease[release.id] ? (
                                    <span className="inline-flex max-w-full min-w-0 flex-[1_1_12rem] flex-col gap-0.5 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[11px] font-medium text-amber-950 sm:max-w-[min(100%,18rem)]">
                                      <span className="inline-flex items-center gap-1.5">
                                        <Loader2
                                          className="size-3.5 shrink-0 animate-spin"
                                          aria-hidden
                                        />
                                        <span className="min-w-0 leading-tight wrap-break-word">
                                          {migrateFrontendProgressByRelease[release.id]?.pipeline
                                            ?.headline ??
                                            `Build Frontend App: ${normalizeBackendAgentStatus(
                                              migrateFrontendProgressByRelease[release.id]
                                                ?.lastStatus,
                                            )}`}
                                        </span>
                                      </span>
                                      {migrateFrontendProgressByRelease[release.id]?.pipeline
                                        ?.detail ? (
                                        <span className="pl-5.5 text-[10px] font-normal leading-snug text-amber-900/85">
                                          {
                                            migrateFrontendProgressByRelease[release.id].pipeline
                                              .detail
                                          }
                                        </span>
                                      ) : null}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <EpicStoryPreviewDialog
                              description={release.description}
                              releaseDescription={release.releaseDescription}
                              jiraReleaseSync={release.jiraReleaseSync}
                              variant="management"
                            />

                            {canManageReleases && (
                              <Collapsible
                                defaultOpen={false}
                                onOpenChange={(open) => {
                                  if (
                                    open &&
                                    !changelogByRelease[release.id] &&
                                    changelogLoadingId !== release.id
                                  ) {
                                    loadChangelog(release.id);
                                  }
                                }}
                              >
                                <CollapsibleTrigger className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-100/80">
                                  <History className="size-3.5 shrink-0" />
                                  Change history
                                  <ChevronDown className="ml-auto size-4 shrink-0 opacity-60" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-2">
                                  {changelogLoadingId === release.id ? (
                                    <HistoryListSkeleton label="Loading change history" />
                                  ) : (
                                    <ul className="max-h-80 space-y-3 overflow-y-auto pr-0.5">
                                      {(changelogByRelease[release.id] || []).length === 0 ? (
                                        <li className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                                          No changes recorded yet.
                                        </li>
                                      ) : (
                                        (changelogByRelease[release.id] || []).map((log) => (
                                          <li
                                            key={log.id}
                                            className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm"
                                          >
                                            <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                              <span className="text-sm font-semibold text-slate-900">
                                                {log.changedBy?.name ||
                                                  log.changedByEmail ||
                                                  "Unknown"}
                                              </span>
                                              <time
                                                className="text-xs text-slate-500"
                                                dateTime={log.createdAt}
                                              >
                                                {formatChangelogTimestamp(log.createdAt)}
                                              </time>
                                            </div>
                                            <div className="px-3 py-2">
                                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                Reason
                                              </p>
                                              <p className="mt-0.5 text-sm leading-relaxed text-slate-700">
                                                {log.reason}
                                              </p>
                                            </div>
                                            {log.changes &&
                                            typeof log.changes === "object" &&
                                            Object.keys(log.changes).length > 0 ? (
                                              <div className="border-t border-slate-100 px-2 py-2">
                                                <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                  What changed
                                                </p>
                                                <div className="overflow-x-auto rounded-md border border-slate-100">
                                                  <table className="w-full min-w-[280px] text-left text-xs">
                                                    <thead>
                                                      <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600">
                                                        <th className="px-2 py-1.5 font-semibold">
                                                          Field
                                                        </th>
                                                        <th className="px-2 py-1.5 font-semibold">
                                                          Before
                                                        </th>
                                                        <th className="px-2 py-1.5 font-semibold">
                                                          After
                                                        </th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {Object.entries(log.changes).map(
                                                        ([key, val]) => {
                                                          const isDiff =
                                                            val &&
                                                            typeof val === "object" &&
                                                            "from" in val &&
                                                            "to" in val;
                                                          return (
                                                            <tr
                                                              key={key}
                                                              className="border-b border-slate-50 last:border-0"
                                                            >
                                                              <td className="px-2 py-2 align-top font-medium text-slate-800">
                                                                {changelogFieldLabel(key)}
                                                              </td>
                                                              <td className="px-2 py-2 align-top text-slate-600">
                                                                {isDiff
                                                                  ? formatChangelogScalar(val.from)
                                                                  : formatChangelogScalar(val)}
                                                              </td>
                                                              <td className="px-2 py-2 align-top text-slate-900">
                                                                {isDiff
                                                                  ? formatChangelogScalar(val.to)
                                                                  : "—"}
                                                              </td>
                                                            </tr>
                                                          );
                                                        },
                                                      )}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            ) : null}
                                          </li>
                                        ))
                                      )}
                                    </ul>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            )}

                            <Collapsible
                              defaultOpen={false}
                              onOpenChange={(open) => {
                                if (
                                  open &&
                                  !migrateHistoryByRelease[release.id] &&
                                  migrateHistoryLoadingId !== release.id
                                ) {
                                  void loadMigrateHistory(release.id);
                                }
                              }}
                            >
                              <CollapsibleTrigger className="mt-2 flex h-9 w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-100/80">
                                <ArrowLeftRight className="size-3.5 shrink-0" />
                                Build Frontend App history
                                <ChevronDown className="ml-auto size-4 shrink-0 opacity-60" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2">
                                {migrateHistoryLoadingId === release.id ? (
                                  <HistoryListSkeleton label="Loading Build Frontend App history" />
                                ) : (
                                  <ul className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
                                    {(migrateHistoryByRelease[release.id] || []).length === 0 ? (
                                      <li className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                                        No Build Frontend App runs yet.
                                      </li>
                                    ) : (
                                      (migrateHistoryByRelease[release.id] || []).map((run) => {
                                        const outcome = String(run.outcome || "").toLowerCase();
                                        const badgeVariant =
                                          outcome === "succeeded"
                                            ? "default"
                                            : outcome === "failed"
                                              ? "destructive"
                                              : "secondary";
                                        const badgeLabel =
                                          outcome === "succeeded"
                                            ? "Succeeded"
                                            : outcome === "failed"
                                              ? "Failed"
                                              : "In progress";
                                        const who =
                                          run.attemptedBy?.name ||
                                          run.attemptedBy?.email ||
                                          "Unknown";
                                        return (
                                          <li
                                            key={run.id}
                                            className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm"
                                          >
                                            <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                                                <Badge variant={badgeVariant} className="shrink-0">
                                                  {badgeLabel}
                                                </Badge>
                                                <span className="text-sm font-semibold text-slate-900">
                                                  {who}
                                                </span>
                                              </span>
                                              <time
                                                className="text-xs text-slate-500"
                                                dateTime={run.attemptedAt || run.updatedAt}
                                              >
                                                {formatChangelogTimestamp(
                                                  run.attemptedAt || run.updatedAt,
                                                )}
                                              </time>
                                            </div>
                                            <div className="px-3 py-2 text-sm text-slate-700">
                                              {outcome === "succeeded" ? (
                                                <p>
                                                  {run.versionLabel
                                                    ? `Revision ready (${run.versionLabel}).`
                                                    : "Revision ready."}
                                                </p>
                                              ) : outcome === "failed" && run.agentFailureDetail ? (
                                                <p className="line-clamp-3 break-words text-destructive">
                                                  {run.agentFailureDetail}
                                                </p>
                                              ) : (
                                                <p className="text-slate-500">
                                                  {normalizeBackendAgentStatus(run.status) ||
                                                    "Running…"}
                                                </p>
                                              )}
                                            </div>
                                          </li>
                                        );
                                      })
                                    )}
                                  </ul>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                            {canManageReleases && (
                              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end sm:gap-6">
                                  <div className="flex min-w-0 flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                      Set status
                                    </span>
                                    {isReleaseLocked(release) ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex w-full">
                                            <Select
                                              value={normalizeReleaseStatus(release)}
                                              disabled
                                            >
                                              <SelectTrigger className="h-9 w-full cursor-not-allowed border-slate-200 bg-slate-50/90 text-slate-500 opacity-90 shadow-none hover:border-slate-200 hover:bg-slate-50/90">
                                                <SelectValue placeholder="Status" />
                                              </SelectTrigger>
                                              <SelectContent align="start">
                                                {RELEASE_STATUS_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[280px] text-left leading-snug"
                                        >
                                          This release is locked! You cannot unlock it. You can
                                          still view this release by selecting a version from the
                                          client link.
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : backendPlanAgentRunning ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex w-full">
                                            <Select
                                              value={normalizeReleaseStatus(release)}
                                              disabled
                                            >
                                              <SelectTrigger className="h-9 w-full cursor-not-allowed border-amber-200/80 bg-amber-50/50 text-amber-950/70 opacity-90 shadow-none">
                                                <SelectValue placeholder="Status" />
                                              </SelectTrigger>
                                              <SelectContent align="start">
                                                {RELEASE_STATUS_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[280px] text-left leading-snug"
                                        >
                                          {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Select
                                        value={normalizeReleaseStatus(release)}
                                        onValueChange={(v) => requestStatusChange(release.id, v)}
                                        disabled={
                                          statusUpdatingId === release.id ||
                                          statusConfirm?.releaseId === release.id
                                        }
                                      >
                                        <SelectTrigger className="h-9 w-full border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50/90">
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                          {RELEASE_STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                  <div className="flex min-w-0 flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                      Add revision
                                    </span>
                                    {isReleaseLocked(release) ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex w-full">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled
                                              className="h-9 w-full cursor-not-allowed gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/90 font-medium text-slate-400 shadow-none"
                                            >
                                              <Plus
                                                className="size-4 shrink-0 opacity-60"
                                                strokeWidth={2}
                                              />
                                              Add revision
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[260px] text-center leading-snug"
                                        >
                                          Locked releases cannot receive new revisions. View this
                                          release from the client link version selector.
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : backendPlanAgentRunning ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex w-full">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled
                                              className="h-9 w-full cursor-not-allowed gap-2 rounded-lg border border-dashed border-amber-200/80 bg-amber-50/50 font-medium text-amber-950/60 shadow-none"
                                            >
                                              <Plus
                                                className="size-4 shrink-0 opacity-60"
                                                strokeWidth={2}
                                              />
                                              Add revision
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[260px] text-center leading-snug"
                                        >
                                          {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Button
                                        variant="default"
                                        className="h-9 w-full gap-2"
                                        onClick={() => setAddRevisionRelease(release)}
                                      >
                                        <Plus className="size-4 text-white" strokeWidth={2.25} />
                                        Add revision
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
                            {release.versions.length === 0 ? (
                              <ReleaseRevisionEmptyState
                                release={release}
                                releases={releases}
                                canManageReleases={canManageReleases}
                                projectSlug={project?.slug}
                                onAddRevision={(r) => setAddRevisionRelease(r)}
                              />
                            ) : null}
                            {release.versions.length > 0 ? (
                              <Collapsible
                                defaultOpen={false}
                                className="rounded-lg border border-slate-200 bg-white"
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="group flex h-auto min-h-9 w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-slate-50 data-[state=open]:rounded-b-none"
                                  >
                                    <span className="text-sm text-slate-800">Revision history</span>
                                    <span className="text-sm text-slate-500">
                                      {release.versions.length} revision
                                      {release.versions.length !== 1 ? "s" : ""}
                                    </span>
                                    <div className="text-sm">
                                      <span className="text-slate-400">Latest</span>
                                      <span className="ml-1.5 text-sm text-slate-700">
                                        {formatProjectVersionLabel(release.versions[0].version)}
                                      </span>
                                    </div>
                                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="space-y-2 border-t border-slate-200 p-4 pt-3">
                                    {release.versions.filter(Boolean).map((version) => (
                                      <div
                                        key={version.id ?? version.version}
                                        className={`flex justify-between items-center gap-3 p-3 ${version.isActive ? "bg-primary/10 border border-primary" : "bg-white border border-slate-100"} rounded-lg hover:border-primary transition-colors`}
                                      >
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm font-medium text-slate-700">
                                              {formatProjectVersionLabel(version.version)}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                              {new Date(version.createdAt).toLocaleDateString()}
                                            </span>
                                          </div>
                                          {/* <div className="flex items-start gap-2 w-full">
                                        <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                                          RoadMap Items:
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          {version.roadmapItems.map((item) => (
                                            <Badge
                                              key={item.id}
                                              className="rounded-md"
                                            >
                                              {item.title}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div> */}
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                                          {String(version.gitTag || "").trim() !== "" ? (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="gap-1.5"
                                              disabled={exportRevisionLoadingId != null}
                                              title="Download this revision's source as a ZIP"
                                              onClick={() => void handleExportRevisionZip(version)}
                                            >
                                              {exportRevisionLoadingId === version.id ? (
                                                <Loader2
                                                  className="size-3.5 animate-spin"
                                                  aria-hidden
                                                />
                                              ) : (
                                                <Download className="size-3.5" aria-hidden />
                                              )}
                                              Export ZIP
                                            </Button>
                                          ) : null}
                                          {canManageReleases &&
                                            String(version.gitTag || "").trim() !== "" && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="inline-flex">
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="sm"
                                                      className="gap-1.5"
                                                      disabled={
                                                        backendPlanAgentRunning ||
                                                        !activeRelease ||
                                                        revertBaselineSubmitting ||
                                                        (normalizeReleaseStatus(release) ===
                                                          "active" &&
                                                          version.isActive)
                                                      }
                                                      onClick={() => {
                                                        if (!activeRelease) return;
                                                        setRevertBaselineReason("");
                                                        setRevertBaselineDialog({
                                                          version,
                                                          baselineSourceReleaseName: release.name,
                                                        });
                                                      }}
                                                    >
                                                      <RotateCcw className="size-3.5" aria-hidden />
                                                      Revert to Revision
                                                    </Button>
                                                  </span>
                                                </TooltipTrigger>
                                                {backendPlanAgentRunning ? (
                                                  <TooltipContent
                                                    side="top"
                                                    className="max-w-[280px]"
                                                  >
                                                    {BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                                                  </TooltipContent>
                                                ) : normalizeReleaseStatus(release) === "active" &&
                                                  version.isActive ? (
                                                  <TooltipContent
                                                    side="top"
                                                    className="max-w-[260px]"
                                                  >
                                                    The live build already matches this revision.
                                                    Pick an earlier revision to roll back.
                                                  </TooltipContent>
                                                ) : !activeRelease ? (
                                                  <TooltipContent
                                                    side="top"
                                                    className="max-w-[260px]"
                                                  >
                                                    Set a release to <strong>Active</strong> first.
                                                    New commits are created on{" "}
                                                    <code className="text-xs">main</code> and a new
                                                    revision is added only to the active release.
                                                  </TooltipContent>
                                                ) : (
                                                  <TooltipContent
                                                    side="top"
                                                    className="max-w-[280px]"
                                                  >
                                                    Revert commits on the platform branch so the
                                                    tree matches this revision, then tag a new
                                                    revision on{" "}
                                                    <strong>{activeRelease.name}</strong>.
                                                  </TooltipContent>
                                                )}
                                              </Tooltip>
                                            )}
                                          {version.isActive && (
                                            <Badge className="bg-primary text-primary-foreground">
                                              <CheckCircle size={14} /> Active
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Dialog
          open={Boolean(revertBaselineDialog)}
          onOpenChange={(open) => {
            if (!open) {
              setRevertBaselineDialog(null);
              setRevertBaselineReason("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Align active release to this revision?</DialogTitle>
              <DialogDescription className="text-left leading-relaxed">
                This creates a new revision on{" "}
                <strong>{activeRelease?.name ?? "the active release"}</strong> by applying
                sequential <code className="text-xs">git revert</code> commits on the platform
                repository so the tree matches{" "}
                <strong>{revertBaselineDialog?.baselineSourceReleaseName ?? "—"}</strong>{" "}
                {revertBaselineDialog?.version
                  ? formatProjectVersionLabel(revertBaselineDialog.version.version)
                  : ""}
                . Existing tags are not moved; new commits reference the same history with explicit
                reverts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="revert-baseline-reason">Reason (required)</Label>
              <Textarea
                id="revert-baseline-reason"
                value={revertBaselineReason}
                onChange={(e) => setRevertBaselineReason(e.target.value)}
                placeholder="e.g. Restore customer-approved build after regression in later revisions"
                rows={3}
                disabled={revertBaselineSubmitting}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRevertBaselineDialog(null);
                  setRevertBaselineReason("");
                }}
                disabled={revertBaselineSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void submitRevertActiveToBaseline()}
                disabled={revertBaselineSubmitting}
              >
                {revertBaselineSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Reverting…
                  </>
                ) : (
                  "Confirm revert"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={migrateReleasePickerOpen}
          onOpenChange={(open) => {
            setMigrateReleasePickerOpen(open);
            if (!open) setMigratePickerReleaseId("");
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Build Frontend App — choose release</DialogTitle>
              <DialogDescription className="text-left leading-relaxed">
                Pick which release this migration applies to (build and changelog are stored on that
                release). With multiple releases, the selector defaults to the{" "}
                <strong>active</strong> one when it exists; otherwise to the{" "}
                <strong>highest</strong> dot-version name (for example{" "}
                <span className="font-mono text-xs">2.1.0</span> over{" "}
                <span className="font-mono text-xs">1.0.0</span>). If no name matches that pattern,
                the first release in the list is selected.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <Label htmlFor="migrate-release-select">Release</Label>
              <Select
                value={migratePickerReleaseId || undefined}
                onValueChange={(v) => setMigratePickerReleaseId(v)}
              >
                <SelectTrigger id="migrate-release-select" className="w-full">
                  <SelectValue placeholder="Select a release" />
                </SelectTrigger>
                <SelectContent>
                  {releases.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMigrateReleasePickerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="text-white"
                onClick={() => void confirmMigrateReleasePicker()}
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(migrateFrontendConfirmRelease)}
          onOpenChange={(open) => {
            if (!open) {
              setMigrateFrontendConfirmRelease(null);
              setMigrateUserPrompt("");
            }
          }}
        >
          <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-4 overflow-hidden sm:max-w-lg">
            <DialogHeader className="shrink-0">
              <DialogTitle>Build Frontend App from developer repo?</DialogTitle>
              <DialogDescription className="text-left leading-relaxed">
                <strong>Read-only</strong> clone of your GitHub dev repo: UI folder (e.g.{" "}
                <code className="text-xs">frontend/</code>) is copied into the platform repo (
                <code className="text-xs">launchpad</code> + migrate branch), then tagged and
                deployed for <strong>{migrateFrontendConfirmRelease?.name ?? "—"}</strong>. Pick a
                platform revision below: <strong>new</strong> tag or <strong>reuse</strong> an
                existing one. Add optional instructions only when you need the Cursor agent path.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <CursorAgentGithubGateAlert
                loading={migrateGithubGateLoading}
                message={migrateGithubGateMessage}
              />
              {(() => {
                const rel = migrateFrontendConfirmRelease;
                const tagged = Array.isArray(rel?.versions)
                  ? rel.versions.filter((v) => String(v?.gitTag || "").trim())
                  : [];
                if (!tagged.length) {
                  return (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      No tagged revisions on this release yet. The migration will create a{" "}
                      <strong>new</strong> platform revision when deploy completes.
                    </p>
                  );
                }
                return (
                  <div className="grid gap-2 py-1">
                    <Label htmlFor="migrate-revision-select">Platform revision</Label>
                    <Select
                      value={migrateSelectedProjectVersionId}
                      onValueChange={(v) => setMigrateSelectedProjectVersionId(v)}
                    >
                      <SelectTrigger id="migrate-revision-select" className="w-full">
                        <SelectValue placeholder="Choose revision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__">
                          New revision (next tag on this release)
                        </SelectItem>
                        {tagged.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.version}
                            {v.isActive ? " (Active)" : ""} — tag {v.gitTag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
              <div className="space-y-2">
                <Label htmlFor="migrate-user-prompt">Additional instructions (optional)</Label>
                <Textarea
                  id="migrate-user-prompt"
                  value={migrateUserPrompt}
                  onChange={(e) => setMigrateUserPrompt(e.target.value)}
                  placeholder="e.g. Preserve custom CSS modules; exclude the admin package…"
                  rows={3}
                  className="resize-y text-sm min-h-[72px]"
                  disabled={migrateFrontendSubmitting}
                  maxLength={4000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (migrateConfirmAcknowledged && !migrateFrontendSubmitting) {
                        void submitMigrateFrontend();
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  When filled, migration runs via the Cursor agent so it can follow these
                  instructions. Leave empty for the default file-copy path.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                <Checkbox
                  id="migrate-frontend-ack"
                  checked={migrateConfirmAcknowledged}
                  onCheckedChange={(v) => setMigrateConfirmAcknowledged(Boolean(v === true))}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="migrate-frontend-ack"
                  className="cursor-pointer text-sm font-medium leading-snug text-slate-800"
                >
                  Build Frontend App: I understand this updates the Launchpad UI for this release
                  from the developer repo (UI/integration code only, not the backend tree).
                </Label>
              </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMigrateFrontendConfirmRelease(null)}
                disabled={migrateFrontendSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="text-white"
                onClick={() => void submitMigrateFrontend()}
                disabled={
                  migrateFrontendSubmitting ||
                  migrateGithubGateLoading ||
                  Boolean(migrateGithubGateMessage) ||
                  !migrateConfirmAcknowledged
                }
              >
                {migrateFrontendSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  "Start migration"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProjectCursorRulesDialogs cursorRules={cursorRules} hasDeveloperRepo={hasDeveloperRepo} />

        {/* Create Release Form Modal */}
        <CreateReleaseDialog
          open={canManageReleases && showCreateForm}
          onOpenChange={setShowCreateForm}
          creating={creating}
          newRelease={newRelease}
          setNewRelease={setNewRelease}
          suggestedPatchReleaseName={suggestedPatchReleaseName}
          lastRelease={lastRelease}
          onSubmit={handleCreateRelease}
        />

        <EditReleaseDialog
          key={
            editDialog
              ? `edit-${editDialog.id}-${editDialog.focusShipDate ? "ship" : "full"}`
              : "edit-closed"
          }
          open={canEditRelease && !!editDialog}
          onOpenChange={(open) => {
            if (!open && !editSaving) setEditDialog(null);
          }}
          editDialog={editDialog}
          setEditDialog={setEditDialog}
          editSaving={editSaving}
          onSubmit={saveEditRelease}
          onRegenerateReviewSummary={handleRegenerateClientReviewSummary}
          aiSummaryRegenerating={aiSummaryRegenerating}
          onManageScope={workspaceMode ? () => handleManageReleaseScope(editDialog?.id) : undefined}
        />

        {canManageReleases ? (
          <ReleaseAddRevisionDialog
            open={Boolean(addRevisionRelease)}
            onOpenChange={(open) => {
              if (!open) setAddRevisionRelease(null);
            }}
            release={addRevisionRelease}
            releases={releases}
            project={project}
            projectId={projectId}
            jiraEpicsStoriesReady={jiraEpicsStoriesReady}
            onCompleted={loadReleases}
            onAgentStarted={({ releaseId, agentId }) => {
              setRevisionSeedProgressByRelease((prev) => ({
                ...prev,
                [releaseId]: { agentId, lastStatus: "CREATING" },
              }));
              const dedupeKey = `seed:${releaseId}:${agentId}`;
              revisionSeedResumePollRef.current.add(dedupeKey);
              void pollRevisionSeedAgent(releaseId, agentId).finally(() => {
                revisionSeedResumePollRef.current.delete(dedupeKey);
              });
            }}
          />
        ) : null}

        <Dialog
          open={!!statusConfirm}
          onOpenChange={(open) => {
            if (!open && !statusConfirmSubmitting) setStatusConfirm(null);
          }}
        >
          <DialogContent className="flex max-h-[min(90dvh,720px)] min-w-0 flex-col gap-4 overflow-hidden sm:max-w-md">
            <DialogHeader className="shrink-0">
              <DialogTitle>Change release status?</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-slate-900">{statusConfirm?.releaseName}</span>{" "}
                will change from{" "}
                <span className="font-semibold text-slate-800">
                  {statusConfirm ? releaseStatusLabel(statusConfirm.fromStatus) : ""}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-800">
                  {statusConfirm ? releaseStatusLabel(statusConfirm.toStatus) : ""}
                </span>
                .
              </DialogDescription>
            </DialogHeader>
            <div
              className={`min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden text-sm text-slate-600`}
            >
              {statusConfirm?.toStatus === "locked" && (
                <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-amber-950/90">
                  Locking disables add revision and further status changes.
                </p>
              )}
              {statusConfirmUserIsYorkInternal && statusConfirm?.toStatus === "locked" ? (
                <SkipBackendLockAgentCheckbox
                  checked={Boolean(statusConfirm?.skipLockAgentOperations)}
                  onCheckedChange={(checked) =>
                    setStatusConfirm((prev) =>
                      prev ? { ...prev, skipLockAgentOperations: checked } : prev,
                    )
                  }
                  disabled={statusConfirmSubmitting}
                />
              ) : null}
              {statusConfirm?.toStatus === "locked" && !statusConfirm?.skipLockAgentOperations ? (
                <CursorAgentGithubGateAlert
                  loading={lockGithubGateLoading}
                  message={lockGithubGateMessage}
                />
              ) : null}
              {statusConfirm?.toStatus === "locked" &&
              !statusConfirm?.skipLockAgentOperations &&
              hasDeveloperRepo ? (
                <ReleaseLockDevRepoSummary
                  projectId={project?.id}
                  developmentRepoUrl={project?.developmentRepoUrl}
                  backendLockAgentMode={project?.backendLockAgentMode}
                  variant="compact"
                  canAccessProjectSettings={userCanAccessProjectSettings(user, project)}
                />
              ) : null}
              {statusConfirm?.toStatus === "locked" &&
              !statusConfirm?.skipLockAgentOperations &&
              !hasDeveloperRepo ? (
                <div className="min-w-0 space-y-3 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-600">
                    No development repository on this project yet. Enter the GitHub or Bitbucket
                    repository for post-lock sync.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="pm-lock-dev-repo">Development repository</Label>
                    <Input
                      id="pm-lock-dev-repo"
                      placeholder="github.com/org/your-repo"
                      value={statusConfirm?.lockDevelopmentRepoUrl ?? ""}
                      onChange={(e) =>
                        setStatusConfirm((prev) =>
                          prev
                            ? {
                                ...prev,
                                lockDevelopmentRepoUrl: e.target.value,
                              }
                            : prev,
                        )
                      }
                      disabled={statusConfirmSubmitting}
                      className="transition-all duration-200"
                    />
                  </div>
                </div>
              ) : null}
              {statusConfirm?.toStatus === "locked" && !statusConfirm?.skipLockAgentOperations ? (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <Label htmlFor="pm-lock-user-prompt">Additional instructions (optional)</Label>
                  <Textarea
                    id="pm-lock-user-prompt"
                    value={statusConfirm?.userPrompt ?? ""}
                    onChange={(e) =>
                      setStatusConfirm((prev) =>
                        prev ? { ...prev, userPrompt: e.target.value } : prev,
                      )
                    }
                    placeholder="e.g. Prefer existing auth middleware; keep API under /v1…"
                    rows={3}
                    className="resize-y text-sm min-h-[72px]"
                    disabled={statusConfirmSubmitting}
                    maxLength={4000}
                  />
                  <p className="text-xs text-muted-foreground">
                    When filled, the backend lock agent will follow these instructions.
                  </p>
                </div>
              ) : null}
              {statusConfirm?.toStatus === "skip" && (
                <p className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-slate-700">
                  Any other active release in this project becomes draft, and this release is marked
                  skipped. The client link updates to reflect the new active build.
                </p>
              )}
              {statusConfirm?.toStatus === "active" && blockActivateUntilOtherLocked && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-900"
                >
                  Lock current active release before activating this version
                  {conflictingActiveRelease?.name ? (
                    <span className="mt-1 block text-xs font-normal text-rose-800/90">
                      Current Active release:{" "}
                      <span className="font-semibold">{conflictingActiveRelease.name}</span>
                    </span>
                  ) : null}
                </p>
              )}
              {statusConfirm?.toStatus === "active" && !blockActivateUntilOtherLocked && (
                <p className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-slate-700">
                  This will be the active release for the project. It may take some time to
                  activate, as it also updates the client link.
                </p>
              )}
              {statusConfirm?.toStatus !== "locked" ? (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="status-change-reason">Reason for change</Label>
                  <Textarea
                    id="status-change-reason"
                    rows={3}
                    placeholder="Required — explain why you are changing status"
                    value={statusConfirm?.statusReason ?? ""}
                    onChange={(e) =>
                      setStatusConfirm((prev) =>
                        prev ? { ...prev, statusReason: e.target.value } : prev,
                      )
                    }
                    disabled={statusConfirmSubmitting}
                    className="resize-none"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter className="shrink-0 gap-2 sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatusConfirm(null)}
                disabled={statusConfirmSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="text-white"
                onClick={confirmStatusChange}
                disabled={
                  statusConfirmSubmitting ||
                  blockActivateUntilOtherLocked ||
                  lockMissingDevelopmentRepo ||
                  (statusConfirm?.toStatus === "locked" &&
                    !statusConfirm?.skipLockAgentOperations &&
                    (lockGithubGateLoading || Boolean(lockGithubGateMessage))) ||
                  (statusConfirm?.toStatus !== "locked" &&
                    !(statusConfirm?.statusReason || "").trim())
                }
              >
                {statusConfirmSubmitting ? (
                  <>
                    <Spinner /> Applying…
                  </>
                ) : (
                  "Confirm change"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ReleaseManagementContext.Provider>
  );
});

ReleaseManagement.displayName = "ReleaseManagement";

export default ReleaseManagement;
