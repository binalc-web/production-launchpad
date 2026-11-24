import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { ComposerStopButton } from "@/components/chat/ComposerStopButton";
import { PLATFORM_PROMPT_BOX_SEND_BTN } from "@/components/chat/platformPromptBox.classes";

/**
 * Primary send / stop control for {@link PlatformPromptBox} toolbars.
 */
export function PlatformPromptSendButton({
  hasActiveRun = false,
  onSend,
  onStop,
  stopping = false,
  sending = false,
  disabled = false,
  sendDisabled = false,
  sendAriaLabel = "Send message",
  stopTooltip = "Stop agent",
  useComposerStop = true,
  className,
}) {
  if (hasActiveRun && typeof onStop === "function") {
    if (useComposerStop) {
      return (
        <ComposerStopButton
          onClick={onStop}
          disabled={stopping || disabled}
          size="sm"
          showPulse={false}
          tooltip={stopTooltip}
          className={className}
        />
      );
    }
    return (
      <Button
        type="button"
        size="icon"
        className={cn(PLATFORM_PROMPT_BOX_SEND_BTN, className)}
        onClick={onStop}
        disabled={stopping || disabled}
        aria-label="Stop"
      >
        <Square className="size-3.5 fill-current" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      className={cn(PLATFORM_PROMPT_BOX_SEND_BTN, className)}
      onClick={onSend}
      disabled={disabled || sendDisabled || sending}
      aria-label={sending ? "Sending message" : sendAriaLabel}
      aria-busy={sending}
    >
      {sending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
      )}
    </Button>
  );
}
