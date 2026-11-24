import { useId, useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHAT_ATTACH_ACCEPT } from "@/lib/chatAttachments";

/**
 * Hidden file input + paperclip button for chat composers.
 * The button must open the picker via input.click() — a nested type="button"
 * does not activate the label's file input in browsers.
 */
export function ChatAttachControl({
  disabled = false,
  uploading = false,
  onFiles,
  accept = CHAT_ATTACH_ACCEPT,
  multiple = true,
  className,
  size = "icon-sm",
  label = "Attach image, PDF, or Markdown",
  variant = "ghost",
  buttonClassName,
  text,
}) {
  const inputRef = useRef(null);
  const inputId = useId();
  const blocked = disabled || uploading;

  return (
    <div className={cn("relative z-10 inline-flex", className)}>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={blocked}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length) onFiles?.(files);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={blocked}
        className={cn(
          text ? "gap-2" : variant === "ghost" && "text-muted-foreground",
          buttonClassName,
        )}
        aria-label={text ? undefined : label}
        title={label}
        onClick={() => {
          if (blocked) return;
          inputRef.current?.click();
        }}
      >
        <Paperclip className="size-4" aria-hidden />
        {text}
      </Button>
    </div>
  );
}
