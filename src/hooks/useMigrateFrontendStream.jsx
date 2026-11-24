import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { consumeMigrateFrontendStream, fetchReleases } from "@/api";
import {
  applyDeployAgentStreamUpdate,
  emptyDeployAgentStreamState,
  legacyAgentSummaryToUpdate,
} from "@/pages/Project/ProjectDetails/components/cloudDeployAgentStream.util";
import {
  clearMigrateOnboardingStreamHandoff,
  isMigrateFrontendTerminalPipelinePhase,
  migrateFrontendPipelineFromEvent,
  migrateFrontendStreamDedupeKey,
  migrateFrontendTerminalStatusFromEvent,
  readMigrateOnboardingStreamHandoff,
  resumeOngoingMigrateFromReleases,
  shouldCloseMigrateLiveFromReleases,
  startMigrateStreamFromHandoff,
} from "@/lib/migrateFrontendStream.util";

export { migrateFrontendStreamDedupeKey } from "@/lib/migrateFrontendStream.util";

const MigrateFrontendStreamContext = createContext(null);

/** Poll while onboarding redirect lands before migrate-start returns agentId. */
const MIGRATE_ONBOARDING_RESUME_POLL_MS = 2000;
const MIGRATE_ONBOARDING_RESUME_POLL_MAX_MS = 90000;
/** Close a stuck live panel if the API no longer reports an ongoing run. */
const MIGRATE_LIVE_RECONCILE_MS = 4000;

/**
 * SSE-driven Build Frontend App progress (releases + Web App).
 * @param {{
 *   projectId: number|null|undefined,
 *   loadReleases: () => Promise<void>,
 *   loadReleasesSilent?: () => Promise<void>,
 * }} deps
 */
export function useMigrateFrontendStream({ projectId, loadReleases, loadReleasesSilent }) {
  const [migrateFrontendProgressByRelease, setMigrateFrontendProgressByRelease] = useState({});
  const [livePanelVisible, setLivePanelVisible] = useState(false);
  const [liveReleaseId, setLiveReleaseId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runPhase, setRunPhase] = useState(null);
  const [runLog, setRunLog] = useState("");
  const [agentStream, setAgentStream] = useState(emptyDeployAgentStreamState);
  const [migrateStartedAtMs, setMigrateStartedAtMs] = useState(null);
  /** Latest Platform sync sub-step for live status line (branch wait, tag, revision, etc.). */
  const [platformSyncDetail, setPlatformSyncDetail] = useState("");
  /** @type {[{ migrateDevLayout?: string, migrateDevelopmentRepoCount?: number } | null, Function]} */
  const [migrateDevLayoutMeta, setMigrateDevLayoutMeta] = useState(null);

  const streamAbortRef = useRef(null);
  const streamingReleaseIdRef = useRef(null);
  /** Prevents duplicate SSE for the same release+agent (e.g. double resume on refresh). */
  const streamingAgentKeyRef = useRef(null);
  const migrateResumeStreamRef = useRef(new Set());
  /** Ensures success/error UI fires once per run. */
  const migrateRunFinishedHandledRef = useRef(false);
  const runPhaseRef = useRef(null);

  useEffect(() => {
    runPhaseRef.current = runPhase;
  }, [runPhase]);

  const stopStream = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    streamingReleaseIdRef.current = null;
    streamingAgentKeyRef.current = null;
  }, []);

  const clearReleaseProgress = useCallback((releaseId) => {
    setMigrateFrontendProgressByRelease((prev) => {
      const next = { ...prev };
      delete next[releaseId];
      return next;
    });
  }, []);

  const applyMigrateDevLayoutFromPipe = useCallback((pipe) => {
    if (!pipe || typeof pipe !== "object") return;
    const layout = pipe.migrateDevLayout;
    const n = Number(pipe.migrateDevelopmentRepoCount);
    if (layout !== "single" && layout !== "multi" && !(Number.isInteger(n) && n >= 1)) {
      return;
    }
    setMigrateDevLayoutMeta({
      migrateDevLayout: layout === "single" || layout === "multi" ? layout : undefined,
      migrateDevelopmentRepoCount: Number.isInteger(n) && n >= 1 ? n : undefined,
    });
  }, []);

  const applyMigrateRunFinishedUi = useCallback(
    async (releaseId, { status, pipe = null, terminalError = "", silent = false } = {}) => {
      if (migrateRunFinishedHandledRef.current) return;
      migrateRunFinishedHandledRef.current = true;

      const succeeded = status === "SUCCEEDED";
      setRunStatus(succeeded ? "SUCCEEDED" : "FAILED");
      setRunPhase("DONE");
      setMigrateStartedAtMs(null);
      setPlatformSyncDetail("");
      setMigrateDevLayoutMeta(null);
      streamingReleaseIdRef.current = null;
      streamingAgentKeyRef.current = null;
      setLivePanelVisible(false);
      setLiveReleaseId(null);
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }

      if (!silent) {
        if (succeeded) {
          if (pipe?.headline) {
            toast.success(pipe.detail ? `${pipe.headline}: ${pipe.detail}` : pipe.headline);
          } else {
            toast.success("Build Frontend App completed.");
          }
        } else if (pipe?.phase === "agent_failed") {
          const detail = String(pipe.detail || terminalError || "").trim();
          toast.error(detail || pipe.headline || "Build Frontend App failed");
        } else {
          const err = String(terminalError || pipe?.detail || "").trim();
          toast.error(err || pipe?.headline || "Build Frontend App failed");
        }
      }

      clearReleaseProgress(releaseId);
      await loadReleases();
      if (loadReleasesSilent) {
        void loadReleasesSilent();
      }
      setTimeout(() => {
        loadReleases().catch(() => {});
      }, 25000);
    },
    [clearReleaseProgress, loadReleases, loadReleasesSilent],
  );

  const reconcileLiveIfRunFinished = useCallback(
    async (releaseId) => {
      if (migrateRunFinishedHandledRef.current) return;
      const rid = Number(releaseId);
      if (!Number.isInteger(rid) || rid < 1) return;
      const pid = Number(projectId);
      if (!Number.isInteger(pid) || pid < 1) return;
      try {
        const releases = await fetchReleases(pid);
        if (!shouldCloseMigrateLiveFromReleases(releases, rid)) return;
        await applyMigrateRunFinishedUi(rid, { status: "SUCCEEDED", silent: true });
      } catch {
        /* keep live panel if we cannot confirm the run is over */
      }
    },
    [applyMigrateRunFinishedUi, projectId],
  );

  const reconcileMigrateLiveFromReleases = useCallback(
    (releases) => {
      if (migrateRunFinishedHandledRef.current) return;
      if (!shouldCloseMigrateLiveFromReleases(releases, liveReleaseId)) return;
      void applyMigrateRunFinishedUi(liveReleaseId, { status: "SUCCEEDED", silent: true });
    },
    [applyMigrateRunFinishedUi, liveReleaseId],
  );

  useEffect(() => {
    if (!livePanelVisible || liveReleaseId == null) return undefined;
    if (runStatus === "SUCCEEDED" || runStatus === "FAILED") return undefined;
    const tick = () => {
      void reconcileLiveIfRunFinished(liveReleaseId);
    };
    const id = window.setInterval(tick, MIGRATE_LIVE_RECONCILE_MS);
    return () => window.clearInterval(id);
  }, [livePanelVisible, liveReleaseId, runStatus, reconcileLiveIfRunFinished]);

  const applyAgentStreamEvent = useCallback((evt) => {
    const normalized = evt?.type === "agent_summary" ? legacyAgentSummaryToUpdate(evt) : evt;
    if (!normalized || normalized.type !== "agent_update") return;
    setAgentStream((prev) => applyDeployAgentStreamUpdate(prev, normalized));
  }, []);

  const handleStreamEvent = useCallback(
    (releaseId, agentId) => async (evt) => {
      if (!evt || typeof evt !== "object") return;

      if (evt.type === "connected") {
        setRunStatus((prev) => (prev === "SUCCEEDED" || prev === "FAILED" ? prev : "RUNNING"));
        if (evt.phase) setRunPhase(evt.phase);
        const pipe = migrateFrontendPipelineFromEvent(evt);
        if (pipe) {
          applyMigrateDevLayoutFromPipe(pipe);
          setMigrateFrontendProgressByRelease((prev) => ({
            ...prev,
            [releaseId]: {
              agentId: evt.agentId ?? agentId ?? prev[releaseId]?.agentId,
              lastStatus: pipe.agentStatus ?? prev[releaseId]?.lastStatus ?? "",
              pipeline: pipe,
            },
          }));
          if (isMigrateFrontendTerminalPipelinePhase(pipe.phase)) {
            await applyMigrateRunFinishedUi(releaseId, {
              status: migrateFrontendTerminalStatusFromEvent(evt),
              pipe,
            });
            return;
          }
        }
      }

      if (evt.type === "log" && evt.text) {
        const line = String(evt.text);
        setRunLog((prev) => (prev ? `${prev}\n${line}` : line));
        if (runPhaseRef.current === "PLATFORM_SYNC") {
          setPlatformSyncDetail(line);
        }
      }

      if (evt.type === "phase" && evt.phase) {
        if (evt.phase === "DONE") {
          await applyMigrateRunFinishedUi(releaseId, { status: "SUCCEEDED" });
          return;
        }
        if (evt.phase === "FAILED") {
          await applyMigrateRunFinishedUi(releaseId, {
            status: "FAILED",
            terminalError: evt.text != null ? String(evt.text) : "",
          });
          return;
        }
        setRunPhase(evt.phase);
        if (evt.phase !== "PLATFORM_SYNC") {
          setPlatformSyncDetail("");
        }
      }

      if (evt.type === "pipeline_update") {
        const pipe = evt.migrateFrontendPipeline ?? null;
        if (pipe) {
          applyMigrateDevLayoutFromPipe(pipe);
          setMigrateFrontendProgressByRelease((prev) => ({
            ...prev,
            [releaseId]: {
              agentId: agentId ?? prev[releaseId]?.agentId,
              lastStatus: pipe.agentStatus ?? prev[releaseId]?.lastStatus ?? "",
              pipeline: pipe,
            },
          }));
          if (pipe.phase === "platform_working" && String(pipe.detail ?? "").trim()) {
            setPlatformSyncDetail(String(pipe.detail).trim());
          }
          if (pipe.phase === "completed") {
            await applyMigrateRunFinishedUi(releaseId, { status: "SUCCEEDED", pipe });
          } else if (pipe.phase === "agent_failed" || pipe.phase === "platform_failed") {
            await applyMigrateRunFinishedUi(releaseId, { status: "FAILED", pipe });
          }
        }
      }

      if (evt.type === "agent_update" || evt.type === "agent_summary") {
        applyAgentStreamEvent(evt);
      }
    },
    [applyAgentStreamEvent, applyMigrateDevLayoutFromPipe, applyMigrateRunFinishedUi],
  );

  const streamMigrateFrontend = useCallback(
    (releaseId, agentId = null) => {
      const rid = Number(releaseId);
      if (!Number.isInteger(rid) || rid < 1) return Promise.resolve(false);

      const agentKey = migrateFrontendStreamDedupeKey(rid, agentId);

      if (streamingAgentKeyRef.current === agentKey && streamAbortRef.current) {
        return Promise.resolve(true);
      }

      stopStream();
      migrateRunFinishedHandledRef.current = false;
      streamingReleaseIdRef.current = rid;
      streamingAgentKeyRef.current = agentKey;
      setLiveReleaseId(rid);
      setLivePanelVisible(true);
      setRunStatus("RUNNING");
      setRunPhase(null);
      setRunLog("");
      setAgentStream(emptyDeployAgentStreamState());
      setPlatformSyncDetail("");
      setMigrateStartedAtMs((prev) => prev ?? Date.now());

      const controller = new AbortController();
      streamAbortRef.current = controller;

      return new Promise((resolve) => {
        let settled = false;
        const finish = (connected) => {
          if (settled) return;
          settled = true;
          if (!connected) {
            migrateResumeStreamRef.current.delete(agentKey);
            streamingReleaseIdRef.current = null;
            streamingAgentKeyRef.current = null;
          }
          resolve(connected);
        };

        void (async () => {
          let connected = false;
          try {
            await consumeMigrateFrontendStream(rid, {
              signal: controller.signal,
              onConnected: () => {
                connected = true;
              },
              onEvent: async (evt) => {
                if (evt?.type === "connected") connected = true;
                await handleStreamEvent(releaseId, agentId)(evt);
              },
            });
            if (!controller.signal.aborted && !migrateRunFinishedHandledRef.current) {
              await reconcileLiveIfRunFinished(rid);
            }
            finish(connected || migrateRunFinishedHandledRef.current);
          } catch (err) {
            if (err?.name === "AbortError") {
              finish(connected || migrateRunFinishedHandledRef.current);
              return;
            }
            if (!migrateRunFinishedHandledRef.current) {
              await reconcileLiveIfRunFinished(rid);
            }
            streamingReleaseIdRef.current = null;
            streamingAgentKeyRef.current = null;
            if (!migrateRunFinishedHandledRef.current) {
              migrateResumeStreamRef.current.delete(agentKey);
            }
            finish(connected || migrateRunFinishedHandledRef.current);
          }
        })();
      });
    },
    [handleStreamEvent, reconcileLiveIfRunFinished, stopStream],
  );

  return {
    migrateFrontendProgressByRelease,
    setMigrateFrontendProgressByRelease,
    livePanelVisible,
    setLivePanelVisible,
    liveReleaseId,
    setLiveReleaseId,
    runStatus,
    runPhase,
    runLog,
    agentStream,
    migrateStartedAtMs,
    platformSyncDetail,
    migrateDevLayoutMeta,
    stopStream,
    streamMigrateFrontend,
    streamingReleaseIdRef,
    migrateResumeStreamRef,
    clearReleaseProgress,
    reconcileMigrateLiveFromReleases,
  };
}

/**
 * Shared migrate stream for ProjectDetails + ReleaseManagement (single SSE, single panel).
 * @param {{ projectId: number|null|undefined, children: import("react").ReactNode }} props
 */
export function MigrateFrontendStreamProvider({ projectId, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reloadersRef = useRef({ loadReleases: null, loadReleasesSilent: null });

  const registerReleaseReloaders = useCallback((fns) => {
    reloadersRef.current = {
      loadReleases: fns?.loadReleases ?? null,
      loadReleasesSilent: fns?.loadReleasesSilent ?? null,
    };
  }, []);

  const loadReleases = useCallback(async () => {
    if (reloadersRef.current.loadReleases) {
      await reloadersRef.current.loadReleases();
      return;
    }
    const pid = Number(projectId);
    if (Number.isInteger(pid) && pid > 0) {
      await fetchReleases(pid);
    }
  }, [projectId]);

  const loadReleasesSilent = useCallback(async () => {
    if (reloadersRef.current.loadReleasesSilent) {
      await reloadersRef.current.loadReleasesSilent();
      return;
    }
    const pid = Number(projectId);
    if (Number.isInteger(pid) && pid > 0) {
      await fetchReleases(pid);
    }
  }, [projectId]);

  const stream = useMigrateFrontendStream({
    projectId,
    loadReleases,
    loadReleasesSilent,
  });

  const {
    streamMigrateFrontend,
    migrateResumeStreamRef,
    stopStream,
    setLivePanelVisible,
    setLiveReleaseId,
  } = stream;

  /** Resume in-progress migrate after navigation, onboarding redirect, or refresh. */
  useEffect(() => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1) return undefined;

    let cancelled = false;
    let pollTimer = null;
    const pollStartedAt = Date.now();
    const pendingReleaseId = Number(location.state?.migrateOnboardingPending?.releaseId);
    const hasOnboardingPending = Number.isInteger(pendingReleaseId) && pendingReleaseId > 0;

    const tryResume = async () => {
      if (cancelled) return false;

      const handoff = readMigrateOnboardingStreamHandoff(pid);
      if (
        await startMigrateStreamFromHandoff(handoff, streamMigrateFrontend, migrateResumeStreamRef)
      ) {
        clearMigrateOnboardingStreamHandoff(pid);
        return true;
      }

      try {
        const releases = await fetchReleases(pid);
        if (cancelled) return false;

        if (
          await resumeOngoingMigrateFromReleases(
            releases,
            streamMigrateFrontend,
            migrateResumeStreamRef,
          )
        ) {
          clearMigrateOnboardingStreamHandoff(pid);
          return true;
        }

        if (hasOnboardingPending && Array.isArray(releases)) {
          const rel = releases.find((row) => Number(row?.id) === pendingReleaseId);
          const ongoingAgentId = rel?.ongoingMigrateFrontend?.agentId;
          if (ongoingAgentId) {
            if (
              await startMigrateStreamFromHandoff(
                { releaseId: pendingReleaseId, agentId: String(ongoingAgentId) },
                streamMigrateFrontend,
                migrateResumeStreamRef,
              )
            ) {
              clearMigrateOnboardingStreamHandoff(pid);
              return true;
            }
          }
        }
      } catch {
        /* optional resume */
      }

      return false;
    };

    const clearOnboardingPendingRouterState = () => {
      if (!location.state?.migrateOnboardingPending) return;
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    };

    void (async () => {
      const started = await tryResume();
      if (cancelled) return;

      if (started) {
        clearOnboardingPendingRouterState();
        return;
      }

      const shouldPoll = hasOnboardingPending || readMigrateOnboardingStreamHandoff(pid) != null;
      if (!shouldPoll) return;

      pollTimer = setInterval(() => {
        void (async () => {
          if (cancelled || Date.now() - pollStartedAt > MIGRATE_ONBOARDING_RESUME_POLL_MAX_MS) {
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
            return;
          }
          const ok = await tryResume();
          if (ok) {
            clearOnboardingPendingRouterState();
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          }
        })();
      }, MIGRATE_ONBOARDING_RESUME_POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [
    projectId,
    streamMigrateFrontend,
    migrateResumeStreamRef,
    navigate,
    location.pathname,
    location.search,
    location.state,
  ]);

  useEffect(
    () => () => {
      stopStream();
    },
    [stopStream],
  );

  const dismissLivePanel = useCallback(() => {
    setLivePanelVisible(false);
    setLiveReleaseId(null);
    stopStream();
  }, [setLivePanelVisible, setLiveReleaseId, stopStream]);

  const value = useMemo(
    () => ({
      ...stream,
      registerReleaseReloaders,
      dismissLivePanel,
    }),
    [stream, registerReleaseReloaders, dismissLivePanel],
  );

  return (
    <MigrateFrontendStreamContext.Provider value={value}>
      {children}
    </MigrateFrontendStreamContext.Provider>
  );
}

/** @returns {NonNullable<import("react").ContextType<typeof MigrateFrontendStreamContext>>} */
export function useMigrateFrontendStreamContext() {
  const ctx = useContext(MigrateFrontendStreamContext);
  if (!ctx) {
    throw new Error(
      "useMigrateFrontendStreamContext must be used within MigrateFrontendStreamProvider",
    );
  }
  return ctx;
}
