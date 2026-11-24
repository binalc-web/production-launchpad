import { useCallback, useEffect, useRef, useState } from "react";
import {
  archivedThreadEmptyMessage,
  parseArchivedThreadMessages,
  resolveOlderChatError,
} from "./olderChatThreads.util.js";

export const CURRENT_CHAT_THREAD_ID = "current";

/**
 * Manages older-chat thread list + read-only archived message viewing.
 * @param {{
 *   enabled?: boolean,
 *   scopeKey?: string,
 *   fetchThreads: () => Promise<{ threads?: Array<object>, hasArchivedChatHistory?: boolean }>,
 *   fetchThreadMessages: (threadId: string) => Promise<{ messages?: Array<object> }>,
 *   onThreadsLoaded?: (hasArchived: boolean) => void,
 * }} options
 */
export function useOlderChatThreads({
  enabled = true,
  scopeKey = "",
  fetchThreads,
  fetchThreadMessages,
  onThreadsLoaded,
}) {
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(CURRENT_CHAT_THREAD_ID);
  const [archivedMessages, setArchivedMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchThreadsRef = useRef(fetchThreads);
  const fetchThreadMessagesRef = useRef(fetchThreadMessages);
  const onThreadsLoadedRef = useRef(onThreadsLoaded);
  fetchThreadsRef.current = fetchThreads;
  fetchThreadMessagesRef.current = fetchThreadMessages;
  onThreadsLoadedRef.current = onThreadsLoaded;

  const resetToCurrentChat = useCallback(() => {
    setActiveThreadId(CURRENT_CHAT_THREAD_ID);
    setArchivedMessages([]);
    setMessagesLoading(false);
  }, []);

  const reloadThreads = useCallback(async () => {
    if (!enabled) {
      setThreads([]);
      return [];
    }
    setThreadsLoading(true);
    setError("");
    try {
      const data = await fetchThreadsRef.current?.();
      const rows = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(rows);
      onThreadsLoadedRef.current?.(Boolean(data?.hasArchivedChatHistory) || rows.length > 0);
      return rows;
    } catch (err) {
      setThreads([]);
      setError(resolveOlderChatError(err, "Could not load older chats."));
      return [];
    } finally {
      setThreadsLoading(false);
    }
  }, [enabled]);

  const prevScopeKeyRef = useRef(scopeKey);

  useEffect(() => {
    void reloadThreads();
  }, [reloadThreads]);

  useEffect(() => {
    if (prevScopeKeyRef.current === scopeKey) return;
    prevScopeKeyRef.current = scopeKey;
    resetToCurrentChat();
    setError("");
    if (!enabled) {
      setThreads([]);
    }
  }, [scopeKey, enabled, resetToCurrentChat]);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const selectThread = useCallback(
    async (threadId) => {
      const tid = String(threadId ?? "").trim();
      if (!tid || tid === CURRENT_CHAT_THREAD_ID) {
        resetToCurrentChat();
        setError("");
        return;
      }
      setActiveThreadId(tid);
      setArchivedMessages([]);
      setMessagesLoading(true);
      setError("");
      try {
        const data = await fetchThreadMessagesRef.current?.(tid);
        const rows = parseArchivedThreadMessages(data);
        setArchivedMessages(rows);
        const emptyMsg = archivedThreadEmptyMessage(rows);
        if (emptyMsg) {
          setError(emptyMsg);
        }
      } catch (err) {
        setArchivedMessages([]);
        setError(resolveOlderChatError(err, "Could not load older chat."));
      } finally {
        setMessagesLoading(false);
      }
    },
    [resetToCurrentChat],
  );

  const backToCurrent = useCallback(() => {
    resetToCurrentChat();
    setError("");
  }, [resetToCurrentChat]);

  const viewingArchived = activeThreadId !== CURRENT_CHAT_THREAD_ID;

  return {
    threads,
    threadsLoading,
    messagesLoading,
    viewingArchived,
    activeThreadId,
    archivedMessages,
    error,
    hasArchivedThreads: threads.length > 0,
    reloadThreads,
    selectThread,
    backToCurrent,
    clearError,
  };
}
