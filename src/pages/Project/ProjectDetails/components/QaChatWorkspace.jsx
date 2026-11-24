import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, Globe, Loader2, MessageSquarePlus, Play, Send, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  consumeQaChatAgentStream,
  createQaChat,
  deleteQaChat,
  fetchQaChat,
  fetchQaChatAgentStatus,
  fetchQaChatBrowser,
  fetchQaChatConfig,
  fetchQaChatWorkspace,
  listQaChats,
  sendQaChatMessage,
  startQaChatBrowser,
  stopQaChatBrowser,
  stopQaChatGeneration,
  updateQaChatBrowserSelection,
} from "@/api";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import { AgentWorkingStatusRow } from "@/components/chat/AgentWorkingStatusRow";
import {
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_PRIMARY_TOGGLE_CLASS,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { chatUserBubbleTextClass } from "@/components/chat/chatPanelLayout.constants";
import { OlderChatThreadsMenu } from "@/components/chat/OlderChatThreadsMenu";
import { QaBrowserViewer } from "@/components/qa/QaBrowserViewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useAgentTurnElapsed } from "@/hooks/useAgentTurnElapsed";
import { cn } from "@/lib/utils";
import { QaChatGeneratedTests } from "./QaChatGeneratedTests";
import {
  applyQaAgentEvent,
  describeBrowserStopReason,
  formatIdleCountdown,
  isBrowserCapError,
  isBrowserLive,
  isMessageInFlight,
  qaChatToThread,
  qaTurnDurationLabel,
  qaTurnStartedAtMs,
  resolveWorkspaceSelection,
  selectEnvironment,
  selectPersona,
  selectionNeedsRestart,
  serverClockOffsetMs,
} from "@/lib/qaChat.util";

const FALLBACK_POLL_MS = 5000;
const STREAM_RETRY_MAX_MS = 15_000;
const BROWSER_POLL_MS = 5000;

function errorText(err, fallback) {
  return (typeof err?.error === "string" && err.error) || fallback;
}

function WorkspaceSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,2fr)_3fr]" aria-busy="true">
      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="aspect-video w-full" />
      </div>
    </div>
  );
}

/**
 * Elapsed time of the running turn. Anchored to the server's start time, so it keeps counting from
 * the real start after a refresh, a reconnect, or opening the chat on another device.
 */
function QaTurnTimer({ startedAtMs }) {
  const elapsed = useAgentTurnElapsed(startedAtMs);
  if (startedAtMs == null) return null;
  return (
    <div
      role="timer"
      aria-label={`Elapsed time ${elapsed}`}
      className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground"
    >
      <Clock className="size-3.5 shrink-0" aria-hidden />
      <span>{elapsed}</span>
    </div>
  );
}

/** "Completed in 2 min 14 sec", from persisted timestamps (identical after a refresh). */
function QaTurnDuration({ message }) {
  const label = qaTurnDurationLabel(message);
  if (!label) return null;
  return (
    <p className="flex items-center gap-1.5 px-1 text-xs tabular-nums text-muted-foreground">
      <Clock className="size-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
    </p>
  );
}

function MessageBubble({ message, live, clockOffsetMs = 0 }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[90%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
        <ChatExpandableContent
          collapsedMaxHeight={CHAT_USER_COLLAPSED_MAX_HEIGHT}
          toggleClassName={CHAT_USER_PRIMARY_TOGGLE_CLASS}
        >
          {/* `!` beats the console-wide muted `p` colour (higher specificity than the shared class). */}
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed !text-primary-foreground",
              chatUserBubbleTextClass,
            )}
          >
            {message.userPrompt}
          </p>
        </ChatExpandableContent>
      </div>
    );
  }
  if (isMessageInFlight(message)) {
    const hasLiveOutput =
      Boolean(live?.streamText?.trim()) || Boolean(live?.streamTimeline?.length);
    return (
      <div className="space-y-2">
        {hasLiveOutput ? (
          <AgentLiveTimeline
            timeline={live.streamTimeline}
            streamText={live.streamText}
            isActive
            collapsibleAssistant
            assistantVariant="plain"
          />
        ) : null}
        <QaTurnTimer startedAtMs={qaTurnStartedAtMs(message, clockOffsetMs)} />
        <AgentWorkingStatusRow
          text={live?.streamPhase || "Working in the project browser…"}
          showLiveDot
        />
      </div>
    );
  }
  if (message.status === "failed") {
    return (
      <div className="space-y-1.5">
        <Alert variant="destructive">
          <AlertTitle>The agent could not finish</AlertTitle>
          <AlertDescription>
            {message.aiSummary || "Something went wrong. Send the message again to retry."}
          </AlertDescription>
        </Alert>
        <QaTurnDuration message={message} />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="max-w-[95%] rounded-lg border bg-card px-3 py-2">
        <AssistantMarkdown text={message.aiSummary || ""} emptyLabel="(No reply.)" collapsible />
      </div>
      <QaTurnDuration message={message} />
    </div>
  );
}

/**
 * Website QA Chat: chat on the left, the live project browser on the right.
 * @param {{ projectId: number | string }} props
 */
export function QaChatWorkspace({ projectId }) {
  const pid = Number(projectId);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChatId = searchParams.get("chat");

  const [enabled, setEnabled] = useState(null);
  const [chats, setChats] = useState(null);
  const [chatId, setChatId] = useState(urlChatId || null);
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [browser, setBrowser] = useState(null);
  const [agentLive, setAgentLive] = useState(null);
  /** Server clock minus this device's clock, learned from the agent stream; anchors turn timers. */
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const agentLiveRef = useRef(null);
  const [streamUp, setStreamUp] = useState(false);
  /** Latest live state of a headless test run, pushed over the chat's SSE stream. */
  const [testRunEvent, setTestRunEvent] = useState(null);
  const healPhaseRef = useRef("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [sending, setSending] = useState(false);
  /** "Create tests": after verifying in the browser, also write, save and offer to run the tests. */
  const [createTests, setCreateTests] = useState(false);
  const [browserBusy, setBrowserBusy] = useState(false);
  const [browserError, setBrowserError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Environments / personas / URLs from the project's QA settings. */
  const [workspace, setWorkspace] = useState(null);
  /** The chat's saved selection (null until loaded); resolved against `workspace` for display. */
  const [selection, setSelection] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [selectionBusy, setSelectionBusy] = useState(false);
  /** Browser fills the whole workspace (chat column hidden). */
  const [maximized, setMaximized] = useState(false);
  const scrollRef = useRef(null);
  /** Chat id we just created: keep the optimistic transcript instead of resetting on switch. */
  const keepOnSwitchRef = useRef(null);
  const sendingRef = useRef(false);

  const inFlight = useMemo(() => messages.some(isMessageInFlight), [messages]);
  const live = isBrowserLive(browser);
  const effectiveSelection = useMemo(
    () => resolveWorkspaceSelection(workspace, selection || {}),
    [workspace, selection],
  );
  const environments = workspace?.environments || [];
  const personas =
    environments.find((e) => e.id === effectiveSelection.environmentId)?.personas || [];
  const activeChat = useMemo(
    () => (chats || []).find((c) => c.id === chatId) ?? null,
    [chats, chatId],
  );

  const selectChat = useCallback(
    (id) => {
      setChatId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("chat", id);
          else next.delete("chat");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleMaximized = useCallback(() => setMaximized((v) => !v), []);

  // Nothing to maximize once the browser stops.
  useEffect(() => {
    if (!live) setMaximized(false);
  }, [live]);

  // Esc restores the layout (keys typed into the remote page never reach this listener).
  useEffect(() => {
    if (!maximized) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximized]);

  // Config + chat list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchQaChatConfig();
        if (cancelled) return;
        setEnabled(Boolean(cfg?.enabled));
        if (!cfg?.enabled) return;
        const [res, ws] = await Promise.all([
          listQaChats(pid),
          fetchQaChatWorkspace(pid).catch(() => ({ configured: false, environments: [] })),
        ]);
        if (cancelled) return;
        setWorkspace(ws);
        setChats(res.chats || []);
        if (!urlChatId && res.chats?.length) selectChat(res.chats[0].id);
      } catch (err) {
        if (cancelled) return;
        setEnabled(false);
        toast.error(errorText(err, "Could not load QA Chat"));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  // Follow the URL only when the URL itself changes (back/forward, shared link). Comparing on every
  // `chatId` change snapped a freshly selected chat back to the previous one while the URL update was
  // still pending, which showed the old chat for a moment.
  const lastUrlChatRef = useRef(urlChatId);
  useEffect(() => {
    if (urlChatId === lastUrlChatRef.current) return;
    lastUrlChatRef.current = urlChatId;
    if (urlChatId && urlChatId !== chatId) setChatId(urlChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlChatId]);

  const loadChat = useCallback(async (id, { quiet = false } = {}) => {
    if (!id) return;
    if (!quiet) setLoadingChat(true);
    try {
      const res = await fetchQaChat(id);
      setMessages(res.messages || []);
    } catch (err) {
      if (!quiet) toast.error(errorText(err, "Could not load chat"));
    } finally {
      if (!quiet) setLoadingChat(false);
    }
  }, []);

  const loadBrowser = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetchQaChatBrowser(id);
      setBrowser(res.browser || null);
      if (res.selection) setSelection(res.selection);
    } catch {
      /* transient; the next poll retries */
    }
  }, []);

  // Switching chats resets per-chat state.
  useEffect(() => {
    agentLiveRef.current = null;
    setAgentLive(null);
    setTestRunEvent(null);
    healPhaseRef.current = "";
    setBrowserError(null);
    setPendingSelection(null);
    if (keepOnSwitchRef.current === chatId) {
      keepOnSwitchRef.current = null;
      return;
    }
    setMessages([]);
    setBrowser(null);
    setSelection(null);
    if (!chatId || !enabled) return;
    void loadChat(chatId);
    void loadBrowser(chatId);
  }, [chatId, enabled, loadChat, loadBrowser]);

  // Live agent output over SSE (reconnects with backoff). No transcript polling while it is up.
  useEffect(() => {
    if (!chatId || !enabled) return undefined;
    const ctrl = new AbortController();
    let cancelled = false;
    let attempt = 0;
    const onEvent = (evt) => {
      if (cancelled) return;
      if (evt?.type === "connected") {
        attempt = 0;
        setStreamUp(true);
        setClockOffsetMs(serverClockOffsetMs(evt.ts));
      }
      const next = applyQaAgentEvent(agentLiveRef.current, evt);
      if (next.testRun) {
        setTestRunEvent(next.testRun);
        // Auto-heal starts a heal agent turn this page did not send: reload the thread so it shows live.
        const phase = next.testRun.autoHeal?.phase || "";
        if (phase !== healPhaseRef.current) {
          healPhaseRef.current = phase;
          if (phase === "healing") void loadChat(chatId, { quiet: true });
        }
      }
      agentLiveRef.current = next.live;
      setAgentLive(next.live);
      if (next.refresh && !sendingRef.current) {
        void loadChat(chatId, { quiet: true });
        if (evt.type === "terminal") void loadBrowser(chatId);
      }
    };
    (async () => {
      while (!cancelled) {
        try {
          await consumeQaChatAgentStream(chatId, { onEvent, signal: ctrl.signal });
        } catch {
          /* fall through to retry */
        }
        if (cancelled) return;
        setStreamUp(false);
        attempt += 1;
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, STREAM_RETRY_MAX_MS)));
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
      setStreamUp(false);
    };
  }, [chatId, enabled, loadChat, loadBrowser]);

  // Only if the stream is down: a slow transcript poll so a turn still settles.
  useEffect(() => {
    if (!chatId || !inFlight || streamUp) return undefined;
    const t = window.setInterval(() => void loadChat(chatId, { quiet: true }), FALLBACK_POLL_MS);
    return () => window.clearInterval(t);
  }, [chatId, inFlight, streamUp, loadChat]);

  // Poll browser status while it is up or a turn may start it; also drives the idle countdown.
  useEffect(() => {
    if (!chatId || !enabled) return undefined;
    const poll = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (live || inFlight || browser?.status === "starting") void loadBrowser(chatId);
    }, BROWSER_POLL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [chatId, enabled, live, inFlight, browser?.status, loadBrowser]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, inFlight, agentLive?.streamText, agentLive?.streamTimeline?.length]);

  const handleNewChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await createQaChat(pid, {});
      // The new chat starts with the environment/persona currently shown.
      if (effectiveSelection.environmentId) {
        await updateQaChatBrowserSelection(res.chat.id, effectiveSelection).catch(() => {});
      }
      setChats((prev) => [{ ...res.chat, browser: null }, ...(prev || [])]);
      // Clear the previous chat in the same render that switches to the new one.
      setMessages([]);
      setBrowser(null);
      selectChat(res.chat.id);
    } catch (err) {
      toast.error(errorText(err, "Could not create chat"));
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    const prompt = draft.trim();
    if (!prompt || sending || inFlight || creating) return;
    setSending(true);
    sendingRef.current = true;
    setBrowserError(null);
    // Show the message and a working row immediately; swapped for the real rows below.
    const withTests =
      createTests && Boolean(effectiveSelection.environmentId && effectiveSelection.personaId);
    const tmpUser = { id: "tmp-user", role: "user", userPrompt: prompt, status: "completed" };
    const tmpAssistant = { id: "tmp-assistant", role: "assistant", status: "pending" };
    setMessages((prev) => [...prev, tmpUser, tmpAssistant]);
    setDraft("");
    const dropTmp = (rows) => rows.filter((m) => m.id !== "tmp-user" && m.id !== "tmp-assistant");
    try {
      let id = chatId;
      if (!id) {
        const created = await createQaChat(pid, {});
        id = created.chat.id;
        if (selection && effectiveSelection.environmentId) {
          await updateQaChatBrowserSelection(id, effectiveSelection).catch(() => {});
        }
        setChats((prev) => [{ ...created.chat, browser: null }, ...(prev || [])]);
        keepOnSwitchRef.current = id;
        selectChat(id);
      }
      // Tests are written for the environment/persona on screen: make sure the chat has it saved.
      if (withTests && !selection) {
        await updateQaChatBrowserSelection(id, effectiveSelection).catch(() => {});
      }
      const res = await sendQaChatMessage(
        id,
        withTests ? { prompt, createTests: true } : { prompt },
      );
      setMessages((prev) => [
        ...dropTmp(prev),
        ...(res.userMessage ? [res.userMessage] : []),
        ...(res.assistantMessage ? [res.assistantMessage] : []),
      ]);
      void loadBrowser(id);
    } catch (err) {
      setMessages((prev) => dropTmp(prev));
      setDraft(prompt);
      if (isBrowserCapError(err)) setBrowserError(err);
      toast.error(errorText(err, "Could not send message"));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleStopTurn = async () => {
    try {
      await stopQaChatGeneration(chatId);
      await loadChat(chatId, { quiet: true });
    } catch (err) {
      toast.error(errorText(err, "Could not stop the agent"));
    }
  };

  const handleStartBrowser = async () => {
    if (!chatId) return;
    setBrowserBusy(true);
    setBrowserError(null);
    try {
      const res = await startQaChatBrowser(
        chatId,
        startUrl.trim() ? { startUrl: startUrl.trim() } : {},
      );
      setBrowser(res.browser || null);
    } catch (err) {
      setBrowserError(err);
    } finally {
      setBrowserBusy(false);
    }
  };

  const handleStopBrowser = async () => {
    setBrowserBusy(true);
    try {
      const res = await stopQaChatBrowser(chatId);
      setBrowser(res.browser || null);
    } catch (err) {
      toast.error(errorText(err, "Could not stop the browser"));
    } finally {
      setBrowserBusy(false);
    }
  };

  const applySelection = async (next) => {
    if (!chatId) {
      setSelection(next);
      return;
    }
    const restarting = live;
    setSelectionBusy(true);
    if (restarting) setBrowserBusy(true);
    setBrowserError(null);
    try {
      const res = await updateQaChatBrowserSelection(chatId, {
        environmentId: next.environmentId,
        personaId: next.personaId,
        urlName: next.urlName,
      });
      setSelection(res.selection || next);
      setBrowser(res.browser || null);
      if (res.restarted) toast.success("Browser restarted with the new selection");
    } catch (err) {
      toast.error(errorText(err, "Could not change environment or persona"));
      void loadBrowser(chatId);
    } finally {
      setSelectionBusy(false);
      setBrowserBusy(false);
      setPendingSelection(null);
    }
  };

  const handlePickSelection = (next) => {
    if (!next.environmentId || !selectionNeedsRestart(effectiveSelection, next)) return;
    // A running browser restarts to load the other login: confirm first.
    if (chatId && live) setPendingSelection(next);
    else void applySelection(next);
  };

  const handleDeleteChat = async () => {
    try {
      await deleteQaChat(chatId);
      const rest = (chats || []).filter((c) => c.id !== chatId);
      setChats(rest);
      setConfirmDelete(false);
      selectChat(rest[0]?.id ?? null);
    } catch (err) {
      toast.error(errorText(err, "Could not delete chat"));
    }
  };

  const onBrowserClosed = useCallback(() => {
    if (chatId) void loadBrowser(chatId);
  }, [chatId, loadBrowser]);

  if (enabled === null || (enabled && chats === null)) return <WorkspaceSkeleton />;

  if (!enabled) {
    return (
      <Alert>
        <AlertTitle>QA Chat is not available</AlertTitle>
        <AlertDescription>
          The live project browser is not enabled on this environment yet.
        </AlertDescription>
      </Alert>
    );
  }

  // The agent is working in the page: a restart would cut it off.
  const selectionDisabled = selectionBusy || inFlight || sending || creating;
  const pendingEnv = environments.find((e) => e.id === pendingSelection?.environmentId);
  const pendingPersona = pendingEnv?.personas?.find((p) => p.id === pendingSelection?.personaId);
  const canCreateTests = Boolean(effectiveSelection.environmentId && effectiveSelection.personaId);
  const idle = live ? formatIdleCountdown(browser?.idleStopAt, now) : null;
  const stopNote = !live ? describeBrowserStopReason(browser?.stopReason) : null;

  return (
    <div
      className={cn(
        "grid gap-4",
        maximized
          ? "h-[calc(100dvh-8rem)] max-h-[calc(100dvh-8rem)] min-h-0 grid-cols-1"
          : "lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)] lg:min-h-0 lg:grid-cols-[minmax(320px,2fr)_3fr]",
      )}
    >
      {/* Chat */}
      <section
        className={cn(
          "flex h-[75dvh] min-h-0 flex-col overflow-hidden rounded-lg border lg:h-auto",
          maximized && "hidden",
        )}
        aria-label="QA Chat"
      >
        <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold" title={activeChat?.title}>
            {activeChat?.title || (chats?.length ? "Select a chat" : "New chat")}
          </h3>
          <OlderChatThreadsMenu
            threads={(chats || []).map(qaChatToThread)}
            activeThreadId={chatId}
            onSelectThread={(id) => selectChat(id)}
            label="Chats"
            emptyLabel="No chats yet"
            emptyListLabel="No chats yet."
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleNewChat}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MessageSquarePlus className="size-4" aria-hidden />
            )}
            {creating ? "Creating…" : "New"}
          </Button>
          {chatId ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Delete chat"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </header>

        {environments.length ? (
          <div
            className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b px-3 py-2"
            role="group"
            aria-label="Environment and persona"
          >
            <span className="text-xs text-muted-foreground">Environment</span>
            <Select
              value={effectiveSelection.environmentId}
              onValueChange={(id) => handlePickSelection(selectEnvironment(workspace, id))}
              disabled={selectionDisabled}
            >
              <SelectTrigger size="sm" aria-label="Environment" className="min-w-28 max-w-44">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.label || env.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Persona</span>
            <Select
              value={effectiveSelection.personaId}
              onValueChange={(id) =>
                handlePickSelection(selectPersona(workspace, effectiveSelection.environmentId, id))
              }
              disabled={selectionDisabled || personas.length === 0}
            >
              <SelectTrigger size="sm" aria-label="Persona" className="min-w-28 max-w-44">
                <SelectValue placeholder="Persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label || p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectionBusy ? (
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-label="Applying"
              />
            ) : null}
            {effectiveSelection.url ? (
              <span
                className="flex min-w-0 basis-full items-center gap-1 text-xs text-muted-foreground"
                title={effectiveSelection.url}
              >
                <Globe className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{effectiveSelection.url}</span>
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
          aria-live="polite"
        >
          {loadingChat || creating ? (
            <>
              <Skeleton className="ml-auto h-10 w-2/3" />
              <Skeleton className="h-20 w-5/6" />
            </>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <Globe className="size-6" />
              <p>
                Ask the agent to open pages, click through flows and check what it finds. You see
                the same browser on the right and can take over any time.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <MessageBubble message={m} live={agentLive} clockOffsetMs={clockOffsetMs} />
                {chatId ? (
                  <QaChatGeneratedTests
                    chatId={chatId}
                    message={m}
                    runEvent={testRunEvent}
                    streamUp={streamUp}
                    onBrowserStarted={() => void loadBrowser(chatId)}
                  />
                ) : null}
              </div>
            ))
          )}
        </div>

        <footer className="shrink-0 space-y-2 border-t bg-background p-3">
          <Textarea
            aria-label="Message the QA agent"
            rows={3}
            value={draft}
            placeholder={
              live
                ? "Tell the agent what to do in the browser…"
                : "Tell the agent what to do. The browser starts automatically."
            }
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="qa-chat-create-tests"
                  checked={createTests && canCreateTests}
                  onCheckedChange={(v) => setCreateTests(v === true)}
                  disabled={!canCreateTests || inFlight || sending}
                />
                <Label
                  htmlFor="qa-chat-create-tests"
                  className="cursor-pointer text-xs font-normal text-muted-foreground"
                >
                  Create tests
                </Label>
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {!canCreateTests
                  ? "Pick an environment and persona to create tests."
                  : createTests
                    ? "Verifies in the browser, then saves tests you can run headless."
                    : "⌘/Ctrl + Enter to send"}
              </span>
            </div>
            {inFlight ? (
              <Button type="button" size="sm" variant="outline" onClick={handleStopTurn}>
                <Square className="size-4" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSend}
                disabled={!draft.trim() || sending}
              >
                <Send className="size-4" />
                {sending ? "Sending…" : "Send"}
              </Button>
            )}
          </div>
        </footer>
      </section>

      {/* Browser */}
      <section
        className={cn(
          "flex min-h-0 flex-col gap-3 rounded-lg border p-3",
          maximized ? "overflow-hidden" : "overflow-y-auto",
        )}
        aria-label="Project browser"
      >
        <header className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Project browser</h3>
          <Badge variant={live ? "default" : "secondary"}>
            {live ? "Running" : browser?.status === "starting" ? "Starting" : "Stopped"}
          </Badge>
          {maximized && inFlight ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Agent is working
            </span>
          ) : null}
          {maximized && inFlight ? (
            <Button type="button" size="sm" variant="outline" onClick={handleStopTurn}>
              <Square className="size-4" />
              Stop agent
            </Button>
          ) : null}
          {idle ? (
            <span className="text-xs text-muted-foreground">Stops after inactivity in {idle}</span>
          ) : null}
          <div className="ml-auto flex gap-2">
            {live ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={browserBusy}
                onClick={handleStopBrowser}
              >
                <Square className="size-4" />
                {browserBusy ? "Stopping…" : "Stop browser"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={browserBusy || !chatId}
                onClick={handleStartBrowser}
              >
                <Play className="size-4" />
                {browserBusy ? "Starting…" : "Start browser"}
              </Button>
            )}
          </div>
        </header>

        {browserError ? (
          <Alert variant="destructive">
            <AlertTitle>
              {isBrowserCapError(browserError)
                ? "Too many browsers running"
                : "Could not start the browser"}
            </AlertTitle>
            <AlertDescription>
              {isBrowserCapError(browserError)
                ? "The project's browser limit is reached. Stop a browser in another chat, then try again."
                : errorText(browserError, "Try again in a moment.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {live ? (
          <QaBrowserViewer
            chatId={chatId}
            live
            agentWorking={inFlight}
            onClosed={onBrowserClosed}
            maximized={maximized}
            onToggleMaximize={toggleMaximized}
          />
        ) : (
          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center",
            )}
          >
            {browserBusy || browser?.status === "starting" ? (
              <Skeleton className="aspect-video w-full max-w-xl" aria-label="Starting browser" />
            ) : (
              <>
                <Globe className="size-8 text-muted-foreground" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  {stopNote ||
                    "The browser is not running. Start it, or send a message and it starts automatically."}
                </p>
                <Input
                  aria-label="Start URL (optional)"
                  className="max-w-sm"
                  placeholder="Start URL (optional), e.g. https://staging.example.com"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                />
              </>
            )}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(pendingSelection)}
        onOpenChange={(open) => {
          if (!open && !selectionBusy) setPendingSelection(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart the browser?</DialogTitle>
            <DialogDescription>
              Switching to {pendingEnv?.label || pendingSelection?.environmentId}
              {pendingPersona ? ` / ${pendingPersona.label || pendingPersona.id}` : ""} restarts the
              browser. The current login is saved, and the browser reopens with the saved login for
              the new selection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={selectionBusy}
              onClick={() => setPendingSelection(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectionBusy}
              onClick={() => void applySelection(pendingSelection)}
            >
              {selectionBusy ? "Restarting…" : "Restart browser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              The chat and its browser are removed. Saved logins for environments and personas are
              kept. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteChat}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
