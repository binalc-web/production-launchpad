import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { consumeReleaseBackendAgentStream, fetchReleases } from "@/api";
import {
  isReleaseBackendAgentFailed,
  isReleaseEffectivelyLocked,
  isReleaseLockOrchestrationActive,
  isReleaseLockPanelEligible,
} from "@/lib/backendAgentStatus";
import { toast } from "sonner";
import {
  applyDeployAgentStreamUpdate,
  emptyDeployAgentStreamState,
  legacyAgentSummaryToUpdate,
} from "../components/cloudDeployAgentStream.util";

/**
 * Shared release-lock SSE stream state for live log panels (Releases + Backend Code).
 * Panel stays open through intermediate FINISHED status until user dismisses or opens another lock.
 * @param {{
 *   projectId?: number | string | null,
 *   releases?: Array<object>,
 *   onReleasesRefresh?: () => void | Promise<void>,
 * }} options
 */
export function useReleaseLockStream({ projectId, releases = [], onReleasesRefresh }) {
  const [liveLockPanelVisible, setLiveLockPanelVisible] = useState(false);
  const [liveLockReleaseId, setLiveLockReleaseId] = useState(null);
  const [lockRunStatus, setLockRunStatus] = useState("RUNNING");
  const [lockRunPhase, setLockRunPhase] = useState(null);
  const [lockRunLog, setLockRunLog] = useState("");
  const [lockAgentStream, setLockAgentStream] = useState(() => emptyDeployAgentStreamState());
  const [lockStartedAtMs, setLockStartedAtMs] = useState(null);

  const lockStreamAbortRef = useRef(null);
  const lockStreamingReleaseIdRef = useRef(null);
  const onReleasesRefreshRef = useRef(onReleasesRefresh);

  useEffect(() => {
    onReleasesRefreshRef.current = onReleasesRefresh;
  }, [onReleasesRefresh]);

  const refreshReleases = useCallback(async () => {
    if (onReleasesRefreshRef.current) {
      await onReleasesRefreshRef.current();
      return;
    }
    const pid = projectId != null ? Number(projectId) : NaN;
    if (!Number.isInteger(pid) || pid < 1) return;
    await fetchReleases(pid).catch(() => {});
  }, [projectId]);

  const stopLockStream = useCallback(() => {
    if (lockStreamAbortRef.current) {
      lockStreamAbortRef.current.abort();
      lockStreamAbortRef.current = null;
    }
    lockStreamingReleaseIdRef.current = null;
  }, []);

  const applyLockAgentStreamEvent = useCallback((evt) => {
    const normalized = evt?.type === "agent_summary" ? legacyAgentSummaryToUpdate(evt) : evt;
    if (!normalized || normalized.type !== "agent_update") return;
    setLockAgentStream((prev) => applyDeployAgentStreamUpdate(prev, normalized));
  }, []);

  const handleLockStreamEvent = useCallback(
    (evt) => {
      if (!evt || typeof evt !== "object") return;
      if (evt.type === "connected") {
        if (evt.phase) setLockRunPhase(evt.phase);
        // Do not force RUNNING over terminal status if reconnecting after complete
        setLockRunStatus((prev) =>
          prev === "SUCCEEDED" || prev === "FAILED" ? prev : "RUNNING",
        );
      }
      if (evt.type === "log" && evt.text) {
        setLockRunLog((prev) => {
          const line = String(evt.text);
          return prev ? `${prev}\n${line}` : line;
        });
      }
      if (evt.type === "phase" && evt.phase) {
        setLockRunPhase(evt.phase);
      }
      if (evt.type === "agent_update" || evt.type === "agent_summary") {
        applyLockAgentStreamEvent(evt);
      }
      if (evt.type === "terminal") {
        setLockRunStatus(evt.status ?? "FAILED");
        setLockStartedAtMs(null);
        lockStreamingReleaseIdRef.current = null;
        // Keep panel visible until user dismisses — do not auto-hide.
        if (evt.status === "SUCCEEDED") {
          toast.success("Release locked successfully.");
          void refreshReleases();
        } else if (evt.status === "FAILED") {
          toast.error(evt.error || "Backend plan agent failed.");
          void refreshReleases();
        }
      }
    },
    [applyLockAgentStreamEvent, refreshReleases],
  );

  const streamLockRelease = useCallback(
    (releaseId) => {
      const rid = Number(releaseId);
      if (!Number.isInteger(rid) || rid < 1) return;
      if (lockStreamingReleaseIdRef.current === rid) return;

      stopLockStream();
      lockStreamingReleaseIdRef.current = rid;
      setLiveLockReleaseId(rid);
      setLiveLockPanelVisible(true);
      setLockRunStatus("RUNNING");
      setLockStartedAtMs((prev) => prev ?? Date.now());

      const controller = new AbortController();
      lockStreamAbortRef.current = controller;

      void (async () => {
        try {
          await consumeReleaseBackendAgentStream(rid, {
            signal: controller.signal,
            onEvent: handleLockStreamEvent,
          });
        } catch (err) {
          if (err?.name === "AbortError") return;
          lockStreamingReleaseIdRef.current = null;
        }
      })();
    },
    [handleLockStreamEvent, stopLockStream],
  );

  const resetLockStreamState = useCallback(() => {
    setLockRunLog("");
    setLockAgentStream(emptyDeployAgentStreamState());
    setLockRunPhase(null);
    setLockRunStatus("RUNNING");
    setLockStartedAtMs(Date.now());
  }, []);

  const showLockPanel = useCallback(
    (releaseId) => {
      const rid = Number(releaseId);
      if (!Number.isInteger(rid) || rid < 1) return;
      const rel = releases.find((r) => Number(r.id) === rid);
      if (rel && !isReleaseLockPanelEligible(rel) && !isReleaseLockOrchestrationActive(rel)) {
        return;
      }
      setLiveLockPanelVisible(true);
      setLiveLockReleaseId(rid);
    },
    [releases],
  );

  const dismissLockPanel = useCallback(() => {
    setLiveLockPanelVisible(false);
    setLiveLockReleaseId(null);
    setLockStartedAtMs(null);
    stopLockStream();
  }, [stopLockStream]);

  /** Stream while orchestration is active (includes FINISHED intermediate — not isReleaseLockPending). */
  const orchestrationRelease = useMemo(
    () => releases.find((r) => isReleaseLockOrchestrationActive(r)) ?? null,
    [releases],
  );

  useEffect(() => {
    if (!orchestrationRelease?.id) return;
    streamLockRelease(orchestrationRelease.id);
  }, [orchestrationRelease?.id, streamLockRelease]);

  /**
   * When releases update: stop SSE only on true terminal (locked success / permanent failed).
   * Never auto-hide the panel — user must dismiss after seeing SUCCESS/FAILED.
   */
  useEffect(() => {
    if (!liveLockPanelVisible || liveLockReleaseId == null) return;
    const rel = releases.find((r) => Number(r.id) === Number(liveLockReleaseId));
    if (!rel) return;

    if (isReleaseEffectivelyLocked(rel)) {
      setLockRunStatus((prev) => (prev === "FAILED" ? prev : "SUCCEEDED"));
      setLockStartedAtMs(null);
      stopLockStream();
      return;
    }

    if (isReleaseBackendAgentFailed(rel)) {
      setLockRunStatus("FAILED");
      setLockStartedAtMs(null);
      stopLockStream();
    }
    // Intermediate FINISHED (orchestration still active): keep stream / panel — do nothing.
  }, [releases, liveLockPanelVisible, liveLockReleaseId, stopLockStream]);

  useEffect(
    () => () => {
      stopLockStream();
    },
    [stopLockStream],
  );

  return {
    visible: liveLockPanelVisible && Boolean(liveLockReleaseId),
    releaseId: liveLockReleaseId,
    runStatus: lockRunStatus,
    runPhase: lockRunPhase,
    runLog: lockRunLog,
    agentStream: lockAgentStream,
    startedAtMs: lockStartedAtMs,
    dismissLockPanel,
    resetLockStreamState,
    showLockPanel,
  };
}
