import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelFeedbackAiFix,
  clarifyFeedbackAiFix,
  consumeFeedbackAiFixStream,
  fetchFeedbackAiFixStatus,
  startFeedbackAiFix,
} from "@/api";
import { isAiFixRunning } from "@/lib/feedbackAiFixLabels";

function normalizeFeedbackId(fid) {
  const id = typeof fid === "string" ? fid.trim() : String(fid ?? "").trim();
  return id || null;
}

/**
 * Apply an SSE/status snapshot without regressing an in-flight optimistic run
 * back to a stale terminal status (common when Retry opens SSE before start persists).
 * @param {string|null|undefined} next
 * @param {boolean} starting
 * @param {(updater: string|null|((prev: string|null) => string|null)) => void} setStatus
 */
function applyIncomingStatus(next, starting, setStatus) {
  if (!next) return;
  setStatus((prev) => {
    if (starting && !isAiFixRunning(next) && isAiFixRunning(prev)) {
      return prev;
    }
    return next;
  });
}

/**
 * @param {string|number} projectId
 * @param {{ onTerminal?: (payload: { feedbackId: string, status: string, result: object|null, error: string|null }) => void }} [options]
 */
export function useFeedbackAiFix(projectId, options = {}) {
  const { onTerminal } = options;
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;

  const [feedbackId, setFeedbackId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [streamLog, setStreamLog] = useState([]);
  const [clarifying, setClarifying] = useState(false);
  const abortRef = useRef(null);
  const terminalNotifiedRef = useRef("");
  const startingRef = useRef(false);
  /** Previous status for detecting running → terminal transitions only. */
  const prevStatusRef = useRef(null);
  /** Tracks the last watched id so we can drop stale status when switching feedback items. */
  const watchedFeedbackIdRef = useRef(null);

  const refresh = useCallback(
    async (fid = feedbackId) => {
      const id = normalizeFeedbackId(fid ?? feedbackId);
      if (!projectId || !id) return null;
      try {
        const snap = await fetchFeedbackAiFixStatus(projectId, id);
        // Watched item changed while this request was in flight — do not bleed its status over.
        if (watchedFeedbackIdRef.current !== id) return snap;
        if (snap?.aiFixStatus) {
          applyIncomingStatus(snap.aiFixStatus, startingRef.current, setStatus);
        } else if (!startingRef.current) {
          setStatus(null);
        }
        setResult(snap.aiFixResult ?? null);
        setError(snap.aiFixError ?? null);
        return snap;
      } catch {
        return null;
      }
    },
    [projectId, feedbackId],
  );

  const subscribe = useCallback(
    (fid = feedbackId) => {
      const id = normalizeFeedbackId(fid ?? feedbackId);
      if (!projectId || !id) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      void consumeFeedbackAiFixStream(projectId, id, {
        signal: ac.signal,
        onEvent: (evt) => {
          if (ac.signal.aborted || watchedFeedbackIdRef.current !== id) return;
          if (evt.type === "connected") {
            if (evt.aiFixStatus) {
              applyIncomingStatus(evt.aiFixStatus, startingRef.current, setStatus);
            }
            if (evt.aiFixResult) setResult(evt.aiFixResult);
            if (evt.aiFixError) setError(evt.aiFixError);
          }
          if (evt.phase || evt.aiFixStatus) {
            applyIncomingStatus(evt.phase || evt.aiFixStatus, startingRef.current, setStatus);
          }
          if (evt.aiFixResult) setResult(evt.aiFixResult);
          if (evt.error || evt.aiFixError) setError(evt.error || evt.aiFixError);
          if (evt.type === "log" && evt.text) {
            setStreamLog((prev) => [...prev.slice(-79), evt.text]);
          }
          if (evt.type === "terminal") {
            void refresh(id);
          }
        },
      }).catch(() => {});
    },
    [projectId, feedbackId, refresh],
  );

  const watchFeedback = useCallback((fid) => {
    const id = normalizeFeedbackId(fid);
    if (!id) return;
    if (watchedFeedbackIdRef.current !== id) {
      abortRef.current?.abort();
      setStatus(null);
      setResult(null);
      setError(null);
      setStreamLog([]);
      terminalNotifiedRef.current = "";
      prevStatusRef.current = null;
      watchedFeedbackIdRef.current = id;
    }
    setFeedbackId(id);
  }, []);

  useEffect(() => {
    if (!projectId || !feedbackId) return;
    void refresh(feedbackId);
  }, [projectId, feedbackId, refresh]);

  // Keep one SSE connection for the whole running lifetime — do not resubscribe on every phase.
  const isStreaming = Boolean(projectId && feedbackId && isAiFixRunning(status));
  useEffect(() => {
    if (!isStreaming) return;
    subscribe(feedbackId);
    return () => abortRef.current?.abort();
  }, [isStreaming, projectId, feedbackId, subscribe]);

  // Only reload list when a watched run transitions running → terminal (not when opening a failed row).
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (!feedbackId || !status || isAiFixRunning(status)) return;
    if (!isAiFixRunning(prev)) return;
    const key = `${feedbackId}:${status}`;
    if (terminalNotifiedRef.current === key) return;
    terminalNotifiedRef.current = key;
    onTerminalRef.current?.({
      feedbackId,
      status: String(status),
      result,
      error,
    });
  }, [feedbackId, status, result, error]);

  const startFor = useCallback(
    async (fid, body = {}) => {
      const id = normalizeFeedbackId(fid);
      if (!projectId || !id) {
        throw new Error("Invalid feedback id");
      }
      startingRef.current = true;
      watchedFeedbackIdRef.current = id;
      setFeedbackId(id);
      terminalNotifiedRef.current = "";
      prevStatusRef.current = "QUEUED";
      setError(null);
      setResult(null);
      setStreamLog([]);
      setStatus("QUEUED");
      try {
        const snap = await startFeedbackAiFix(projectId, id, body);
        if (watchedFeedbackIdRef.current !== id) return snap;
        const nextStatus = snap.aiFixStatus ?? "QUEUED";
        setStatus(nextStatus);
        prevStatusRef.current = isAiFixRunning(nextStatus) ? nextStatus : prevStatusRef.current;
        return snap;
      } finally {
        startingRef.current = false;
      }
    },
    [projectId],
  );

  const cancel = useCallback(async () => {
    if (!projectId || !feedbackId) return null;
    const snap = await cancelFeedbackAiFix(projectId, feedbackId);
    setStatus(snap.aiFixStatus ?? "CANCELLED");
    abortRef.current?.abort();
    return snap;
  }, [projectId, feedbackId]);

  const clarify = useCallback(
    async (prompt) => {
      if (!projectId || !feedbackId) return null;
      setClarifying(true);
      try {
        const snap = await clarifyFeedbackAiFix(projectId, feedbackId, prompt);
        if (snap?.aiFixStatus) setStatus(snap.aiFixStatus);
        setResult(snap?.aiFixResult ?? null);
        setError(snap?.aiFixError ?? null);
        return snap;
      } finally {
        setClarifying(false);
      }
    },
    [projectId, feedbackId],
  );

  return {
    feedbackId,
    status,
    result,
    error,
    streamLog,
    clarifying,
    isRunning: isAiFixRunning(status),
    isAwaitingQuestions: String(status || "") === "AWAITING_QUESTIONS",
    watchFeedback,
    startFor,
    cancel,
    clarify,
    refresh,
  };
}
