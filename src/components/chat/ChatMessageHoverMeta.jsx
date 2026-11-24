import React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessageCopyButton } from "@/components/chat/ChatMessageCopyButton";
import { formatChatPromptTimestamp } from "@/lib/formatChatPromptTimestamp";
import { cn } from "@/lib/utils";

/** Timestamp + copy (+ optional edit) — visible on bubble hover (AI Home / panel chats). */
export const ChatMessageHoverMeta = React.memo(function ChatMessageHoverMeta({
  createdAt,
  text,
  align = "end",
  onEdit,
  className,
}) {
  const label = formatChatPromptTimestamp(createdAt);
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!label && !trimmed) return null;

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        align === "end" ? "mt-1.5 justify-end" : "mt-2 justify-start",
        className,
      )}
    >
      {label ? (
        <time
          className="text-[10px] font-medium tabular-nums text-muted-foreground"
          dateTime={createdAt ? new Date(createdAt).toISOString() : undefined}
        >
          {label}
        </time>
      ) : null}
      {trimmed ? (
        <ChatMessageCopyButton
          text={trimmed}
          showLabel
          className="h-6 gap-1 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        />
      ) : null}
      {onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 gap-1 bg-transparent px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent dark:hover:bg-transparent"
          onClick={onEdit}
          aria-label="Edit message"
          title="Edit message"
        >
          <Pencil className="size-3.5" aria-hidden />
          <span>Edit</span>
        </Button>
      ) : null}
    </div>
  );
});
