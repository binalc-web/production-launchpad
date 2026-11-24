import { useCallback, useState } from "react";
import {
  CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { Badge } from "@/components/ui/badge";
import { PlatformPromptBox } from "@/components/chat/PlatformPromptBox";
import { PlatformPromptSendButton } from "@/components/chat/PlatformPromptSendButton";
import { PLATFORM_PROMPT_BOX_TOOL_BTN } from "@/components/chat/platformPromptBox.classes";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import { ChatMessageAttachments } from "@/components/chat/ChatMessageAttachments";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { uploadChatAttachment } from "@/api";
import { chatComposerCanSend } from "@/lib/chatAttachments";

const DEFAULT_INTRO =
  "I edit this PRD directly. Ask me to add sections, rewrite requirements, reorganize, or refine priorities.";

export function PrdChatPanel({
  onChat,
  selectionText,
  disabled,
  projectId,
  title = "PRD editor",
  intro = DEFAULT_INTRO,
  placeholder = "Rewrite the goals section…",
  submitLabel = "Apply to document",
  className,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: intro,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const attach = useChatAttachments({
    upload: (file) => uploadChatAttachment(file, { channel: "document", scopeId: projectId }),
  });

  const send = useCallback(async () => {
    const text = input.trim();
    const attachmentIds = attach.ids;
    if ((!text && !attachmentIds.length) || sending || disabled) return;
    setSending(true);
    const userMsg = { role: "user", content: text, attachments: attach.readyItems };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    attach.clear();
    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10);
      const data = await onChat({
        message: text,
        conversationHistory: history,
        selectionText: selectionText || undefined,
        attachmentIds,
      });
      const fallback =
        data?.action === "clarify"
          ? "I need a bit more information before editing."
          : "Document updated.";
      setMessages((m) => [...m, { role: "assistant", content: data?.reply || fallback }]);
    } catch (err) {
      toast.error(err?.error || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, disabled, messages, onChat, selectionText, attach]);

  return (
    <aside
      className={cn("w-[280px] shrink-0 border-l flex flex-col bg-card/50 min-h-0", className)}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{title}</span>
        {selectionText ? (
          <Badge variant="secondary" className="ml-auto max-w-[8rem] truncate text-[10px]">
            Selection
          </Badge>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-2.5 py-2 text-xs leading-relaxed",
              m.role === "user"
                ? "bg-primary/10 border border-primary/20 ml-2"
                : "bg-muted/50 mr-1",
            )}
          >
            <ChatExpandableContent
              collapsedMaxHeight={
                m.role === "user"
                  ? CHAT_USER_COLLAPSED_MAX_HEIGHT
                  : CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT
              }
              className="whitespace-pre-wrap"
            >
              <span>{m.content}</span>
            </ChatExpandableContent>
            <ChatMessageAttachments attachments={m.attachments} />
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t p-2">
        <PlatformPromptBox
          staging={
            <ChatAttachmentChips
              items={attach.items}
              onRemove={attach.remove}
              disabled={disabled}
            />
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          rows={3}
          disabled={disabled || sending}
          onPasteFiles={attach.uploading ? null : (files) => void attach.addFiles(files)}
          textareaClassName="min-h-[72px] max-h-32 text-xs rounded-none shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          toolbarLeft={
            <ChatAttachControl
              disabled={disabled || sending}
              uploading={attach.uploading}
              onFiles={(files) => void attach.addFiles(files)}
              buttonClassName={PLATFORM_PROMPT_BOX_TOOL_BTN}
            />
          }
          toolbarRight={
            sending ? (
              <span className="inline-flex size-8 items-center justify-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
              </span>
            ) : (
              <PlatformPromptSendButton
                onSend={send}
                sendDisabled={
                  !chatComposerCanSend({
                    draft: input,
                    disabled: disabled || sending,
                    attachEnabled: true,
                    attachmentCount: attach.ids.length,
                    uploading: attach.uploading,
                  })
                }
                sendAriaLabel={submitLabel}
              />
            )
          }
        />
      </div>
    </aside>
  );
}
