import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import config from "@/config";
import {
  consumeUnderstandGraphStream,
  fetchUnderstandGraphStatus,
  generateUnderstandGraph,
  syncUnderstandGraph,
} from "@/api";
import { runSseWithReconnect } from "@/lib/sseStreamReconnect";
import { logger } from "@/utils/logger";
import {
  applyDeployAgentStreamUpdate,
  emptyDeployAgentStreamState,
} from "../components/cloudDeployAgentStream.util";
import { isArchitectureDiagramRunning } from "../components/architectureDiagram/architectureDiagramSteps";

const TERMINAL_STATUSES = new Set(["ready", "failed"]);

/**
 * Architecture diagram generation with SSE live updates and reconnect.
 * @param {number|string|undefined|null} projectId
 */
export function useArchitectureDiagram(projectId) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [livePanelVisible, setLivePanelVisible] = useState(false);
  const [runLog, setRunLog] = useState("");
  const [agentStream, setAgentStream] = useState(emptyDeployAgentStreamState);
  const [generationStartedAtMs, setGenerationStartedAtMs] = useState(null);

  const streamAbortRef = useRef(null);
  const streamingRef = useRef(false);

  const pid = projectId != null ? Number(projectId) : NaN;
  const validProjectId = Number.isInteger(pid) && pid > 0 ? pid : null;

  const reload = useCallback(
    async (opts = {}) => {
      if (!validProjectId) {
        setStatus(null);
        return null;
      }
      const silent = Boolean(opts.silent);
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const data = await fetchUnderstandGraphStatus(validProjectId);
        setStatus(data);
        return data;
      } catch (err) {
        if (!silent) {
          setError(
            (typeof err === "object" && err?.error) ||
              err?.message ||
              "Could not load graph status.",
          );
        }
        return null;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [validProjectId],
  );

  const stopStream = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    streamingRef.current = false;
  }, []);

  useEffect(
    () => () => {
      stopStream();
    },
    [stopStream],
  );

  const appendRunLogLine = useCallback((phase, message) => {
    const line = message ? `[${phase}] ${message}\n` : `[${phase}]\n`;
    setRunLog((prev) => prev + line);
  }, []);

  const handleStreamEvent = useCallback(
    (evt) => {
      if (!evt || typeof evt !== "object") return;

      if (evt.type === "connected") {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                currentPhase: evt.currentPhase ?? prev.currentPhase,
                status: evt.status ?? prev.status,
                progress: typeof evt.progress === "number" ? evt.progress : prev.progress,
              }
            : prev,
        );
      }

      if (evt.type === "phase") {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                currentPhase: evt.phase ?? prev.currentPhase,
                progress: typeof evt.progress === "number" ? evt.progress : prev.progress,
              }
            : prev,
        );
        if (evt.phase) {
          appendRunLogLine(evt.phase, evt.message ?? "");
        }
      }

      if (evt.type === "agent_update") {
        setAgentStream((prev) => applyDeployAgentStreamUpdate(prev, evt));
      }

      if (evt.type === "terminal") {
        stopStream();
        if (evt.status === "completed") {
          setStatus((prev) =>
            prev ? { ...prev, status: "ready", progress: 100, currentPhase: "completed" } : prev,
          );
        } else if (evt.status === "failed") {
          setStatus((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  lastError: evt.failureMessage ?? prev.lastError,
                  currentPhase: "failed",
                }
              : prev,
          );
        }
        void reload({ silent: true }).then((next) => {
          if (next && TERMINAL_STATUSES.has(next.status)) {
            setLivePanelVisible(false);
          }
        });
      }
    },
    [appendRunLogLine, reload, stopStream],
  );

  const streamGeneration = useCallback(
    (projectId) => {
      stopStream();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      streamingRef.current = true;

      void (async () => {
        try {
          await runSseWithReconnect({
            signal: controller.signal,
            onEvent: handleStreamEvent,
            connect: ({ onEvent, signal }) =>
              consumeUnderstandGraphStream(projectId, { signal, onEvent }),
          });
          const next = await reload({ silent: true });
          if (next && TERMINAL_STATUSES.has(next.status)) {
            setLivePanelVisible(false);
          }
        } catch (err) {
          if (err?.name === "AbortError") return;
          logger.error("Architecture diagram stream failed", err);
          setError("Live connection lost. Refresh the page to see progress.");
        } finally {
          streamingRef.current = false;
        }
      })();
    },
    [handleStreamEvent, reload, stopStream],
  );

  const beginLiveGeneration = useCallback(
    (startedAtMs = Date.now()) => {
      if (!validProjectId) return;
      setRunLog("");
      setAgentStream(emptyDeployAgentStreamState());
      setLivePanelVisible(true);
      setGenerationStartedAtMs(startedAtMs);
      streamGeneration(validProjectId);
    },
    [streamGeneration, validProjectId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!validProjectId || loading) return undefined;

    let cancelled = false;

    const resume = async () => {
      try {
        const data = await fetchUnderstandGraphStatus(validProjectId);
        if (cancelled) return;
        if (!data || !isArchitectureDiagramRunning(data)) return;

        setStatus(data);
        setLivePanelVisible(true);
        setGenerationStartedAtMs(data.startedAt ? new Date(data.startedAt).getTime() : Date.now());
        streamGeneration(validProjectId);
      } catch (err) {
        logger.error("Failed to resume architecture diagram generation", err);
      }
    };

    void resume();

    return () => {
      cancelled = true;
    };
  }, [loading, streamGeneration, validProjectId]);

  const refreshGraph = useCallback(async () => {
    if (!validProjectId) return;
    setStarting(true);
    setError("");
    beginLiveGeneration();
    try {
      await generateUnderstandGraph(validProjectId);
      await reload({ silent: true });
    } catch (err) {
      setLivePanelVisible(false);
      setError(
        (typeof err === "object" && err?.error) ||
          err?.message ||
          "Could not start graph generation.",
      );
    } finally {
      setStarting(false);
    }
  }, [beginLiveGeneration, reload, validProjectId]);

  const syncGraph = useCallback(async () => {
    if (!validProjectId) return;
    try {
      await syncUnderstandGraph(validProjectId);
      await reload();
    } catch (err) {
      setError((typeof err === "object" && err?.error) || err?.message || "Could not sync graph.");
    }
  }, [reload, validProjectId]);

  const embedSrc = useMemo(() => {
    const url = status?.embedUrl;
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const base = config.API_URL || "";
    return `${base.replace(/\/$/, "")}${url}`;
  }, [status?.embedUrl]);

  const generating = starting || isArchitectureDiagramRunning(status);
  const running = isArchitectureDiagramRunning(status);

  return {
    status,
    loading,
    generating,
    starting,
    running,
    error,
    embedSrc,
    reload,
    refreshGraph,
    syncGraph,
    livePanelVisible,
    setLivePanelVisible,
    runLog,
    agentStream,
    generationStartedAtMs,
  };
}
