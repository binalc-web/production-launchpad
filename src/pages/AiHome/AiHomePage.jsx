import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  chatPanelPageColumnClass,
  chatPanelPageGutterClass,
} from "@/components/chat/chatPanelLayout.constants";
import { PlatformPromptBox } from "@/components/chat/PlatformPromptBox";
import { PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER } from "@/components/chat/platformPromptBox.classes";
import { PlatformPromptSendButton } from "@/components/chat/PlatformPromptSendButton";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import {
  cancelAssistantGoal,
  confirmAssistantPending,
  createAssistantThread,
  deleteAssistantThreadApi,
  fetchProjects,
  getAssistantBriefing,
  getAssistantThread,
  listAssistantThreads,
  patchAssistantThread,
  searchProjects,
  sendAssistantMessage,
  setAssistantGoal,
  uploadAssistantAttachment,
} from "@/api/index";
import { resolveProjectsHomePath, readLastProjectId, writeLastProjectId } from "@/lib/lastProject";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { citationToInspector } from "@/lib/assistantCitations";
import {
  applyAssistantEvent,
  ASSISTANT_STREAMING_ID,
  isAssistantReplyEvent,
  isAssistantReplyMissing,
} from "@/lib/assistantSseEvents";
import {
  applyAssistantThreadIdToSearchParams,
  assistantThreadSearchParamMatches,
  readAssistantThreadIdFromSearchParams,
} from "@/lib/assistantThreadSearchParam";
import { cn } from "@/lib/utils";
import { ChatMessageHoverMeta } from "@/components/chat/ChatMessageHoverMeta";
import { AI_HOME_USER_BUBBLE, ALL_PROJECTS_LABEL } from "./aiHomeClasses";
import { AiHomeThreadList } from "./AiHomeThreadList";
import { AiHomeProjectChip } from "./AiHomeProjectChip";
import { AiHomeBriefing } from "./AiHomeBriefing";
import { AiHomeInspector } from "./AiHomeInspector";
import { AiHomeConfirmCard } from "./AiHomeConfirmCard";
import { AiHomeGoalBanner } from "./AiHomeGoalBanner";
import { AiHomeInProgressCard } from "./AiHomeInProgressCard";
import { AiHomeThinkingTools } from "./AiHomeThinkingTools";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import { ChatMessageAttachments } from "@/components/chat/ChatMessageAttachments";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { assistantDisplayText, isAssistantTickActive } from "@/lib/assistantGoal";

const GOAL_LOOP_TEXT =
  "Keep shipping this project in small increments until I cancel: Product Strategy → backlog → release → implement → preview → QA → lock → seed next. Do not stop after one lock.";

function AiHomeThreadSkeleton() {
  return (
    <div
      className={cn(chatPanelPageColumnClass, "space-y-6")}
      role="status"
      aria-busy="true"
      aria-label="Loading chat"
    >
      <div className="flex justify-end">
        <Skeleton className="h-10 w-1/2 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export default function AiHomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const [threads, setThreads] = useState([]);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  /** `{ id, text }` while a sent user prompt is being edited. */
  const [editing, setEditing] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(null);
  const [liveTools, setLiveTools] = useState([]);
  const [inspector, setInspector] = useState(null);
  const [navOpen, setNavOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 767px)").matches;
  });
  const [threadLoading, setThreadLoading] = useState(false);
  const [projectName, setProjectName] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const restoringThreadRef = useRef(false);
  const queryProjectId = searchParams.get("projectId");
  const queryThreadId = readAssistantThreadIdFromSearchParams(searchParams);

  const projectId = thread?.projectId != null ? String(thread.projectId) : queryProjectId;

  const loadThreads = async () => {
    const rows = await listAssistantThreads();
    setThreads(rows);
    return rows;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listAssistantThreads();
        if (cancelled) return;
        setThreads(rows);
      } catch {
        if (!cancelled) setThreads([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAssistantBriefing();
        if (!cancelled) setBriefing(data);
      } catch {
        if (!cancelled) setBriefing(null);
      } finally {
        if (!cancelled) setBriefingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const raw = searchParams.get("q");
    if (!raw?.trim()) return;
    setDraft(raw.trim());
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!queryProjectId) return;
    writeLastProjectId(queryProjectId);
    let cancelled = false;
    (async () => {
      try {
        const list = await searchProjects({ includeInactive: true });
        if (cancelled) return;
        const found = (Array.isArray(list) ? list : []).find(
          (p) => String(p.id) === String(queryProjectId),
        );
        setProjectName(found?.name || null);
      } catch {
        if (!cancelled) setProjectName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryProjectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveTools, pending]);

  /** Keep ?threadId= in sync so reload restores the active chat. */
  useEffect(() => {
    const tid = thread?.id != null ? String(thread.id) : "";
    if (!tid) return;
    setSearchParams(
      (prev) => {
        if (assistantThreadSearchParamMatches(prev, tid)) return prev;
        return applyAssistantThreadIdToSearchParams(prev, tid);
      },
      { replace: true },
    );
  }, [thread?.id, setSearchParams]);

  const tickActive = isAssistantTickActive(thread?.goalState);

  useEffect(() => {
    if (!thread?.id || !tickActive) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await getAssistantThread(thread.id);
        if (cancelled) return;
        setThread(data.thread);
        setMessages(data.messages || []);
        const pendingTools = data.thread?.pendingConfirmation?.pendingTools;
        setPending(Array.isArray(pendingTools) && pendingTools.length ? pendingTools : null);
      } catch {
        /* ignore poll errors */
      }
    };
    void refresh();
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => {
      if (!sending) void refresh();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [thread?.id, tickActive, sending]);

  const openThread = async (id) => {
    if (thread?.id != null && String(thread.id) === String(id)) return;

    setThreadLoading(true);
    setEditing(null);
    setMessages([]);
    setPending(null);
    setLiveTools([]);

    try {
      const data = await getAssistantThread(id);
      setThread(data.thread);
      setMessages(data.messages || []);
      const pendingTools = data.thread?.pendingConfirmation?.pendingTools;
      setPending(Array.isArray(pendingTools) && pendingTools.length ? pendingTools : null);
      if (data.thread?.projectId != null) {
        writeLastProjectId(String(data.thread.projectId));
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("projectId", String(data.thread.projectId));
            return next;
          },
          { replace: true },
        );
      }
    } finally {
      setThreadLoading(false);
    }
  };

  const startNew = () => {
    setThread(null);
    setEditing(null);
    setMessages([]);
    setPending(null);
    setLiveTools([]);
    attach.clear();
    setSearchParams((prev) => applyAssistantThreadIdToSearchParams(prev, null), { replace: true });
  };

  // Restore thread from ?threadId= after reload / deep link.
  useEffect(() => {
    if (!queryThreadId) return;
    if (thread?.id && String(thread.id) === queryThreadId) return;
    if (restoringThreadRef.current) return;
    restoringThreadRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        await openThread(queryThreadId);
      } catch {
        if (cancelled) return;
        setSearchParams((prev) => applyAssistantThreadIdToSearchParams(prev, null), {
          replace: true,
        });
      } finally {
        restoringThreadRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only react to URL thread id changes; openThread is stable enough for restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional restore-from-URL effect
  }, [queryThreadId]);

  const ensureThread = async () => {
    if (thread?.id) return thread;
    const created = await createAssistantThread({
      projectId: projectId || undefined,
    });
    setThread(created);
    setThreads((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
    return created;
  };

  const attach = useChatAttachments({
    upload: async (file) => {
      const current = await ensureThread();
      return uploadAssistantAttachment(current.id, file);
    },
  });

  const sawReplyRef = useRef(false);

  const handleAssistantEvent = (evt) => {
    if (isAssistantReplyEvent(evt)) sawReplyRef.current = true;
    applyAssistantEvent(evt, { setMessages, setPending, setThread, setLiveTools });
  };

  /** The stream ended without any answer (dropped proxy, empty turn): show what the server saved. */
  const recoverMissingReply = async (threadId) => {
    let loaded = null;
    if (threadId) {
      try {
        loaded = await getAssistantThread(threadId);
      } catch {
        /* fall through to the generic message below */
      }
    }
    if (loaded) {
      setThread(loaded.thread);
      const pendingTools = loaded.thread?.pendingConfirmation?.pendingTools;
      setPending(Array.isArray(pendingTools) && pendingTools.length ? pendingTools : null);
    }
    const rows = loaded?.messages;
    if (Array.isArray(rows) && !isAssistantReplyMissing(rows)) {
      setMessages(rows);
      return;
    }
    setMessages((prev) => [
      ...(Array.isArray(rows) && rows.length ? rows : prev).filter(
        (m) => m.id !== ASSISTANT_STREAMING_ID,
      ),
      {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "No response was received. Please try again.",
      },
    ]);
  };

  const runSse = async (fn, threadId) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    sawReplyRef.current = false;
    setSending(true);
    try {
      await fn(controller.signal);
      if (!sawReplyRef.current && !controller.signal.aborted) {
        await recoverMissingReply(threadId);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== ASSISTANT_STREAMING_ID),
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: err?.error || err?.message || "Request failed",
        },
      ]);
    } finally {
      setSending(false);
      await loadThreads();
    }
  };

  const send = async (text) => {
    const message = String(text || draft).trim();
    const attachmentIds = attach.ids;
    const readyItems = attach.readyItems;
    if ((!message && !attachmentIds.length) || sending) return;
    setDraft("");
    attach.clear();
    setMessages((prev) => [
      ...prev,
      {
        id: `local-user-${Date.now()}`,
        role: "user",
        content: message || "See attached",
        attachments: readyItems,
        optimistic: true,
      },
    ]);
    setSending(true);
    try {
      const current = await ensureThread();
      await runSse(
        (signal) =>
          sendAssistantMessage(
            current.id,
            { message, projectId: projectId || undefined, attachmentIds },
            {
              signal,
              onEvent: handleAssistantEvent,
            },
          ),
        current.id,
      );
    } catch (err) {
      setSending(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: err?.error || err?.message || "Could not send message.",
        },
      ]);
    }
  };

  /** Replace a sent prompt and everything after it, then re-run the assistant on the revised text. */
  const saveEdit = async () => {
    const message = String(editing?.text || "").trim();
    if (!editing || !message || sending || !thread?.id) return;
    const target = messages.find((m) => m.id === editing.id);
    setEditing(null);
    if (!target || message === String(target.content || "").trim()) return;
    setMessages((prev) => [
      ...prev.slice(
        0,
        prev.findIndex((m) => m.id === target.id),
      ),
      { ...target, id: `local-user-${Date.now()}`, content: message, optimistic: true },
    ]);
    setLiveTools([]);
    setSending(true);
    try {
      await runSse(
        (signal) =>
          sendAssistantMessage(
            thread.id,
            { message, projectId: projectId || undefined, editMessageId: target.id },
            {
              signal,
              onEvent: handleAssistantEvent,
            },
          ),
        thread.id,
      );
    } catch (err) {
      setSending(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: err?.error || err?.message || "Could not send message.",
        },
      ]);
    }
  };

  const confirm = async (accept, { allowAll = false } = {}) => {
    if (!thread?.id) return;
    await runSse(
      (signal) =>
        confirmAssistantPending(thread.id, accept, {
          allowAll,
          signal,
          onEvent: handleAssistantEvent,
        }),
      thread.id,
    );
    if (!accept) setPending(null);
  };

  const revokeAllowAll = async () => {
    if (!thread?.id) return;
    const updated = await patchAssistantThread(thread.id, { allowAllTools: false });
    setThread(updated);
  };

  const startGoal = async ({ text, mode, deployTarget }) => {
    const message = String(text || "").trim();
    if (!message || sending) return;
    const current = await ensureThread();
    try {
      const updated = await setAssistantGoal(current.id, { text: message, mode, deployTarget });
      setThread(updated);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: err?.error || err?.message || "Could not start goal",
        },
      ]);
      return;
    }
    await send(message);
  };

  const stopGoal = async () => {
    if (!thread?.id) return;
    const updated = await cancelAssistantGoal(thread.id);
    setThread(updated);
  };

  const startLoopOnLastProject = async () => {
    const storedId = readLastProjectId();
    if (storedId) {
      await onProjectChange({ projectId: storedId, projectName: null });
    }
    await startGoal({ text: GOAL_LOOP_TEXT, mode: "loop", deployTarget: "preview" });
  };

  const onProjectChange = async ({ projectId: nextId, projectName: nextName }) => {
    setProjectName(nextName);
    if (nextId) writeLastProjectId(nextId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextId) nextParams.set("projectId", String(nextId));
    else nextParams.delete("projectId");
    setSearchParams(nextParams, { replace: true });
    if (thread?.id) {
      const updated = await patchAssistantThread(thread.id, { projectId: nextId });
      setThread(updated);
    }
  };

  const openLastWorkspace = async () => {
    const storedId = readLastProjectId();
    try {
      let list = await searchProjects({ includeInactive: true });
      if (!Array.isArray(list) || list.length === 0) {
        const all = await fetchProjects({ includeInactive: true }).catch(() => []);
        list = Array.isArray(all) ? all : [];
      }
      const path = resolveProjectsHomePath(list, {
        isAdmin,
        lastProjectId: storedId,
      });
      navigate(path);
    } catch {
      if (storedId) {
        navigate(buildProjectDetailsPathWithResume(storedId, { isAdmin }));
        return;
      }
      navigate("/projects/onboarding");
    }
  };

  const streamingAssistant = messages.find((m) => m.id === ASSISTANT_STREAMING_ID);
  const hasLiveAssistantOutput =
    Boolean(String(streamingAssistant?.content || "").trim()) || liveTools.length > 0;
  const showReplyPending = sending && !hasLiveAssistantOutput;

  const showEmpty = messages.length === 0 && !sending;

  const composer = (
    <div className={cn(PLATFORM_PROMPT_BOX_FULLSCREEN_GUTTER, "pt-2")}>
      <div className={chatPanelPageColumnClass}>
        <div className="mb-2 pr-1">
          <AiHomeProjectChip
            projectId={projectId}
            projectName={thread?.project?.name || projectName}
            onChange={onProjectChange}
          />
        </div>
        <PlatformPromptBox
          staging={
            <ChatAttachmentChips
              items={attach.items}
              onRemove={attach.remove}
              disabled={sending || Boolean(pending?.length)}
            />
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask about a project, a release, or what to do next…"
          rows={2}
          disabled={sending || Boolean(pending?.length)}
          onPasteFiles={attach.uploading ? null : (files) => void attach.addFiles(files)}
          toolbarLeft={
            <ChatAttachControl
              disabled={sending || Boolean(pending?.length)}
              uploading={attach.uploading}
              onFiles={(files) => void attach.addFiles(files)}
              className="opacity-70 hover:opacity-100"
            />
          }
          toolbarRight={
            sending ? (
              <PlatformPromptSendButton
                hasActiveRun
                onStop={() => abortRef.current?.abort()}
                useComposerStop={false}
                sendAriaLabel="Stop"
              />
            ) : (
              <PlatformPromptSendButton
                onSend={() => void send()}
                sendDisabled={
                  (!draft.trim() && !attach.ids.length) ||
                  Boolean(pending?.length) ||
                  attach.uploading
                }
                sendAriaLabel="Send"
              />
            )
          }
        />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          By selecting {ALL_PROJECTS_LABEL} you can ask any question or doubt regarding LaunchPad.
        </p>
      </div>
    </div>
  );

  return (
    <div data-chat-surface className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/40">
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {navOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/45 md:hidden"
              aria-label="Close chats"
              onClick={() => setNavOpen(false)}
            />
            <AiHomeThreadList
              className="fixed inset-y-0 left-0 z-50 w-[min(100vw,18rem)] shadow-xl md:relative md:z-auto md:w-72 md:shadow-none"
              threads={threads}
              activeId={thread?.id}
              onToggleNav={() => setNavOpen(false)}
              onBackToWorkspace={() => void openLastWorkspace()}
              onSelect={(id) => {
                void openThread(id);
                if (window.matchMedia("(max-width: 767px)").matches) setNavOpen(false);
              }}
              onNew={() => {
                startNew();
                if (window.matchMedia("(max-width: 767px)").matches) setNavOpen(false);
              }}
              onDelete={async (id) => {
                await deleteAssistantThreadApi(id);
                if (thread?.id === id) startNew();
                await loadThreads();
              }}
              onRename={async (id, title) => {
                const nextTitle = String(title || "").trim();
                if (!id || !nextTitle) {
                  throw new Error("Chat name cannot be empty");
                }
                const previous = threads;
                setThreads((list) =>
                  list.map((t) => (t.id === id ? { ...t, title: nextTitle } : t)),
                );
                if (thread?.id === id) {
                  setThread((prev) => (prev ? { ...prev, title: nextTitle } : prev));
                }
                try {
                  const updated = await patchAssistantThread(id, { title: nextTitle });
                  const savedTitle = updated?.title || nextTitle;
                  setThreads((list) =>
                    list.map((t) => (t.id === id ? { ...t, ...updated, title: savedTitle } : t)),
                  );
                  if (thread?.id === id) {
                    setThread((prev) => (prev ? { ...prev, ...updated, title: savedTitle } : prev));
                  }
                } catch (err) {
                  setThreads(previous);
                  if (thread?.id === id) {
                    const restored = previous.find((t) => t.id === id);
                    if (restored)
                      setThread((prev) => (prev ? { ...prev, title: restored.title } : prev));
                  }
                  throw err;
                }
              }}
            />
          </>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {!navOpen ? (
            <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-3">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setNavOpen(true)}
                aria-label="Open chats"
              >
                <PanelLeft className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => void openLastWorkspace()}
                aria-label="Back to workspace"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
          <div
            ref={scrollRef}
            className={cn("min-h-0 flex-1 overflow-y-auto", chatPanelPageGutterClass)}
          >
            {threadLoading ? (
              <AiHomeThreadSkeleton />
            ) : showEmpty ? (
              <div className="flex min-h-full flex-col justify-center py-10">
                <div className={chatPanelPageColumnClass}>
                  <AiHomeBriefing
                    briefing={briefing}
                    loading={briefingLoading}
                    onAsk={(text) => void send(text)}
                    onStartLoop={() => void startLoopOnLastProject()}
                    onOpenCard={(card) => {
                      void onProjectChange({
                        projectId: String(card.projectId),
                        projectName: card.projectName,
                      });
                      setInspector({
                        projectId: String(card.projectId),
                        section: card.section,
                        area: card.area,
                        label: card.projectName,
                      });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className={cn(chatPanelPageColumnClass, "space-y-4")}>
                <AiHomeGoalBanner
                  goalState={thread?.goalState}
                  allowAllTools={Boolean(thread?.allowAllTools)}
                  busy={sending}
                  onCancel={() => void stopGoal()}
                  onRevokeAllowAll={() => void revokeAllowAll()}
                />
                <AiHomeInProgressCard
                  goalState={thread?.goalState}
                  busy={sending}
                  onStop={() => void stopGoal()}
                />
                {messages.map((m) => (
                  <div key={m.id} className={cn(m.role === "user" ? "flex justify-end" : "block")}>
                    {m.role === "user" && editing?.id === m.id ? (
                      <form
                        className={cn(AI_HOME_USER_BUBBLE, "w-full space-y-2")}
                        onSubmit={(e) => {
                          e.preventDefault();
                          void saveEdit();
                        }}
                      >
                        <Textarea
                          autoFocus
                          aria-label="Edit message"
                          value={editing.text}
                          onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditing(null);
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void saveEdit();
                            }
                          }}
                          className="min-h-20 resize-y bg-background"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!editing.text.trim() || sending}
                          >
                            Save
                          </Button>
                        </div>
                      </form>
                    ) : m.role === "user" ? (
                      <div className={cn(AI_HOME_USER_BUBBLE, "group relative")}>
                        {m.content}
                        <ChatMessageAttachments attachments={m.attachments} />
                        <ChatMessageHoverMeta
                          createdAt={m.createdAt}
                          text={m.content}
                          align="end"
                          onEdit={
                            m.optimistic || sending || pending?.length
                              ? undefined
                              : () => setEditing({ id: m.id, text: m.content || "" })
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Array.isArray(m.toolCalls) && m.toolCalls.length ? (
                          <AiHomeThinkingTools tools={m.toolCalls} />
                        ) : null}
                        {m.id === ASSISTANT_STREAMING_ID && liveTools.length ? (
                          <AiHomeThinkingTools tools={liveTools} isStreaming />
                        ) : null}
                        {(() => {
                          const display =
                            m.role === "assistant" ? assistantDisplayText(m.content) : m.content;
                          return display ? <AssistantMarkdown text={display} /> : null;
                        })()}
                        {m.id === ASSISTANT_STREAMING_ID ? (
                          <span
                            className="inline-block size-1.5 animate-pulse rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : null}
                        {Array.isArray(m.citations) && m.citations.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {m.citations.map((c, i) => (
                              <Button
                                key={`${m.id}-c-${i}`}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => {
                                  const loc = citationToInspector(c, projectId);
                                  if (loc) setInspector(loc);
                                }}
                              >
                                {c.label || c.sourceType}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
                {showReplyPending ? <AiHomeThinkingTools tools={[]} isStreaming /> : null}
                {!messages.some((m) => m.id === ASSISTANT_STREAMING_ID) && liveTools.length ? (
                  <AiHomeThinkingTools tools={liveTools} isStreaming />
                ) : null}
                <AiHomeConfirmCard
                  pending={pending}
                  busy={sending}
                  onAccept={() => void confirm(true)}
                  onAllowAll={() => void confirm(true, { allowAll: true })}
                  onReject={() => void confirm(false)}
                />
              </div>
            )}
          </div>

          {!threadLoading ? composer : null}
        </div>

        {inspector ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/45 md:hidden"
              aria-label="Close workspace preview"
              onClick={() => setInspector(null)}
            />
            <AiHomeInspector
              inspector={inspector}
              onClose={() => setInspector(null)}
              className="fixed inset-0 z-50 md:relative md:inset-auto md:h-full"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
