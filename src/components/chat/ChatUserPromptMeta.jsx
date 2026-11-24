import React from "react";
import { ChatMessageCopyButton } from "@/components/chat/ChatMessageCopyButton";
import { formatChatPromptTimestamp } from "@/lib/formatChatPromptTimestamp";
import { cn } from "@/lib/utils";

/**
 * Date/time + Copy control for a user chat prompt bubble.
 * Timestamp uses submission `createdAt` (`25 Aug, 2026 03:45 PM`).
 */
export const ChatUserPromptMeta = React.memo(function ChatUserPromptMeta({
  createdAt,
  text,
  className,
  borderClassName,
  timeClassName,
  copyClassName,
}) {
  const label = formatChatPromptTimestamp(createdAt);
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!label && !trimmed) return null;

  return (
    <div
      className={cn(
        "mt-2 flex w-full flex-wrap items-center justify-end gap-1.5 border-t pt-1.5",
        borderClassName ?? "border-primary-foreground/25",
        className,
      )}
    >
      {label ? (
        <time
          className={cn(
            "text-[10px] font-medium tabular-nums text-primary-foreground/70",
            timeClassName,
          )}
          dateTime={createdAt ? new Date(createdAt).toISOString() : undefined}
        >
          {label}
        </time>
      ) : null}
      {trimmed ? (
        <ChatMessageCopyButton
          text={trimmed}
          showLabel
          className={cn(
            "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
            copyClassName,
          )}
        />
      ) : null}
    </div>
  );
});
