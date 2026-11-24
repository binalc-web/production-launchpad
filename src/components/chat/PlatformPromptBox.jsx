import { Textarea } from "@/components/ui/textarea";
import { chatAttachFilesFromClipboard } from "@/lib/chatAttachments";
import { cn } from "@/lib/utils";
import {
  PLATFORM_PROMPT_BOX_BODY,
  PLATFORM_PROMPT_BOX_SURFACE,
  PLATFORM_PROMPT_BOX_TEXTAREA,
  PLATFORM_PROMPT_BOX_TOOLBAR,
} from "@/components/chat/platformPromptBox.classes";

/**
 * Cursor-style prompt shell: rounded surface, body (staging + textarea or custom children), toolbar row.
 */
export function PlatformPromptBox({
  children,
  staging = null,
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows = 2,
  disabled = false,
  textareaClassName,
  textareaRef,
  "aria-label": ariaLabel,
  toolbarLeft = null,
  toolbarRight = null,
  footer = null,
  beforeSurface = null,
  className,
  bodyClassName,
  toolbarClassName,
  pathDropActive = false,
  onPasteFiles = null,
  ...surfaceProps
}) {
  const showToolbar = toolbarLeft != null || toolbarRight != null;

  const handlePaste = (event) => {
    if (disabled || typeof onPasteFiles !== "function") return;
    const files = chatAttachFilesFromClipboard(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    onPasteFiles(files);
  };

  return (
    <>
      {beforeSurface}
      <div
        className={cn(
          PLATFORM_PROMPT_BOX_SURFACE,
          "transition-shadow",
          pathDropActive && "border-primary/60 ring-2 ring-primary/20",
          className,
        )}
        {...surfaceProps}
      >
        {children ?? (
          <div className={cn(PLATFORM_PROMPT_BOX_BODY, bodyClassName)}>
            {staging}
            {value !== undefined ? (
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                aria-label={ariaLabel}
                className={cn(PLATFORM_PROMPT_BOX_TEXTAREA, textareaClassName)}
              />
            ) : null}
          </div>
        )}
        {showToolbar ? (
          <div className={cn(PLATFORM_PROMPT_BOX_TOOLBAR, toolbarClassName)}>
            <div className="flex min-w-0 items-center justify-between gap-1 max-[480px]:flex-nowrap max-[480px]:gap-0.5">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 max-[480px]:flex-nowrap max-[480px]:gap-1 max-[480px]:overflow-hidden">
                {toolbarLeft}
              </div>
              {toolbarRight ? (
                <div className="flex shrink-0 items-center gap-1.5">{toolbarRight}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {footer}
    </>
  );
}
