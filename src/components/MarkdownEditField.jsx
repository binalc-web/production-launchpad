import { useRef, useState } from "react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Markdown field: rendered markdown when saved, textarea while editing.
 */
export function MarkdownEditField({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  rows = 3,
  disabled,
  className,
  id,
}) {
  const source = typeof value === "string" ? value : "";
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);
  const ignoreBlurRef = useRef(false);
  const empty = !source.trim();

  const enterEditing = () => {
    if (disabled || editing) return;
    ignoreBlurRef.current = true;
    setEditing(true);
    onFocus?.();
    window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
      window.setTimeout(() => {
        ignoreBlurRef.current = false;
      }, 0);
    }, 0);
  };

  const handleBlur = (e) => {
    if (ignoreBlurRef.current) return;
    setEditing(false);
    onBlur?.(e);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        value={source}
        onChange={onChange}
        onFocus={() => {
          if (!editing) setEditing(true);
          onFocus?.();
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        tabIndex={editing && !disabled ? 0 : -1}
        className={cn(className, !editing && "hidden")}
        aria-hidden={!editing}
      />
      {!editing ? (
        <div
          role="button"
          tabIndex={disabled ? undefined : 0}
          aria-label={
            empty ? placeholder || "Add description" : "Edit description"
          }
          aria-disabled={disabled || undefined}
          onPointerDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            enterEditing();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              enterEditing();
            }
          }}
          className={cn(
            "min-h-[2.5rem] rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
            disabled
              ? "cursor-default opacity-60"
              : "cursor-text hover:bg-muted/30",
            empty && "text-muted-foreground",
            className,
          )}
        >
          {empty ? (
            placeholder || "Add description…"
          ) : (
            <AssistantMarkdown text={source} className="text-sm" />
          )}
        </div>
      ) : null}
    </div>
  );
}
