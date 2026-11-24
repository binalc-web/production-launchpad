import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  clientLinkArchiveChatHistory,
  clientLinkBuildPlan,
  clientLinkClearPendingPlan,
  clientLinkFetchAgentStatus,
  clientLinkFetchArchivedThreadMessages,
  clientLinkFetchArchivedThreads,
  clientLinkFetchJiraTickets,
  clientLinkFetchExecutionSummary,
  clientLinkRevertMerge,
  cancelClientLinkChatQueueMessage,
  steerClientLinkChatQueueMessage,
  clientLinkRecoveryFollowup,
  clientLinkSendFollowup,
  clientLinkStopGeneration,
  fetchClientLinkChatQueue,
  reorderClientLinkChatQueue,
} from "@/api";
import { BackendCodePlanDocument } from "@/pages/Project/ProjectDetails/components/BackendCodePlanDocument";
import { ChatMessageQueuePanel } from "@/components/chat/ChatMessageQueuePanel";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import {
  extractLaunchpadQuestionsFence,
  findActiveLaunchpadQuestions,
  stripLaunchpadQuestionsFromReply,
} from "@/lib/launchpadQuestions.util.js";
import { useChatMessageQueue } from "@/hooks/useChatMessageQueue";
import { watchClientLinkDispatchPhase } from "../chat/watchClientLinkDispatchPhase";
import { useClientLinkVoiceAgent } from "@/hooks/useClientLinkVoiceAgent";
import { ClientLinkVoicePanel } from "./ClientLinkVoicePanel";
import { ClientLinkTurnActivity } from "./ClientLinkTurnActivity";
import { PreviewDesktopControlBanner } from "./PreviewDesktopControlBanner";
import { useAgentTurnElapsed } from "@/hooks/useAgentTurnElapsed";
import {
  formatQueuedSendToast,
  isQueuedChatSendResult,
  shouldRefreshTranscriptForQueueChange,
} from "@/lib/chatMessageQueue.util";
import { buildAgentProgressStatusLine } from "@/lib/clientLinkAgentTurnTimer";
import { readPreviewRefreshMode } from "@/lib/clientLinkPostTurnPreview.util";
import { getCursorModelLabel } from "@/constants/cursorModelCatalog";
import {
  findLastClientLinkUserMessageIndex,
  mapClientLinkChatRows,
  recoveryEligibilityFromMessageRows,
  splitClientLinkPersistedAgentOutputText,
} from "@/pages/ClientLink/chat/clientLinkChatMessages.util";
import { useClientLinkChatSession } from "@/pages/ClientLink/chatSession/useClientLinkChatSession";
import {
  TURN_PHASE,
  isTurnInFlight,
  selectActivityForKey,
  selectActivityForMessage,
  selectScratchRunStartedAt,
  selectTurnActivityView,
  selectTurnStatusLabel,
} from "@/pages/ClientLink/chatSession/clientLinkChatSession.util";
import {
  SCRATCH_ROW_FALLBACK_TEXT,
  resolveActivityDurationMs,
  shouldShowScratchRow,
} from "@/pages/ClientLink/chat/clientLinkTurnActivity.util";
import {
  isChatNearBottom,
  scrollChatToBottom,
} from "@/pages/ClientLink/chat/clientLinkChatScroll.util";
import { CLIENT_LINK_PREVIEW_RECOVERY } from "../clientLinkPreviewRecovery.constants";
import { StopAgentConfirmDialog } from "@/components/agent/StopAgentConfirmDialog";
import { AgentPipelineStatusShimmer } from "@/components/chat/AgentWorkingStatusRow";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getClientLinkVerifiedEmail,
  isPlausibleClientLinkEmail,
  setClientLinkVerifiedEmail,
} from "@/lib/clientLinkVerifiedEmail";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { PlatformPromptBox } from "@/components/chat/PlatformPromptBox";
import {
  PLATFORM_PROMPT_BOX_RADIUS,
  PLATFORM_PROMPT_BOX_SEND_BTN,
} from "@/components/chat/platformPromptBox.classes";
import {
  ArrowUp,
  Check,
  FileText,
  MessageSquarePlus,
  RefreshCw,
  SquareMousePointer,
  Undo2,
  User,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatComposerModeSelect } from "@/components/chat/ChatComposerModeSelect";
import {
  buildComposerModeCycleIds,
  handleComposerModeTabCycleKeyDown,
} from "@/components/chat/chatComposerModeSelect.util.js";
import {
  formatPickedElementForPrompt,
  splitFollowupWithElementContext,
} from "./ClientLinkPreviewPicker";
import { ElementContextChip } from "@/components/ElementContextChip";
import {
  parseDataUrlParts,
  PREVIEW_REPLACE_IMAGE_MAX_BYTES,
  revertPreviewElementSnapshot,
} from "@/lib/previewImageReplace";
import { PreviewReplaceImageButton } from "./PreviewReplaceImageButton";
import { PreviewLoadingTroubleMenu } from "./PreviewLoadingTroubleMenu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CHAT_ATTACH_MAX_BYTES } from "@/lib/chatAttachments";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import {
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { chatUserBubbleTextClass } from "@/components/chat/chatPanelLayout.constants";
import { AgentLiveTimeline } from "@/components/chat/AgentLiveTimeline";
import {
  ChatMessageCopyButton,
  resolveChatMessageCopyText,
} from "@/components/chat/ChatMessageCopyButton";
import { ClientLinkChatBlockedGuide } from "./ClientLinkChatBlockedGuide";
import { OlderChatThreadsMenu } from "@/components/chat/OlderChatThreadsMenu";
import { ViewingOlderChatBanner } from "@/components/chat/ViewingOlderChatBanner";
import { ArchivedChatHistoryHint } from "@/components/chat/ArchivedChatHistoryHint";
import { ComposerStopButton } from "@/components/chat/ComposerStopButton";
import JiraTicketMentionMenu, {
  JiraTicketLinkBadges,
  JiraTicketMentionChips,
} from "@/components/jira/JiraTicketMentionMenu";
import { useJiraTicketMention } from "@/hooks/useJiraTicketMention";
import { useOlderChatThreads } from "@/hooks/useOlderChatThreads";
import { formatChatThreadLabel } from "@/lib/formatChatThreadLabel";
import { formatChatPromptTimestamp } from "@/lib/formatChatPromptTimestamp";
import logo from "../../../assets/fevicon.png";

/**
 * @param {File} file
 * @returns {Promise<{ previewDataUrl: string; mimeType: string; width: number; height: number }>}
 */
async function readImageFileAsChatStaging(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Drop a PNG, JPG, WebP, or other image file.");
  }
  if (file.size > PREVIEW_REPLACE_IMAGE_MAX_BYTES) {
    throw new Error("Image is too large (max 5 MB).");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const previewDataUrl = reader.result;
      if (typeof previewDataUrl !== "string") {
        reject(new Error("Could not read image."));
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolve({
          previewDataUrl,
          mimeType: file.type || "image/png",
          width: img.naturalWidth || 512,
          height: img.naturalHeight || 512,
        });
      };
      img.onerror = () => reject(new Error("Could not read image."));
      img.src = previewDataUrl;
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

/**
 * @param {File} file
 * @returns {Promise<{ data: string; fileName: string; mimeType: string }>}
 */
function isMarkdownChatFile(file) {
  const name = String(file?.name || "");
  const type = String(file?.type || "").toLowerCase();
  return /\.(md|markdown)$/i.test(name) || type === "text/markdown" || type === "text/x-markdown";
}

async function readDocumentFileAsChatStaging(file) {
  const isPdf = file?.type === "application/pdf" || /\.pdf$/i.test(String(file?.name || ""));
  const isMarkdown = isMarkdownChatFile(file);
  if (!isPdf && !isMarkdown) {
    throw new Error("Drop a PDF or Markdown file.");
  }
  if (file.size > CHAT_ATTACH_MAX_BYTES) {
    throw new Error("File is too large (max 10 MB).");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const parts = typeof dataUrl === "string" ? parseDataUrlParts(dataUrl) : null;
      if (!parts?.base64) {
        reject(new Error("Could not read file."));
        return;
      }
      resolve({
        data: parts.base64,
        fileName: file.name || (isMarkdown ? "attachment.md" : "attachment.pdf"),
        mimeType: isMarkdown ? "text/markdown" : "application/pdf",
      });
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

/** Matches backend `MAX_REFERENCE_IMAGES_PER_MESSAGE`. */
const MAX_STAGED_REFERENCE_IMAGES = 6;
const MAX_STAGED_REFERENCE_PDFS = 6;
/** Compact composer toolbar — matches mode pill height (32px). */
const CLIENT_LINK_COMPOSER_TOOL_BTN = cn(
  "h-8 w-8 shrink-0 disabled:opacity-40 [&_svg]:size-3.5",
  PLATFORM_PROMPT_BOX_RADIUS,
);
/** Small inline thumb for chat / composer attachments; click opens full preview. */
const CHAT_ATTACHMENT_THUMB_CLASS = "h-9 w-9 shrink-0 rounded-md object-cover pointer-events-none";

const USER_BUBBLE_CLASS =
  "ml-auto w-fit max-w-[min(100%,42rem)] rounded-2xl rounded-br-none bg-secondary px-2.5 py-2 text-left text-sm leading-snug text-secondary-foreground";
const ASSISTANT_BUBBLE_CLASS =
  "mr-auto w-fit max-w-[min(100%,42rem)] rounded-2xl rounded-bl-sm border border-border/80 bg-muted/30 px-2.5 py-2 text-left text-sm leading-snug text-foreground shadow-sm";
const SYSTEM_NEUTRAL_BUBBLE_CLASS =
  "w-full max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-relaxed text-foreground";
const SYSTEM_SUCCESS_BUBBLE_CLASS =
  "w-full max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-relaxed text-foreground";
const SYSTEM_ERROR_BUBBLE_CLASS =
  "w-full max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-relaxed text-destructive";
/** Agent output bubble — grows with content; chat list handles scrolling. */
const AGENT_STREAM_BUBBLE_OUTER_CLASS = "flex w-full flex-col p-0";

const CHAT_ACCESS_DENIED_USER_MESSAGE = "Your email is not allowed to use this chat feature.";

function extractChatHttpErrorMessage(err) {
  return err?.response?.data?.error || err?.error || err?.message || "";
}

/** Cursor may return errors such as "Unauthorized request.: Follow-up blocked." */
const CHAT_AGENT_BUSY_USER_MESSAGE =
  "The AI agent is still finishing your previous message. Wait a moment, or press Stop and try again.";

function mapChatSendErrorForUser(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  const lower = s.toLowerCase();
  if (/follow[- ]?up\s*blocked/.test(lower)) {
    return CHAT_ACCESS_DENIED_USER_MESSAGE;
  }
  if (/\bunauthorized\b/.test(lower) && /\bblocked\b/.test(lower)) {
    return CHAT_ACCESS_DENIED_USER_MESSAGE;
  }
  if (/another stakeholder/i.test(lower) || /still finishing your previous message/i.test(lower)) {
    return CHAT_AGENT_BUSY_USER_MESSAGE;
  }
  return s;
}

const CHAT_PREVIEW_SYNC_COPY = {
  revert: {
    shimmer: "Refreshing preview after revert…",
    detail:
      "Rebuilding live preview from the reverted checkpoint. Chat input will unlock when the preview is ready.",
    ariaLabel: "Refreshing preview after revert",
  },
  agent: {
    shimmer: "Applying changes to preview…",
    detail:
      "Your changes are saved. The live preview is updating in the background — you can keep chatting.",
    ariaLabel: "Updating preview after agent changes",
  },
};

function ChatPreviewSyncStatusBanner({ kind, shimmerText }) {
  const copy = kind ? CHAT_PREVIEW_SYNC_COPY[kind] : null;
  if (!copy) return null;
  const shimmer =
    typeof shimmerText === "string" && shimmerText.trim() ? shimmerText.trim() : copy.shimmer;
  return (
    <div
      className={cn(
        "flex w-full max-w-full shrink-0 flex-col items-stretch rounded-3xl px-4 py-3",
        "gap-2",
      )}
      role="status"
      aria-live="polite"
      aria-label={copy.ariaLabel}
    >
      <AgentPipelineStatusShimmer text={shimmer} />
      <p className="flex shrink-0 items-center justify-center gap-2 text-center text-xs font-medium text-muted-foreground">
        <Spinner className="size-3.5 shrink-0 text-primary" />
        {copy.detail}
      </p>
    </div>
  );
}

function UserMessageAttachmentThumbs({ urls, onOpen }) {
  const list = Array.isArray(urls) ? urls.filter((u) => typeof u === "string" && u.trim()) : [];
  if (!list.length) return null;
  return (
    <div className="mb-2 flex w-full flex-wrap justify-start gap-1.5">
      {list.map((url, i) => (
        <button
          key={`att-${i}`}
          type="button"
          className="overflow-hidden rounded-lg border border-white/25 bg-white/10 p-0.5 shadow-sm ring-1 ring-white/20 cursor-pointer transition hover:bg-white/15 hover:ring-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label={`View attached image ${i + 1} of ${list.length}`}
          onClick={() => onOpen?.(url)}
        >
          <img src={url} alt="" className={CHAT_ATTACHMENT_THUMB_CLASS} draggable={false} />
        </button>
      ))}
    </div>
  );
}

function userMessageShowsRevert(msg) {
  return Boolean(
    msg?.role === "user" &&
    !msg?.isScratchPrompt &&
    (msg.isMerged || msg.mergedAt) &&
    !msg.isReverted,
  );
}

function chatMessageStableKey(msg) {
  if (msg?.id != null) return `id:${msg.id}`;
  if (msg?.key != null) return `key:${String(msg.key)}`;
  return null;
}

function userMessageShowsRetry(msg, recoveryEligibility = null) {
  if (
    msg?.role !== "user" ||
    msg?.isScratchPrompt ||
    userMessageShowsRevert(msg) ||
    !msg?.figmaConversionId ||
    isTurnInFlight(msg.turn?.phase)
  ) {
    return false;
  }
  if (msg.retryEligible || msg.turn?.phase === TURN_PHASE.FAILED) return true;
  const failReason =
    typeof msg.agentFailureReason === "string" ? msg.agentFailureReason.trim() : "";
  if (failReason) return true;
  return Boolean(
    recoveryEligibility?.retryEligible &&
    recoveryEligibility.figmaConversionId != null &&
    Number(recoveryEligibility.figmaConversionId) === Number(msg.figmaConversionId),
  );
}

function formatChatMessageTimestamp(value) {
  return formatChatPromptTimestamp(value);
}

function resolveChatMessageTimestampLabel(msg) {
  if (msg?.isScratchPlaceholder) return "Project setup";
  if (msg?.isScratchPrompt) return "Original prompt";
  return formatChatMessageTimestamp(msg?.createdAt ?? msg?.mergedAt ?? null) ?? "Just now";
}

function ChatMessagesSkeleton({ label }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label={label}>
      <Skeleton className="ml-auto h-10 w-[60%] rounded-2xl" />
      <Skeleton className="h-16 w-[80%] rounded-2xl" />
      <Skeleton className="ml-auto h-10 w-[50%] rounded-2xl" />
    </div>
  );
}

function resolveUserTurnFooterAction(msg, recoveryEligibility) {
  if (msg?.role !== "user" || msg?.isScratchPrompt) {
    return { showRevert: false, showRetry: false };
  }
  const showRevert = userMessageShowsRevert(msg);
  const showRetry = !showRevert && userMessageShowsRetry(msg, recoveryEligibility);
  return { showRevert, showRetry };
}

function UserTurnFailureNotice({ reason }) {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return null;
  return (
    <div
      className="mt-2 w-full rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-left"
      role="alert"
    >
      <p className="text-xs font-semibold text-destructive">Couldn&apos;t complete this request</p>
      <p className="mt-1 whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-destructive/90">
        {text}
      </p>
    </div>
  );
}

const ChatMessageBubbleFooter = React.memo(function ChatMessageBubbleFooter({
  msg,
  timestampLabel,
  copyText,
  align = "start",
  isUserBubble = false,
  isMerged = false,
  isReverted = false,
  showRevert = false,
  showRetry = false,
  disableRevert = false,
  disableRetry = false,
  isRevertBusy = false,
  isRetryBusy = false,
  onRequestRevertConfirm,
  onRetryMessage,
}) {
  const timeClass = cn(
    "text-[10px] font-medium tabular-nums",
    isUserBubble ? "text-inherit opacity-70" : "text-muted-foreground",
  );
  const copyClass = cn(
    "shrink-0",
    isUserBubble
      ? "h-6 text-inherit opacity-80 hover:bg-foreground/10 hover:opacity-100"
      : "h-6 w-6",
  );

  return (
    <div
      className={cn(
        "mt-2 flex w-full flex-wrap items-center gap-1 border-t border-border/50 pt-1.5",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <time
        className={timeClass}
        dateTime={
          msg?.createdAt
            ? new Date(msg.createdAt).toISOString()
            : msg?.mergedAt
              ? new Date(msg.mergedAt).toISOString()
              : undefined
        }
      >
        {timestampLabel}
      </time>
      {copyText ? (
        <ChatMessageCopyButton text={copyText} className={copyClass} showLabel={isUserBubble} />
      ) : null}
      {msg?.role === "user" && isMerged && isReverted ? (
        <span
          className={cn(
            "text-[10px] font-medium",
            isUserBubble ? "text-inherit opacity-70" : "text-muted-foreground",
          )}
        >
          Reverted
        </span>
      ) : null}
      {showRevert ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disableRevert}
          className="h-6 rounded-2xl border border-border bg-background px-2 text-[10px] font-semibold shadow-none"
          onClick={() => onRequestRevertConfirm?.(msg)}
        >
          {isRevertBusy ? (
            <span className="flex items-center gap-1">
              <Spinner className="size-3" />
              Reverting…
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Undo2 className="size-3" />
              Revert
            </span>
          )}
        </Button>
      ) : null}
      {showRetry && !showRevert ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disableRetry}
          className="h-6 rounded-2xl border border-border bg-background px-2 text-[10px] font-semibold shadow-none"
          onClick={() => onRetryMessage?.(Number(msg.figmaConversionId), msg)}
        >
          {isRetryBusy ? (
            <span className="flex items-center gap-1">
              <Spinner className="size-3" />
              Retrying…
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <RefreshCw className="size-3" />
              Retry
            </span>
          )}
        </Button>
      ) : null}
    </div>
  );
});

const ChatMessageRow = React.memo(function ChatMessageRow({
  msg,
  revertLoadingKey,
  retryLoadingRunId,
  /** Revert targets an already-merged commit; do not tie to agent-status `busy` (composer uses that separately). */
  revertActionsEnabled,
  retryActionsEnabled,
  onRequestRevertConfirm,
  onRetryMessage,
  onOpenImagePreview,
  lastRetryEligibleMessageKey = null,
  recoveryEligibility = null,
}) {
  const rowKey = msg.id ?? msg.key ?? null;
  const isMerged = Boolean(msg?.isMerged);
  const isReverted = Boolean(msg?.isReverted);
  const isRevertBusy =
    revertLoadingKey != null && rowKey != null && String(revertLoadingKey) === String(rowKey);
  const disableRevert = !revertActionsEnabled || !isMerged || isReverted;
  const msgStableKey = chatMessageStableKey(msg);
  const { showRevert, showRetry: canRetry } = resolveUserTurnFooterAction(msg, recoveryEligibility);
  const showRetry =
    canRetry && lastRetryEligibleMessageKey != null && msgStableKey === lastRetryEligibleMessageKey;
  const isRetryBusy =
    retryLoadingRunId != null &&
    msg.figmaConversionId != null &&
    Number(retryLoadingRunId) === Number(msg.figmaConversionId);
  const disableRetry = !retryActionsEnabled || isRetryBusy;

  const systemTone = msg.role === "system" ? msg.tone || "neutral" : null;
  const systemClass =
    systemTone === "error"
      ? SYSTEM_ERROR_BUBBLE_CLASS
      : systemTone === "success"
        ? SYSTEM_SUCCESS_BUBBLE_CLASS
        : SYSTEM_NEUTRAL_BUBBLE_CLASS;

  const elementSplit = msg.role === "user" ? splitFollowupWithElementContext(msg.text) : null;

  const attachmentUrls = useMemo(() => {
    const u = msg?.attachmentPreviewUrls;
    if (Array.isArray(u) && u.length) {
      return u.filter((x) => typeof x === "string" && x.trim());
    }
    if (msg?.attachmentPreviewUrl) return [msg.attachmentPreviewUrl];
    return [];
  }, [msg?.attachmentPreviewUrls, msg?.attachmentPreviewUrl]);

  const isPersistedAgentOutput = Boolean(msg?.isPersistedAgentOutput);
  const persistedAgentSplit = useMemo(() => {
    if (!isPersistedAgentOutput || typeof msg.text !== "string") {
      return { header: null, body: "" };
    }
    const split = splitClientLinkPersistedAgentOutputText(msg.text);
    const body = split.body || "";
    if (extractLaunchpadQuestionsFence(body)?.length) {
      return {
        header: split.header,
        body: stripLaunchpadQuestionsFromReply(body),
        hidQuestions: true,
      };
    }
    return split;
  }, [isPersistedAgentOutput, msg.text]);

  const isAssistantRow = msg.role === "assistant";
  const turnPhase = msg.role === "user" ? msg.turn?.phase : null;
  const turnFailureReason =
    turnPhase === TURN_PHASE.FAILED && !msg.agentFailureReason
      ? msg.turn?.failureReason || "The agent couldn't finish this request. Try again."
      : null;

  const copyText = useMemo(() => {
    if (isPersistedAgentOutput) {
      const body = persistedAgentSplit.body?.trim();
      if (body) return body;
    }
    return resolveChatMessageCopyText(msg, elementSplit);
  }, [isPersistedAgentOutput, persistedAgentSplit.body, msg, elementSplit]);

  const timestampLabel = resolveChatMessageTimestampLabel(msg);

  const bubbleFooter = (
    <ChatMessageBubbleFooter
      msg={msg}
      timestampLabel={timestampLabel}
      copyText={copyText}
      align={msg.role === "user" ? "end" : "start"}
      isUserBubble={msg.role === "user"}
      isMerged={isMerged}
      isReverted={isReverted}
      showRevert={showRevert}
      showRetry={showRetry}
      disableRevert={disableRevert}
      disableRetry={disableRetry}
      isRevertBusy={isRevertBusy}
      isRetryBusy={isRetryBusy}
      onRequestRevertConfirm={onRequestRevertConfirm}
      onRetryMessage={onRetryMessage}
    />
  );

  const showBubbleFooter = isPersistedAgentOutput || msg.role === "user" || isAssistantRow;

  const bubbleClassName = cn(
    msg.role === "user"
      ? cn(USER_BUBBLE_CLASS, "flex flex-col")
      : isAssistantRow
        ? cn(ASSISTANT_BUBBLE_CLASS, "flex flex-col")
        : cn(systemClass, "flex flex-col"),
    msg.pending && "opacity-80",
    isPersistedAgentOutput && AGENT_STREAM_BUBBLE_OUTER_CLASS,
  );

  return (
    <div className={cn("group flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
      <div className={bubbleClassName}>
        {elementSplit ? (
          <div className="flex w-full flex-col items-stretch gap-2">
            <div className="flex w-full justify-start">
              <ElementContextChip
                tag={elementSplit.tag}
                contextBlock={elementSplit.contextBlock}
                inspectorCtx={elementSplit.inspectorCtx}
                variant="composer"
              />
            </div>
            {attachmentUrls.length ? (
              <UserMessageAttachmentThumbs urls={attachmentUrls} onOpen={onOpenImagePreview} />
            ) : null}
            <ChatExpandableContent
              collapsedMaxHeight={CHAT_USER_COLLAPSED_MAX_HEIGHT}
              className="whitespace-pre-wrap wrap-break-word text-sm leading-snug"
            >
              <p className={chatUserBubbleTextClass}>{elementSplit.userText}</p>
            </ChatExpandableContent>
            <JiraTicketLinkBadges links={msg.jiraTicketLinks} />
          </div>
        ) : (
          <>
            {msg.role === "user" && attachmentUrls.length ? (
              <UserMessageAttachmentThumbs urls={attachmentUrls} onOpen={onOpenImagePreview} />
            ) : null}
            {isPersistedAgentOutput ? (
              <div className="flex w-full flex-col px-4 py-3">
                <AgentLiveTimeline
                  timeline={msg.streamTimeline}
                  streamText={
                    persistedAgentSplit.hidQuestions
                      ? persistedAgentSplit.body
                      : persistedAgentSplit.body || msg.text
                  }
                  isActive={false}
                  collapsibleAssistant
                />
              </div>
            ) : isAssistantRow && typeof msg.text === "string" ? (
              <AssistantMarkdown text={msg.text} className="min-w-0" collapsible />
            ) : msg.role === "user" ? (
              <>
                <ChatExpandableContent
                  collapsedMaxHeight={CHAT_USER_COLLAPSED_MAX_HEIGHT}
                  className="whitespace-pre-wrap wrap-break-word text-sm leading-snug"
                >
                  <p className={chatUserBubbleTextClass}>{msg.text}</p>
                </ChatExpandableContent>
                <JiraTicketLinkBadges links={msg.jiraTicketLinks} />
              </>
            ) : (
              msg.text
            )}
          </>
        )}
        {msg.role === "user" && (msg.agentFailureReason || turnFailureReason) ? (
          <UserTurnFailureNotice reason={msg.agentFailureReason || turnFailureReason} />
        ) : null}
        {turnPhase === TURN_PHASE.STOPPED ? (
          <p className="mt-1 text-[10px] font-medium opacity-70">Stopped</p>
        ) : null}
        {showBubbleFooter ? bubbleFooter : null}
      </div>
    </div>
  );
});

export const ClientLinkChatPanel = React.memo(function ClientLinkChatPanel({
  projectSlug,
  projectId = null,
  scratchPrompt = null,
  /** When set, scratch prompt is only shown for chat on this release (project’s first / oldest release). */
  firstReleaseId = null,
  effectiveChatReleaseId,
  hasActiveVersion = false,
  /** When set, show guided next steps instead of the composer (e.g. post-lock). */
  chatBlockedReason = null,
  isLocked,
  backendPlanAgentRunning = false,
  releaseBackgroundAgentBlock = null,
  isOpen,
  devPreviewActive = false,
  /** recovering | failed | exhausted — inline HMR status banner in chat footer. */
  embedHmrWsBannerState = null,
  /** Clear pinned version preview + reload project metadata after revert (no iframe bump). */
  onRevertApplied,
  /** Parent shows preview loader while post-revert dev server restarts. */
  onRevertPreviewSyncChange,
  /** Unified preview sync: refresh-build + HMR wait + iframe remount. */
  onSyncAndRefreshPreview,
  /** Parent iframe reload after tag merge (skipped when embed HMR handles updates). */
  onPreviewCommitApplied,
  /** Non-blocking post-turn live refresh: prefers HMR, soft-reloads iframe if HMR missed. */
  onPreviewLiveRefresh,
  /** Notify parent when an agent turn is settling so it can mute embed HMR reconnect recovery. */
  onAgentTurnSettlingChange,
  /** Notify parent when chat/onboard agent work is active + live status line for preview overlay. */
  onAgentWorkingChange,
  /** Notify parent when Preview Desktop holds control (hide Bring up to date until release). */
  onDesktopControlHeldChange,
  onCloseChat,
  pickedElementContext = null,
  onPickedElementContextChange = () => {},
  visualPickMode = false,
  onVisualPickModeChange = () => {},
  previewIframeAccessible = null,
  previewBridgeInspectable = false,
  previewIframeRef = null,
  previewFailureDiagnosis = null,
  previewConsoleLines = null,
  onPreviewReplaceImageResult = () => {},
  stagedChatReplacementImage = null,
  onStagedChatReplacementImageChange = () => {},
  stagedChatReferenceImages = [],
  onStagedChatReferenceImagesChange = () => {},
  onReplacementStagedForRepo = () => {},
  clientLinkAiSvgContext = null,
  existingRevertSnapshot = null,
  /** One-shot composer text from parent (e.g. Fix with AI). */
  composerSeed = null,
  onComposerSeedConsumed = () => {},
  /** e.g. "Release 1 / v1.2" — shown under the chat title for multi-release projects. */
  mergeTargetLabel = "",
  /** Current app route shown in the preview iframe (voice mode context). */
  previewPath = "/",
  /** Navigate the preview iframe to an app route; returns true when navigation was applied. */
  onNavigatePreview = null,
  /** Voice demo virtual cursor over the preview (window-fixed rect) or null to hide. */
  onVoiceDemoCursor = () => {},
  /** Admin/platform gate for the Voice composer tab (public project `clientLinkVoiceEnabled`). */
  voiceEnabled = false,
}) {
  const [chatInput, setChatInput] = useState("");
  const [stagedChatReferencePdfs, setStagedChatReferencePdfs] = useState([]);
  /** Composer Cursor mode for the next send: agent | ask | plan */
  const [composerMode, setComposerMode] = useState(/** @type {'agent'|'ask'|'plan'} */ ("agent"));
  /** Hands-free voice mode: realtime voice agent drives agent-mode sends. */
  const [voiceMode, setVoiceMode] = useState(false);
  const [desktopControlHeld, setDesktopControlHeld] = useState(false);
  const onDesktopControlHeldChangeRef = useRef(onDesktopControlHeldChange);
  useEffect(() => {
    onDesktopControlHeldChangeRef.current = onDesktopControlHeldChange;
  }, [onDesktopControlHeldChange]);
  useEffect(() => {
    onDesktopControlHeldChangeRef.current?.(desktopControlHeld);
  }, [desktopControlHeld]);
  const [pendingPlan, setPendingPlan] = useState(
    /** @type {{ markdown: string, sourceMessageId: number|null }|null} */ (null),
  );
  const [buildingPlan, setBuildingPlan] = useState(false);
  /** One-shot text to send after composerSeed with autoSend (avoids race with seed clear). */
  const [pendingAutoSendText, setPendingAutoSendText] = useState(null);
  const [composerDragOver, setComposerDragOver] = useState(false);
  /** Brief lock while a followup POST is in flight. */
  const [queueSending, setQueueSending] = useState(false);
  /** Sync guard — state alone can miss rapid double Enter before re-render. */
  const sendInFlightRef = useRef(false);
  /** True after "Start new chat" (or any prior thread with archived rows) — hides scratch prompt. */
  const [hasArchivedChatHistory, setHasArchivedChatHistory] = useState(false);
  const [revertLoadingKey, setRevertLoadingKey] = useState(null);
  const [retryLoadingRunId, setRetryLoadingRunId] = useState(null);
  const [previewSyncKind, setPreviewSyncKind] = useState(null);
  const previewSyncBusy = previewSyncKind != null;
  const [postTurnPreviewSyncing, setPostTurnPreviewSyncing] = useState(false);
  const [postTurnPreviewLabel, setPostTurnPreviewLabel] = useState("");
  const [dispatchPhaseLabel, setDispatchPhaseLabel] = useState("");
  const [stopping, setStopping] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [revertPendingMsg, setRevertPendingMsg] = useState(null);
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [newChatBusy, setNewChatBusy] = useState(false);
  const {
    threads: olderChatThreads,
    threadsLoading: olderChatThreadsLoading,
    messagesLoading: olderChatMessagesLoading,
    viewingArchived: viewingArchivedChat,
    activeThreadId: olderChatActiveThreadId,
    archivedMessages: olderArchivedMessages,
    error: olderChatError,
    reloadThreads: reloadOlderChatThreads,
    selectThread: selectOlderChatThread,
    backToCurrent: backToCurrentChat,
  } = useOlderChatThreads({
    enabled: Boolean(projectSlug?.trim()) && effectiveChatReleaseId != null,
    scopeKey: `${projectSlug}:${effectiveChatReleaseId}`,
    fetchThreads: useCallback(
      () => clientLinkFetchArchivedThreads(projectSlug, Number(effectiveChatReleaseId)),
      [projectSlug, effectiveChatReleaseId],
    ),
    fetchThreadMessages: useCallback(
      (threadId) =>
        clientLinkFetchArchivedThreadMessages(
          projectSlug,
          Number(effectiveChatReleaseId),
          threadId,
        ),
      [projectSlug, effectiveChatReleaseId],
    ),
  });
  const activeOlderChatThreadLabel = useMemo(() => {
    if (!viewingArchivedChat) return "";
    const thread = olderChatThreads.find((t) => String(t.id) === String(olderChatActiveThreadId));
    return thread ? formatChatThreadLabel(thread) : "";
  }, [viewingArchivedChat, olderChatThreads, olderChatActiveThreadId]);
  useEffect(() => {
    if (!olderChatError) return;
    toast.error(olderChatError);
  }, [olderChatError]);
  const reloadOlderChatThreadsRef = useRef(reloadOlderChatThreads);
  reloadOlderChatThreadsRef.current = reloadOlderChatThreads;
  const [verifyBump, setVerifyBump] = useState(0);
  useEffect(() => {
    const onIdentityUpdated = () => setVerifyBump((b) => b + 1);
    window.addEventListener("client-link-identity-updated", onIdentityUpdated);
    return () => window.removeEventListener("client-link-identity-updated", onIdentityUpdated);
  }, []);
  const [panelEmailInput, setPanelEmailInput] = useState("");
  const [gateInlineError, setGateInlineError] = useState("");
  const [composerEmailEditorOpen, setComposerEmailEditorOpen] = useState(false);
  const [composerEmailDraft, setComposerEmailDraft] = useState("");
  const [composerEmailError, setComposerEmailError] = useState("");
  const [stopAgentConfirmOpen, setStopAgentConfirmOpen] = useState(false);
  const [chatImagePreviewUrl, setChatImagePreviewUrl] = useState(null);
  const composerTextareaRef = useRef(null);
  const chatListScrollRef = useRef(null);
  /** Inner content wrapper — ResizeObserver target when timeline rows grow in place. */
  const chatScrollContentRef = useRef(null);
  /** When true, new content auto-scrolls; false after user scrolls up to read. */
  const chatStickToBottomRef = useRef(true);
  /** One-shot scroll after the user sends a message or taps Jump to latest. */
  const forceScrollToBottomRef = useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  /** Last composer draft, restored when the user stops the turn it started. */
  const lastComposerDraftRef = useRef({ input: "", pickedElement: null, messageId: null });
  const lastEndedTurnRef = useRef(null);

  useEffect(() => {
    const seedText = typeof composerSeed?.text === "string" ? composerSeed.text.trim() : "";
    if (!seedText || composerSeed?.ts == null) return;
    setComposerMode("agent");
    if (composerSeed?.autoSend) {
      setPendingAutoSendText(seedText);
    } else {
      setChatInput(seedText);
      requestAnimationFrame(() => {
        composerTextareaRef.current?.focus({ preventScroll: true });
      });
    }
    onComposerSeedConsumed?.();
  }, [composerSeed?.ts, composerSeed?.text, composerSeed?.autoSend, onComposerSeedConsumed]);

  const openChatImagePreview = useCallback((url) => {
    const u = typeof url === "string" ? url.trim() : "";
    if (u) setChatImagePreviewUrl(u);
  }, []);

  const identityEmail = useMemo(() => getClientLinkVerifiedEmail(), [verifyBump, isOpen]);
  const identityLooksValid = Boolean(identityEmail) && isPlausibleClientLinkEmail(identityEmail);
  const showMainChatUi = identityLooksValid;

  const canViewChat = Boolean(projectSlug?.trim()) && effectiveChatReleaseId != null;
  const canMutateChat =
    canViewChat &&
    hasActiveVersion &&
    !chatBlockedReason &&
    !isLocked &&
    !backendPlanAgentRunning &&
    !releaseBackgroundAgentBlock &&
    identityLooksValid;

  const previewSyncInFlightRef = useRef(false);
  const previewSyncPendingRef = useRef(false);

  /** After an agent turn lands, refresh the preview without blocking the composer. */
  const syncPreviewAfterAgentTurn = useCallback(async () => {
    if (!projectSlug?.trim() || effectiveChatReleaseId == null) return;
    if (previewSyncInFlightRef.current) {
      previewSyncPendingRef.current = true;
      return;
    }
    previewSyncInFlightRef.current = true;
    setPostTurnPreviewSyncing(true);
    try {
      do {
        previewSyncPendingRef.current = false;
        let backendRefreshMode = "full";
        try {
          const st = await clientLinkFetchAgentStatus(projectSlug, Number(effectiveChatReleaseId));
          backendRefreshMode = readPreviewRefreshMode(st?.previewRefreshOutcome);
        } catch {
          /* fall back to a full refresh */
        }
        // Banner only for a visible reload; silent HMR shows nothing.
        if (backendRefreshMode === "restart") {
          setPostTurnPreviewLabel("Restarting live preview…");
        } else if (!devPreviewActive) {
          setPostTurnPreviewLabel("Updating live preview…");
        }
        await onPreviewCommitApplied?.({ releaseId: Number(effectiveChatReleaseId) });
        await onPreviewLiveRefresh?.({ backendRefreshMode });
      } while (previewSyncPendingRef.current);
    } catch {
      /* best-effort; the user can reload the preview from the toolbar */
    } finally {
      previewSyncInFlightRef.current = false;
      previewSyncPendingRef.current = false;
      setPostTurnPreviewLabel("");
      setPostTurnPreviewSyncing(false);
    }
  }, [
    projectSlug,
    effectiveChatReleaseId,
    devPreviewActive,
    onPreviewCommitApplied,
    onPreviewLiveRefresh,
  ]);

  const syncPreviewAfterAgentTurnRef = useRef(syncPreviewAfterAgentTurn);
  syncPreviewAfterAgentTurnRef.current = syncPreviewAfterAgentTurn;
  const messageQueueReloadRef = useRef(async () => []);

  const handleTranscriptMeta = useCallback((data) => {
    setHasArchivedChatHistory(Boolean(data?.hasArchivedChatHistory));
    if (data?.pendingPlan?.markdown) {
      setPendingPlan({
        markdown: String(data.pendingPlan.markdown),
        sourceMessageId:
          data.pendingPlan.sourceMessageId != null
            ? Number(data.pendingPlan.sourceMessageId)
            : null,
      });
    } else {
      setPendingPlan(null);
    }
    if (data?.hasArchivedChatHistory) {
      void reloadOlderChatThreadsRef.current?.();
    }
  }, []);

  const handleTurnEnded = useCallback((turn) => {
    lastEndedTurnRef.current = turn;
    void messageQueueReloadRef.current?.({ silent: true });
    if (turn.phase === TURN_PHASE.DONE && (turn.mode ?? "agent") === "agent") {
      void syncPreviewAfterAgentTurnRef.current();
    }
  }, []);

  const session = useClientLinkChatSession({
    projectSlug,
    releaseId: effectiveChatReleaseId,
    clientEmail: identityEmail,
    enabled: showMainChatUi && canViewChat,
    onTranscriptMeta: handleTranscriptMeta,
    onTurnEnded: handleTurnEnded,
  });
  const {
    thread: sessionThread,
    messages: chatMessages,
    activeTurn,
    activeTurnStartedAtMs,
    scratchRunStartedAtMs,
    liveStream,
    statusLabel: turnStatusLabel,
    scratchRunKey,
    release: releaseStatus,
    connection: sessionConnection,
    refreshTranscript,
    submit: submitChatRequest,
    addNote,
    startFreshChat,
    abandonFreshChat,
  } = session;
  const pendingSends = session.state.pendingSends;
  const turnBusy = Boolean(activeTurn);
  const activeTurnRef = useRef(activeTurn);
  activeTurnRef.current = activeTurn;
  const chatHistoryLoading = showMainChatUi && canViewChat && !session.transcriptLoaded;

  /** A send the server has not turned into a visible turn yet. */
  const unconfirmedSend = useMemo(
    () =>
      pendingSends.find(
        (p) => p.status === "sending" || (p.messageId != null && !session.state.turns[p.messageId]),
      ) ?? null,
    [pendingSends, session.state.turns],
  );

  const agentTurnElapsed = useAgentTurnElapsed(activeTurnStartedAtMs);
  const turnModelId = session.state.stream?.model || releaseStatus?.model || null;

  /** A scratch / first-revision run (no user message) is still going. */
  const scratchRunning = useMemo(
    () =>
      !activeTurn &&
      Boolean(scratchRunKey) &&
      (selectTurnActivityView(session.state, scratchRunKey, null).running ||
        liveStream?.key === scratchRunKey),
    [activeTurn, scratchRunKey, session.state, liveStream],
  );
  const scratchElapsed = useAgentTurnElapsed(scratchRunning ? scratchRunStartedAtMs : null);

  const agentProgressStatusLine = useMemo(() => {
    if (activeTurn) {
      return buildAgentProgressStatusLine({
        label: turnStatusLabel,
        model: turnModelId ? getCursorModelLabel(turnModelId) : "",
        elapsed: agentTurnElapsed,
      });
    }
    if (dispatchPhaseLabel) return dispatchPhaseLabel;
    return unconfirmedSend ? "Sending your request…" : "";
  }, [
    activeTurn,
    turnStatusLabel,
    turnModelId,
    agentTurnElapsed,
    unconfirmedSend,
    dispatchPhaseLabel,
  ]);

  /** Status text without the clock: the activity block shows the timer as its own chip. */
  const agentProgressLabelLine = useMemo(
    () =>
      activeTurn
        ? buildAgentProgressStatusLine({
            label: turnStatusLabel,
            model: turnModelId ? getCursorModelLabel(turnModelId) : "",
          })
        : agentProgressStatusLine,
    [activeTurn, turnStatusLabel, turnModelId, agentProgressStatusLine],
  );

  const workingActive = turnBusy || Boolean(unconfirmedSend) || postTurnPreviewSyncing;
  useEffect(() => {
    if (typeof onAgentWorkingChange !== "function") return;
    const statusLine = (
      agentProgressStatusLine.trim() ||
      postTurnPreviewLabel.trim() ||
      (workingActive ? "Agent is working on your request…" : "")
    ).trim();
    onAgentWorkingChange({ active: workingActive, statusLine });
  }, [onAgentWorkingChange, workingActive, agentProgressStatusLine, postTurnPreviewLabel]);

  useEffect(() => {
    if (typeof onAgentWorkingChange !== "function") return undefined;
    return () => {
      onAgentWorkingChange({ active: false, statusLine: "" });
    };
  }, [onAgentWorkingChange]);

  const turnSettling = activeTurn?.phase === TURN_PHASE.FINISHING || postTurnPreviewSyncing;
  useEffect(() => {
    onAgentTurnSettlingChange?.(turnSettling);
  }, [onAgentTurnSettlingChange, turnSettling]);
  useEffect(() => () => onAgentTurnSettlingChange?.(false), [onAgentTurnSettlingChange]);

  const messageQueue = useChatMessageQueue({
    enabled:
      canMutateChat &&
      !viewingArchivedChat &&
      Boolean(projectSlug?.trim()) &&
      effectiveChatReleaseId != null,
    loadQueue: useCallback(
      () => fetchClientLinkChatQueue(projectSlug, effectiveChatReleaseId),
      [projectSlug, effectiveChatReleaseId],
    ),
    reorderQueue: useCallback(
      (orderedMessageIds) =>
        reorderClientLinkChatQueue(
          projectSlug,
          effectiveChatReleaseId,
          orderedMessageIds,
          identityEmail,
        ),
      [projectSlug, effectiveChatReleaseId, identityEmail],
    ),
    cancelQueueItem: useCallback(
      (messageId) =>
        cancelClientLinkChatQueueMessage(
          projectSlug,
          effectiveChatReleaseId,
          messageId,
          identityEmail,
        ),
      [projectSlug, effectiveChatReleaseId, identityEmail],
    ),
    steerQueueItem: useCallback(
      (messageId) =>
        steerClientLinkChatQueueMessage(
          projectSlug,
          effectiveChatReleaseId,
          messageId,
          identityEmail,
        ),
      [projectSlug, effectiveChatReleaseId, identityEmail],
    ),
    onItemCancelled: useCallback(() => {
      toast.message("Removed from queue.");
    }, []),
    onItemSteered: useCallback(() => {
      toast.success("Sent into the running turn.");
      void refreshTranscript().catch(() => {});
    }, [refreshTranscript]),
    onSteerFailed: useCallback((err) => {
      const message =
        (err && typeof err === "object" && (err.error || err.message)) ||
        "Could not steer this message. It stays in the queue.";
      toast.error(String(message));
    }, []),
    onCancelFailed: useCallback((err) => {
      const message =
        (err && typeof err === "object" && (err.error || err.message)) ||
        "Could not remove this message from the queue.";
      toast.error(String(message));
    }, []),
  });
  messageQueueReloadRef.current = messageQueue.reload;

  const composerDisabled =
    !canMutateChat ||
    stopping ||
    queueSending ||
    chatHistoryLoading ||
    previewSyncBusy ||
    viewingArchivedChat ||
    desktopControlHeld;

  const fetchClientLinkJiraTickets = useCallback(
    (search) =>
      clientLinkFetchJiraTickets(projectSlug, identityEmail, {
        mode: "mention",
        types: "all",
        search,
      }),
    [projectSlug, identityEmail],
  );

  const jiraMention = useJiraTicketMention({
    disabled: composerDisabled,
    canSearch: identityLooksValid && Boolean(projectSlug?.trim()),
    fetchTickets: fetchClientLinkJiraTickets,
  });

  const mergeComposerTextareaRef = useCallback(
    (el) => {
      composerTextareaRef.current = el;
      jiraMention.textareaRef.current = el;
    },
    [jiraMention.textareaRef],
  );

  const composerModeIds = useMemo(
    () => buildComposerModeCycleIds(true, voiceEnabled),
    [voiceEnabled],
  );
  const activeComposerModeValue = voiceMode ? "voice" : composerMode;

  const applyComposerModeValue = useCallback(
    (value) => {
      if (value === "voice") {
        if (!voiceEnabled) return;
        setVoiceMode(true);
      } else if (value === "ask" || value === "plan" || value === "agent") {
        setVoiceMode(false);
        setComposerMode(value);
      }
    },
    [voiceEnabled],
  );

  const composerPlaceholder = releaseBackgroundAgentBlock
    ? "AI chat is paused while a background agent runs on this release…"
    : backendPlanAgentRunning
      ? "Chat is paused while the backend plan agent runs…"
      : turnBusy
        ? "Queue a follow-up while the agent works…"
        : "Type here to reflect changes… Type @ for Jira context";

  useEffect(() => {
    if (viewingArchivedChat || !canMutateChat || turnBusy) return;
    void messageQueue.reload();
  }, [turnBusy, viewingArchivedChat, canMutateChat, messageQueue.reload]);

  useEffect(() => {
    if (viewingArchivedChat || !canMutateChat) return;
    if (messageQueue.items.length === 0) return;
    const id = window.setInterval(() => {
      void messageQueue.reload({ silent: true });
    }, 1500);
    return () => window.clearInterval(id);
  }, [viewingArchivedChat, canMutateChat, messageQueue.items.length, messageQueue.reload]);

  const prevQueueItemsRef = useRef(messageQueue.items);
  useEffect(() => {
    const prev = prevQueueItemsRef.current;
    const next = messageQueue.items;
    prevQueueItemsRef.current = next;
    if (viewingArchivedChat || !canMutateChat) return;
    if (shouldRefreshTranscriptForQueueChange(prev, next, { previousTurnLive: turnBusy })) {
      void refreshTranscript().catch(() => {});
    }
  }, [viewingArchivedChat, canMutateChat, messageQueue.items, turnBusy, refreshTranscript]);

  // A queue item the transcript already renders (by chat message id) must not also show as a card.
  const visibleQueueItems = useMemo(() => {
    const ids = new Set((chatMessages ?? []).map((m) => Number(m?.id)).filter(Number.isInteger));
    if (ids.size === 0) return messageQueue.items;
    return messageQueue.items.filter((item) => !ids.has(Number(item?.id)));
  }, [chatMessages, messageQueue.items]);

  const scratchTrim = useMemo(() => {
    return typeof scratchPrompt === "string" ? scratchPrompt.trim() : "";
  }, [scratchPrompt]);

  const scratchPromptAppliesToThisRelease = useMemo(() => {
    if (firstReleaseId == null || effectiveChatReleaseId == null) return false;
    return Number(firstReleaseId) === Number(effectiveChatReleaseId);
  }, [firstReleaseId, effectiveChatReleaseId]);

  /** The scratch run has a log or a live stream, so its activity needs a row to hang under. */
  const hasScratchRunActivity = useMemo(
    () =>
      Boolean(scratchRunKey) &&
      (selectActivityForKey(session.state, scratchRunKey).length > 0 ||
        liveStream?.key === scratchRunKey),
    [scratchRunKey, session.state, liveStream],
  );

  /** Scratch prompt from project settings shown first only on the first (oldest) release and first conversation; deduped if it matches the first stored user message. Also shown (with a neutral label when there is no prompt text) whenever the scratch run has activity and the chat has no real first message. */
  const displayMessages = useMemo(() => {
    if (viewingArchivedChat) {
      return mapClientLinkChatRows(olderArchivedMessages);
    }
    const visibleMessages = sessionThread.map((m) =>
      m.role === "note"
        ? {
            role: "system",
            key: m.key,
            tone: m.tone === "error" ? "error" : "neutral",
            text: m.text,
          }
        : m,
    );
    const firstUser = visibleMessages.find((m) => m?.role === "user");
    const showScratchRow = shouldShowScratchRow({
      scratchTrim,
      appliesToRelease: scratchPromptAppliesToThisRelease,
      hasArchivedHistory: hasArchivedChatHistory,
      firstMessageText: typeof firstUser?.text === "string" ? firstUser.text : "",
      scratchRunKey,
      hasScratchActivity: hasScratchRunActivity,
    });
    if (!showScratchRow) return visibleMessages;
    return [
      {
        role: "user",
        key: "client-link-scratch-prompt",
        text: scratchTrim || SCRATCH_ROW_FALLBACK_TEXT,
        isScratchPrompt: true,
        isScratchPlaceholder: !scratchTrim,
      },
      ...visibleMessages,
    ];
  }, [
    sessionThread,
    olderArchivedMessages,
    scratchTrim,
    scratchPromptAppliesToThisRelease,
    hasArchivedChatHistory,
    scratchRunKey,
    hasScratchRunActivity,
    viewingArchivedChat,
  ]);

  /** Where the active turn's live output + status renders: right under its user message. */
  const turnActivity = useMemo(() => {
    if (viewingArchivedChat) return null;
    const messageId =
      activeTurn?.messageId ?? liveStream?.messageId ?? unconfirmedSend?.messageId ?? null;
    if (messageId == null && !unconfirmedSend) return null;
    const anchor = displayMessages.find(
      (m) =>
        m.role === "user" &&
        ((messageId != null && (Number(m.id) === messageId || Number(m.messageId) === messageId)) ||
          (unconfirmedSend && m.key === `pending:${unconfirmedSend.clientId}`)),
    );
    const stream =
      liveStream && liveStream.messageId != null && liveStream.messageId === messageId
        ? liveStream
        : null;
    return {
      anchorKey: anchor ? String(anchor.id ?? anchor.key) : null,
      entries: messageId != null ? selectActivityForMessage(session.state, messageId) : [],
      stream,
      statusLine: agentProgressLabelLine,
      elapsed: activeTurnStartedAtMs != null ? agentTurnElapsed : "",
      streaming: activeTurn?.phase === TURN_PHASE.RUNNING,
      live: sessionConnection === "live" && activeTurn?.phase === TURN_PHASE.RUNNING,
      collapsed: false,
    };
  }, [
    viewingArchivedChat,
    activeTurn,
    liveStream,
    unconfirmedSend,
    displayMessages,
    agentProgressLabelLine,
    agentTurnElapsed,
    activeTurnStartedAtMs,
    sessionConnection,
    session.state.activity,
  ]);

  /**
   * Activity blocks by row key: the live one for the active turn, a collapsed disclosure under
   * every finished user message that has a log, and the scratch run's log under the synthetic
   * scratch-prompt bubble (never under a real user message).
   */
  const activityBlocks = useMemo(() => {
    const blocks = new Map();
    if (viewingArchivedChat) return blocks;
    const state = session.state;
    for (const m of displayMessages) {
      if (m.role !== "user" || m.isScratchPrompt || m.pending || m.id == null) continue;
      const rowKey = String(m.id);
      if (turnActivity?.anchorKey === rowKey) continue;
      const turn = state.turns[Number(m.id)];
      if (turn && (isTurnInFlight(turn.phase) || turn.phase === TURN_PHASE.QUEUED)) continue;
      const entries = selectActivityForMessage(state, m.id);
      if (entries.length === 0) continue;
      blocks.set(rowKey, {
        entries,
        collapsed: true,
        outcome: turn?.phase,
        durationMs: resolveActivityDurationMs({
          startedAt: turn?.startedAt,
          endedAt: turn?.endedAt,
          entries,
        }),
      });
    }
    const scratchRow = displayMessages.find((m) => m.isScratchPrompt);
    if (scratchRow && scratchRunKey) {
      const view = selectTurnActivityView(state, scratchRunKey, null);
      const stream = liveStream && liveStream.key === scratchRunKey ? liveStream : null;
      if (view.entries.length > 0 || stream) {
        const running = !activeTurn && (view.running || Boolean(stream));
        blocks.set(String(scratchRow.id ?? scratchRow.key), {
          entries: view.entries,
          stream,
          statusLine: running ? selectTurnStatusLabel(null, stream, view.entries) : "",
          streaming: running,
          live: running && sessionConnection === "live",
          collapsed: !running,
          elapsed: running && scratchRunStartedAtMs != null ? scratchElapsed : "",
          durationMs: running
            ? null
            : resolveActivityDurationMs({
                startedAt: selectScratchRunStartedAt(state, scratchRunKey),
                entries: view.entries,
              }),
        });
      }
    }
    return blocks;
  }, [
    viewingArchivedChat,
    displayMessages,
    turnActivity,
    scratchRunKey,
    liveStream,
    activeTurn,
    sessionConnection,
    scratchElapsed,
    scratchRunStartedAtMs,
    session.state.activity,
    session.state.turns,
    session.state.scratchRun,
  ]);
  const liveActivityShown =
    Boolean(turnActivity) || [...activityBlocks.values()].some((b) => !b.collapsed);

  const activeLaunchpadQuestions = useMemo(() => {
    if (viewingArchivedChat || turnBusy || isLocked) return null;
    return findActiveLaunchpadQuestions(displayMessages, {
      replyField: "text",
      isAssistantRow: (m) =>
        Boolean(m?.isPersistedAgentOutput) ||
        m?.role === "assistant" ||
        (m?.role === "system" && (m?.mode === "agent" || m?.mode === "ask")),
      isUserRow: (m) => m?.role === "user" && !m?.isScratchPrompt,
      extractReplyText: (row) => {
        const raw = typeof row?.text === "string" ? row.text : "";
        if (row?.isPersistedAgentOutput || row?.role === "system") {
          return splitClientLinkPersistedAgentOutputText(raw).body || raw;
        }
        return raw;
      },
    });
  }, [viewingArchivedChat, turnBusy, isLocked, displayMessages]);

  const recoveryEligibility = useMemo(() => {
    if (releaseStatus?.retryEligible && releaseStatus?.figmaConversionId != null) {
      return {
        retryEligible: true,
        figmaConversionId: Number(releaseStatus.figmaConversionId),
      };
    }
    return recoveryEligibilityFromMessageRows(chatMessages);
  }, [releaseStatus?.retryEligible, releaseStatus?.figmaConversionId, chatMessages]);

  const chatReleaseLabel = typeof mergeTargetLabel === "string" ? mergeTargetLabel.trim() : "";

  const showArchivedHistoryHint =
    !viewingArchivedChat &&
    !chatHistoryLoading &&
    !turnBusy &&
    chatMessages.length === 0 &&
    pendingSends.length === 0 &&
    (hasArchivedChatHistory || olderChatThreads.length > 0);

  const lastRetryEligibleMessageKey = useMemo(() => {
    for (let i = displayMessages.length - 1; i >= 0; i--) {
      const m = displayMessages[i];
      if (userMessageShowsRetry(m, recoveryEligibility)) {
        return chatMessageStableKey(m);
      }
    }
    return null;
  }, [displayMessages, recoveryEligibility]);

  const requestForceChatScrollToBottom = useCallback(() => {
    forceScrollToBottomRef.current = true;
    chatStickToBottomRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  const maybeScrollChatToBottom = useCallback(() => {
    if (!isOpen || !showMainChatUi) return;
    const el = chatListScrollRef.current;
    if (!el) return;
    if (!forceScrollToBottomRef.current && !chatStickToBottomRef.current) {
      return;
    }
    scrollChatToBottom(el);
    forceScrollToBottomRef.current = false;
  }, [isOpen, showMainChatUi]);

  const handleJumpToLatest = useCallback(() => {
    requestForceChatScrollToBottom();
    const el = chatListScrollRef.current;
    if (el) scrollChatToBottom(el, "smooth");
  }, [requestForceChatScrollToBottom]);

  const showJumpToLatestDuringAgent = showJumpToLatest && liveActivityShown;

  useEffect(() => {
    if (!isOpen) return;
    chatStickToBottomRef.current = true;
    forceScrollToBottomRef.current = true;
    setShowJumpToLatest(false);
  }, [isOpen]);

  useLayoutEffect(() => {
    maybeScrollChatToBottom();
  }, [
    maybeScrollChatToBottom,
    displayMessages,
    turnActivity,
    activityBlocks,
    chatHistoryLoading,
    previewSyncBusy,
  ]);

  useEffect(() => {
    const el = chatListScrollRef.current;
    if (!el || !isOpen || !showMainChatUi) return;
    const onScroll = () => {
      const nearBottom = isChatNearBottom(el);
      chatStickToBottomRef.current = nearBottom;
      setShowJumpToLatest(!nearBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen, showMainChatUi]);

  useEffect(() => {
    const contentEl = chatScrollContentRef.current;
    if (!contentEl || !isOpen || !showMainChatUi) return;
    const observer = new ResizeObserver(() => {
      maybeScrollChatToBottom();
    });
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [isOpen, showMainChatUi, maybeScrollChatToBottom]);

  const visualPickSupported = previewIframeAccessible === true || previewBridgeInspectable;
  const visualPickDisabledReason = visualPickSupported
    ? ""
    : previewIframeAccessible === null
      ? "Loading preview…"
      : "Visual pick needs a same-origin preview. Cross-origin previews cannot be inspected from the browser.";

  const handleToggleVisualPick = useCallback(() => {
    if (!visualPickSupported || !canMutateChat) return;
    onVisualPickModeChange(!visualPickMode);
  }, [visualPickSupported, canMutateChat, visualPickMode, onVisualPickModeChange]);

  useEffect(() => {
    if (!isOpen) return;
    const s = getClientLinkVerifiedEmail();
    setPanelEmailInput(s && isPlausibleClientLinkEmail(s) ? s : "");
    setGateInlineError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setComposerEmailEditorOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !showMainChatUi || composerEmailEditorOpen) return;
    const s = getClientLinkVerifiedEmail();
    setComposerEmailDraft(s && isPlausibleClientLinkEmail(s) ? s : "");
    setComposerEmailError("");
  }, [isOpen, showMainChatUi, verifyBump, composerEmailEditorOpen]);

  const toggleComposerEmailEditor = useCallback(() => {
    setComposerEmailEditorOpen((open) => {
      const next = !open;
      if (next) {
        const s = getClientLinkVerifiedEmail();
        setComposerEmailDraft(s && isPlausibleClientLinkEmail(s) ? s : "");
        setComposerEmailError("");
      }
      return next;
    });
  }, []);

  const handleContinueEmail = useCallback(() => {
    const email = panelEmailInput.trim().toLowerCase();
    if (!isPlausibleClientLinkEmail(email)) {
      setGateInlineError("Please enter a valid email address.");
      return;
    }
    setClientLinkVerifiedEmail(email);
    setGateInlineError("");
    setVerifyBump((b) => b + 1);
  }, [panelEmailInput]);

  /**
   * Archive the active chat thread and reset local composer/pick states so the next
   * message starts a fresh assistant turn against the same release.
   */
  const handleStartNewChat = useCallback(async () => {
    if (!canMutateChat || effectiveChatReleaseId == null || !projectSlug?.trim()) {
      return;
    }
    const email = (identityEmail || "").trim();
    if (!email) return;
    const throughMessageId = (chatMessages ?? []).reduce((max, row) => {
      const id = Number(row?.id);
      return Number.isInteger(id) && id > max ? id : max;
    }, 0);
    setNewChatBusy(true);
    setHasArchivedChatHistory(true);
    backToCurrentChat();
    startFreshChat(throughMessageId);
    setChatInput("");
    setComposerMode("agent");
    setPendingPlan(null);
    setStagedChatReferencePdfs([]);
    onStagedChatReplacementImageChange(null);
    onStagedChatReferenceImagesChange([]);
    onPickedElementContextChange(null);
    try {
      const archived = await clientLinkArchiveChatHistory(
        projectSlug,
        Number(effectiveChatReleaseId),
        email,
      );
      const serverThrough = Number(archived?.throughMessageId);
      if (Number.isInteger(serverThrough) && serverThrough > throughMessageId) {
        startFreshChat(serverThrough);
      }
      try {
        await refreshTranscript();
      } catch (e) {
        toast.error(extractChatHttpErrorMessage(e) || "Could not load chat history.");
      }
      void messageQueue.reload({ silent: true });
      setNewChatConfirmOpen(false);
      await reloadOlderChatThreads();
      toast.success("Started a new chat. Your next message will use a new assistant.");
    } catch (e) {
      abandonFreshChat();
      try {
        await refreshTranscript();
      } catch {
        /* the archive error is the one to show */
      }
      const raw = extractChatHttpErrorMessage(e);
      toast.error(raw || "Could not start a new chat. Please try again.");
    } finally {
      setNewChatBusy(false);
    }
  }, [
    abandonFreshChat,
    backToCurrentChat,
    canMutateChat,
    chatMessages,
    effectiveChatReleaseId,
    identityEmail,
    messageQueue.reload,
    projectId,
    onPickedElementContextChange,
    onStagedChatReferenceImagesChange,
    onStagedChatReplacementImageChange,
    projectSlug,
    refreshTranscript,
    reloadOlderChatThreads,
    startFreshChat,
  ]);

  const handleSaveComposerEmail = useCallback(() => {
    const email = composerEmailDraft.trim().toLowerCase();
    if (!isPlausibleClientLinkEmail(email)) {
      setComposerEmailError("Please enter a valid email address.");
      return;
    }
    const current = (getClientLinkVerifiedEmail() || "").trim().toLowerCase();
    if (current === email) {
      setComposerEmailError("");
      setComposerEmailEditorOpen(false);
      return;
    }
    setClientLinkVerifiedEmail(email);
    setComposerEmailError("");
    setVerifyBump((b) => b + 1);
    setComposerEmailEditorOpen(false);
  }, [composerEmailDraft]);

  const appendReferenceStagingFromFiles = useCallback(
    async (fileList) => {
      if (composerDisabled) return;
      const files = Array.from(fileList || []).filter(Boolean);
      for (const file of files) {
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(String(file.name || ""));
        const isMarkdown = isMarkdownChatFile(file);
        const isImage = Boolean(file.type?.startsWith("image/")) && !isMarkdown;
        if (!isPdf && !isMarkdown && !isImage) {
          toast.error("Attach a PNG, JPG, WebP, PDF, or Markdown file.");
          continue;
        }
        if (isPdf || isMarkdown) {
          let wasFull = false;
          try {
            const staged = await readDocumentFileAsChatStaging(file);
            setStagedChatReferencePdfs((prev) => {
              const p = Array.isArray(prev) ? prev : [];
              if (p.length >= MAX_STAGED_REFERENCE_PDFS) {
                wasFull = true;
                return p;
              }
              return [...p, staged];
            });
          } catch (err) {
            toast.error(err?.message || "Could not attach file.");
          }
          if (wasFull) {
            toast.error(`At most ${MAX_STAGED_REFERENCE_PDFS} documents per message.`);
            break;
          }
          continue;
        }
        let wasFull = false;
        let appended = false;
        try {
          const staged = await readImageFileAsChatStaging(file);
          onStagedChatReferenceImagesChange((prev) => {
            const p = Array.isArray(prev) ? prev : [];
            if (p.length >= MAX_STAGED_REFERENCE_IMAGES) {
              wasFull = true;
              return p;
            }
            appended = true;
            return [...p, staged];
          });
        } catch (err) {
          toast.error(err?.message || "Could not attach image.");
        }
        if (wasFull) {
          toast.error(`At most ${MAX_STAGED_REFERENCE_IMAGES} reference images per message.`);
          break;
        }
        if (appended) onStagedChatReplacementImageChange(null);
      }
    },
    [composerDisabled, onStagedChatReferenceImagesChange, onStagedChatReplacementImageChange],
  );

  const handleComposerDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setComposerDragOver(false);
      if (composerDisabled) return;
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length) await appendReferenceStagingFromFiles(files);
    },
    [appendReferenceStagingFromFiles, composerDisabled],
  );

  const handleBackToCurrentChat = useCallback(() => {
    backToCurrentChat();
    void refreshTranscript().catch((e) => {
      toast.error(extractChatHttpErrorMessage(e) || "Could not load chat history.");
    });
  }, [backToCurrentChat, refreshTranscript]);

  const handleViewOlderChats = useCallback(async () => {
    let threads = olderChatThreads;
    if (!threads.length) {
      threads = await reloadOlderChatThreads();
    }
    const first = Array.isArray(threads) ? threads[0] : null;
    if (first?.id != null) {
      await selectOlderChatThread(first.id);
      return;
    }
    toast.message("No older chats found for this version.");
  }, [olderChatThreads, reloadOlderChatThreads, selectOlderChatThread]);

  const executeStopGeneration = useCallback(async () => {
    if (!projectSlug?.trim() || effectiveChatReleaseId == null) return;
    const turn = activeTurnRef.current;
    setStopping(true);
    try {
      await clientLinkStopGeneration(projectSlug, Number(effectiveChatReleaseId), identityEmail);
      const draft = lastComposerDraftRef.current;
      const restore = turn != null && draft.messageId === turn.messageId && Boolean(draft.input);
      if (restore) {
        setChatInput((prev) => (prev.trim() ? prev : draft.input));
        if (draft.pickedElement) onPickedElementContextChange(draft.pickedElement);
      }
      addNote(
        `stopped:${turn?.messageId ?? "release"}`,
        restore ? "Stopped. Your message is back in the composer." : "Stopped.",
      );
    } catch (e) {
      toast.error(extractChatHttpErrorMessage(e) || "Could not stop the agent.");
    } finally {
      setStopping(false);
      void refreshTranscript().catch(() => {});
      void messageQueue.reload({ silent: true });
    }
  }, [
    projectSlug,
    effectiveChatReleaseId,
    identityEmail,
    onPickedElementContextChange,
    addNote,
    refreshTranscript,
    messageQueue,
  ]);

  const handleStopGeneration = useCallback(() => {
    setStopAgentConfirmOpen(true);
  }, []);

  const handleConfirmStopAgent = useCallback(async () => {
    setStopAgentConfirmOpen(false);
    await executeStopGeneration();
  }, [executeStopGeneration]);

  const handleRetry = useCallback(
    async (runIdOverride) => {
      const runId =
        runIdOverride != null
          ? Number(runIdOverride)
          : recoveryEligibility.figmaConversionId != null
            ? Number(recoveryEligibility.figmaConversionId)
            : null;
      if (!projectSlug?.trim() || effectiveChatReleaseId == null || projectId == null || !runId) {
        return;
      }
      if (isLocked) {
        toast.error("This release is locked.");
        return;
      }
      if (stopping) {
        toast.message("Still stopping the previous request…");
        return;
      }
      if (turnBusy) {
        toast.error(CHAT_AGENT_BUSY_USER_MESSAGE);
        return;
      }
      requestForceChatScrollToBottom();
      setRetryLoadingRunId(runId);
      try {
        await submitChatRequest({
          request: () =>
            clientLinkRecoveryFollowup(projectSlug, {
              action: "retry",
              runId,
              projectId: Number(projectId),
              r: Number(effectiveChatReleaseId),
              clientEmail: identityEmail,
            }),
        });
      } catch (e) {
        const httpStatus = e?.response?.status;
        const errCode = e?.response?.data?.code;
        if (httpStatus === 409 || errCode === "CHAT_AGENT_BUSY") {
          toast.error(
            mapChatSendErrorForUser(extractChatHttpErrorMessage(e)) || CHAT_AGENT_BUSY_USER_MESSAGE,
          );
        } else if (errCode === "RUN_NOT_RECOVERABLE") {
          toast.error(
            extractChatHttpErrorMessage(e) ||
              "This run cannot be retried. Send a new message instead.",
          );
        } else {
          const rawMsg = extractChatHttpErrorMessage(e);
          toast.error(mapChatSendErrorForUser(rawMsg) || rawMsg || "Could not retry this run.");
        }
      } finally {
        setRetryLoadingRunId(null);
      }
    },
    [
      projectSlug,
      effectiveChatReleaseId,
      projectId,
      recoveryEligibility.figmaConversionId,
      isLocked,
      stopping,
      turnBusy,
      identityEmail,
      submitChatRequest,
      requestForceChatScrollToBottom,
    ],
  );

  const dispatchWatchStopRef = useRef(null);
  const stopDispatchWatch = useCallback(() => {
    dispatchWatchStopRef.current?.();
    dispatchWatchStopRef.current = null;
    setDispatchPhaseLabel("");
  }, []);
  const startDispatchWatch = useCallback(() => {
    stopDispatchWatch();
    if (!projectSlug?.trim() || effectiveChatReleaseId == null) return;
    dispatchWatchStopRef.current = watchClientLinkDispatchPhase(
      projectSlug,
      Number(effectiveChatReleaseId),
      (phase) => setDispatchPhaseLabel(phase),
    );
  }, [effectiveChatReleaseId, projectSlug, stopDispatchWatch]);

  const handleSendChat = useCallback(
    async (messageOverride) => {
      const isOverrideSend = typeof messageOverride === "string";
      const replacementPayload =
        stagedChatReplacementImage &&
        pickedElementContext?.selector &&
        stagedChatReplacementImage.selector === pickedElementContext.selector
          ? (() => {
              const raw = stagedChatReplacementImage.previewDataUrl;
              const parts = typeof raw === "string" ? parseDataUrlParts(raw) : null;
              if (!parts?.base64) return null;
              return {
                data: parts.base64,
                mimeType: stagedChatReplacementImage.mimeType || parts.mimeType || "image/png",
                width: stagedChatReplacementImage.width,
                height: stagedChatReplacementImage.height,
              };
            })()
          : null;

      const refList = Array.isArray(stagedChatReferenceImages) ? stagedChatReferenceImages : [];
      const referencePayloads =
        !replacementPayload && refList.length
          ? refList
              .map((img) => {
                const raw = img?.previewDataUrl;
                const parts = typeof raw === "string" ? parseDataUrlParts(raw) : null;
                if (!parts?.base64) return null;
                return {
                  data: parts.base64,
                  mimeType: img.mimeType || parts.mimeType || "image/png",
                  width: img.width,
                  height: img.height,
                };
              })
              .filter(Boolean)
          : null;

      const pdfList = Array.isArray(stagedChatReferencePdfs) ? stagedChatReferencePdfs : [];
      const followupPdfPayloads = pdfList.length
        ? pdfList
            .filter((pdf) => pdf && typeof pdf.data === "string" && pdf.data.trim())
            .map((pdf) => ({
              data: pdf.data,
              fileName: pdf.fileName || "attachment.pdf",
              mimeType: pdf.mimeType || "application/pdf",
            }))
        : null;

      if (replacementPayload && refList.length) {
        toast.error(
          "Remove the design reference or the element replacement image — only one attachment per message.",
        );
        return;
      }

      if ((composerMode === "ask" || composerMode === "plan") && replacementPayload) {
        toast.error(
          composerMode === "plan"
            ? "Plan mode can't replace assets — switch to Agent or remove the image."
            : "Ask mode can't replace assets — turn off Ask or remove the image.",
        );
        return;
      }

      if (
        !replacementPayload &&
        refList.length &&
        (!referencePayloads || !referencePayloads.length)
      ) {
        toast.error("Could not read one or more attached images.");
        return;
      }

      let userPart = isOverrideSend ? messageOverride.trim() : chatInput.trim();
      if (!userPart && replacementPayload && pickedElementContext?.replacementKind) {
        userPart =
          "Replace the selected asset with the attached reference image. Save it under src/assets/ (e.g. src/assets/images/) and update imports or references in code.";
      }
      if (referencePayloads?.length && !userPart.trim()) {
        toast.error("Add a message describing what you want for the attached image(s).");
        return;
      }
      if (
        !userPart &&
        !replacementPayload &&
        !referencePayloads?.length &&
        !followupPdfPayloads?.length
      ) {
        toast.error("Enter a message or attach an image, PDF, or Markdown file.");
        return;
      }
      if (!projectSlug?.trim()) {
        toast.error("Enter a message.");
        return;
      }
      if (effectiveChatReleaseId == null) {
        toast.error("Select a version above so we know which release to update.");
        return;
      }
      if (isLocked) {
        toast.error("This release is locked.");
        return;
      }
      if (stopping) {
        toast.message("Still stopping the previous request…");
        return;
      }

      if (sendInFlightRef.current) return;
      sendInFlightRef.current = true;
      setQueueSending(true);

      const jiraTicketLinks = [...jiraMention.jiraTicketMentions];
      const text = pickedElementContext
        ? `${formatPickedElementForPrompt(pickedElementContext)}\n\n${userPart}`
        : userPart;
      const attachmentPreviewUrls =
        replacementPayload && stagedChatReplacementImage?.previewDataUrl
          ? [stagedChatReplacementImage.previewDataUrl]
          : referencePayloads?.length
            ? refList.map((i) => i?.previewDataUrl).filter(Boolean)
            : [];
      const rid = Number(effectiveChatReleaseId);
      const followupMode =
        !voiceMode && (composerMode === "ask" || composerMode === "plan") ? composerMode : "agent";
      const followupReferencePayloads =
        !replacementPayload && referencePayloads?.length ? referencePayloads : null;
      const followupJiraLinks = jiraTicketLinks.length ? jiraTicketLinks : null;
      const pickedSnapshot = pickedElementContext ? { ...pickedElementContext } : null;

      lastComposerDraftRef.current = {
        input: userPart,
        pickedElement: pickedSnapshot,
        messageId: null,
      };
      requestForceChatScrollToBottom();
      setChatInput("");
      jiraMention.resetSelection();
      onPickedElementContextChange(null);
      onStagedChatReplacementImageChange(null);
      onStagedChatReferenceImagesChange([]);
      setStagedChatReferencePdfs([]);

      try {
        startDispatchWatch();
        const result = await submitChatRequest({
          // While a turn runs the server queues the message; the queue panel shows it instead.
          optimistic: turnBusy ? null : { text, jiraTicketLinks, attachmentPreviewUrls },
          request: () =>
            clientLinkSendFollowup(
              projectSlug,
              rid,
              text,
              identityEmail,
              replacementPayload,
              followupReferencePayloads,
              followupMode,
              followupJiraLinks,
              followupPdfPayloads,
            ),
        });
        const userMessageId = Number(result?.userMessageId);
        if (Number.isInteger(userMessageId) && userMessageId > 0) {
          lastComposerDraftRef.current = {
            ...lastComposerDraftRef.current,
            messageId: userMessageId,
          };
        }
        void messageQueue.reload();
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
          return { ok: true, queued: true };
        }
        if (followupMode !== "plan") setComposerMode("agent");
        return { ok: true };
      } catch (e) {
        if (!isOverrideSend) {
          setChatInput((prev) => (prev.trim() ? prev : userPart));
          if (pickedSnapshot) onPickedElementContextChange(pickedSnapshot);
        }
        const httpStatus = e?.response?.status;
        const errCode = e?.response?.data?.code;
        const rawMsg = extractChatHttpErrorMessage(e);
        const mapped = mapChatSendErrorForUser(rawMsg);
        if (httpStatus === 409 || errCode === "CHAT_AGENT_BUSY") {
          toast.error(mapped || CHAT_AGENT_BUSY_USER_MESSAGE);
          return { ok: false, error: mapped || CHAT_AGENT_BUSY_USER_MESSAGE };
        }
        const display = mapped || rawMsg || "Failed to send";
        toast.error(display);
        addNote(`send-failed:${Date.now()}`, display, "error");
        return { ok: false, error: display };
      } finally {
        stopDispatchWatch();
        sendInFlightRef.current = false;
        setQueueSending(false);
      }
    },
    [
      composerMode,
      chatInput,
      effectiveChatReleaseId,
      identityEmail,
      isLocked,
      onPickedElementContextChange,
      onStagedChatReferenceImagesChange,
      onStagedChatReplacementImageChange,
      pickedElementContext,
      turnBusy,
      requestForceChatScrollToBottom,
      jiraMention,
      messageQueue,
      submitChatRequest,
      addNote,
      startDispatchWatch,
      stopDispatchWatch,
      projectSlug,
      stagedChatReplacementImage,
      stagedChatReferenceImages,
      stagedChatReferencePdfs,
      stopping,
      voiceMode,
    ],
  );

  const getVoiceCompletionReport = useCallback(async () => {
    const rows = chatMessages || [];
    const lastUserIdx = findLastClientLinkUserMessageIndex(rows);
    const replies = rows
      .slice(lastUserIdx + 1)
      .map((r) => (typeof r?.text === "string" ? r.text.trim() : ""))
      .filter(Boolean);
    const lines = [`Run outcome: ${lastEndedTurnRef.current?.phase || "unknown"}.`];
    if (replies.length) lines.push(`Coding agent reply:\n${replies.join("\n\n")}`);
    if (effectiveChatReleaseId != null && projectSlug?.trim()) {
      try {
        const summary = await Promise.race([
          clientLinkFetchExecutionSummary(projectSlug, effectiveChatReleaseId, identityEmail),
          new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (summary?.ready) {
          if (Array.isArray(summary.summaryLines) && summary.summaryLines.length) {
            lines.push(`Change summary:\n${summary.summaryLines.join("\n")}`);
          }
          const files = Array.isArray(summary.files)
            ? summary.files.map((f) => f?.filename || f?.path || f?.name).filter(Boolean)
            : [];
          if (files.length) lines.push(`Files touched: ${files.join(", ")}`);
        }
      } catch {
        /* summary is best-effort */
      }
    }
    lines.push(`Preview route: ${previewPath || "/"}`);
    return lines.join("\n\n").slice(0, 4000);
  }, [chatMessages, effectiveChatReleaseId, identityEmail, previewPath, projectSlug]);

  const voiceAgent = useClientLinkVoiceAgent({
    projectSlug,
    releaseId: effectiveChatReleaseId,
    clientEmail: identityEmail,
    agentBusy: workingActive,
    onStartWork: (prompt) => handleSendChat(prompt),
    onStopWork: () => executeStopGeneration(),
    getWorkStatus: () => ({
      phase: activeTurn?.phase ?? "idle",
      busy: turnBusy,
      progress: agentProgressStatusLine,
      latestOutput: (liveStream?.text || "").slice(-600),
      queuedMessages: messageQueue.items.length,
    }),
    onNavigatePreview: (path) =>
      typeof onNavigatePreview === "function" ? onNavigatePreview(path) : false,
    previewIframeRef,
    previewPath,
    getPickedElementText: () =>
      pickedElementContext
        ? formatPickedElementForPrompt(pickedElementContext).slice(0, 1200)
        : null,
    getCompletionReport: getVoiceCompletionReport,
    onDemoCursor: onVoiceDemoCursor,
  });
  const stopVoiceAgent = voiceAgent.stop;

  useEffect(() => {
    if (!voiceMode || !canMutateChat) stopVoiceAgent();
  }, [voiceMode, canMutateChat, stopVoiceAgent]);

  useEffect(() => {
    if (!voiceEnabled) setVoiceMode(false);
  }, [voiceEnabled]);

  useEffect(() => {
    if (!pendingAutoSendText) return;
    const text = pendingAutoSendText;
    setPendingAutoSendText(null);
    void handleSendChat(text);
  }, [pendingAutoSendText, handleSendChat]);

  const handleBuildPendingPlan = useCallback(
    async (planMarkdown) => {
      if (!projectSlug?.trim() || effectiveChatReleaseId == null || !identityEmail) return;
      if (buildingPlan || sendInFlightRef.current) return;
      setBuildingPlan(true);
      sendInFlightRef.current = true;
      setQueueSending(true);
      try {
        setComposerMode("agent");
        requestForceChatScrollToBottom();
        startDispatchWatch();
        const result = await submitChatRequest({
          request: () =>
            clientLinkBuildPlan(projectSlug, Number(effectiveChatReleaseId), identityEmail, {
              planMarkdown: typeof planMarkdown === "string" ? planMarkdown : undefined,
            }),
        });
        setPendingPlan(null);
        if (isQueuedChatSendResult(result)) {
          toast.success(formatQueuedSendToast(result));
          void messageQueue.reload();
        }
      } catch (e) {
        toast.error(extractChatHttpErrorMessage(e) || "Could not build plan.");
      } finally {
        stopDispatchWatch();
        sendInFlightRef.current = false;
        setQueueSending(false);
        setBuildingPlan(false);
      }
    },
    [
      buildingPlan,
      effectiveChatReleaseId,
      identityEmail,
      messageQueue,
      projectSlug,
      requestForceChatScrollToBottom,
      submitChatRequest,
      startDispatchWatch,
      stopDispatchWatch,
    ],
  );

  const handleDismissPendingPlan = useCallback(async () => {
    if (!projectSlug?.trim() || effectiveChatReleaseId == null || !identityEmail) {
      setPendingPlan(null);
      return;
    }
    try {
      await clientLinkClearPendingPlan(projectSlug, Number(effectiveChatReleaseId), identityEmail);
      setPendingPlan(null);
    } catch (e) {
      toast.error(extractChatHttpErrorMessage(e) || "Could not dismiss plan.");
    }
  }, [effectiveChatReleaseId, identityEmail, projectSlug]);

  const handleRetryMessage = useCallback(
    (runId) => {
      void handleRetry(runId);
    },
    [handleRetry],
  );

  const handleRevertMergedMessage = useCallback(
    async (msg) => {
      if (!projectSlug?.trim() || effectiveChatReleaseId == null) {
        toast.error("Cannot revert: project or release is not ready.");
        return;
      }
      const mid = Number(msg?.id);
      if (!Number.isInteger(mid) || mid < 1) {
        toast.error("Invalid message.");
        return;
      }
      const key = msg.id ?? msg.key ?? mid;
      setRevertLoadingKey(key);
      // Single two-phase toast: it stays as "Reverting" through git/DB, then "Rebuilding
      // preview", and only resolves to success once the live preview has actually rebuilt —
      // so we never claim "reverted" while the preview still shows pre-revert content.
      const revertToastId = toast.loading("Reverting…");
      let revertGitOk = false;
      let previewRefreshFailed = false;
      let revertNoOp = false;
      let revertWarning = "";
      try {
        const data = await clientLinkRevertMerge(
          projectSlug,
          effectiveChatReleaseId,
          mid,
          identityEmail,
        );
        revertGitOk = true;
        previewRefreshFailed = Boolean(data?.previewRefreshFailed);
        revertNoOp = Boolean(data?.revertNoOp);
        revertWarning =
          typeof data?.previewRefreshWarning === "string" ? data.previewRefreshWarning : "";
        await refreshTranscript();
        onRevertApplied?.();
      } catch (e) {
        // The server may have committed the revert before a 502.
        void refreshTranscript().catch(() => {});
        const msgText = e?.response?.data?.error || e?.error || e?.message || "Could not revert.";
        toast.error(msgText, { id: revertToastId });
        setRevertLoadingKey(null);
        return;
      } finally {
        setRevertLoadingKey(null);
      }

      if (!revertGitOk) {
        toast.dismiss(revertToastId);
        return;
      }

      toast.loading("Rebuilding live preview from the reverted checkpoint…", {
        id: revertToastId,
      });
      onRevertPreviewSyncChange?.(true);
      setPreviewSyncKind("revert");
      const revertSyncClearTimer = window.setTimeout(() => {
        setPreviewSyncKind(null);
        onRevertPreviewSyncChange?.(false);
      }, 120_000);
      try {
        // Always force a real workspace rebuild (skipLiveBuild:false). Trusting the
        // backend-only refresh previously left the dev server on stale modules / old bundle.
        await onSyncAndRefreshPreview?.({
          clean: true,
          skipLiveBuild: false,
          forceRemount: true,
        });
        if (revertNoOp) {
          toast.warning(
            revertWarning ||
              "Nothing to revert — this message's changes were not found on the branch.",
            { id: revertToastId },
          );
        } else if (previewRefreshFailed) {
          toast.warning(
            revertWarning ||
              `Reverted on main and in chat. If the preview looks stale, use ${CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel} in the toolbar.`,
            { id: revertToastId },
          );
        } else {
          toast.success("Reverted to this message.", { id: revertToastId });
        }
      } catch (e) {
        toast.error(
          extractChatHttpErrorMessage(e) ||
            `Preview rebuild after revert failed. Use ${CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel} in the preview toolbar.`,
          { id: revertToastId },
        );
      } finally {
        window.clearTimeout(revertSyncClearTimer);
        setPreviewSyncKind(null);
        onRevertPreviewSyncChange?.(false);
      }
    },
    [
      effectiveChatReleaseId,
      identityEmail,
      onRevertApplied,
      onRevertPreviewSyncChange,
      onSyncAndRefreshPreview,
      projectSlug,
      refreshTranscript,
    ],
  );

  const handleOpenRevertConfirm = useCallback((msg) => {
    setRevertPendingMsg(msg);
    setRevertConfirmOpen(true);
  }, []);

  const handleRevertConfirmProceed = useCallback(async () => {
    const msg = revertPendingMsg;
    setRevertConfirmOpen(false);
    setRevertPendingMsg(null);
    if (msg) await handleRevertMergedMessage(msg);
  }, [revertPendingMsg, handleRevertMergedMessage]);

  const showStopButton =
    !viewingArchivedChat &&
    (activeTurn?.phase === TURN_PHASE.STARTING || activeTurn?.phase === TURN_PHASE.RUNNING);
  const rowActionsEnabled =
    canMutateChat && !viewingArchivedChat && !turnBusy && !chatHistoryLoading && !previewSyncBusy;
  const turnActivityNode = turnActivity ? <ClientLinkTurnActivity {...turnActivity} /> : null;
  return (
    <>
      <div
        data-chat-surface
        className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-card text-card-foreground lg:border-l lg:border-border"
      >
        <div className="flex shrink-0 flex-col border-b border-border bg-card">
          <div className="flex shrink-0 items-center px-3 sm:px-4 py-2">
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold tracking-tight text-foreground sm:text-base">
                <img src={logo} alt="launchpad logo" className="size-8 shrink-0" />
                <span className="truncate">AI Chat</span>
                {chatReleaseLabel ? (
                  <span className="truncate text-[11px] font-normal text-muted-foreground">
                    {chatReleaseLabel}
                  </span>
                ) : null}
              </h2>
              <div className="flex shrink-0 items-center gap-0.5">
                {showMainChatUi ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={composerDisabled}
                        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                        aria-expanded={composerEmailEditorOpen}
                        aria-label={
                          composerEmailEditorOpen ? "Close email editor" : "Edit chat email"
                        }
                        onClick={toggleComposerEmailEditor}
                      >
                        <User className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[14rem]">
                      {composerEmailEditorOpen
                        ? "Close the email editor"
                        : "Change the stakeholder email used for this chat"}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                {showMainChatUi && canViewChat && !isLocked ? (
                  <OlderChatThreadsMenu
                    threads={olderChatThreads}
                    loading={olderChatThreadsLoading}
                    activeThreadId={viewingArchivedChat ? olderChatActiveThreadId : null}
                    onSelectThread={(threadId) => void selectOlderChatThread(threadId)}
                  />
                ) : null}
                {showMainChatUi && canViewChat && !isLocked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setNewChatConfirmOpen(true)}
                        disabled={
                          newChatBusy ||
                          previewSyncBusy ||
                          viewingArchivedChat ||
                          !identityLooksValid ||
                          effectiveChatReleaseId == null
                        }
                        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Start a new chat"
                      >
                        <MessageSquarePlus className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[14rem]">
                      Start a new chat — the current messages will be hidden and your next message
                      will use a new assistant
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onCloseChat}
                  className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close chat panel"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>
          {composerEmailEditorOpen && showMainChatUi ? (
            <div className="border-t border-border px-3 pb-2.5 pt-2 sm:px-4">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Input
                    id="client-link-header-chat-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Your stakeholder email"
                    value={composerEmailDraft}
                    onChange={(e) => {
                      setComposerEmailDraft(e.target.value);
                      setComposerEmailError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveComposerEmail();
                      }
                    }}
                    disabled={composerDisabled}
                    className="h-8 min-w-0 flex-1 rounded-md border-slate-200/90 bg-white text-xs shadow-sm dark:border-border dark:bg-background"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="h-8 w-8 shrink-0 rounded-md"
                    aria-label="Update chat email"
                    disabled={
                      composerDisabled ||
                      !isPlausibleClientLinkEmail(composerEmailDraft.trim().toLowerCase())
                    }
                    onClick={handleSaveComposerEmail}
                  >
                    <Check className="size-4" />
                  </Button>
                </div>
                {composerEmailError ? (
                  <p className="px-0.5 text-[10px] leading-tight text-destructive">
                    {composerEmailError}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {showMainChatUi && embedHmrWsBannerState ? (
            <div className="border-t border-border px-3 py-2 sm:px-4">
              <p className="text-xs leading-snug text-amber-950 dark:text-amber-100">
                {embedHmrWsBannerState === "recovering"
                  ? CLIENT_LINK_PREVIEW_RECOVERY.embedHmrConnectionLost
                  : embedHmrWsBannerState === "exhausted"
                    ? CLIENT_LINK_PREVIEW_RECOVERY.embedHmrReconnectFailed
                    : `Live preview may be out of date. If it looks stale, use ${CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel} in the preview toolbar.`}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showMainChatUi ? (
            <PreviewDesktopControlBanner
              projectId={projectId}
              onHeldChange={setDesktopControlHeld}
            />
          ) : null}
          {!showMainChatUi && (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Enter your email to continue. Chat permissions are verified securely on the
                  server.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="client-link-panel-chat-email">Your email</Label>
                  <Input
                    id="client-link-panel-chat-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={panelEmailInput}
                    onChange={(e) => {
                      setPanelEmailInput(e.target.value);
                      setGateInlineError("");
                    }}
                    className="rounded-lg border-input"
                  />
                  {gateInlineError ? (
                    <p className="text-xs text-destructive">{gateInlineError}</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="default"
                    className="w-full font-semibold"
                    onClick={handleContinueEmail}
                    disabled={!isPlausibleClientLinkEmail(panelEmailInput.trim().toLowerCase())}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}
          {showMainChatUi && !canViewChat && effectiveChatReleaseId == null && (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              Choose a version in the header dropdown so we know which release to update.
            </p>
          )}
          {showMainChatUi &&
          (chatBlockedReason === "no_active_version" ||
            chatBlockedReason === "awaiting_first_revision") ? (
            <ClientLinkChatBlockedGuide
              projectId={projectId}
              showDashboardLink
              stakeholderMode={false}
              reason={chatBlockedReason}
            />
          ) : null}
          {showMainChatUi && isLocked && !chatBlockedReason ? (
            <p className="m-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs leading-relaxed text-destructive">
              This release is locked. Please switch to an active release to continue using the chat.
            </p>
          ) : null}
          {showMainChatUi && !isLocked && backendPlanAgentRunning && (
            <p className="m-4 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-xs leading-relaxed text-amber-950">
              Backend plan agent is running. Chat and preview edits are paused until it finishes.
            </p>
          )}
          {showMainChatUi &&
            !isLocked &&
            !backendPlanAgentRunning &&
            releaseBackgroundAgentBlock && (
              <p className="m-4 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-xs leading-relaxed text-amber-950">
                {releaseBackgroundAgentBlock.message}
              </p>
            )}

          {showMainChatUi && !chatBlockedReason ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {viewingArchivedChat ? (
                <ViewingOlderChatBanner
                  onBackToCurrent={handleBackToCurrentChat}
                  loading={olderChatMessagesLoading}
                  threadLabel={activeOlderChatThreadLabel}
                  error={!olderChatMessagesLoading ? olderChatError : ""}
                />
              ) : null}
              <div className="relative min-h-0 flex-1">
                <div
                  ref={chatListScrollRef}
                  className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-card"
                >
                  <div ref={chatScrollContentRef} className="space-y-4 px-4 py-4">
                    {viewingArchivedChat &&
                    olderChatMessagesLoading &&
                    displayMessages.length === 0 ? (
                      <ChatMessagesSkeleton label="Loading older chat" />
                    ) : null}
                    {showArchivedHistoryHint ? (
                      <ArchivedChatHistoryHint
                        loading={olderChatThreadsLoading}
                        onViewOlderChats={() => void handleViewOlderChats()}
                      />
                    ) : null}
                    {!viewingArchivedChat &&
                    !showArchivedHistoryHint &&
                    chatMessages.length === 0 &&
                    displayMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Describe the change you want (e.g. &quot;Make the hero button larger&quot;).
                        Use <span className="font-medium text-foreground">Pick element</span> to
                        select something in the preview — it appears as a tag in the box below;
                        hover the tag for full details.
                      </p>
                    ) : null}
                    {viewingArchivedChat &&
                    !olderChatMessagesLoading &&
                    displayMessages.length === 0 &&
                    !olderChatError ? (
                      <p className="text-sm text-muted-foreground">
                        No messages found for this older chat.
                      </p>
                    ) : null}
                    {displayMessages.map((msg, index) => {
                      const rowKey = String(msg.id ?? msg.key ?? `m-${index}`);
                      return (
                        <React.Fragment key={rowKey}>
                          <ChatMessageRow
                            msg={msg}
                            revertLoadingKey={revertLoadingKey}
                            retryLoadingRunId={retryLoadingRunId}
                            revertActionsEnabled={rowActionsEnabled && revertLoadingKey == null}
                            retryActionsEnabled={
                              rowActionsEnabled &&
                              revertLoadingKey == null &&
                              retryLoadingRunId == null
                            }
                            onRequestRevertConfirm={handleOpenRevertConfirm}
                            onRetryMessage={handleRetryMessage}
                            lastRetryEligibleMessageKey={lastRetryEligibleMessageKey}
                            recoveryEligibility={recoveryEligibility}
                            onOpenImagePreview={openChatImagePreview}
                          />
                          {turnActivity?.anchorKey === rowKey ? turnActivityNode : null}
                          {activityBlocks.has(rowKey) ? (
                            <ClientLinkTurnActivity {...activityBlocks.get(rowKey)} />
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                    {turnActivity && turnActivity.anchorKey == null ? turnActivityNode : null}
                    {previewSyncKind || (postTurnPreviewSyncing && postTurnPreviewLabel.trim()) ? (
                      <ChatPreviewSyncStatusBanner
                        kind={previewSyncKind || "agent"}
                        shimmerText={previewSyncKind ? "" : postTurnPreviewLabel}
                      />
                    ) : null}
                    {chatHistoryLoading && !viewingArchivedChat ? (
                      <ChatMessagesSkeleton label="Loading conversation" />
                    ) : null}
                  </div>
                </div>
                {showJumpToLatestDuringAgent ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="pointer-events-auto h-8 shadow-md"
                      onClick={handleJumpToLatest}
                    >
                      Jump to latest
                    </Button>
                  </div>
                ) : null}
              </div>

              {!viewingArchivedChat ? (
                <div className="shrink-0 space-y-2 bg-card px-4 py-3">
                  {activeLaunchpadQuestions?.questions?.length &&
                  !isLocked &&
                  !desktopControlHeld ? (
                    <LaunchpadQuestionsCard
                      variant="thread"
                      optionLayout="cursor"
                      questions={activeLaunchpadQuestions.questions}
                      sending={turnBusy || queueSending}
                      disabled={composerDisabled}
                      continueMode={composerMode === "plan" ? "plan" : "implement"}
                      onSubmit={(prompt) => void handleSendChat(prompt)}
                    />
                  ) : null}
                  <ChatMessageQueuePanel
                    items={visibleQueueItems}
                    loading={messageQueue.loading}
                    mutating={messageQueue.mutating}
                    onMoveUp={messageQueue.moveUp}
                    onMoveDown={messageQueue.moveDown}
                    onCancel={messageQueue.cancelItem}
                    onSteer={messageQueue.steerItem}
                  />
                  {pendingPlan?.markdown ? (
                    <BackendCodePlanDocument
                      markdown={pendingPlan.markdown}
                      onBuild={handleBuildPendingPlan}
                      onDismiss={handleDismissPendingPlan}
                      building={buildingPlan}
                      disabled={!canMutateChat || composerDisabled || buildingPlan}
                      className="mb-2"
                    />
                  ) : null}
                  <PlatformPromptBox
                    className={cn(
                      jiraMention.menuOpen && "overflow-visible",
                      composerDragOver &&
                        !composerDisabled &&
                        "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
                    )}
                    pathDropActive={Boolean(composerDragOver && !composerDisabled)}
                    onDragOver={(e) => {
                      if (composerDisabled) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setComposerDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setComposerDragOver(false);
                      }
                    }}
                    onDrop={handleComposerDrop}
                    toolbarLeft={
                      <>
                        <ChatComposerModeSelect
                          value={activeComposerModeValue}
                          onValueChange={applyComposerModeValue}
                          disabled={!canMutateChat || composerDisabled}
                          voiceEnabled={voiceEnabled}
                          showVoiceInMenu
                          showPlan
                          compact
                        />
                        {voiceMode ? null : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <ChatAttachControl
                                  disabled={!canMutateChat || composerDisabled}
                                  onFiles={(files) => void appendReferenceStagingFromFiles(files)}
                                  variant="secondary"
                                  size="icon"
                                  buttonClassName={CLIENT_LINK_COMPOSER_TOOL_BTN}
                                  label="Attach images, PDFs, or Markdown"
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[260px] text-xs">
                              Attach screenshots, mockups, PDFs, or Markdown (same as
                              drag-and-drop). Up to {MAX_STAGED_REFERENCE_IMAGES} images and{" "}
                              {MAX_STAGED_REFERENCE_PDFS} PDFs per message.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                type="button"
                                size="icon"
                                variant={visualPickMode ? "default" : "secondary"}
                                disabled={
                                  !canMutateChat || composerDisabled || !visualPickSupported
                                }
                                className={CLIENT_LINK_COMPOSER_TOOL_BTN}
                                aria-pressed={visualPickMode}
                                aria-label={
                                  visualPickMode
                                    ? "Exit pick element mode"
                                    : "Pick element in preview"
                                }
                                onClick={handleToggleVisualPick}
                              >
                                <SquareMousePointer className="size-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[260px] text-xs leading-relaxed"
                          >
                            {visualPickSupported
                              ? "Turn this on and select the part of the UI you'd like to edit"
                              : visualPickDisabledReason}
                          </TooltipContent>
                        </Tooltip>
                        <PreviewLoadingTroubleMenu
                          disabled={!canMutateChat || composerDisabled}
                          triggerClassName={CLIENT_LINK_COMPOSER_TOOL_BTN}
                          diagnosis={previewFailureDiagnosis}
                          consoleLines={previewConsoleLines}
                          onPrefillPrompt={(text) => {
                            setComposerMode("agent");
                            setChatInput(text);
                            requestAnimationFrame(() =>
                              composerTextareaRef.current?.focus({ preventScroll: true }),
                            );
                          }}
                          onSendCustom={(text) => {
                            setComposerMode("agent");
                            void handleSendChat(text);
                          }}
                        />
                      </>
                    }
                    toolbarRight={
                      showStopButton ? (
                        <ComposerStopButton
                          onClick={() => void handleStopGeneration()}
                          disabled={!canMutateChat}
                          size="sm"
                          showPulse={false}
                        />
                      ) : voiceMode ? null : (
                        <Button
                          type="button"
                          size="icon"
                          disabled={!canMutateChat || composerDisabled}
                          className={cn(PLATFORM_PROMPT_BOX_SEND_BTN, "h-8 w-8")}
                          aria-label="Send message"
                          onClick={() => void handleSendChat()}
                        >
                          <ArrowUp className="size-3.5" strokeWidth={2.5} aria-hidden />
                        </Button>
                      )
                    }
                  >
                    {voiceMode ? (
                      <div className="p-2">
                        <ClientLinkVoicePanel
                          className="border-0 p-1 shadow-none"
                          voice={voiceAgent}
                          agentWorking={turnBusy}
                          agentStatusLine={agentProgressStatusLine}
                          disabled={!canMutateChat || composerDisabled}
                          disabledReason={
                            !canMutateChat ? "Voice mode needs an unlocked, active version." : ""
                          }
                        />
                      </div>
                    ) : (
                      <div
                        className="flex flex-col gap-2.5 px-4 pb-1 pt-4"
                        role="group"
                        aria-label="Chat message composer. Drop images or PDFs here to attach as turn context."
                      >
                        {pickedElementContext ||
                        (Array.isArray(stagedChatReferenceImages) &&
                          stagedChatReferenceImages.length > 0) ||
                        stagedChatReferencePdfs.length > 0 ? (
                          <div className="flex w-full flex-wrap items-center gap-2 px-0.5">
                            {pickedElementContext ? (
                              <>
                                <ElementContextChip
                                  tag={
                                    pickedElementContext.reactComponentStack?.[0] ||
                                    pickedElementContext.tag
                                  }
                                  inspectorCtx={pickedElementContext}
                                  onRemove={() => onPickedElementContextChange(null)}
                                  variant="composer"
                                  className="shrink-0"
                                />
                                {pickedElementContext.replacementKind &&
                                previewIframeAccessible === true &&
                                previewIframeRef ? (
                                  <PreviewReplaceImageButton
                                    iframeRef={previewIframeRef}
                                    context={pickedElementContext}
                                    disabled={composerDisabled}
                                    onResult={onPreviewReplaceImageResult}
                                    onStagedForRepo={onReplacementStagedForRepo}
                                    clientLinkAiSvgContext={clientLinkAiSvgContext}
                                    existingRevertSnapshot={existingRevertSnapshot}
                                    buttonClassName="shrink-0"
                                  />
                                ) : null}
                                {stagedChatReplacementImage &&
                                stagedChatReplacementImage.selector ===
                                  pickedElementContext.selector &&
                                stagedChatReplacementImage.previewDataUrl ? (
                                  <div className="group relative shrink-0">
                                    <button
                                      type="button"
                                      className="overflow-hidden rounded-lg border border-border bg-muted/40 p-0.5 shadow-sm ring-1 ring-primary/20 cursor-pointer transition hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                      title="Queued for this message — click to enlarge"
                                      aria-label="View queued replacement image"
                                      onClick={() =>
                                        openChatImagePreview(
                                          stagedChatReplacementImage.previewDataUrl,
                                        )
                                      }
                                    >
                                      <img
                                        src={stagedChatReplacementImage.previewDataUrl}
                                        alt=""
                                        className={CHAT_ATTACHMENT_THUMB_CLASS}
                                        draggable={false}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:bg-destructive/10 hover:text-destructive"
                                      aria-label="Remove queued image"
                                      disabled={composerDisabled}
                                      onClick={() => {
                                        const snap = stagedChatReplacementImage?.revertSnapshot;
                                        if (snap) {
                                          revertPreviewElementSnapshot(snap);
                                        }
                                        onStagedChatReplacementImageChange(null);
                                      }}
                                    >
                                      <X className="size-3.5" aria-hidden />
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            ) : null}
                            {(Array.isArray(stagedChatReferenceImages)
                              ? stagedChatReferenceImages
                              : []
                            ).map((refImg, refIdx) =>
                              refImg?.previewDataUrl ? (
                                <div key={`ref-${refIdx}`} className="group relative shrink-0">
                                  <button
                                    type="button"
                                    className="overflow-hidden rounded-lg border border-border bg-muted/40 p-0.5 shadow-sm ring-1 ring-border cursor-pointer transition hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                    title="Design reference — click to enlarge"
                                    aria-label={`View design reference image ${refIdx + 1}`}
                                    onClick={() => openChatImagePreview(refImg.previewDataUrl)}
                                  >
                                    <img
                                      src={refImg.previewDataUrl}
                                      alt=""
                                      className={CHAT_ATTACHMENT_THUMB_CLASS}
                                      draggable={false}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Remove design reference image ${refIdx + 1}`}
                                    disabled={composerDisabled}
                                    onClick={() =>
                                      onStagedChatReferenceImagesChange((prev) =>
                                        (Array.isArray(prev) ? prev : []).filter(
                                          (_, i) => i !== refIdx,
                                        ),
                                      )
                                    }
                                  >
                                    <X className="size-3.5" aria-hidden />
                                  </button>
                                </div>
                              ) : null,
                            )}
                            {stagedChatReferencePdfs.map((pdf, pdfIdx) => (
                              <div
                                key={`pdf-${pdfIdx}-${pdf.fileName || "file"}`}
                                className="group relative flex max-w-[11rem] items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                              >
                                <FileText
                                  className="size-3.5 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                                <span className="min-w-0 truncate" title={pdf.fileName}>
                                  {pdf.fileName || "attachment.pdf"}
                                </span>
                                <button
                                  type="button"
                                  className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Remove PDF ${pdf.fileName || pdfIdx + 1}`}
                                  disabled={composerDisabled}
                                  onClick={() =>
                                    setStagedChatReferencePdfs((prev) =>
                                      (Array.isArray(prev) ? prev : []).filter(
                                        (_, i) => i !== pdfIdx,
                                      ),
                                    )
                                  }
                                >
                                  <X className="size-3.5" aria-hidden />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <JiraTicketMentionChips
                          tickets={jiraMention.selectedTickets}
                          onRemove={jiraMention.removeTicket}
                          disabled={composerDisabled}
                        />
                        <div
                          className={cn(
                            "relative w-full px-0.5",
                            jiraMention.menuOpen && "overflow-visible",
                          )}
                        >
                          <div
                            ref={jiraMention.mirrorRef}
                            aria-hidden
                            className="pointer-events-none absolute left-0.5 top-1.5 whitespace-pre-wrap break-words opacity-0"
                          />
                          <Textarea
                            ref={mergeComposerTextareaRef}
                            placeholder={composerPlaceholder}
                            value={chatInput}
                            onChange={(e) => {
                              const next = e.target.value;
                              setChatInput(next);
                              jiraMention.handleTextChange(next, e.target.selectionStart);
                            }}
                            disabled={composerDisabled}
                            rows={2}
                            className="max-h-40 min-h-[56px] w-full resize-none overflow-y-auto border-0 bg-transparent px-0 py-0 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:placeholder:text-muted-foreground"
                            onClick={(e) =>
                              jiraMention.handleTextChange(
                                chatInput,
                                e.currentTarget.selectionStart,
                              )
                            }
                            onSelect={(e) =>
                              jiraMention.handleTextChange(
                                chatInput,
                                e.currentTarget.selectionStart,
                              )
                            }
                            onBlur={jiraMention.handleComposerBlur}
                            onPaste={(e) => {
                              if (composerDisabled) return;
                              const cd = e.clipboardData;
                              if (!cd) return;
                              const fromFiles = Array.from(cd.files || []).filter(
                                (f) =>
                                  f.type?.startsWith("image/") ||
                                  f.type === "application/pdf" ||
                                  /\.pdf$/i.test(String(f.name || "")) ||
                                  isMarkdownChatFile(f),
                              );
                              const pasteFiles = [...fromFiles];
                              if (!pasteFiles.length && cd.items?.length) {
                                for (const item of Array.from(cd.items)) {
                                  if (
                                    item.kind === "file" &&
                                    (item.type?.startsWith("image/") ||
                                      item.type === "application/pdf")
                                  ) {
                                    const f = item.getAsFile();
                                    if (f) pasteFiles.push(f);
                                  }
                                }
                              }
                              if (!pasteFiles.length) return;
                              e.preventDefault();
                              void appendReferenceStagingFromFiles(pasteFiles);
                            }}
                            onKeyDown={(e) => {
                              if (jiraMention.handleMenuKeyDown(e, chatInput, setChatInput)) {
                                return;
                              }
                              if (
                                handleComposerModeTabCycleKeyDown(e, {
                                  currentMode: activeComposerModeValue,
                                  orderedIds: composerModeIds,
                                  onModeChange: applyComposerModeValue,
                                  disabled: !canMutateChat || composerDisabled || voiceMode,
                                })
                              ) {
                                return;
                              }
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (canMutateChat && !composerDisabled) {
                                  void handleSendChat();
                                }
                              }
                            }}
                          />
                          <JiraTicketMentionMenu
                            menuRef={jiraMention.menuRef}
                            open={jiraMention.menuOpen}
                            loading={jiraMention.loading}
                            error={jiraMention.fetchError}
                            tickets={jiraMention.tickets}
                            highlightIndex={jiraMention.highlightIndex}
                            onHighlight={jiraMention.setHighlightIndex}
                            onSelect={(ticket) =>
                              jiraMention.selectTicket(ticket, chatInput, setChatInput)
                            }
                            onSearchBlur={jiraMention.handleComposerBlur}
                            onSearchKeyDown={(e) => {
                              if (jiraMention.handleMenuKeyDown(e, chatInput, setChatInput)) {
                                return;
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                jiraMention.closeMenu();
                                jiraMention.textareaRef.current?.focus();
                              }
                            }}
                            style={jiraMention.menuStyle}
                            atMaxMentions={jiraMention.atMaxMentions}
                            searchValue={jiraMention.mentionQuery}
                            searchReady={jiraMention.searchReady}
                            onSearchChange={jiraMention.setMentionQuery}
                          />
                        </div>
                      </div>
                    )}
                  </PlatformPromptBox>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <StopAgentConfirmDialog
        open={stopAgentConfirmOpen}
        onOpenChange={setStopAgentConfirmOpen}
        onConfirm={handleConfirmStopAgent}
        confirming={stopping}
      />

      <Dialog
        open={revertConfirmOpen}
        onOpenChange={(open) => {
          setRevertConfirmOpen(open);
          if (!open) setRevertPendingMsg(null);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Undo this message?</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block">
                This removes this message and any later chat from the thread, and restores the
                preview to the code from before this change. This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => {
                setRevertConfirmOpen(false);
                setRevertPendingMsg(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={revertLoadingKey != null}
              className="rounded-lg font-semibold text-white shadow-md disabled:opacity-50"
              onClick={() => void handleRevertConfirmProceed()}
            >
              Revert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={newChatConfirmOpen}
        onOpenChange={(open) => {
          if (newChatBusy) return;
          setNewChatConfirmOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a new chat?</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span className="block">
                Your current chat history will be hidden and a fresh assistant will start with your
                next message.
              </span>
              <span className="block">
                Old messages move to <span className="font-medium">Older chats</span> (history icon
                in the header) and are not shown in the current thread. Code already merged into
                your project is not affected.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={newChatBusy}
              onClick={() => setNewChatConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={newChatBusy}
              className="rounded-lg font-semibold text-white shadow-md disabled:opacity-50"
              onClick={() => void handleStartNewChat()}
            >
              {newChatBusy ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4 text-primary-foreground" />
                  Starting…
                </span>
              ) : (
                "Start new chat"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chatImagePreviewUrl != null}
        onOpenChange={(open) => {
          if (!open) setChatImagePreviewUrl(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-h-[90vh] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] overflow-y-auto overflow-x-hidden border-neutral-800 bg-neutral-950 p-2 sm:p-4"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Image preview</DialogTitle>
          </DialogHeader>
          {chatImagePreviewUrl ? (
            <img
              src={chatImagePreviewUrl}
              alt=""
              className="mx-auto max-h-[min(85vh,900px)] w-auto max-w-full object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
});
