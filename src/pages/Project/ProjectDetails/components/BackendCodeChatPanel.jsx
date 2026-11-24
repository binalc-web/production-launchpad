import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanelComposer } from "@/components/chat/ChatPanelComposer";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { uploadChatAttachment } from "@/api";
import { ChatPanelEmptyState } from "@/components/chat/ChatPanelEmptyState";
import { ChatPanelFullscreenButton } from "@/components/chat/ChatPanelFullscreenButton";
import { ChatPanelHeader } from "@/components/chat/ChatPanelHeader";
import { ChatPanelMessageArea } from "@/components/chat/ChatPanelMessageArea";
import { ChatPanelShell } from "@/components/chat/ChatPanelShell";
import { chatUserBubbleTextClass } from "@/components/chat/chatPanelLayout.constants";
import {
  chatPanelBodyClass,
  chatPanelHeaderActionBtnClass,
  chatPanelHeaderActionLabelClass,
} from "@/components/chat/chatPanelLayout.constants";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import { AgentResultBadge } from "@/components/chat/AgentResultBadge";
import {
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_NEUTRAL_TOGGLE_CLASS,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { ChatMessageHoverMeta } from "@/components/chat/ChatMessageHoverMeta";
import { Badge } from "@/components/ui/badge";
import { HubProfileAvatar } from "@/components/common/HubProfileAvatar";
import { AI_HOME_USER_BUBBLE } from "@/pages/AiHome/aiHomeClasses";
import { ViewingOlderChatBanner } from "@/components/chat/ViewingOlderChatBanner";
import { ChatMessageQueuePanel } from "@/components/chat/ChatMessageQueuePanel";
import {
  formatQueuedSendToast,
  isQueuedChatSendResult,
  shouldRefreshTranscriptForQueueChange,
} from "@/lib/chatMessageQueue.util";
import { StopAgentConfirmDialog } from "@/components/agent/StopAgentConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentTurnElapsed } from "@/hooks/useAgentTurnElapsed";
import { useOlderChatThreads } from "@/hooks/useOlderChatThreads";
import { useStickToBottomScroll } from "@/hooks/useStickToBottomScroll";
import { formatChatThreadLabel } from "@/lib/formatChatThreadLabel";
import { usePanelFullscreen } from "@/hooks/usePanelFullscreen";
import { buildAgentProgressStatusLine } from "@/lib/clientLinkAgentTurnTimer";
import { getCursorModelLabel } from "@/constants/cursorModelCatalog";
import { agentStreamTimelineHasContent } from "@/pages/ClientLink/chat/clientLinkStreamTimeline.util";
import { cn } from "@/lib/utils";
import {
  consumeCloudDebugFixHandoff,
  cloudDebugFixActionLabel,
} from "@/utils/cloudDebugFixHandoff.util";
import { consumeAutomationReportBackendFixHandoff } from "@/utils/automationReportBackendFixHandoff.util";
import { consumeServerlessCompatibilityFixHandoff } from "@/utils/serverlessCompatibilityFixHandoff.util";
import {
  Check,
  GitBranch,
  History,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import { PLATFORM_PROMPT_BOX_RADIUS } from "@/components/chat/platformPromptBox.classes";
import { toast } from "sonner";
import {
  cancelBackendCodeChatQueueMessage,
  steerBackendCodeChatQueueMessage,
  fetchBackendCodeChatArchivedThreadMessages,
  fetchBackendCodeChatArchivedThreads,
  fetchBackendCodeChatQueue,
  reorderBackendCodeChatQueue,
} from "@/api";
import { useChatMessageQueue } from "@/hooks/useChatMessageQueue";
import { useBackendCodeChat } from "../hooks/useBackendCodeChat";
import {
  formatBackendCodeChatSessionOptionLabel,
  pairBackendCodeChatMessages,
  resolveBackendCodeChatTurnLabel,
} from "../chat/backendCodeChat.util";
import { formatRepoPathForPrompt } from "./devIde/devIdeDragPath.js";
import { normalizeAgentRepoPath } from "./devIde/normalizeAgentRepoPath.js";
import { BackendCodePlanDocument } from "./BackendCodePlanDocument";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import {
  extractLaunchpadQuestionsFence,
  extractLaunchpadPlanFenceFromReply,
  findActivePlanQuestions,
  findActiveLaunchpadQuestions,
  findIncompletePlanTurn,
  PLAN_INCOMPLETE_RETRY_PROMPT,
  stripLaunchpadQuestionsFromReply,
} from "../chat/backendCodeChatPlanQuestions.util.js";

const SUGGESTED_PROMPTS = [
  "Add a health-check endpoint to the backend API",
  "Explain how authentication is wired in this repo",
  "Wire the users list screen to a real GET /users endpoint",
];

function BackendCodeBaseBranchToolbarChip({ branchName, locked }) {
  const label = branchName?.trim() || "main";
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-7 max-w-[min(100%,14rem)] gap-1 border-border/80 bg-muted/30 px-2 py-0 font-normal shadow-none max-[480px]:max-w-full",
            PLATFORM_PROMPT_BOX_RADIUS,
          )}
        >
          <GitBranch className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[10px] leading-none text-muted-foreground">
            Base branch
          </span>
          <span className="min-w-0 truncate font-mono text-[10px] font-normal leading-none text-foreground">
            {label}
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        {locked
          ? "This chat’s agent is locked to this Git base branch. Start a new chat to pick a different branch."
          : "Git branch the agent uses for this chat (before the first message is sent)."}
      </TooltipContent>
    </Tooltip>
  );
}

function ChatBubble({
  message,
  isUser,
  progressLabel = "",
  modelLabel = "",
  elapsed = "",
  turnDurationMs = null,
  isFullscreen = false,
  onOpenPath,
  displayTextOverride = null,
  skipCollapse = false,
  /** Durable in-thread plan body (survives sticky pendingPlan clear after Build). */
  planMarkdown = null,
  /** When set, plan.md in-thread shows Preview/Edit, Build, and Dismiss (no duplicate above composer). */
  planActions = null,
  clarifyingQuestions = null,
  questionsInteractive = null,
}) {
  const text = isUser
    ? String(message?.content ?? "").trim()
    : displayTextOverride != null
      ? String(displayTextOverride).trim()
      : String(message?.reply ?? message?.content ?? "").trim();
  const isFailed = !isUser && message?.status === "failed";
  const isRunning = !isUser && (message?.status === "pending" || message?.status === "generating");
  const streamText = typeof message?.streamText === "string" ? message.streamText : "";
  const streamTimeline = Array.isArray(message?.streamTimeline) ? message.streamTimeline : [];
  const hasLiveTimeline =
    isRunning && (streamText.trim() || agentStreamTimelineHasContent(streamTimeline));
  const completedDurationMs =
    turnDurationMs != null && Number.isFinite(Number(turnDurationMs)) && Number(turnDurationMs) >= 1
      ? Number(turnDurationMs)
      : null;
  const durablePlan =
    !isUser && !isRunning && typeof planMarkdown === "string" && planMarkdown.trim()
      ? planMarkdown.trim()
      : "";
  const showClarifyingQuestions =
    !isUser &&
    !isRunning &&
    questionsInteractive &&
    Array.isArray(clarifyingQuestions) &&
    clarifyingQuestions.length > 0;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={cn(AI_HOME_USER_BUBBLE, "group relative")}>
          <ChatExpandableContent
            collapsedMaxHeight={CHAT_USER_COLLAPSED_MAX_HEIGHT}
            toggleClassName={CHAT_USER_NEUTRAL_TOGGLE_CLASS}
            className="whitespace-pre-wrap"
          >
            <p className={chatUserBubbleTextClass}>{message.content}</p>
          </ChatExpandableContent>
          <ChatMessageHoverMeta createdAt={message?.createdAt} text={text} align="end" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "group relative min-w-0 w-full max-w-full text-sm leading-relaxed",
          isFullscreen && "text-[15px]",
          (durablePlan || showClarifyingQuestions) && "max-w-full w-full",
        )}
      >
        {isRunning ? (
          hasLiveTimeline ? (
            <AgentLiveTimeline
              timeline={streamTimeline}
              streamText={streamText}
              isActive
              assistantVariant="plain"
              onOpenPath={onOpenPath}
            />
          ) : null
        ) : showClarifyingQuestions ? (
          <div className="min-w-0">
            <LaunchpadQuestionsCard
              variant="thread"
              optionLayout="cursor"
              questions={clarifyingQuestions}
              continueMode={questionsInteractive.continueMode}
              sending={questionsInteractive.sending}
              disabled={questionsInteractive.disabled}
              onSubmit={questionsInteractive.onSubmit}
              className="mb-0"
            />
            {completedDurationMs != null ? (
              <AgentResultBadge
                status={isFailed ? "error" : "success"}
                durationMs={completedDurationMs}
                className="mt-4"
              />
            ) : null}
          </div>
        ) : durablePlan ? (
          <div className="min-w-0">
            <BackendCodePlanDocument
              markdown={durablePlan}
              readOnly={!planActions}
              building={planActions?.building}
              disabled={planActions?.disabled}
              onBuild={planActions?.onBuild}
              onDismiss={planActions?.onDismiss}
              className="mb-0"
            />
            {completedDurationMs != null ? (
              <AgentResultBadge
                status={isFailed ? "error" : "success"}
                durationMs={completedDurationMs}
                className="mt-4"
              />
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 space-y-2 leading-relaxed">
            <AssistantMarkdown text={text || "(no reply)"} collapsible={!skipCollapse} />
            {completedDurationMs != null ? (
              <AgentResultBadge
                status={isFailed ? "error" : "success"}
                durationMs={completedDurationMs}
              />
            ) : null}
          </div>
        )}
        {!isRunning ? (
          <ChatMessageHoverMeta
            createdAt={message?.createdAt}
            text={durablePlan || text}
            align="start"
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Inline chat for updating backend code via Cursor agent (Backend Code tab).
 */
export function BackendCodeChatPanel({
  projectId,
  canSend,
  disabledHint,
  embeddedInIde = false,
  onActiveRunChange,
  onAgentFileChange,
  onOpenPath,
  onOpenPlan,
  onUpdatePlan,
  onPendingPlanCleared,
  onFocusPlan,
  onPlanChromeChange,
  onRequestNewChat,
  onNewChatStarted,
  newChatConfirmOpen: newChatConfirmOpenProp,
  onNewChatConfirmOpenChange,
}) {
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("agent");
  const attach = useChatAttachments({
    upload: (file) => uploadChatAttachment(file, { channel: "backend_code", scopeId: projectId }),
  });
  const [newChatConfirmOpenLocal, setNewChatConfirmOpenLocal] = useState(false);
  const newChatConfirmControlled = typeof onNewChatConfirmOpenChange === "function";
  const newChatConfirmOpen = newChatConfirmControlled
    ? Boolean(newChatConfirmOpenProp)
    : newChatConfirmOpenLocal;
  const setNewChatConfirmOpen = useCallback(
    (open) => {
      if (newChatConfirmControlled) {
        onNewChatConfirmOpenChange(Boolean(open));
        return;
      }
      setNewChatConfirmOpenLocal(Boolean(open));
    },
    [newChatConfirmControlled, onNewChatConfirmOpenChange],
  );
  const [stopAgentConfirmOpen, setStopAgentConfirmOpen] = useState(false);
  const { isFullscreen, toggleFullscreen } = usePanelFullscreen();
  const effectiveFullscreen = embeddedInIde ? false : isFullscreen;
  const cloudDebugFixHandoffSentRef = useRef(false);
  const automationReportFixHandoffSentRef = useRef(false);
  const serverlessFixHandoffSentRef = useRef(false);
  const lastOpenedPlanMarkdownRef = useRef("");

  const {
    session,
    messages,
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
    sessions,
    sessionId,
    baseBranch,
    setBaseBranch,
    reload,
  } = useBackendCodeChat(projectId);

  useEffect(() => {
    onActiveRunChange?.(Boolean(hasActiveRun));
  }, [hasActiveRun, onActiveRunChange]);

  const [pendingPlanCollapsed, setPendingPlanCollapsed] = useState(false);
  useEffect(() => {
    setPendingPlanCollapsed(mode !== "plan" || buildingPlan);
  }, [mode, buildingPlan]);

  useEffect(() => {
    if (!embeddedInIde) return;
    const md = typeof pendingPlan?.markdown === "string" ? pendingPlan.markdown.trim() : "";
    if (!md) {
      // Build / agent continuation clears session pendingPlan* — keep plan.md open
      // with the last markdown so the plan remains a durable IDE artifact. Explicit
      // dismiss and new-chat call onPendingPlanCleared themselves.
      return;
    }
    if (md !== lastOpenedPlanMarkdownRef.current) {
      lastOpenedPlanMarkdownRef.current = md;
      onOpenPlan?.(md);
    } else {
      onUpdatePlan?.(md);
    }
  }, [embeddedInIde, pendingPlan?.markdown, onOpenPlan, onUpdatePlan]);

  const seenAgentFileKeysRef = useRef(/** @type {Set<string>} */ (new Set()));
  useEffect(() => {
    if (!onAgentFileChange || !hasActiveRun) {
      if (!hasActiveRun) seenAgentFileKeysRef.current = new Set();
      return;
    }
    const timeline = Array.isArray(liveStatus?.streamTimeline) ? liveStatus.streamTimeline : [];
    for (const item of timeline) {
      if (item?.type !== "tool_call") continue;
      const kind = item.toolKind;
      if (kind !== "edit" && kind !== "write") continue;
      const path = typeof item.targetPath === "string" ? item.targetPath.trim() : "";
      if (!path) continue;
      const status =
        item.status === "success" || item.status === "failed" ? item.status : "running";
      const hasPreview = typeof item.diffPreview === "string" && Boolean(item.diffPreview.trim());
      const key = `${item.callId || item.id || path}:${status}:${hasPreview ? "p" : "np"}`;
      if (seenAgentFileKeysRef.current.has(key)) continue;
      seenAgentFileKeysRef.current.add(key);
      onAgentFileChange({
        path,
        toolKind: kind,
        status,
        diffPreview: item.diffPreview,
      });
    }
  }, [hasActiveRun, liveStatus?.streamTimeline, onAgentFileChange]);

  const {
    threads: olderThreads,
    threadsLoading: olderThreadsLoading,
    messagesLoading: olderMessagesLoading,
    viewingArchived,
    activeThreadId: olderActiveThreadId,
    archivedMessages,
    error: olderChatError,
    reloadThreads,
    selectThread,
    backToCurrent,
  } = useOlderChatThreads({
    enabled: Boolean(projectId) && canSend,
    scopeKey: String(projectId),
    fetchThreads: useCallback(() => fetchBackendCodeChatArchivedThreads(projectId), [projectId]),
    fetchThreadMessages: useCallback(
      (threadId) => fetchBackendCodeChatArchivedThreadMessages(projectId, threadId),
      [projectId],
    ),
  });
  const activeOlderChatThreadLabel = useMemo(() => {
    if (!viewingArchived) return "";
    const thread = olderThreads.find((t) => String(t.id) === String(olderActiveThreadId));
    return thread ? formatChatThreadLabel(thread) : "";
  }, [viewingArchived, olderThreads, olderActiveThreadId]);
  useEffect(() => {
    if (!olderChatError) return;
    toast.error(olderChatError);
  }, [olderChatError]);

  const messageQueue = useChatMessageQueue({
    enabled: Boolean(projectId) && canSend && !viewingArchived,
    loadQueue: useCallback(
      () => fetchBackendCodeChatQueue(projectId, { sessionId: sessionId || undefined }),
      [projectId, sessionId],
    ),
    reorderQueue: useCallback(
      (orderedMessageIds) =>
        reorderBackendCodeChatQueue(projectId, orderedMessageIds, {
          sessionId: sessionId || undefined,
        }),
      [projectId, sessionId],
    ),
    cancelQueueItem: useCallback(
      (messageId) =>
        cancelBackendCodeChatQueueMessage(projectId, messageId, {
          sessionId: sessionId || undefined,
        }),
      [projectId, sessionId],
    ),
    steerQueueItem: useCallback(
      (messageId) =>
        steerBackendCodeChatQueueMessage(projectId, messageId, {
          sessionId: sessionId || undefined,
        }),
      [projectId, sessionId],
    ),
    onItemCancelled: useCallback(() => {
      toast.message("Removed from queue.");
    }, []),
    onItemSteered: useCallback(() => {
      toast.success("Sent into the running turn.");
      void reload({ silent: true });
    }, [reload]),
    onSteerFailed: useCallback((err) => {
      toast.error(
        err?.error || err?.message || "Could not steer this message. It stays in the queue.",
      );
    }, []),
    onCancelFailed: useCallback((err) => {
      toast.error(err?.error || err?.message || "Could not remove this message from the queue.");
    }, []),
  });

  const displayMessages = viewingArchived ? archivedMessages : messages;
  const {
    containerRef: scrollRef,
    onScroll: onChatScroll,
    pinToBottom: pinChatToBottom,
  } = useStickToBottomScroll([displayMessages, sending, hasActiveRun, viewingArchived]);

  useEffect(() => {
    pinChatToBottom();
  }, [viewingArchived, olderActiveThreadId, pinChatToBottom]);

  const pairs = pairBackendCodeChatMessages(displayMessages);
  const composerDisabled = !canSend || sending || archiving || viewingArchived;
  const newChatDisabled = !canSend || sending || archiving || viewingArchived;
  const showEmpty =
    pairs.length === 0 &&
    !loading &&
    !archiving &&
    !olderMessagesLoading &&
    !viewingArchived &&
    !sending &&
    !buildingPlan;
  const turnElapsed = useAgentTurnElapsed(hasActiveRun ? turnStartedAtMs : null);
  const activePlanQuestions = useMemo(
    () =>
      viewingArchived || hasActiveRun
        ? null
        : findActivePlanQuestions(displayMessages, Boolean(pendingPlan?.markdown)),
    [viewingArchived, hasActiveRun, displayMessages, pendingPlan?.markdown],
  );
  const activeAgentQuestions = useMemo(
    () =>
      viewingArchived || hasActiveRun || activePlanQuestions || pendingPlan?.markdown
        ? null
        : findActiveLaunchpadQuestions(displayMessages, { modeFilter: "agent" }),
    [viewingArchived, hasActiveRun, activePlanQuestions, pendingPlan?.markdown, displayMessages],
  );
  const incompletePlanTurn = useMemo(
    () =>
      viewingArchived || hasActiveRun || activePlanQuestions || activeAgentQuestions
        ? null
        : findIncompletePlanTurn(displayMessages, Boolean(pendingPlan?.markdown)),
    [
      viewingArchived,
      hasActiveRun,
      activePlanQuestions,
      activeAgentQuestions,
      displayMessages,
      pendingPlan?.markdown,
    ],
  );

  useEffect(() => {
    if (activePlanQuestions?.questions?.length || activeAgentQuestions?.questions?.length) {
      pinChatToBottom();
    }
  }, [activePlanQuestions, activeAgentQuestions, pinChatToBottom]);

  const activeAssistantId = useMemo(() => {
    if (viewingArchived) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const row = messages[i];
      if (row?.role === "assistant" && (row.status === "pending" || row.status === "generating")) {
        return row.id;
      }
    }
    return null;
  }, [messages, viewingArchived]);

  const activeModelLabel = useMemo(() => {
    if (!hasActiveRun) return "";
    const phase = typeof liveStatus?.streamPhase === "string" ? liveStatus.streamPhase.trim() : "";
    if (phase === "Selecting model…" || /^selecting model/i.test(phase)) return "";
    const reply = typeof liveStatus?.aiSummary === "string" ? liveStatus.aiSummary.trim() : "";
    if (reply === "Selecting model…" || /^selecting model/i.test(reply)) return "";
    const modelId = typeof liveStatus?.model === "string" ? liveStatus.model.trim() : "";
    return modelId ? getCursorModelLabel(modelId) : "";
  }, [hasActiveRun, liveStatus]);

  const activeAssistantMessage = useMemo(() => {
    if (!activeAssistantId) return null;
    return messages.find((row) => row?.id === activeAssistantId) ?? null;
  }, [messages, activeAssistantId]);

  const runningBadgeLabel = useMemo(() => {
    if (!hasActiveRun) return "Running";
    const turnLabel = resolveBackendCodeChatTurnLabel(liveStatus, activeAssistantMessage);
    return buildAgentProgressStatusLine({
      label: turnLabel || "Running",
      model: activeModelLabel,
      elapsed: turnElapsed,
    });
  }, [hasActiveRun, liveStatus, activeAssistantMessage, activeModelLabel, turnElapsed]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (viewingArchived || !canSend) return;
    if (!hasActiveRun) {
      void messageQueue.reload();
    }
  }, [hasActiveRun, viewingArchived, canSend, messageQueue.reload]);

  // Keep draining while prompts sit in the queue with no live agent (matches Client Link).
  useEffect(() => {
    if (viewingArchived || messageQueue.items.length === 0) return;
    const id = window.setInterval(() => {
      void messageQueue.reload({ silent: true });
    }, 1500);
    return () => window.clearInterval(id);
  }, [viewingArchived, messageQueue.items.length, messageQueue.reload]);

  const prevQueueItemsRef = useRef(messageQueue.items);
  useEffect(() => {
    const prev = prevQueueItemsRef.current;
    const next = messageQueue.items;
    prevQueueItemsRef.current = next;
    if (viewingArchived || !canSend) return;
    if (
      !shouldRefreshTranscriptForQueueChange(prev, next, {
        previousTurnLive: hasActiveRun,
      })
    ) {
      return;
    }
    void reload({ silent: true });
  }, [viewingArchived, canSend, messageQueue.items, hasActiveRun, reload]);

  useEffect(() => {
    if (!projectId || !canSend || cloudDebugFixHandoffSentRef.current) return;
    const handoff = consumeCloudDebugFixHandoff(projectId);
    if (!handoff?.prompt) return;
    cloudDebugFixHandoffSentRef.current = true;
    setMode("agent");
    void (async () => {
      try {
        await sendMessage({
          prompt: handoff.prompt,
          mode: "agent",
          fixAction: handoff.fixAction,
          deployEnvironmentId: handoff.deployEnvironmentId,
          baseBranch: handoff.baseBranch,
        });
        const actionLabel = cloudDebugFixActionLabel(handoff.fixAction);
        toast.success(`${actionLabel} request sent to Backend Code agent.`);
      } catch (err) {
        toast.error(err?.message || "Could not send fix request.");
      }
    })();
  }, [projectId, canSend, sendMessage]);

  useEffect(() => {
    if (!projectId || !canSend || automationReportFixHandoffSentRef.current) return;
    const handoff = consumeAutomationReportBackendFixHandoff(projectId);
    if (!handoff?.prompt) return;
    automationReportFixHandoffSentRef.current = true;
    setMode("agent");
    void (async () => {
      try {
        await sendMessage({
          prompt: handoff.prompt,
          mode: "agent",
        });
        toast.success("Automation report sent to Backend Code agent.");
      } catch (err) {
        toast.error(err?.message || "Could not send fix request.");
      }
    })();
  }, [projectId, canSend, sendMessage]);

  useEffect(() => {
    if (!projectId || !canSend || serverlessFixHandoffSentRef.current) return;
    const handoff = consumeServerlessCompatibilityFixHandoff(projectId);
    if (!handoff?.prompt) return;
    serverlessFixHandoffSentRef.current = true;
    setMode("agent");
    void (async () => {
      try {
        await sendMessage({
          prompt: handoff.prompt,
          mode: "agent",
        });
        toast.success("Fix request sent to the app repository chat.");
      } catch (err) {
        toast.error(err?.message || "Could not send fix request.");
      }
    })();
  }, [projectId, canSend, sendMessage]);

  const handleSend = useCallback(
    async (text) => {
      const trimmed = (text || draft).trim();
      const attachmentIds = attach.ids;
      if ((!trimmed && !attachmentIds.length) || composerDisabled) return;
      try {
        setDraft("");
        attach.clear();
        pinChatToBottom();
        const result = await sendMessage({ prompt: trimmed, mode, attachmentIds });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        }
      } catch (err) {
        toast.error(err?.message || "Could not send message.");
      }
    },
    [composerDisabled, draft, mode, messageQueue, pinChatToBottom, sendMessage, attach],
  );

  const handleBuildPlan = useCallback(
    async (planMarkdown) => {
      if (composerDisabled && !buildingPlan) return;
      try {
        setMode("agent");
        pinChatToBottom();
        const result = await buildPlan({ planMarkdown });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        } else {
          toast.success("Building plan…");
        }
      } catch (err) {
        toast.error(err?.message || err?.error || "Could not build plan.");
      }
    },
    [buildPlan, buildingPlan, composerDisabled, messageQueue, pinChatToBottom],
  );

  const handlePlanQuestionsSubmit = useCallback(
    async (prompt) => {
      if (!prompt?.trim() || composerDisabled) return;
      try {
        setMode("plan");
        pinChatToBottom();
        const result = await sendMessage({ prompt: prompt.trim(), mode: "plan" });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        }
      } catch (err) {
        toast.error(err?.message || "Could not send answers.");
      }
    },
    [composerDisabled, messageQueue, pinChatToBottom, sendMessage],
  );

  const handleAgentQuestionsSubmit = useCallback(
    async (prompt) => {
      if (!prompt?.trim() || composerDisabled) return;
      try {
        setMode("agent");
        pinChatToBottom();
        const result = await sendMessage({ prompt: prompt.trim(), mode: "agent" });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        }
      } catch (err) {
        toast.error(err?.message || "Could not send answers.");
      }
    },
    [composerDisabled, messageQueue, pinChatToBottom, sendMessage],
  );

  const handleIncompletePlanRetry = useCallback(async () => {
    if (composerDisabled) return;
    try {
      setMode("plan");
      pinChatToBottom();
      const result = await sendMessage({
        prompt: PLAN_INCOMPLETE_RETRY_PROMPT,
        mode: "plan",
      });
      await messageQueue.reload();
      if (isQueuedChatSendResult(result)) {
        toast.success(formatQueuedSendToast(result));
      }
    } catch (err) {
      toast.error(err?.message || "Could not retry planning.");
    }
  }, [composerDisabled, messageQueue, pinChatToBottom, sendMessage]);

  const handleDismissPlan = useCallback(async () => {
    try {
      await dismissPendingPlan();
      lastOpenedPlanMarkdownRef.current = "";
      onPendingPlanCleared?.();
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not dismiss plan.");
    }
  }, [dismissPendingPlan, onPendingPlanCleared]);

  useEffect(() => {
    if (!embeddedInIde) return;
    onPlanChromeChange?.({
      building: buildingPlan,
      disabled: viewingArchived || !canSend,
      hasPendingPlan: Boolean(pendingPlan?.markdown),
      build: (planMarkdown) => void handleBuildPlan(planMarkdown),
      dismiss: () => void handleDismissPlan(),
    });
  }, [
    embeddedInIde,
    buildingPlan,
    viewingArchived,
    canSend,
    pendingPlan?.markdown,
    onPlanChromeChange,
    handleBuildPlan,
    handleDismissPlan,
  ]);

  const handleStopGeneration = useCallback(() => {
    setStopAgentConfirmOpen(true);
  }, []);

  const handleConfirmStopAgent = useCallback(async () => {
    setStopAgentConfirmOpen(false);
    try {
      await stopActiveRun();
      await messageQueue.reload();
      toast.success("Agent stopped.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not stop the agent.");
    }
  }, [messageQueue, stopActiveRun]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handlePathDrop = useCallback((path) => {
    const normalized = normalizeAgentRepoPath(path);
    const token = formatRepoPathForPrompt(normalized);
    if (!token) return;
    setDraft((prev) => {
      const current = String(prev || "");
      if (!current.trim()) return token;
      if (current.includes(token)) return current;
      const needsSpace = !/\s$/.test(current);
      return `${current}${needsSpace ? " " : ""}${token}`;
    });
  }, []);

  // One agent = one branch. Lock after the session has any turns or a live agent.
  const branchLocked = Boolean(
    session?.cursorAgentId || (Array.isArray(messages) && messages.length > 0) || viewingArchived,
  );
  const [newChatBaseBranch, setNewChatBaseBranch] = useState("");

  useEffect(() => {
    if (!newChatConfirmOpen) return;
    setNewChatBaseBranch(baseBranch || "");
  }, [newChatConfirmOpen, baseBranch]);

  const handleStartNewChat = useCallback(async () => {
    setNewChatConfirmOpen(false);
    setDraft("");
    backToCurrent();
    pinChatToBottom();
    try {
      await startNewChat({
        baseBranch: newChatBaseBranch.trim() || undefined,
      });
      lastOpenedPlanMarkdownRef.current = "";
      onPendingPlanCleared?.();
      void reloadThreads();
      onNewChatStarted?.();
      toast.success(
        hasActiveRun
          ? "Started a parallel chat on the selected branch. Your previous chat keeps running."
          : "Started a new chat. Your next message will use a new agent on this branch.",
      );
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not start a new chat.");
    }
  }, [
    startNewChat,
    backToCurrent,
    pinChatToBottom,
    reloadThreads,
    onNewChatStarted,
    onPendingPlanCleared,
    hasActiveRun,
    newChatBaseBranch,
    setNewChatConfirmOpen,
  ]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetSessionId, setDeleteTargetSessionId] = useState(null);

  const deleteTargetSession = useMemo(
    () =>
      sessions.find((s) => String(s.id) === String(deleteTargetSessionId)) ??
      (deleteTargetSessionId ? null : session),
    [sessions, deleteTargetSessionId, session],
  );

  const handleDeleteChat = useCallback(async () => {
    const targetId = deleteTargetSessionId || sessionId;
    if (!targetId) return;
    try {
      await deleteSession(targetId);
      setDeleteConfirmOpen(false);
      setDeleteTargetSessionId(null);
      setDraft("");
      backToCurrent();
      lastOpenedPlanMarkdownRef.current = "";
      onPendingPlanCleared?.();
      void reloadThreads();
      toast.success("Chat deleted.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not delete chat.");
    }
  }, [
    deleteSession,
    deleteTargetSessionId,
    sessionId,
    backToCurrent,
    onPendingPlanCleared,
    reloadThreads,
  ]);

  const showChatHistoryMenu = sessions.length > 1 || olderThreads.length > 0 || olderThreadsLoading;

  const chatHeaderActions = canSend ? (
    <>
      {!embeddedInIde ? (
        <ChatPanelFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      ) : null}
      {showChatHistoryMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={viewingArchived || archiving || deleting}
              aria-label="Chat history"
              className={chatPanelHeaderActionBtnClass}
            >
              {olderThreadsLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <History className="size-3.5 shrink-0" aria-hidden />
              )}
              <span className={chatPanelHeaderActionLabelClass}>Chat History</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={6}
            className="max-h-64 w-[min(20rem,90vw)] p-2"
          >
            {sessions.length > 0 ? (
              <>
                <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Recent chats
                </DropdownMenuLabel>
                {sessions.map((s) => {
                  const isActive = !viewingArchived && String(s.id) === String(sessionId);
                  const deleteDisabled = isActive && hasActiveRun;
                  const label = formatBackendCodeChatSessionOptionLabel(s);
                  return (
                    <div key={s.id} className="flex min-w-0 items-center gap-0.5">
                      <DropdownMenuItem
                        className="min-w-0 flex-1 cursor-pointer gap-2 py-2.5 pl-3 pr-2 text-xs leading-snug"
                        onSelect={() => {
                          backToCurrent();
                          void selectSession(s.id);
                        }}
                      >
                        <HubProfileAvatar
                          email={s.createdBy?.email}
                          name={s.createdBy?.name}
                          alt={s.createdBy?.name || s.createdBy?.email || "Chat creator"}
                          className="size-5"
                          fallbackClassName="text-[9px]"
                        />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {isActive ? (
                          <Check className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        ) : null}
                      </DropdownMenuItem>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleteDisabled || deleting}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteTargetSessionId(String(s.id));
                              setDeleteConfirmOpen(true);
                            }}
                            aria-label={`Delete chat: ${label}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[12rem] text-xs">
                          {deleteDisabled
                            ? "Stop the agent to delete this chat"
                            : "Delete this chat"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </>
            ) : null}
            {olderThreads.length > 0 ? (
              <>
                {sessions.length > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
                <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Older chats
                </DropdownMenuLabel>
                {olderThreads.map((thread) => {
                  const isActive =
                    viewingArchived &&
                    olderActiveThreadId != null &&
                    String(olderActiveThreadId) === String(thread.id);
                  return (
                    <DropdownMenuItem
                      key={thread.id}
                      className="min-w-0 cursor-pointer flex-col items-start gap-0.5 py-2.5 pl-3 pr-3 text-xs leading-snug"
                      onSelect={() => void selectThread(thread.id)}
                    >
                      <span
                        className={cn(
                          "flex w-full min-w-0 items-start gap-1.5",
                          isActive && "font-semibold",
                        )}
                      >
                        {isActive ? (
                          <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                        ) : null}
                        <span className="min-w-0 flex-1">{formatChatThreadLabel(thread)}</span>
                      </span>
                      {thread.messageCount != null ? (
                        <span className="text-[10px] text-muted-foreground">
                          {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewChatConfirmOpen(true);
            }}
            disabled={newChatDisabled}
            className={chatPanelHeaderActionBtnClass}
            aria-label="Start a new chat"
          >
            {archiving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MessageSquarePlus className="size-3.5" aria-hidden />
            )}
            <span className={chatPanelHeaderActionLabelClass}>New Chat</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
          Start a new agent on a branch — one agent stays on one branch
        </TooltipContent>
      </Tooltip>
    </>
  ) : null;

  const newChatDialog = (
    <Dialog
      open={newChatConfirmOpen}
      onOpenChange={(open) => {
        if (archiving) return;
        setNewChatConfirmOpen(open);
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new chat?</DialogTitle>
          <DialogDescription className="space-y-2 pt-1 text-left">
            <span className="block">
              Opens a new agent on the branch you choose. One agent stays on one branch — pick a
              different branch here to switch.
            </span>
            <span className="block">
              Any chat that is still running keeps going. Code already committed is not reverted.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <label
            htmlFor="backend-code-new-chat-base-branch"
            className="text-sm font-medium text-foreground"
          >
            Base branch
          </label>
          <input
            id="backend-code-new-chat-base-branch"
            type="text"
            value={newChatBaseBranch}
            onChange={(e) => setNewChatBaseBranch(e.target.value)}
            placeholder="main (project default)"
            disabled={archiving}
            className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={archiving}
            onClick={() => setNewChatConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={archiving}
            className="gap-2 font-semibold text-white"
            onClick={() => void handleStartNewChat()}
          >
            {archiving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Start new chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const deleteChatDialog = (
    <Dialog
      open={deleteConfirmOpen}
      onOpenChange={(open) => {
        if (deleting) return;
        setDeleteConfirmOpen(open);
        if (!open) setDeleteTargetSessionId(null);
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this chat?</DialogTitle>
          <DialogDescription className="pt-1 text-left">
            {deleteTargetSession?.title
              ? `"${deleteTargetSession.title}" `
              : deleteTargetSession
                ? `${formatBackendCodeChatSessionOptionLabel(deleteTargetSession)} `
                : "This chat "}
            and its messages will be permanently removed. Code already committed is not reverted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            className="gap-2 font-semibold"
            onClick={() => void handleDeleteChat()}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Delete chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const stopAgentDialog = (
    <StopAgentConfirmDialog
      open={stopAgentConfirmOpen}
      onOpenChange={setStopAgentConfirmOpen}
      onConfirm={handleConfirmStopAgent}
      confirming={stopping}
      title="Stop app repositories agent?"
    />
  );

  if (!canSend) {
    return (
      <Card
        className={cn(
          "overflow-hidden border-border shadow-none",
          embeddedInIde && "h-full w-full rounded-none border-0",
        )}
      >
        <ChatPanelHeader
          icon={MessageSquare}
          title="App repositories chat"
          layout={embeddedInIde ? "stack" : "row"}
        />
        <CardContent className="px-4 py-8 text-center">
          <span className="text-sm text-muted-foreground">
            {disabledHint || "Connect a development repository to chat with the backend agent."}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatPanelShell
      isFullscreen={effectiveFullscreen}
      fullscreenLayout={effectiveFullscreen ? "page" : "modal"}
      className={
        embeddedInIde
          ? "h-full w-full max-h-none min-h-0 rounded-none border-0 shadow-none"
          : "flex h-full min-h-0 max-h-full flex-1 flex-col !min-h-0 !max-h-none shadow-none"
      }
      dialog={
        <>
          {newChatDialog}
          {deleteChatDialog}
          {stopAgentDialog}
        </>
      }
    >
      <ChatPanelHeader
        icon={MessageSquare}
        title="App repositories chat"
        description={
          embeddedInIde
            ? "Plan, Ask, or Agent — files on the left are read-only."
            : "Plan mode drafts a reviewable plan; Build implements it. Agent edits the repo; Ask replies without editing."
        }
        actions={chatHeaderActions}
        isFullscreen={effectiveFullscreen}
        compact={!embeddedInIde}
        layout={embeddedInIde ? "stack" : "responsive"}
      />

      <div className={chatPanelBodyClass}>
        {viewingArchived ? (
          <ViewingOlderChatBanner
            onBackToCurrent={backToCurrent}
            loading={olderMessagesLoading}
            threadLabel={activeOlderChatThreadLabel}
            error={!olderMessagesLoading ? olderChatError : ""}
          />
        ) : null}

        <ChatPanelMessageArea
          scrollRef={scrollRef}
          onScroll={onChatScroll}
          isFullscreen={effectiveFullscreen}
          fullscreenLayout={effectiveFullscreen ? "page" : "modal"}
          loading={
            ((loading || archiving || olderMessagesLoading) && pairs.length === 0) ||
            ((sending || buildingPlan) && pairs.length === 0)
          }
          loadingLabel={
            archiving
              ? "Starting new chat…"
              : buildingPlan
                ? "Starting build…"
                : sending
                  ? "Sending your message…"
                  : ""
          }
        >
          {showEmpty ? (
            <ChatPanelEmptyState
              title="Update backend via chat"
              description="Use Plan to clarify and review a plan (then Build), Agent to implement directly, or Ask for guidance only."
              prompts={SUGGESTED_PROMPTS}
              onSelectPrompt={(prompt) => void handleSend(prompt)}
              composerDisabled={composerDisabled}
              isFullscreen={effectiveFullscreen}
            />
          ) : viewingArchived && !olderMessagesLoading && pairs.length === 0 && !olderChatError ? (
            <p className="px-4 text-sm text-muted-foreground">
              No messages found for this older chat.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-5 p-0">
              {pairs.map((pair, idx) => (
                <li key={pair.user?.id ?? pair.assistant?.id ?? idx} className="space-y-4">
                  {pair.user ? (
                    <ChatBubble message={pair.user} isUser isFullscreen={effectiveFullscreen} />
                  ) : null}
                  {pair.assistant ? (
                    <ChatBubble
                      message={pair.assistant}
                      isUser={false}
                      isFullscreen={effectiveFullscreen}
                      progressLabel={
                        pair.assistant.id === activeAssistantId
                          ? resolveBackendCodeChatTurnLabel(liveStatus, pair.assistant)
                          : ""
                      }
                      modelLabel={pair.assistant.id === activeAssistantId ? activeModelLabel : ""}
                      elapsed={pair.assistant.id === activeAssistantId ? turnElapsed : ""}
                      turnDurationMs={completedTurnDurations[pair.assistant.id] ?? null}
                      onOpenPath={embeddedInIde ? onOpenPath : undefined}
                      planMarkdown={
                        pair.assistant.status === "pending" ||
                        pair.assistant.status === "generating"
                          ? null
                          : extractLaunchpadPlanFenceFromReply(
                              pair.assistant.reply ?? pair.assistant.content,
                            )
                      }
                      planActions={(() => {
                        if (viewingArchived || embeddedInIde || !pendingPlan?.markdown) return null;
                        const planFromReply = extractLaunchpadPlanFenceFromReply(
                          pair.assistant.reply ?? pair.assistant.content,
                        );
                        if (!planFromReply?.trim()) return null;
                        const assistantId = pair.assistant.id;
                        const matchesPending =
                          pendingPlan.sourceMessageId && assistantId
                            ? pendingPlan.sourceMessageId === assistantId
                            : idx === pairs.length - 1;
                        if (!matchesPending) return null;
                        return {
                          building: buildingPlan,
                          disabled: viewingArchived || !canSend,
                          onBuild: (md) => void handleBuildPlan(md),
                          onDismiss: () => void handleDismissPlan(),
                        };
                      })()}
                      {...(() => {
                        if (
                          pair.assistant.status === "pending" ||
                          pair.assistant.status === "generating"
                        ) {
                          return {};
                        }
                        const raw = String(pair.assistant.reply ?? pair.assistant.content ?? "");
                        const assistantId = pair.assistant.id;
                        const questionsInReply = extractLaunchpadQuestionsFence(raw);
                        const isActivePlanQ =
                          String(activePlanQuestions?.messageId ?? "") ===
                            String(assistantId ?? "") && activePlanQuestions?.questions?.length;
                        const isActiveAgentQ =
                          String(activeAgentQuestions?.messageId ?? "") ===
                            String(assistantId ?? "") && activeAgentQuestions?.questions?.length;
                        if (isActivePlanQ) {
                          return {
                            clarifyingQuestions: activePlanQuestions.questions,
                            questionsInteractive: {
                              continueMode: "plan",
                              sending,
                              disabled: viewingArchived || !canSend || hasActiveRun,
                              onSubmit: (prompt) => void handlePlanQuestionsSubmit(prompt),
                            },
                          };
                        }
                        if (isActiveAgentQ) {
                          return {
                            clarifyingQuestions: activeAgentQuestions.questions,
                            questionsInteractive: {
                              continueMode: "implement",
                              sending,
                              disabled: viewingArchived || !canSend || hasActiveRun,
                              onSubmit: (prompt) => void handleAgentQuestionsSubmit(prompt),
                            },
                          };
                        }
                        if (extractLaunchpadPlanFenceFromReply(raw)) return {};
                        if (!questionsInReply?.length) return {};
                        const stripped = stripLaunchpadQuestionsFromReply(raw);
                        return {
                          displayTextOverride: stripped,
                          skipCollapse: stripped.length < 480,
                        };
                      })()}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ChatPanelMessageArea>

        {!viewingArchived ? (
          <ChatPanelComposer
            mode={mode}
            onModeChange={setMode}
            draft={draft}
            onDraftChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onSend={() => void handleSend()}
            onStop={hasActiveRun ? handleStopGeneration : undefined}
            stopping={stopping}
            composerDisabled={composerDisabled}
            sending={sending || buildingPlan}
            sendingBadgeLabel={buildingPlan ? "Starting build…" : "Sending…"}
            hasActiveRun={hasActiveRun}
            runningBadgeLabel={runningBadgeLabel}
            showPlanMode
            placeholderAsk="Ask about the backend architecture or APIs…"
            placeholderAgent="Describe the backend change you want implemented…"
            placeholderPlan="Describe what to build — I'll ask questions if needed, then propose a plan."
            composerPlaceholderOverride={
              hasActiveRun ? "Queue a follow-up while the agent works…" : null
            }
            isFullscreen={effectiveFullscreen}
            fullscreenLayout={effectiveFullscreen ? "page" : "modal"}
            onPathDrop={embeddedInIde ? handlePathDrop : undefined}
            attachEnabled
            attachItems={attach.items}
            attachUploading={attach.uploading}
            onAttachFiles={(files) => void attach.addFiles(files)}
            onRemoveAttach={attach.remove}
            composerFooter="Ask for frontend, backend, or code changes here — just like chatting with Cursor on your computer."
            toolbarExtra={
              !viewingArchived ? (
                branchLocked ? (
                  <BackendCodeBaseBranchToolbarChip branchName={baseBranch} locked />
                ) : (
                  <div
                    className={cn(
                      "inline-flex h-7 max-w-[min(100%,14rem)] items-center gap-1 border border-border/80 bg-muted/30 px-2 shadow-none max-[480px]:max-w-full",
                      PLATFORM_PROMPT_BOX_RADIUS,
                    )}
                  >
                    <GitBranch className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                    <label
                      htmlFor="backend-code-base-branch"
                      className="shrink-0 text-[10px] font-normal leading-none text-muted-foreground"
                    >
                      Base branch
                    </label>
                    <input
                      id="backend-code-base-branch"
                      type="text"
                      value={baseBranch}
                      onChange={(e) => setBaseBranch(e.target.value)}
                      placeholder="main"
                      disabled={composerDisabled}
                      aria-label="Base branch name"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-5 w-[3.25rem] min-w-0 max-w-[5.5rem] shrink border-0 bg-transparent p-0 font-mono text-[10px] font-normal leading-none text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
                    />
                  </div>
                )
              ) : null
            }
            beforeComposer={
              <>
                <ChatMessageQueuePanel
                  items={messageQueue.items}
                  loading={messageQueue.loading}
                  mutating={messageQueue.mutating}
                  onMoveUp={messageQueue.moveUp}
                  onMoveDown={messageQueue.moveDown}
                  onCancel={messageQueue.cancelItem}
                  onSteer={messageQueue.steerItem}
                />
                {embeddedInIde && pendingPlan?.markdown ? (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
                    <p className="min-w-0 truncate text-xs text-foreground">
                      Plan ready — open <span className="font-medium">plan.md</span>
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onFocusPlan?.()}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        disabled={buildingPlan || viewingArchived || !canSend}
                        onClick={() => void handleBuildPlan(pendingPlan.markdown)}
                      >
                        {buildingPlan ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                        ) : null}
                        Build
                      </Button>
                    </div>
                  </div>
                ) : incompletePlanTurn ? (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
                    <p className="min-w-0 text-xs text-muted-foreground">
                      Plan incomplete — no reviewable plan was returned.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      disabled={sending || viewingArchived || !canSend || hasActiveRun}
                      onClick={() => void handleIncompletePlanRetry()}
                    >
                      {sending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
                      Retry
                    </Button>
                  </div>
                ) : null}
              </>
            }
          />
        ) : null}
      </div>
    </ChatPanelShell>
  );
}
