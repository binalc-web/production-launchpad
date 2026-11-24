import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import config from "@/config";
import {
  archiveBackendCodeChat,
  buildBackendCodeChatPlan,
  clearBackendCodeChatPendingPlan,
  createBackendCodeChatSession,
  deleteBackendCodeChatSession,
  fetchBackendCodeChat,
  fetchBackendCodeChatSessions,
  fetchUnderstandGraphStatus,
  generateUnderstandGraph,
  sendBackendCodeChatMessage,
  stopBackendCodeChat,
  syncUnderstandGraph,
} from "@/api";
import { parseTimestampMs } from "@/lib/clientLinkAgentTurnTimer";
import { watchProjectDevChatAgentStream } from "@/lib/projectDevChatAgentStream";
import {
  extractCliResultDurationMs,
  findActiveBackendCodeChatAssistant,
  isAssistantActive,
} from "../chat/backendCodeChat.util";
import {
  applyDevChatLiveStatusToMessages,
  buildFreshDevChatTurnLiveStatus,
  sanitizeDevChatLiveStatusForTurnStart,
  sleepMs,
  stripDevChatLiveOverlayFromAllMessages,
  stripDevChatLiveOverlayFromMessages,
} from "../chat/projectDevChatStream.util";

const TERMINAL_RELOAD_RETRY_DELAYS_MS = [1000, 2000];

/**
 * @param {number|string|undefined|null} projectId
 */
export function useBackendCodeChat(projectId) {
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(/** @type {string|null} */ (null));
  const [baseBranch, setBaseBranch] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingPlan, setPendingPlan] = useState(
    /** @type {{ markdown: string, sourceMessageId?: string|null }|null} */ (null),
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [liveStatus, setLiveStatus] = useState(null);
  const [completedTurnDurations, setCompletedTurnDurations] = useState({});

  const streamAbortRef = useRef(null);
  const reloadRef = useRef(null);
  const turnStartedAtMsRef = useRef(null);
  const messagesRef = useRef([]);
  const hasActiveRunRef = useRef(false);
  const sessionIdRef = useRef(null);

  const pid = projectId != null ? Number(projectId) : NaN;
  const validProjectId = Number.isInteger(pid) && pid > 0 ? pid : null;

  const reloadSessions = useCallback(async () => {
    if (!validProjectId) {
      setSessions([]);
      return [];
    }
    try {
      const data = await fetchBackendCodeChatSessions(validProjectId);
      const rows = Array.isArray(data?.sessions) ? data.sessions : [];
      setSessions(rows);
      return rows;
    } catch {
      return [];
    }
  }, [validProjectId]);

  const reload = useCallback(
    async (opts = {}) => {
      if (!validProjectId) {
        setSession(null);
        setMessages([]);
        setPendingPlan(null);
        return [];
      }
      const silent = Boolean(opts.silent);
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const activeSessionId = opts.sessionId ?? sessionIdRef.current;
        const data = await fetchBackendCodeChat(validProjectId, {
          sessionId: activeSessionId || undefined,
        });
        const rows = Array.isArray(data?.messages) ? data.messages : [];
        setSession(data ?? null);
        if (data?.id) {
          setSessionId(data.id);
          sessionIdRef.current = data.id;
        }
        if (typeof data?.baseBranch === "string") {
          setBaseBranch(data.baseBranch);
        } else if (data?.baseBranch == null) {
          setBaseBranch("");
        }
        setMessages(rows);
        setPendingPlan(
          data?.pendingPlan && typeof data.pendingPlan.markdown === "string"
            ? {
                markdown: data.pendingPlan.markdown,
                sourceMessageId: data.pendingPlan.sourceMessageId ?? null,
              }
            : null,
        );
        void reloadSessions();
        return rows;
      } catch (err) {
        setSession(null);
        setMessages([]);
        setPendingPlan(null);
        if (!silent) {
          setError(
            (typeof err === "object" && err?.error) ||
              err?.message ||
              "Could not load backend code chat.",
          );
        }
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [validProjectId, reloadSessions],
  );

  reloadRef.current = reload;
  sessionIdRef.current = sessionId;

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!validProjectId) {
      setSession(null);
      setMessages([]);
      setPendingPlan(null);
    }
  }, [validProjectId]);

  const hasActiveRun = useMemo(() => messages.some(isAssistantActive), [messages]);

  messagesRef.current = messages;
  hasActiveRunRef.current = hasActiveRun;

  const displayMessages = useMemo(
    () => applyDevChatLiveStatusToMessages(messages, liveStatus),
    [messages, liveStatus],
  );

  const activeAssistant = useMemo(
    () => findActiveBackendCodeChatAssistant(displayMessages),
    [displayMessages],
  );

  const turnStartedAtMs = useMemo(() => {
    if (!activeAssistant) return null;
    return parseTimestampMs(activeAssistant.createdAt);
  }, [activeAssistant]);

  useEffect(() => {
    if (turnStartedAtMs != null) {
      turnStartedAtMsRef.current = turnStartedAtMs;
    }
  }, [turnStartedAtMs]);

  const recordCompletedTurnDuration = useCallback((status) => {
    const messageId =
      typeof status?.assistantMessageId === "string" ? status.assistantMessageId.trim() : "";
    if (!messageId) return;

    const cliDuration = extractCliResultDurationMs(status?.streamTimeline);
    const startedAt = turnStartedAtMsRef.current;
    const wallDurationMs = startedAt != null ? Date.now() - startedAt : null;
    const durationMs = cliDuration ?? wallDurationMs;
    if (durationMs == null || durationMs < 1) return;

    setCompletedTurnDurations((prev) =>
      prev[messageId] === durationMs ? prev : { ...prev, [messageId]: durationMs },
    );
    turnStartedAtMsRef.current = null;
  }, []);

  const reloadAfterTerminal = useCallback(
    async (status) => {
      const messageId =
        typeof status?.assistantMessageId === "string" ? status.assistantMessageId.trim() : "";
      recordCompletedTurnDuration(status);
      setLiveStatus(null);
      if (messageId) {
        setMessages((prev) => stripDevChatLiveOverlayFromMessages(prev, messageId));
      }

      let rows = await reloadRef.current?.({ silent: true });
      if (!Array.isArray(rows)) rows = [];

      for (const delayMs of TERMINAL_RELOAD_RETRY_DELAYS_MS) {
        if (!rows.some(isAssistantActive)) break;
        await sleepMs(delayMs);
        const nextRows = await reloadRef.current?.({ silent: true });
        if (Array.isArray(nextRows)) rows = nextRows;
      }
    },
    [recordCompletedTurnDuration],
  );

  useEffect(() => {
    if (!validProjectId) {
      streamAbortRef.current?.abort();
      streamAbortRef.current = null;
      return undefined;
    }

    const controller = new AbortController();
    streamAbortRef.current = controller;

    void watchProjectDevChatAgentStream({
      projectId: validProjectId,
      chatKind: "backend-code",
      sessionId,
      signal: controller.signal,
      onStatus: async (status, evt) => {
        const nextStatus = sanitizeDevChatLiveStatusForTurnStart(status);

        // A turn started out-of-band (e.g. via MCP) reports an assistant message
        // this panel has not loaded yet — pull it in so it renders as working.
        const mid = nextStatus?.assistantMessageId;
        if (mid && nextStatus?.busy !== false && !messagesRef.current.some((m) => m.id === mid)) {
          await reloadRef.current?.({ silent: true });
        }

        setLiveStatus(nextStatus);
        if (nextStatus?.assistantMessageId) {
          setMessages((prev) => applyDevChatLiveStatusToMessages(prev, nextStatus));
        }
        if (evt?.type === "terminal" || (nextStatus?.busy === false && hasActiveRunRef.current)) {
          await reloadAfterTerminal(nextStatus);
        }
      },
    }).catch(() => {
      /* aborted on unmount / session switch */
    });

    return () => {
      controller.abort();
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    };
  }, [validProjectId, sessionId, reloadAfterTerminal]);

  const selectSession = useCallback(
    async (nextSessionId) => {
      const sid = typeof nextSessionId === "string" ? nextSessionId.trim() : "";
      if (!sid || !validProjectId) return;
      setSessionId(sid);
      sessionIdRef.current = sid;
      setLiveStatus(null);
      setMessages([]);
      setCompletedTurnDurations({});
      await reload({ sessionId: sid });
    },
    [validProjectId, reload],
  );

  /** Delete a session by id (defaults to current), then switch if the active one was removed. */
  const deleteSession = useCallback(
    async (targetSessionId) => {
      const sid =
        typeof targetSessionId === "string" && targetSessionId.trim()
          ? targetSessionId.trim()
          : sessionIdRef.current;
      if (!sid || !validProjectId) return;
      setDeleting(true);
      try {
        await deleteBackendCodeChatSession(validProjectId, sid);
        const remaining = (await reloadSessions()).filter((s) => s.id !== sid);
        if (sessionIdRef.current === sid) {
          setSessionId(null);
          sessionIdRef.current = null;
          setLiveStatus(null);
          setMessages([]);
          setPendingPlan(null);
          setCompletedTurnDurations({});
          await reload({ sessionId: remaining[0]?.id ?? null });
        }
      } finally {
        setDeleting(false);
      }
    },
    [validProjectId, reload, reloadSessions],
  );

  const sendMessage = useCallback(
    async ({
      prompt,
      mode = "agent",
      fixAction,
      deployEnvironmentId,
      attachmentIds,
      baseBranch: branchOverride,
    }) => {
      if (!validProjectId) {
        throw new Error("Project context missing.");
      }
      const text = typeof prompt === "string" ? prompt.trim() : "";
      const ids = Array.isArray(attachmentIds) ? attachmentIds : [];
      if (!text && !ids.length) return null;

      // After the first turn / agent lock, omit baseBranch so the server keeps the session lock
      // (avoids 409 when UI shows the resolved default but session.baseBranch was never stored).
      const branchLocked = Boolean(session?.cursorAgentId || messagesRef.current.length > 0);
      const branch = branchLocked
        ? undefined
        : typeof branchOverride === "string" && branchOverride.trim()
          ? branchOverride.trim()
          : baseBranch.trim() || undefined;

      setSending(true);
      setError("");
      setLiveStatus(null);
      setMessages((prev) => stripDevChatLiveOverlayFromAllMessages(prev));
      try {
        const result = await sendBackendCodeChatMessage(validProjectId, {
          prompt: text,
          mode,
          ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
          ...(branch ? { baseBranch: branch } : {}),
          ...(ids.length ? { attachmentIds: ids } : {}),
          ...(fixAction ? { fixAction } : {}),
          ...(deployEnvironmentId ? { deployEnvironmentId } : {}),
        });
        if (result?.sessionId) {
          setSessionId(result.sessionId);
          sessionIdRef.current = result.sessionId;
        }
        if (typeof result?.baseBranch === "string") {
          setBaseBranch(result.baseBranch);
        }
        const userMessage = result?.userMessage;
        const assistantMessage = result?.assistantMessage;
        if (result?.queued && userMessage?.id) {
          setMessages((prev) => [...prev, userMessage]);
          await reload({ silent: true });
          return result;
        }
        if (userMessage?.id && assistantMessage?.id) {
          setMessages((prev) => [...prev, userMessage, assistantMessage]);
          setLiveStatus(buildFreshDevChatTurnLiveStatus(assistantMessage.id));
        }
        await reload({ silent: true });
        return result;
      } catch (err) {
        const msg =
          (typeof err === "object" && err?.error) || err?.message || "Could not send message.";
        setError(msg);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [validProjectId, reload, baseBranch, session?.cursorAgentId],
  );

  const stopActiveRun = useCallback(async () => {
    if (!validProjectId) {
      throw new Error("Project context missing.");
    }
    setStopping(true);
    setError("");
    try {
      await stopBackendCodeChat(validProjectId, {
        sessionId: sessionIdRef.current || undefined,
      });
      setLiveStatus(null);
      setMessages((prev) => stripDevChatLiveOverlayFromAllMessages(prev));
      await reload({ silent: true });
    } catch (err) {
      const msg =
        (typeof err === "object" && err?.error) || err?.message || "Could not stop the agent.";
      setError(msg);
      throw err;
    } finally {
      setStopping(false);
    }
  }, [validProjectId, reload]);

  const startNewChat = useCallback(
    async ({ baseBranch: branchOverride } = {}) => {
      if (!validProjectId) {
        throw new Error("Project context missing.");
      }
      setArchiving(true);
      setError("");
      setLiveStatus(null);
      setMessages([]);
      setPendingPlan(null);
      setCompletedTurnDurations({});
      turnStartedAtMsRef.current = null;
      try {
        const branch =
          typeof branchOverride === "string" && branchOverride.trim()
            ? branchOverride.trim()
            : baseBranch.trim() || undefined;
        // Prefer creating a parallel session so an in-flight chat can keep running.
        const created = await createBackendCodeChatSession(validProjectId, {
          ...(branch ? { baseBranch: branch } : {}),
        });
        if (created?.id) {
          setSessionId(created.id);
          sessionIdRef.current = created.id;
          setSession(created);
          setBaseBranch(created.baseBranch || branch || "");
          setMessages([]);
          setPendingPlan(null);
          void reloadSessions();
          return created;
        }
        // Fallback: soft-archive current session when create is unavailable.
        await archiveBackendCodeChat(validProjectId, {
          sessionId: sessionIdRef.current || undefined,
        });
        await reload({ silent: true });
      } catch (err) {
        const msg =
          (typeof err === "object" && err?.error) || err?.message || "Could not start a new chat.";
        setError(msg);
        await reload({ silent: true });
        throw err;
      } finally {
        setArchiving(false);
      }
    },
    [validProjectId, reload, reloadSessions, baseBranch],
  );

  const buildPlan = useCallback(
    async ({ planMarkdown } = {}) => {
      if (!validProjectId) {
        throw new Error("Project context missing.");
      }
      setBuildingPlan(true);
      setSending(true);
      setError("");
      setLiveStatus(null);
      setMessages((prev) => stripDevChatLiveOverlayFromAllMessages(prev));
      try {
        const branchLocked = Boolean(session?.cursorAgentId || messagesRef.current.length > 0);
        const result = await buildBackendCodeChatPlan(validProjectId, {
          planMarkdown: typeof planMarkdown === "string" ? planMarkdown : undefined,
          sessionId: sessionIdRef.current || undefined,
          ...(branchLocked ? {} : { baseBranch: baseBranch.trim() || undefined }),
        });
        setPendingPlan(null);
        const userMessage = result?.userMessage;
        const assistantMessage = result?.assistantMessage;
        if (result?.queued && userMessage?.id) {
          setMessages((prev) => [...prev, userMessage]);
          await reload({ silent: true });
          return result;
        }
        if (userMessage?.id && assistantMessage?.id) {
          setMessages((prev) => [...prev, userMessage, assistantMessage]);
          setLiveStatus(buildFreshDevChatTurnLiveStatus(assistantMessage.id));
        }
        await reload({ silent: true });
        return result;
      } catch (err) {
        const msg =
          (typeof err === "object" && err?.error) || err?.message || "Could not build plan.";
        setError(msg);
        throw err;
      } finally {
        setBuildingPlan(false);
        setSending(false);
      }
    },
    [validProjectId, reload, baseBranch, session?.cursorAgentId],
  );

  const dismissPendingPlan = useCallback(async () => {
    if (!validProjectId) return;
    try {
      await clearBackendCodeChatPendingPlan(validProjectId, {
        sessionId: sessionIdRef.current || undefined,
      });
      setPendingPlan(null);
    } catch (err) {
      const msg =
        (typeof err === "object" && err?.error) || err?.message || "Could not dismiss plan.";
      setError(msg);
      throw err;
    }
  }, [validProjectId]);

  return {
    session,
    sessions,
    sessionId,
    baseBranch,
    setBaseBranch,
    messages: displayMessages,
    pendingPlan,
    loading,
    sending,
    buildingPlan,
    stopping,
    archiving,
    deleting,
    error,
    hasActiveRun,
    liveStatus,
    turnStartedAtMs,
    completedTurnDurations,
    sendMessage,
    buildPlan,
    dismissPendingPlan,
    stopActiveRun,
    startNewChat,
    selectSession,
    deleteSession,
    reload,
    reloadSessions,
  };
}

const GRAPH_POLL_MS = 3000;

/**
 * @param {number|string|undefined|null} projectId
 * @param {{ autoGenerate?: boolean }} [opts]
 */
export function useUnderstandGraph(projectId, opts = {}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const autoGenAttempted = useRef(false);

  const pid = projectId != null ? Number(projectId) : NaN;
  const validProjectId = Number.isInteger(pid) && pid > 0 ? pid : null;

  const reload = useCallback(
    async (opts = {}) => {
      if (!validProjectId) {
        setStatus(null);
        return;
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await reload();
      if (cancelled || !opts.autoGenerate || !validProjectId || autoGenAttempted.current) {
        return;
      }
      if (data?.status === "none") {
        autoGenAttempted.current = true;
        setGenerating(true);
        try {
          await generateUnderstandGraph(validProjectId);
          await reload();
        } catch (err) {
          setGenerating(false);
          setError(
            (typeof err === "object" && err?.error) ||
              err?.message ||
              "Could not start graph generation.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validProjectId, opts.autoGenerate, reload]);

  useEffect(() => {
    if (status?.status !== "generating") return undefined;
    const timer = setInterval(() => {
      void reload({ silent: true });
    }, GRAPH_POLL_MS);
    return () => clearInterval(timer);
  }, [status?.status, reload]);

  useEffect(() => {
    if (!generating) return;
    if (status?.status && status.status !== "generating") {
      setGenerating(false);
    }
  }, [generating, status?.status]);

  const refreshGraph = useCallback(async () => {
    if (!validProjectId) return;
    setGenerating(true);
    setError("");
    try {
      await generateUnderstandGraph(validProjectId);
      await reload();
    } catch (err) {
      setGenerating(false);
      setError(
        (typeof err === "object" && err?.error) || err?.message || "Could not refresh graph.",
      );
    }
  }, [validProjectId, reload]);

  const syncGraph = useCallback(async () => {
    if (!validProjectId) return;
    try {
      await syncUnderstandGraph(validProjectId);
      await reload();
    } catch (err) {
      setError((typeof err === "object" && err?.error) || err?.message || "Could not sync graph.");
    }
  }, [validProjectId, reload]);

  const embedSrc = useMemo(() => {
    const url = status?.embedUrl;
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const base = config.API_URL || "";
    return `${base.replace(/\/$/, "")}${url}`;
  }, [status?.embedUrl]);

  return {
    status,
    loading,
    generating,
    error,
    embedSrc,
    reload,
    refreshGraph,
    syncGraph,
  };
}
