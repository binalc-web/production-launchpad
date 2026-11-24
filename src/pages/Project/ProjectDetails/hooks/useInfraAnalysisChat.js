import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  confirmInfraAnalysisChatChange,
  archiveInfraAnalysisChat,
  createInfraAnalysisChatSession,
  fetchInfraAnalysisChat,
  rejectInfraAnalysisChatChange,
  sendInfraAnalysisChatMessage,
  stopInfraAnalysisChat,
} from "@/api";
import { watchProjectDevChatAgentStream } from "@/lib/projectDevChatAgentStream";
import {
  findPendingInfraAnalysisConfirmationMessage,
  isInfraAnalysisAssistantActive,
} from "../chat/infraAnalysisChat.util";
import {
  applyDevChatLiveStatusToMessages,
  buildFreshDevChatTurnLiveStatus,
  stripDevChatLiveOverlayFromAllMessages,
} from "../chat/projectDevChatStream.util";

/**
 * @param {number|string|undefined|null} projectId
 * @param {{ onAnalysisUpdated?: () => void }} [options]
 */
export function useInfraAnalysisChat(projectId, options = {}) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [liveStatus, setLiveStatus] = useState(null);

  const streamAbortRef = useRef(null);
  const reloadRef = useRef(null);
  const messagesRef = useRef([]);
  const hasActiveRunRef = useRef(false);

  const pid = projectId != null ? Number(projectId) : NaN;
  const validProjectId = Number.isInteger(pid) && pid > 0 ? pid : null;
  const onAnalysisUpdated = options.onAnalysisUpdated;

  const reload = useCallback(
    async (opts = {}) => {
      if (!validProjectId) {
        setSession(null);
        setMessages([]);
        return;
      }
      const silent = Boolean(opts.silent);
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const data = await fetchInfraAnalysisChat(validProjectId);
        setSession(data ?? null);
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
      } catch (err) {
        setSession(null);
        setMessages([]);
        if (!silent) {
          setError(
            (typeof err === "object" && err?.error) ||
              err?.message ||
              "Could not load infra analysis chat.",
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [validProjectId],
  );

  reloadRef.current = reload;

  useEffect(() => {
    reload();
  }, [reload]);

  const hasActiveRun = useMemo(() => messages.some(isInfraAnalysisAssistantActive), [messages]);

  messagesRef.current = messages;
  hasActiveRunRef.current = hasActiveRun;

  const pendingConfirmation = useMemo(
    () => findPendingInfraAnalysisConfirmationMessage(messages),
    [messages],
  );

  const displayMessages = useMemo(
    () => applyDevChatLiveStatusToMessages(messages, liveStatus),
    [messages, liveStatus],
  );

  const prevPendingIdRef = useRef(null);
  useEffect(() => {
    const pendingId = pendingConfirmation?.id ?? null;
    if (pendingId && pendingId !== prevPendingIdRef.current) {
      onAnalysisUpdated?.();
    }
    prevPendingIdRef.current = pendingId;
  }, [pendingConfirmation, onAnalysisUpdated]);

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
      chatKind: "infra-analysis",
      signal: controller.signal,
      onStatus: async (status, evt) => {
        // A turn started out-of-band (e.g. via MCP) reports an assistant message
        // this panel has not loaded yet — pull it in so it renders as working.
        const mid = status?.assistantMessageId;
        if (mid && status?.busy !== false && !messagesRef.current.some((m) => m.id === mid)) {
          await reloadRef.current?.({ silent: true });
        }

        setLiveStatus(status);
        if (status?.assistantMessageId) {
          setMessages((prev) => applyDevChatLiveStatusToMessages(prev, status));
        }
        if (evt?.type === "terminal" || (status?.busy === false && hasActiveRunRef.current)) {
          setLiveStatus(null);
          await reloadRef.current?.();
        }
      },
    }).catch(() => {
      /* aborted on unmount */
    });

    return () => {
      controller.abort();
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    };
  }, [validProjectId]);

  const sendMessage = useCallback(
    async ({ prompt, mode = "agent", attachmentIds }) => {
      if (!validProjectId) {
        throw new Error("Project context missing.");
      }
      const text = typeof prompt === "string" ? prompt.trim() : "";
      const ids = Array.isArray(attachmentIds) ? attachmentIds : [];
      if (!text && !ids.length) return null;

      setSending(true);
      setError("");
      setLiveStatus(null);
      setMessages((prev) => stripDevChatLiveOverlayFromAllMessages(prev));
      try {
        const result = await sendInfraAnalysisChatMessage(validProjectId, {
          prompt: text,
          mode,
          ...(ids.length ? { attachmentIds: ids } : {}),
        });
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
      } catch (err) {
        const msg =
          (typeof err === "object" && err?.error) || err?.message || "Could not send message.";
        setError(msg);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [validProjectId, reload],
  );

  const confirmChange = useCallback(
    async (messageId) => {
      if (!validProjectId || !messageId) return;
      setConfirming(true);
      setError("");
      try {
        await confirmInfraAnalysisChatChange(validProjectId, messageId);
        await reload();
        onAnalysisUpdated?.();
      } catch (err) {
        const msg =
          (typeof err === "object" && err?.error) || err?.message || "Could not confirm change.";
        setError(msg);
        throw err;
      } finally {
        setConfirming(false);
      }
    },
    [validProjectId, reload, onAnalysisUpdated],
  );

  const rejectChange = useCallback(
    async (messageId) => {
      if (!validProjectId || !messageId) return;
      setConfirming(true);
      setError("");
      try {
        await rejectInfraAnalysisChatChange(validProjectId, messageId);
        await reload();
        onAnalysisUpdated?.();
      } catch (err) {
        const msg =
          (typeof err === "object" && err?.error) || err?.message || "Could not discard change.";
        setError(msg);
        throw err;
      } finally {
        setConfirming(false);
      }
    },
    [validProjectId, reload, onAnalysisUpdated],
  );

  const stopActiveRun = useCallback(async () => {
    if (!validProjectId) {
      throw new Error("Project context missing.");
    }
    setStopping(true);
    setError("");
    try {
      await stopInfraAnalysisChat(validProjectId);
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

  const startNewChat = useCallback(async () => {
    if (!validProjectId) {
      throw new Error("Project context missing.");
    }
    setArchiving(true);
    setError("");
    try {
      const created = await createInfraAnalysisChatSession(validProjectId);
      if (created?.id) {
        setSession(created);
        setMessages([]);
        setLiveStatus(null);
        return created;
      }
      await archiveInfraAnalysisChat(validProjectId);
      await reload();
    } catch (err) {
      const msg =
        (typeof err === "object" && err?.error) || err?.message || "Could not start a new chat.";
      setError(msg);
      throw err;
    } finally {
      setArchiving(false);
    }
  }, [validProjectId, reload]);

  return {
    session,
    messages: displayMessages,
    loading,
    sending,
    stopping,
    confirming,
    archiving,
    error,
    hasActiveRun,
    pendingConfirmation,
    liveStatus,
    sendMessage,
    stopActiveRun,
    confirmChange,
    rejectChange,
    startNewChat,
    reload,
  };
}
