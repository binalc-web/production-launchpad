import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  archiveCloudDebugChat,
  cancelCloudDebugChatQueueMessage,
  steerCloudDebugChatQueueMessage,
  fetchCloudDebugChatArchivedThreadMessages,
  fetchCloudDebugChatArchivedThreads,
  fetchCloudDebugChatQueue,
  reorderCloudDebugChatQueue,
} from "@/api";
import { ChatMessageQueuePanel } from "@/components/chat/ChatMessageQueuePanel";
import { formatQueuedSendToast, isQueuedChatSendResult } from "@/lib/chatMessageQueue.util";
import { ChatPanelEmptyState } from "@/components/chat/ChatPanelEmptyState";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import { PlatformPromptBox } from "@/components/chat/PlatformPromptBox";
import { PlatformPromptSendButton } from "@/components/chat/PlatformPromptSendButton";
import {
  PLATFORM_PROMPT_BOX_OUTER_PANEL,
  PLATFORM_PROMPT_BOX_OUTER_PANEL_FULLSCREEN,
  PLATFORM_PROMPT_BOX_TEXTAREA_COMPACT,
  PLATFORM_PROMPT_BOX_TEXTAREA_FULLSCREEN,
  PLATFORM_PROMPT_BOX_TOOL_BTN,
} from "@/components/chat/platformPromptBox.classes";
import { chatComposerCanSend } from "@/lib/chatAttachments";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { uploadChatAttachment } from "@/api";
import { ChatPanelFullscreenButton } from "@/components/chat/ChatPanelFullscreenButton";
import { ChatPanelHeader } from "@/components/chat/ChatPanelHeader";
import { ChatPanelMessageArea } from "@/components/chat/ChatPanelMessageArea";
import { ChatPanelShell } from "@/components/chat/ChatPanelShell";
import {
  chatPanelBodyClass,
  chatUserBubbleTextClass,
} from "@/components/chat/chatPanelLayout.constants";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import { AgentResultBadge } from "@/components/chat/AgentResultBadge";
import { AgentWorkingStatusRow } from "@/components/chat/AgentWorkingStatusRow";
import {
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_PRIMARY_TOGGLE_CLASS,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { ChatBubbleInlineCopy } from "@/components/chat/ChatMessageCopyButton";
import { ChatUserPromptMeta } from "@/components/chat/ChatUserPromptMeta";
import { OlderChatThreadsMenu } from "@/components/chat/OlderChatThreadsMenu";
import { ViewingOlderChatBanner } from "@/components/chat/ViewingOlderChatBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentTurnElapsed } from "@/hooks/useAgentTurnElapsed";
import { useChatMessageQueue } from "@/hooks/useChatMessageQueue";
import { useOlderChatThreads } from "@/hooks/useOlderChatThreads";
import { formatChatThreadLabel } from "@/lib/formatChatThreadLabel";
import { usePanelFullscreen } from "@/hooks/usePanelFullscreen";
import { buildAgentProgressStatusLine } from "@/lib/clientLinkAgentTurnTimer";
import { getCursorModelLabel } from "@/constants/cursorModelCatalog";
import { agentStreamTimelineHasContent } from "@/pages/ClientLink/chat/clientLinkStreamTimeline.util";
import { cn } from "@/lib/utils";
import { Bug, ChevronDown, CornerDownLeft, Loader2, MessageSquarePlus, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  CLOUD_DEBUG_FIX_ACTION,
  CLOUD_DEBUG_FIX_ACTION_OPTIONS,
} from "@/utils/cloudDebugFixHandoff.util";
import { useCloudDebugChat } from "../hooks/useCloudDebugChat";
import {
  pairCloudDebugChatMessages,
  resolveCloudDebugChatTurnLabel,
} from "../chat/cloudDebugChat.util";

const SUGGESTED_PROMPTS = [
  "API returns 502 after deploy — what should I check?",
  "CloudFormation stack is UPDATE_FAILED — help me find the cause",
  "Where are error logs for the backend service?",
];

const RECENT_ISSUE_CHIPS = [
  { id: "5xx", label: "5xx", hint: "API returns 5xx" },
  { id: "deploy", label: "Deploy failed", hint: "deploy failed" },
  { id: "timeouts", label: "Timeouts", hint: "timeouts" },
  { id: "auth", label: "Auth", hint: "auth or login errors" },
];

const RECENT_ISSUE_WINDOWS = [
  { id: "1", label: "1h" },
  { id: "6", label: "6h" },
  { id: "24", label: "24h" },
];

function buildRecentIssuesPrompt(hours, hint) {
  const trimmed = String(hint ?? "").trim();
  if (!trimmed) {
    return `Debug recent issues in the last ${hours} hours. Scan the environment and report the top errors.`;
  }
  return `Debug recent issues in the last ${hours} hours. Hint: ${trimmed}`;
}

function ChatBubble({
  message,
  isUser,
  progressLabel = "",
  modelLabel = "",
  elapsed = "",
  turnDurationMs = null,
  isFullscreen = false,
  onFixNow = null,
  fixNowDisabled = false,
  deployEnvironmentId = "",
}) {
  const text = isUser
    ? String(message?.content ?? "").trim()
    : String(message?.reply ?? message?.content ?? "").trim();
  const isFailed = !isUser && message?.status === "failed";
  const isRunning = !isUser && (message?.status === "pending" || message?.status === "generating");
  const streamText = typeof message?.streamText === "string" ? message.streamText : "";
  const streamTimeline = Array.isArray(message?.streamTimeline) ? message.streamTimeline : [];
  const hasLiveTimeline =
    isRunning && (streamText.trim() || agentStreamTimelineHasContent(streamTimeline));
  const runningStatusLine = buildAgentProgressStatusLine({
    label: progressLabel || "Cursor agent is working…",
    model: modelLabel,
    elapsed: isRunning ? elapsed : "",
  });
  const completedDurationMs =
    turnDurationMs != null && Number.isFinite(Number(turnDurationMs)) && Number(turnDurationMs) >= 1
      ? Number(turnDurationMs)
      : null;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[min(100%,42rem)] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-sm",
            isFullscreen && "max-w-[min(100%,48rem)] px-5 py-4",
          )}
        >
          <ChatExpandableContent
            collapsedMaxHeight={CHAT_USER_COLLAPSED_MAX_HEIGHT}
            toggleClassName={CHAT_USER_PRIMARY_TOGGLE_CLASS}
          >
            <p
              className={cn("whitespace-pre-wrap text-sm leading-relaxed", chatUserBubbleTextClass)}
            >
              {text}
            </p>
          </ChatExpandableContent>
          <ChatUserPromptMeta createdAt={message?.createdAt} text={text} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "w-full max-w-[min(100%,48rem)] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm",
          isFullscreen && "px-5 py-4",
        )}
      >
        {isRunning ? (
          hasLiveTimeline ? (
            <div className="space-y-2">
              <AgentWorkingStatusRow text={runningStatusLine} showLiveDot />
              <AgentLiveTimeline
                timeline={streamTimeline}
                streamText={streamText}
                isActive
                assistantVariant="plain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span>{runningStatusLine}</span>
            </div>
          )
        ) : (
          <div className="min-w-0 space-y-2 leading-relaxed">
            <AssistantMarkdown text={text || "(no reply)"} collapsible />
            {completedDurationMs != null ? (
              <AgentResultBadge
                status={isFailed ? "error" : "success"}
                durationMs={completedDurationMs}
              />
            ) : null}
          </div>
        )}
        {!isRunning && text ? <ChatBubbleInlineCopy text={text} className="mt-2" /> : null}
        {!isRunning && !isFailed && text && onFixNow ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={fixNowDisabled}
                  className="gap-1.5"
                >
                  <Wrench className="size-3.5" aria-hidden />
                  Fix now
                  <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {CLOUD_DEBUG_FIX_ACTION_OPTIONS.map((opt) => {
                  const needsEnv = opt.value === CLOUD_DEBUG_FIX_ACTION.PR_DEPLOY;
                  const optionDisabled = fixNowDisabled || (needsEnv && !deployEnvironmentId);
                  return (
                    <DropdownMenuItem
                      key={opt.value}
                      disabled={optionDisabled}
                      onClick={() => onFixNow(opt.value)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Ask-only cloud debugging chat panel.
 */
export function CloudDebugChatPanel({ projectId, environmentId, canSend, disabledHint, onFixNow }) {
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [recentHint, setRecentHint] = useState("");
  const [recentHours, setRecentHours] = useState("6");
  const attach = useChatAttachments({
    upload: (file) => uploadChatAttachment(file, { channel: "cloud_debug", scopeId: projectId }),
  });
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const { isFullscreen, toggleFullscreen } = usePanelFullscreen();

  const {
    messages,
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
  } = useCloudDebugChat(projectId, environmentId);

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
    fetchThreads: useCallback(() => fetchCloudDebugChatArchivedThreads(projectId), [projectId]),
    fetchThreadMessages: useCallback(
      (threadId) => fetchCloudDebugChatArchivedThreadMessages(projectId, threadId),
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
    loadQueue: useCallback(() => fetchCloudDebugChatQueue(projectId), [projectId]),
    reorderQueue: useCallback(
      (orderedMessageIds) => reorderCloudDebugChatQueue(projectId, orderedMessageIds),
      [projectId],
    ),
    cancelQueueItem: useCallback(
      (messageId) => cancelCloudDebugChatQueueMessage(projectId, messageId),
      [projectId],
    ),
    steerQueueItem: useCallback(
      (messageId) => steerCloudDebugChatQueueMessage(projectId, messageId),
      [projectId],
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
  const pairs = useMemo(() => pairCloudDebugChatMessages(displayMessages), [displayMessages]);
  const showEmpty = !loading && !olderMessagesLoading && pairs.length === 0 && !viewingArchived;
  const composerDisabled = !canSend || sending || viewingArchived;
  const newChatDisabled = archiving || viewingArchived;

  const fixNowDisabled =
    !canSend || sending || hasActiveRun || viewingArchived || typeof onFixNow !== "function";

  const handleFixNowForPair = useCallback(
    (pair, fixAction) => {
      if (fixNowDisabled || !pair?.assistant) return;
      if (fixAction === CLOUD_DEBUG_FIX_ACTION.PR_DEPLOY && !environmentId) {
        toast.error("Select an environment before Fix + PR + deploy.");
        return;
      }
      onFixNow?.({
        diagnosis: pair.assistant.reply ?? pair.assistant.content ?? "",
        userSymptom: pair.user?.content ?? "",
        fixAction,
        deployEnvironmentId: environmentId,
      });
    },
    [fixNowDisabled, environmentId, onFixNow],
  );

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

  const turnElapsed = useAgentTurnElapsed(turnStartedAtMs, hasActiveRun);

  const activeModelLabel = useMemo(() => {
    if (!hasActiveRun) return "";
    const phase = typeof liveStatus?.streamPhase === "string" ? liveStatus.streamPhase.trim() : "";
    if (phase === "Selecting model…" || /^selecting model/i.test(phase)) return "";
    const reply = typeof liveStatus?.aiSummary === "string" ? liveStatus.aiSummary.trim() : "";
    if (reply === "Selecting model…" || /^selecting model/i.test(reply)) return "";
    const modelId = typeof liveStatus?.model === "string" ? liveStatus.model.trim() : "";
    return modelId ? getCursorModelLabel(modelId) : "";
  }, [hasActiveRun, liveStatus]);

  const runningBadgeLabel = buildAgentProgressStatusLine({
    label:
      (typeof liveStatus?.streamPhase === "string" &&
        (liveStatus.streamPhase.trim() === "Selecting model…" ||
          /^selecting model/i.test(liveStatus.streamPhase.trim())) &&
        "Selecting model…") ||
      "Running",
    model: activeModelLabel,
    elapsed: hasActiveRun ? turnElapsed : "",
  });

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayMessages, sending, hasActiveRun, viewingArchived]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!hasActiveRun) {
      void messageQueue.reload();
    }
  }, [hasActiveRun, messageQueue.reload]);

  const handleSend = useCallback(
    async (text) => {
      const trimmed = (text || draft).trim();
      const attachmentIds = attach.ids;
      if ((!trimmed && !attachmentIds.length) || composerDisabled) return;
      try {
        setDraft("");
        attach.clear();
        const result = await sendMessage({ prompt: trimmed, attachmentIds });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        }
      } catch (err) {
        toast.error(err?.message || "Could not send message.");
      }
    },
    [composerDisabled, draft, messageQueue, sendMessage, attach],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleStartNewChat = useCallback(async () => {
    try {
      await startNewChat();
      setDraft("");
      setNewChatConfirmOpen(false);
      backToCurrent();
      await reloadThreads();
      toast.success("Started a new chat.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not start a new chat.");
    }
  }, [startNewChat, backToCurrent, reloadThreads]);

  const chatHeaderActions = canSend ? (
    <>
      <ChatPanelFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      <OlderChatThreadsMenu
        threads={olderThreads}
        loading={olderThreadsLoading}
        activeThreadId={viewingArchived ? olderActiveThreadId : null}
        onSelectThread={(threadId) => void selectThread(threadId)}
      />
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setNewChatConfirmOpen(true)}
            disabled={newChatDisabled}
            className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Start a new chat"
          >
            {archiving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MessageSquarePlus className="size-4" aria-hidden />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
          Start a new chat — prior messages are archived
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
          <DialogDescription>
            Your current chat history will be hidden and a fresh agent will start with your next
            message.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={archiving}
            onClick={() => setNewChatConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={archiving} onClick={() => void handleStartNewChat()}>
            {archiving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Start new chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!canSend) {
    return (
      <Card className="overflow-hidden border-border shadow-sm">
        <ChatPanelHeader icon={Bug} title="Cloud debugging" />
        <CardContent className="px-4 py-8 text-center">
          <span className="text-sm text-muted-foreground">{disabledHint}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatPanelShell isFullscreen={isFullscreen} dialog={newChatDialog}>
      <ChatPanelHeader
        icon={Bug}
        title="Cloud debugging"
        description="Describe what you are seeing, or scan recent AWS errors from a hint. The agent reads your repo and checks logs — read-only, no code changes."
        actions={chatHeaderActions}
        isFullscreen={isFullscreen}
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
          isFullscreen={isFullscreen}
          loading={(loading || olderMessagesLoading) && pairs.length === 0}
        >
          {showEmpty ? (
            <ChatPanelEmptyState
              title="Debug your AWS deployment"
              description="Tell us what broke or what you expected vs what you see. We investigate using your code and live AWS data."
              prompts={SUGGESTED_PROMPTS}
              onSelectPrompt={(prompt) => void handleSend(prompt)}
              composerDisabled={composerDisabled}
              isFullscreen={isFullscreen}
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
                    <ChatBubble message={pair.user} isUser isFullscreen={isFullscreen} />
                  ) : null}
                  {pair.assistant ? (
                    <ChatBubble
                      message={pair.assistant}
                      isUser={false}
                      isFullscreen={isFullscreen}
                      progressLabel={
                        pair.assistant.id === activeAssistantId
                          ? resolveCloudDebugChatTurnLabel(liveStatus, pair.assistant)
                          : ""
                      }
                      modelLabel={pair.assistant.id === activeAssistantId ? activeModelLabel : ""}
                      elapsed={pair.assistant.id === activeAssistantId ? turnElapsed : ""}
                      turnDurationMs={completedTurnDurations[pair.assistant.id] ?? null}
                      onFixNow={(fixAction) => handleFixNowForPair(pair, fixAction)}
                      fixNowDisabled={fixNowDisabled}
                      deployEnvironmentId={environmentId}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ChatPanelMessageArea>

        {!viewingArchived ? (
          <div
            className={cn(
              isFullscreen
                ? PLATFORM_PROMPT_BOX_OUTER_PANEL_FULLSCREEN
                : PLATFORM_PROMPT_BOX_OUTER_PANEL,
            )}
          >
            {hasActiveRun ? (
              <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {runningBadgeLabel}
              </p>
            ) : null}
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={recentHint}
                  onChange={(e) => setRecentHint(e.target.value)}
                  placeholder="Hint, e.g. login returns 500"
                  disabled={composerDisabled}
                  className="h-8 min-w-[12rem] flex-1 text-sm"
                  aria-label="Recent issue hint"
                />
                <div className="flex items-center gap-1" role="group" aria-label="Lookback window">
                  {RECENT_ISSUE_WINDOWS.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      size="sm"
                      variant={recentHours === option.id ? "secondary" : "outline"}
                      disabled={composerDisabled}
                      onClick={() => setRecentHours(option.id)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={composerDisabled}
                  onClick={() => void handleSend(buildRecentIssuesPrompt(recentHours, recentHint))}
                >
                  Debug recent issues
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RECENT_ISSUE_CHIPS.map((chip) => {
                  const selected = recentHint === chip.hint;
                  return (
                    <Button
                      key={chip.id}
                      type="button"
                      size="sm"
                      variant={selected ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs"
                      disabled={composerDisabled}
                      onClick={() => setRecentHint(selected ? "" : chip.hint)}
                    >
                      {chip.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <PlatformPromptBox
              staging={
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
                  <ChatAttachmentChips
                    items={attach.items}
                    onRemove={attach.remove}
                    disabled={composerDisabled}
                  />
                </>
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasActiveRun
                  ? "Queue a follow-up while the agent works…"
                  : "Describe the issue — errors, URLs, steps to reproduce…"
              }
              rows={isFullscreen ? 4 : 3}
              disabled={composerDisabled}
              onPasteFiles={attach.uploading ? null : (files) => void attach.addFiles(files)}
              textareaClassName={
                isFullscreen
                  ? PLATFORM_PROMPT_BOX_TEXTAREA_FULLSCREEN
                  : PLATFORM_PROMPT_BOX_TEXTAREA_COMPACT
              }
              toolbarLeft={
                <ChatAttachControl
                  disabled={composerDisabled}
                  uploading={attach.uploading}
                  onFiles={(files) => void attach.addFiles(files)}
                  buttonClassName={PLATFORM_PROMPT_BOX_TOOL_BTN}
                />
              }
              toolbarRight={
                <PlatformPromptSendButton
                  onSend={() => void handleSend()}
                  disabled={composerDisabled || sending}
                  sendDisabled={
                    !chatComposerCanSend({
                      draft,
                      disabled: composerDisabled,
                      attachEnabled: true,
                      attachmentCount: attach.ids.length,
                      uploading: attach.uploading,
                    })
                  }
                />
              }
              footer={
                <p
                  className={cn(
                    "mt-2 flex items-center gap-1 text-muted-foreground",
                    isFullscreen ? "text-xs" : "text-[11px]",
                  )}
                >
                  <CornerDownLeft className="size-3" aria-hidden />
                  Enter to send · Shift + Enter for newline
                </p>
              }
            />
          </div>
        ) : null}
      </div>
    </ChatPanelShell>
  );
}
