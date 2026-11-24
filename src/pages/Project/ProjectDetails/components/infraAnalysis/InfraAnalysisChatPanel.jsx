import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import {
  extractLaunchpadQuestionsFence,
  findActiveLaunchpadQuestions,
  stripLaunchpadQuestionsFromReply,
} from "@/lib/launchpadQuestions.util.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanelComposer } from "@/components/chat/ChatPanelComposer";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { uploadChatAttachment } from "@/api";
import { ChatPanelEmptyState } from "@/components/chat/ChatPanelEmptyState";
import { ChatPanelFullscreenButton } from "@/components/chat/ChatPanelFullscreenButton";
import { ChatPanelHeader } from "@/components/chat/ChatPanelHeader";
import { ChatPanelMessageArea } from "@/components/chat/ChatPanelMessageArea";
import { ChatPanelShell } from "@/components/chat/ChatPanelShell";
import {
  chatPanelBodyClass,
  chatPanelHeaderActionBtnClass,
  chatPanelHeaderActionLabelClass,
  chatUserBubbleTextClass,
} from "@/components/chat/chatPanelLayout.constants";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import {
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_NEUTRAL_TOGGLE_CLASS,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { ChatMessageHoverMeta } from "@/components/chat/ChatMessageHoverMeta";
import { AI_HOME_USER_BUBBLE } from "@/pages/AiHome/aiHomeClasses";
import { ViewingOlderChatBanner } from "@/components/chat/ViewingOlderChatBanner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatChatThreadLabel } from "@/lib/formatChatThreadLabel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOlderChatThreads } from "@/hooks/useOlderChatThreads";
import { usePanelFullscreen } from "@/hooks/usePanelFullscreen";
import { agentStreamTimelineHasContent } from "@/pages/ClientLink/chat/clientLinkStreamTimeline.util";
import { cn } from "@/lib/utils";
import { Check, Cloud, History, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import {
  fetchInfraAnalysisChatArchivedThreadMessages,
  fetchInfraAnalysisChatArchivedThreads,
  cancelInfraAnalysisChatQueueMessage,
  steerInfraAnalysisChatQueueMessage,
  fetchInfraAnalysisChatQueue,
  reorderInfraAnalysisChatQueue,
} from "@/api";
import { ChatMessageQueuePanel } from "@/components/chat/ChatMessageQueuePanel";
import { formatQueuedSendToast, isQueuedChatSendResult } from "@/lib/chatMessageQueue.util";
import { StopAgentConfirmDialog } from "@/components/agent/StopAgentConfirmDialog";
import { useChatMessageQueue } from "@/hooks/useChatMessageQueue";
import { useInfraAnalysisChat } from "../../hooks/useInfraAnalysisChat";
import {
  pairInfraAnalysisChatMessages,
  isInfraAnalysisAgentRunning,
} from "../../chat/infraAnalysisChat.util";
import { InfraAnalysisChangeConfirmation } from "../InfraAnalysisChangeConfirmation";
import { consumeInfraAnalysisFixHandoff } from "@/utils/infraAnalysisFixHandoff.util";

const SUGGESTED_PROMPTS = [
  "Explain the biggest reliability risk in our current architecture",
  "Add a CloudFront CDN node for the frontend tier",
  "What IaC changes would improve our RTO/RPO score?",
];

function ChatBubble({
  message,
  isUser,
  isFullscreen = false,
  clarifyingQuestions = null,
  questionsInteractive = null,
}) {
  const rawText = isUser
    ? String(message?.content ?? "").trim()
    : String(message?.reply ?? message?.content ?? "").trim();
  const showClarifyingQuestions =
    !isUser &&
    questionsInteractive &&
    Array.isArray(clarifyingQuestions) &&
    clarifyingQuestions.length > 0;
  const text =
    !isUser && !showClarifyingQuestions && extractLaunchpadQuestionsFence(rawText)?.length
      ? stripLaunchpadQuestionsFromReply(rawText) || rawText
      : rawText;
  const isFailed = !isUser && message?.status === "failed";
  const isRunning =
    !isUser &&
    (message?.status === "pending" ||
      message?.status === "generating" ||
      message?.status === "previewing");
  const streamText = typeof message?.streamText === "string" ? message.streamText : "";
  const streamTimeline = Array.isArray(message?.streamTimeline) ? message.streamTimeline : [];
  const hasLiveTimeline =
    isRunning && (streamText.trim() || agentStreamTimelineHasContent(streamTimeline));

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
          showClarifyingQuestions && "max-w-full w-full",
          isFailed && "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2",
        )}
      >
        {isRunning ? (
          hasLiveTimeline ? (
            <AgentLiveTimeline
              timeline={streamTimeline}
              streamText={streamText}
              isActive
              assistantVariant="plain"
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
          </div>
        ) : (
          <div className="min-w-0 leading-relaxed">
            <AssistantMarkdown text={text || "(no reply)"} collapsible />
          </div>
        )}
        {!isRunning ? (
          <ChatMessageHoverMeta createdAt={message?.createdAt} text={text} align="start" />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Inline chat for infra analysis follow-ups via Cursor agent (Cloud Infra tab).
 */
export function InfraAnalysisChatPanel({
  projectId,
  project,
  canSend,
  disabledHint,
  onAnalysisUpdated,
}) {
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("agent");
  const attach = useChatAttachments({
    upload: (file) => uploadChatAttachment(file, { channel: "infra_analysis", scopeId: projectId }),
  });
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [stopAgentConfirmOpen, setStopAgentConfirmOpen] = useState(false);
  const { isFullscreen, toggleFullscreen } = usePanelFullscreen();
  const scrollRef = useRef(null);
  const fixHandoffSentRef = useRef(false);

  const {
    messages,
    loading,
    sending,
    stopping,
    confirming,
    archiving,
    error,
    hasActiveRun,
    pendingConfirmation,
    sendMessage,
    stopActiveRun,
    confirmChange,
    rejectChange,
    startNewChat,
    reload,
  } = useInfraAnalysisChat(projectId, { onAnalysisUpdated });

  const hasRunningAgent = useMemo(() => messages.some(isInfraAnalysisAgentRunning), [messages]);

  const {
    threads: olderThreads,
    threadsLoading: olderThreadsLoading,
    messagesLoading: olderMessagesLoading,
    viewingArchived,
    activeThreadId: olderActiveThreadId,
    archivedMessages,
    reloadThreads,
    selectThread,
    backToCurrent,
  } = useOlderChatThreads({
    enabled: Boolean(projectId) && canSend,
    fetchThreads: useCallback(() => fetchInfraAnalysisChatArchivedThreads(projectId), [projectId]),
    fetchThreadMessages: useCallback(
      (threadId) => fetchInfraAnalysisChatArchivedThreadMessages(projectId, threadId),
      [projectId],
    ),
  });

  const messageQueue = useChatMessageQueue({
    enabled: Boolean(projectId) && canSend && !viewingArchived,
    loadQueue: useCallback(() => fetchInfraAnalysisChatQueue(projectId), [projectId]),
    reorderQueue: useCallback(
      (orderedMessageIds) => reorderInfraAnalysisChatQueue(projectId, orderedMessageIds),
      [projectId],
    ),
    cancelQueueItem: useCallback(
      (messageId) => cancelInfraAnalysisChatQueueMessage(projectId, messageId),
      [projectId],
    ),
    steerQueueItem: useCallback(
      (messageId) => steerInfraAnalysisChatQueueMessage(projectId, messageId),
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
  const pairs = pairInfraAnalysisChatMessages(displayMessages);
  const composerDisabled = !canSend || sending || Boolean(pendingConfirmation) || viewingArchived;
  const activeLaunchpadQuestions = useMemo(
    () =>
      viewingArchived || hasActiveRun || pendingConfirmation
        ? null
        : findActiveLaunchpadQuestions(displayMessages),
    [viewingArchived, hasActiveRun, pendingConfirmation, displayMessages],
  );
  const newChatDisabled =
    !canSend || sending || archiving || viewingArchived || Boolean(pendingConfirmation);
  const showEmpty = pairs.length === 0 && !loading && !olderMessagesLoading && !sending;

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

  useEffect(() => {
    if (!projectId || !canSend || fixHandoffSentRef.current) return;
    const handoff = consumeInfraAnalysisFixHandoff(projectId);
    if (!handoff?.prompt) return;
    fixHandoffSentRef.current = true;
    setMode("agent");
    void (async () => {
      try {
        const result = await sendMessage({ prompt: handoff.prompt, mode: "agent" });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        } else {
          toast.success("Fix request sent to infra chat.");
        }
      } catch (err) {
        toast.error(err?.message || "Could not send fix request.");
      }
    })();
  }, [projectId, canSend, sendMessage, messageQueue.reload]);

  const handleSend = useCallback(
    async (text) => {
      const trimmed = (text || draft).trim();
      const attachmentIds = attach.ids;
      if ((!trimmed && !attachmentIds.length) || composerDisabled) return;
      try {
        setDraft("");
        attach.clear();
        const result = await sendMessage({ prompt: trimmed, mode, attachmentIds });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        }
      } catch (err) {
        toast.error(err?.message || "Could not send message.");
      }
    },
    [composerDisabled, draft, mode, messageQueue, sendMessage, attach],
  );

  const handleLaunchpadQuestionsSubmit = useCallback(
    async (prompt) => {
      if (!prompt?.trim() || composerDisabled) return;
      try {
        const result = await sendMessage({
          prompt: prompt.trim(),
          mode: mode === "ask" ? "ask" : "agent",
        });
        await messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
        }
      } catch (err) {
        toast.error(err?.message || "Could not send answers.");
      }
    },
    [composerDisabled, mode, messageQueue, sendMessage],
  );

  const handleStopGeneration = useCallback(() => {
    setStopAgentConfirmOpen(true);
  }, []);

  const handleConfirmStopAgent = useCallback(async () => {
    setStopAgentConfirmOpen(false);
    try {
      await stopActiveRun();
      await messageQueue.reload();
      onAnalysisUpdated?.();
      toast.success("Agent stopped.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not stop the agent.");
    }
  }, [messageQueue, onAnalysisUpdated, stopActiveRun]);

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
      toast.success("Started a new chat. Your next message will use a new agent.");
    } catch (err) {
      toast.error(err?.message || err?.error || "Could not start a new chat.");
    }
  }, [startNewChat, backToCurrent, reloadThreads]);

  const showChatHistoryMenu = olderThreads.length > 0 || olderThreadsLoading || viewingArchived;

  const chatHeaderActions = canSend ? (
    <>
      <ChatPanelFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
      {showChatHistoryMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={archiving || (olderThreadsLoading && olderThreads.length === 0)}
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
            {!viewingArchived ? (
              <>
                <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Current chat
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="min-w-0 cursor-default gap-2 py-2.5 pl-3 pr-3 text-xs leading-snug"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="min-w-0 flex-1 truncate">Active conversation</span>
                  <Check className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </DropdownMenuItem>
                {olderThreads.length > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
              </>
            ) : null}
            {olderThreads.length > 0 ? (
              <>
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
                      onSelect={() => {
                        if (isActive) return;
                        void selectThread(thread.id);
                      }}
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
            {viewingArchived ? (
              <>
                {olderThreads.length > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 pl-3 pr-3 text-xs"
                  onSelect={() => backToCurrent()}
                >
                  Back to current chat
                </DropdownMenuItem>
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
            onClick={() => setNewChatConfirmOpen(true)}
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
          Start a new chat — current messages will be hidden and your next message uses a new agent
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
              Your current chat history will be hidden and a fresh agent will start with your next
              message.
            </span>
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

  const stopAgentDialog = (
    <StopAgentConfirmDialog
      open={stopAgentConfirmOpen}
      onOpenChange={setStopAgentConfirmOpen}
      onConfirm={handleConfirmStopAgent}
      confirming={stopping}
      title="Stop infra analysis agent?"
    />
  );

  if (!canSend) {
    return (
      <Card className="overflow-hidden border-border shadow-none">
        <ChatPanelHeader icon={Cloud} title="Infra analysis chat" />
        <CardContent className="px-4 py-8 text-center">
          <span className="text-sm text-muted-foreground">
            {disabledHint || "Connect a development repository to chat about infrastructure."}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatPanelShell
      isFullscreen={isFullscreen}
      fullscreenLayout={isFullscreen ? "page" : "modal"}
      className="flex h-full min-h-0 max-h-full flex-1 flex-col !min-h-0 !max-h-none shadow-none"
      dialog={
        <>
          {newChatDialog}
          {stopAgentDialog}
        </>
      }
    >
      <ChatPanelHeader
        icon={Cloud}
        title="Infra analysis chat"
        description="Agent mode previews diagram changes before you confirm. Ask mode replies without editing files."
        actions={chatHeaderActions}
        isFullscreen={isFullscreen}
        compact
        layout="responsive"
      />

      <div className={chatPanelBodyClass}>
        {viewingArchived ? <ViewingOlderChatBanner onBackToCurrent={backToCurrent} /> : null}

        <ChatPanelMessageArea
          scrollRef={scrollRef}
          isFullscreen={isFullscreen}
          fullscreenLayout={isFullscreen ? "page" : "modal"}
          loading={
            ((loading || olderMessagesLoading) && pairs.length === 0) ||
            (sending && pairs.length === 0)
          }
          loadingLabel={sending ? "Sending your message…" : ""}
        >
          {showEmpty ? (
            <ChatPanelEmptyState
              title="Chat about infrastructure"
              description="Ask questions or request diagram and suggestion updates. Agent mode previews changes first; Ask mode replies without editing files."
              prompts={SUGGESTED_PROMPTS}
              onSelectPrompt={(prompt) => void handleSend(prompt)}
              composerDisabled={composerDisabled}
              isFullscreen={isFullscreen}
            />
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
                      {...(() => {
                        if (
                          pair.assistant.status === "pending" ||
                          pair.assistant.status === "generating" ||
                          pair.assistant.status === "previewing"
                        ) {
                          return {};
                        }
                        const raw = String(pair.assistant.reply ?? pair.assistant.content ?? "");
                        const assistantId = pair.assistant.id;
                        if (
                          String(activeLaunchpadQuestions?.messageId ?? "") !==
                            String(assistantId ?? "") ||
                          !activeLaunchpadQuestions?.questions?.length
                        ) {
                          return {};
                        }
                        return {
                          clarifyingQuestions: activeLaunchpadQuestions.questions,
                          questionsInteractive: {
                            continueMode: "implement",
                            sending,
                            disabled: composerDisabled || hasActiveRun,
                            onSubmit: (prompt) => void handleLaunchpadQuestionsSubmit(prompt),
                          },
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
            onStop={hasRunningAgent ? handleStopGeneration : undefined}
            stopping={stopping}
            composerDisabled={composerDisabled}
            sending={sending}
            hasActiveRun={hasActiveRun}
            placeholderAsk="Ask about architecture, suggestions, or IaC…"
            placeholderAgent="Describe the infra change you want in the diagram…"
            composerPlaceholderOverride={
              hasActiveRun ? "Queue a follow-up while the agent works…" : null
            }
            isFullscreen={isFullscreen}
            fullscreenLayout={isFullscreen ? "page" : "modal"}
            attachEnabled
            attachItems={attach.items}
            attachUploading={attach.uploading}
            onAttachFiles={(files) => void attach.addFiles(files)}
            onRemoveAttach={attach.remove}
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
                {pendingConfirmation ? (
                  <div className="mb-3">
                    <InfraAnalysisChangeConfirmation
                      pendingMessage={pendingConfirmation}
                      backendLockAgentMode={project?.backendLockAgentMode}
                      confirming={confirming}
                      onConfirm={(id) => void confirmChange(id)}
                      onReject={(id) => void rejectChange(id)}
                    />
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
