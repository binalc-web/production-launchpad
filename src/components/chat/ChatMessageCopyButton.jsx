import React, { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Plain-text body to copy for a chat row (user, assistant, system, scratch prompt).
 */
export function resolveChatMessageCopyText(msg, elementSplit = null) {
  if (elementSplit?.userText) {
    return String(elementSplit.userText).trim();
  }
  if (msg?.role === "assistant" && Boolean(msg?.generationStopped)) {
    const raw =
      typeof msg.partialText === "string"
        ? msg.partialText
        : typeof msg.text === "string"
          ? msg.text
          : "";
    const trimmed = raw.trim();
    return trimmed && trimmed.toLowerCase() !== "stopped" ? trimmed : "";
  }
  if (typeof msg?.text === "string") {
    return msg.text.trim();
  }
  if (typeof msg?.content === "string") {
    return msg.content.trim();
  }
  return "";
}

/** Positions copy control inside a `relative` message bubble (bottom-left). */
export const CHAT_BUBBLE_INLINE_COPY_CLASS =
  "absolute bottom-1 left-1 z-10 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100";

export const ChatBubbleInlineCopy = React.memo(function ChatBubbleInlineCopy({
  text,
  className,
}) {
  return (
    <ChatMessageCopyButton
      text={text}
      className={cn(CHAT_BUBBLE_INLINE_COPY_CLASS, className)}
    />
  );
});

export const ChatMessageCopyButton = React.memo(function ChatMessageCopyButton({
  text,
  className,
  /** When true, always show a Copy / Copied text label (user prompt meta). */
  showLabel = false,
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = typeof text === "string" ? text.trim() : "";
  const canCopy = trimmed.length > 0;

  const handleCopy = useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [trimmed, canCopy]);

  if (!canCopy) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      className={cn(
        // Keep hover/active transparent — ghost's hover:bg-accent reads as a white chip on primary bubbles.
        "shrink-0 bg-transparent transition-opacity hover:bg-transparent active:bg-transparent dark:hover:bg-transparent dark:active:bg-transparent",
        showLabel
          ? "h-6 gap-1 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          : "h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        className,
      )}
      onClick={() => void handleCopy()}
      aria-label={copied ? "Copied" : "Copy message"}
      title={copied ? "Copied" : "Copy message"}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-600" aria-hidden />
          {showLabel ? <span className="font-medium text-emerald-600">Copied</span> : null}
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          {showLabel ? <span>Copy</span> : null}
        </>
      )}
    </Button>
  );
});
