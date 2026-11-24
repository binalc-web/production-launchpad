import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { archiveCloudDebugChat, createCloudDebugChatSession, fetchCloudDebugChat, sendCloudDebugChatMessage } from "@/api";
import { parseTimestampMs } from "@/lib/clientLinkAgentTurnTimer";
import { watchProjectDevChatAgentStream } from "@/lib/projectDevChatAgentStream";
import {
  extractCliResultDurationMs,
  findActiveCloudDebugChatAssistant,
  isAssistantActive,
} from "../chat/cloudDebugChat.util";
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
 * @param {string} environmentId
 */
export function useCloudDebugChat(projectId, environmentId) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [liveStatus, setLiveStatus] = useState(null);
  const [completedTurnDurations, setCompletedTurnDurations] = useState({});

  const streamAbortRef = useRef(null);
  const reloadRef = useRef(null);
  const turnStartedAtMsRef = useRef(null);
  const messagesRef = useRef([]);
  const hasActiveRunRef = useRef(false);

  const pid = projectId != null ? Number(projectId) : NaN;
  const validProjectId = Number.isInteger(pid) && pid > 0 ? pid : null;
  const validEnvironmentId = typeof environmentId === "string" ? environmentId.trim() : "";

  const reload = useCallback(
    async (opts = {}) => {
      if (!validProjectId) {
        setSession(null);
        setMessages([]);
        return [];
      }
      const silent = Boolean(opts.silent);
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const data = await fetchCloudDebugChat(validProjectId);
        const rows = Array.isArray(data?.messages) ? data.messages : [];
        setSession(data ?? null);
        setMessages(rows);
        return rows;
      } catch (err) {
        setSession(null);
        setMessages([]);
        if (!silent) {
          setError(
            (typeof err === "object" && err?.error) || err?.message || "Could not load debug chat.",
          );
        }
        return [];
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

  const hasActiveRun = useMemo(() => messages.some(isAssistantActive), [messages]);

  messagesRef.current = messages;
  hasActiveRunRef.current = hasActiveRun;

  const displayMessages = useMemo(
    () => applyDevChatLiveStatusToMessages(messages, liveStatus),
    [messages, liveStatus],
  );

  const activeAssistant = useMemo(
    () => findActiveCloudDebugChatAssistant(displayMessages),
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
      chatKind: "cloud-debug",
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
      /* aborted on unmount */
    });

    return () => {
      controller.abort();
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    };
  }, [validProjectId, reloadAfterTerminal]);

  const sendMessage = useCallback(
    async ({ prompt, attachmentIds }) => {
      if (!validProjectId) {
        throw new Error("Project context missing.");
      }
      if (!validEnvironmentId) {
        throw new Error("Select an environment first.");
      }
      const text = typeof prompt === "string" ? prompt.trim() : "";
      const ids = Array.isArray(attachmentIds) ? attachmentIds : [];
      if (!text && !ids.length) return null;

      setSending(true);
      setError("");
      setLiveStatus(null);
      setMessages((prev) => stripDevChatLiveOverlayFromAllMessages(prev));
      try {
        const result = await sendCloudDebugChatMessage(validProjectId, {
          prompt: text,
          environmentId: validEnvironmentId,
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
    [validProjectId, validEnvironmentId, reload],
  );

  const startNewChat = useCallback(async () => {
    if (!validProjectId) {
      throw new Error("Project context missing.");
    }
    setArchiving(true);
    setError("");
    try {
      const created = await createCloudDebugChatSession(validProjectId);
      setCompletedTurnDurations({});
      turnStartedAtMsRef.current = null;
      if (created?.id) {
        setSession(created);
        setMessages([]);
        setLiveStatus(null);
        return created;
      }
      await archiveCloudDebugChat(validProjectId);
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
    archiving,
    error,
    hasActiveRun,
    liveStatus,
    turnStartedAtMs,
    completedTurnDurations,
    sendMessage,
    startNewChat,
    reload,
  };
}
