import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelReleaseScopeImplementRun,
  clarifyReleaseScopeImplementRun,
  continueReleaseScopeImplementRun,
  fetchActiveReleaseScopeImplementRun,
  fetchReleaseScopeImplementRun,
  startReleaseScopeImplement,
} from "@/api";

const ACTIVE_RUN_STATUSES = new Set(["queued", "running", "awaiting_questions"]);

export function useReleaseScopeImplement(releaseId) {
  const [run, setRun] = useState(null);
  const [resumable, setResumable] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const pollRef = useRef(null);

  const refreshRun = useCallback(
    async (runId) => {
      if (!releaseId || runId == null) return null;
      const data = await fetchReleaseScopeImplementRun(releaseId, runId);
      setRun(data);
      setResumable(false);
      return data;
    },
    [releaseId],
  );

  const start = useCallback(
    async (body) => {
      if (!releaseId) return null;
      setStarting(true);
      try {
        const res = await startReleaseScopeImplement(releaseId, body);
        if (res?.run) {
          setRun(res.run);
          setResumable(false);
        }
        return res;
      } finally {
        setStarting(false);
      }
    },
    [releaseId],
  );

  const cancel = useCallback(async () => {
    if (!releaseId || run?.id == null) return null;
    setCancelling(true);
    try {
      const data = await cancelReleaseScopeImplementRun(releaseId, run.id);
      setRun(data);
      setResumable(false);
      return data;
    } finally {
      setCancelling(false);
    }
  }, [releaseId, run?.id]);

  const continueRun = useCallback(async () => {
    if (!releaseId || run?.id == null) return null;
    setContinuing(true);
    try {
      const data = await continueReleaseScopeImplementRun(releaseId, run.id);
      setRun(data);
      setResumable(false);
      return data;
    } finally {
      setContinuing(false);
    }
  }, [releaseId, run?.id]);

  const clarify = useCallback(
    async (prompt) => {
      if (!releaseId || run?.id == null) return null;
      setClarifying(true);
      try {
        const data = await clarifyReleaseScopeImplementRun(releaseId, run.id, prompt);
        setRun(data);
        setResumable(false);
        return data;
      } finally {
        setClarifying(false);
      }
    },
    [releaseId, run?.id],
  );

  const clearRun = useCallback(() => {
    setRun(null);
    setResumable(false);
  }, []);

  const isActive = run != null && ACTIVE_RUN_STATUSES.has(run.status);
  const isAwaitingQuestions = run != null && run.status === "awaiting_questions";

  useEffect(() => {
    if (!releaseId) {
      setRun(null);
      setResumable(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchActiveReleaseScopeImplementRun(releaseId);
        if (!cancelled) {
          setRun(data?.run ?? null);
          setResumable(Boolean(data?.resumable));
        }
      } catch {
        if (!cancelled) {
          setRun(null);
          setResumable(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [releaseId]);

  useEffect(() => {
    if (!run?.id || !isActive) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }
    // Pause aggressive polling while waiting for human MCQ answers.
    if (isAwaitingQuestions) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }
    pollRef.current = setInterval(() => {
      void refreshRun(run.id);
    }, 4000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [run?.id, isActive, isAwaitingQuestions, refreshRun]);

  return {
    run,
    resumable,
    starting,
    cancelling,
    continuing,
    clarifying,
    isActive,
    isAwaitingQuestions,
    start,
    cancel,
    continueRun,
    clarify,
    refreshRun,
    clearRun,
  };
}
