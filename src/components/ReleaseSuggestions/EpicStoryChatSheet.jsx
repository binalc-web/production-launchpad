import { fetchEpicStoryChat, uploadChatAttachment } from "@/api";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  Send,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import {
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_PRIMARY_TOGGLE_CLASS,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { ChatBubbleInlineCopy } from "@/components/chat/ChatMessageCopyButton";
import { chatUserBubbleTextClass } from "@/components/chat/chatPanelLayout.constants";
import { ComposerStopButton } from "@/components/chat/ComposerStopButton";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import { ChatMessageAttachments } from "@/components/chat/ChatMessageAttachments";
import { useChatAttachments } from "@/hooks/useChatAttachments";

/**
 * @typedef {{ role: 'user'|'assistant', content: string, suggestedContent?: { title: string, description: string } | null }} ChatMessage
 */

const SUGGESTED_PROMPTS_EPIC = [
  "Make the title sharper and more outcome-focused",
  "Rewrite the description with a clear pitch, client fit, and risk",
  "Tighten this into 2-3 sentences",
];

const SUGGESTED_PROMPTS_STORY = [
  "Rewrite as a clear user-value story",
  "Add brief acceptance notes",
  "Make the title shorter and more specific",
];

const SUGGESTED_PROMPTS_CREATE_EPIC = [
  "I need an epic for user onboarding with email verification",
  "Create an epic for improving dashboard load performance",
  "Build an epic around mobile push notifications",
];

function isAbortError(err) {
  return (
    err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError"
  );
}

/**
 * Find the latest assistant message that included a concrete suggestedContent.
 * @param {ChatMessage[]} messages
 */
function findLatestSuggestion(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role === "assistant" && m.suggestedContent) {
      return { message: m, index: i };
    }
  }
  return null;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {number|string} props.projectId
 * @param {{ type: 'epic'|'story', title: string, description: string, epicContext?: string, siblingNames?: string[] }} props.target
 * @param {(suggestion: { title: string, description: string }) => void} props.onConfirm
 * @param {boolean} [props.closeOnApply=true] — close sheet after Use this / Confirm
 * @param {"refine" | "create"} [props.intent="refine"] — create shows chat-first flow for new epics
 */
export function EpicStoryChatSheet({
  open,
  onOpenChange,
  projectId,
  target,
  onConfirm,
  closeOnApply = true,
  intent = "refine",
}) {
  const [messages, setMessages] = useState(/** @type {ChatMessage[]} */ ([]));
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const attach = useChatAttachments({
    upload: (file) => uploadChatAttachment(file, { channel: "epic_story", scopeId: projectId }),
  });
  const [appliedIndex, setAppliedIndex] = useState(/** @type {number | null} */ (null));
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const isEpic = target?.type === "epic";
  const isCreate = intent === "create";

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    setMessages([]);
    setDraft("");
    setLoading(false);
    setAppliedIndex(null);
    const seedTitle = typeof target?.title === "string" ? target.title.trim() : "";
    const seedDescription =
      typeof target?.description === "string" ? target.description.trim() : "";
    setEditedTitle(isCreate && seedTitle ? seedTitle : "");
    setEditedDescription(isCreate && seedDescription ? seedDescription : "");
  }, [open, target?.type, target?.title, target?.description, isCreate]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const latestSuggestion = useMemo(() => findLatestSuggestion(messages), [messages]);
  const hasCreateDetails =
    isCreate &&
    (!!latestSuggestion?.message?.suggestedContent || !!editedTitle.trim());

  useEffect(() => {
    if (!isCreate || !latestSuggestion?.message?.suggestedContent) return;
    const sc = latestSuggestion.message.suggestedContent;
    setEditedTitle(sc.title || "");
    setEditedDescription(sc.description || "");
  }, [isCreate, latestSuggestion?.index, latestSuggestion?.message?.suggestedContent]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      const attachmentIds = attach.ids;
      if ((!trimmed && !attachmentIds.length) || loading) return;
      if (!projectId) {
        toast.error("Project context missing.");
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const nextMessages = [...messages, { role: "user", content: trimmed || "See attached", attachments: attach.readyItems }];
      setMessages(nextMessages);
      setDraft("");
      attach.clear();
      setLoading(true);

      try {
        const data = await fetchEpicStoryChat(
          projectId,
          {
            type: target.type,
            currentContent: {
              title:
                isCreate && (editedTitle.trim() || hasCreateDetails)
                  ? editedTitle
                  : target.title || "",
              description:
                isCreate && (editedDescription.trim() || hasCreateDetails)
                  ? editedDescription
                  : target.description || "",
            },
            epicContext: target.epicContext || "",
            siblingNames: Array.isArray(target.siblingNames) ? target.siblingNames : [],
            messages: nextMessages.map((m) => ({
              role: m.role,
              content: m.content || "See attached",
            })),
            ...(attachmentIds.length ? { attachmentIds } : {}),
          },
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;
        const reply = typeof data?.reply === "string" ? data.reply : "";
        const sc = data?.suggestedContent;
        const suggestedContent =
          sc && typeof sc === "object" && (sc.title || sc.description)
            ? { title: sc.title || "", description: sc.description || "" }
            : null;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply || "(no reply)",
            suggestedContent,
          },
        ]);
      } catch (err) {
        if (ac.signal.aborted || isAbortError(err)) return;
        const msg =
          typeof err?.error === "string"
            ? err.error
            : "Could not reach the AI right now. Try again.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: msg,
            suggestedContent: null,
            isError: true,
          },
        ]);
        toast.error(msg);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [
      loading,
      messages,
      projectId,
      target,
      isCreate,
      editedTitle,
      editedDescription,
      hasCreateDetails,
      attach,
    ],
  );

  const handleStopGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Generation stopped",
        suggestedContent: null,
      },
    ]);
  };

  const handleSendClick = () => {
    sendMessage(draft);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(draft);
    }
  };

  const handleConfirm = () => {
    if (isCreate) {
      if (!editedTitle.trim()) {
        toast.error("Add an epic title before continuing.");
        return;
      }
      onConfirm?.({
        title: editedTitle.trim(),
        description: editedDescription.trim(),
      });
      if (closeOnApply) onOpenChange(false);
      return;
    }
    if (!latestSuggestion?.message?.suggestedContent) {
      toast.error("Ask the AI to propose a change first, then confirm to apply it.");
      return;
    }
    onConfirm?.(latestSuggestion.message.suggestedContent);
    if (closeOnApply) onOpenChange(false);
  };

  const applyInline = (idx) => {
    const m = messages[idx];
    if (!m?.suggestedContent) return;
    onConfirm?.(m.suggestedContent);
    setAppliedIndex(idx);
    if (closeOnApply) onOpenChange(false);
  };

  const suggestedPrompts = isCreate
    ? SUGGESTED_PROMPTS_CREATE_EPIC
    : isEpic
      ? SUGGESTED_PROMPTS_EPIC
      : SUGGESTED_PROMPTS_STORY;
  const itemLabel = isEpic ? "Epic" : "Story";
  const ItemIcon = isEpic ? Zap : Bookmark;

  const showEmptyState = messages.length === 0 && !loading;

  const headerTitle = isCreate
    ? "Create with AI"
    : target?.title?.trim() || `Untitled ${itemLabel.toLowerCase()}`;
  const headerDescription = isCreate
    ? "Describe the epic you want to build. After your first prompt, you can review and edit the details."
    : `Chat to refine this ${itemLabel.toLowerCase()}'s title and description. Confirm to apply the latest suggestion to your draft.`;

  const chatComposer = (
    <div className="shrink-0 border-t border-border bg-background px-5 py-3">
      <ChatAttachmentChips items={attach.items} onRemove={attach.remove} disabled={loading} />
      <div className="relative">
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isCreate
              ? hasCreateDetails
                ? "Ask for changes to the title or description…"
                : "Describe the epic you want to create…"
              : `Ask the AI to refine this ${itemLabel.toLowerCase()}…`
          }
          rows={isCreate && !hasCreateDetails ? 3 : 2}
          className={cn(
            "resize-none pl-10 pr-12 text-sm",
            isCreate && !hasCreateDetails ? "min-h-[88px]" : "min-h-[64px]",
          )}
          disabled={loading}
        />
        <div className="absolute bottom-2 left-2">
          <ChatAttachControl
            disabled={loading}
            uploading={attach.uploading}
            onFiles={(files) => void attach.addFiles(files)}
          />
        </div>
        {loading ? (
          <div className="absolute bottom-2 right-2">
            <ComposerStopButton
              size="sm"
              onClick={handleStopGeneration}
              tooltip="Stop generating"
            />
          </div>
        ) : (
          <Button
            type="button"
            size="icon-sm"
            className="absolute bottom-2 right-2 text-white"
            onClick={handleSendClick}
            disabled={!draft.trim() && !attach.ids.length}
            aria-label="Send message"
            title="Send (Enter)"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <CornerDownLeft className="size-3" aria-hidden />
        Enter to send · Shift + Enter for newline
      </p>
    </div>
  );

  const chatMessages = (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 overflow-y-auto px-5 py-4",
        isCreate && hasCreateDetails
          ? "max-h-[min(32vh,16rem)] shrink-0"
          : "flex-1",
      )}
      role="log"
      aria-live="polite"
    >
      {showEmptyState ? (
        <EmptyState
          itemLabel={itemLabel}
          prompts={suggestedPrompts}
          onPickPrompt={(p) => sendMessage(p)}
          currentTitle={target?.title}
          currentDescription={target?.description}
          isCreate={isCreate}
        />
      ) : (
        <ul className="m-0 list-none space-y-4 p-0">
          {messages.map((m, idx) => (
            <li key={idx}>
              <ChatBubble
                message={m}
                isLatestSuggestion={
                  latestSuggestion?.index === idx && m.role === "assistant" && !!m.suggestedContent
                }
                onApplyInline={() => applyInline(idx)}
                appliedIndex={appliedIndex}
                index={idx}
                hideSuggestionCard={isCreate && hasCreateDetails}
              />
              {m.role === "user" ? <ChatMessageAttachments attachments={m.attachments} /> : null}
            </li>
          ))}
          {loading ? (
            <li>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Thinking…
              </div>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );

  const createDetailsPanel = hasCreateDetails ? (
    <div className="space-y-3 border-t border-border bg-muted/20 px-5 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold text-foreground">Epic details</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Review and edit below, or keep chatting to refine further.
      </p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="create-epic-title" className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id="create-epic-title"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Epic title"
            className="bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="create-epic-description"
            className="text-xs font-medium text-muted-foreground"
          >
            Description
          </label>
          <Textarea
            id="create-epic-description"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder="Epic description"
            rows={4}
            className="min-h-[96px] resize-none overflow-y-auto bg-background text-sm"
          />
        </div>
      </div>
    </div>
  ) : null;

  const footerActions = (
    <>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      {isCreate ? (
        hasCreateDetails ? (
          <Button
            type="button"
            className="gap-2 text-white"
            onClick={handleConfirm}
            disabled={!editedTitle.trim() || loading}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            {latestSuggestion?.message?.suggestedContent ? "Continue" : "Generate stories"}
          </Button>
        ) : null
      ) : (
        <Button
          type="button"
          className="gap-2 text-white"
          onClick={handleConfirm}
          disabled={!latestSuggestion?.message?.suggestedContent || loading}
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Confirm &amp; apply
        </Button>
      )}
    </>
  );

  const headerBadges = (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className="gap-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15"
      >
        <Sparkles className="size-3.5" aria-hidden />
        AI assistant
      </Badge>
      {!isCreate ? (
        <Badge variant="outline" className="gap-1.5 rounded-md">
          <ItemIcon className="size-3.5" aria-hidden />
          {itemLabel}
        </Badge>
      ) : null}
    </div>
  );

  if (isCreate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(92vh,820px)] min-h-0 w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border bg-muted/30 px-5 py-4 text-left">
            {headerBadges}
            <DialogTitle className="text-base font-semibold">{headerTitle}</DialogTitle>
            <DialogDescription>{headerDescription}</DialogDescription>
          </DialogHeader>

          {hasCreateDetails ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-32 flex-1 overflow-y-auto overscroll-contain">
                {createDetailsPanel}
              </div>
              {chatMessages}
            </div>
          ) : (
            <div className="flex min-h-[min(420px,55vh)] flex-1 flex-col overflow-hidden">
              {chatMessages}
            </div>
          )}

          {chatComposer}

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:flex-row sm:justify-end">
            {footerActions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border bg-muted/30 px-5 py-4">
          {headerBadges}
          <SheetTitle className="mt-2 truncate text-base font-semibold">{headerTitle}</SheetTitle>
          <SheetDescription>{headerDescription}</SheetDescription>
        </SheetHeader>

        {chatMessages}

        {chatComposer}

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3">
          {footerActions}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({
  itemLabel,
  prompts,
  onPickPrompt,
  currentTitle,
  currentDescription,
  isCreate = false,
}) {
  const hasCurrentContent = Boolean(currentTitle?.trim() || currentDescription?.trim());

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <WandSparkles className="size-4 text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            {isCreate
              ? "What epic do you want to create?"
              : `How can I help refine this ${itemLabel.toLowerCase()}?`}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {isCreate
            ? "Describe the goal, users, or scope. I'll draft a title and description for you to review."
            : "Ask me to rewrite, expand, simplify, or change the tone. I'll propose a new title and description you can apply with one click."}
        </p>
      </div>

      {!isCreate && hasCurrentContent ? (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current {itemLabel.toLowerCase()}
          </p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {currentTitle?.trim() || (
                <span className="italic text-muted-foreground">(no title yet)</span>
              )}
            </p>
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">
              {currentDescription?.trim() || "(no description yet)"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isCreate ? "Example prompts" : "Try one of these"}
        </p>
        <div className="flex flex-col gap-1.5">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPickPrompt(p)}
              className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  isLatestSuggestion,
  onApplyInline,
  appliedIndex,
  index,
  hideSuggestionCard = false,
}) {
  const isUser = message.role === "user";
  const copyText = typeof message.content === "string" ? message.content.trim() : "";

  if (isUser) {
    return (
      <div className="group flex justify-end">
        <div className="relative max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 pb-7 pl-7 text-sm text-primary-foreground shadow-sm">
          <ChatBubbleInlineCopy
            text={copyText}
            className="text-primary-foreground/70 hover:text-primary-foreground"
          />
          <ChatExpandableContent
            collapsedMaxHeight={CHAT_USER_COLLAPSED_MAX_HEIGHT}
            toggleClassName={CHAT_USER_PRIMARY_TOGGLE_CLASS}
            className="whitespace-pre-wrap"
          >
            <p className={chatUserBubbleTextClass}>{message.content}</p>
          </ChatExpandableContent>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="group flex justify-start">
        <div
          className={cn(
            "relative max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-muted/40 px-3.5 py-2 pb-7 pl-7 text-sm text-foreground shadow-sm",
            message.isError && "border-destructive/40 bg-destructive/5",
          )}
        >
          <ChatBubbleInlineCopy text={copyText} />
          <div className="min-w-0 leading-relaxed">
            <AssistantMarkdown text={message.content} collapsible />
          </div>
        </div>
      </div>
      {message.suggestedContent && !hideSuggestionCard ? (
        <div className="w-full max-w-[95%] space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" aria-hidden />
              Suggested update
            </div>
            <Button
              type="button"
              size="xs"
              variant={appliedIndex === index || isLatestSuggestion ? "default" : "outline"}
              className={cn(
                "gap-1",
                (appliedIndex === index || isLatestSuggestion) && "text-white",
              )}
              onClick={onApplyInline}
            >
              <CheckCircle2 className="size-3" aria-hidden />
              {appliedIndex === index ? "Applied" : "Use this"}
            </Button>
          </div>
          {message.suggestedContent.title ? (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </p>
              <p className="text-sm font-semibold text-foreground">
                {message.suggestedContent.title}
              </p>
            </div>
          ) : null}
          {message.suggestedContent.description ? (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {message.suggestedContent.description}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
