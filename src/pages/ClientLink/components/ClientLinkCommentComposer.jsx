import React, { useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import { ClientLinkCommentSectionToggle } from "./ClientLinkCommentSectionToggle";
import {
  PREVIEW_COMMENT_CATEGORY_PANEL_CLASS,
  PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS,
  PREVIEW_COMMENT_CATEGORY_SUBMIT_LABELS,
  PREVIEW_COMMENT_CATEGORY_VALIDATION,
  PREVIEW_COMMENT_PANEL_WIDTH_CLASS,
  normalizePreviewCommentSection,
  previewCommentElementLabel,
} from "@/lib/previewCommentCategory.util";

/**
 * Inline composer for a new preview feedback pin.
 */
export const ClientLinkCommentComposer = React.forwardRef(function ClientLinkCommentComposer(
  { anchor = null, submitLabel, initialBody = "", disabled = false, onCancel, onSubmit },
  ref,
) {
  const textareaRef = useRef(null);
  const [body, setBody] = useState(initialBody);
  const [activeSection, setActiveSection] = useState("comments");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus({ preventScroll: true });
    },
  }));

  const sectionKey = normalizePreviewCommentSection(activeSection);
  const elementLabel = previewCommentElementLabel({ anchor });
  const resolvedSubmitLabel = submitLabel || PREVIEW_COMMENT_CATEGORY_SUBMIT_LABELS[sectionKey];

  const handleSubmit = async () => {
    const text = body.trim();
    if (!text) {
      setError(PREVIEW_COMMENT_CATEGORY_VALIDATION[sectionKey]);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (sectionKey === "logic") {
        await onSubmit?.({
          logicBody: text,
          body: "",
          category: "logic",
        });
      } else {
        await onSubmit?.({
          body: text,
          category: "comments",
        });
      }
      setBody("");
      setActiveSection("comments");
    } catch (err) {
      const msg = err?.error || err?.message || "Could not post feedback. Try again.";
      setError(typeof msg === "string" ? msg : "Could not post feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-lg",
        PREVIEW_COMMENT_PANEL_WIDTH_CLASS,
        PREVIEW_COMMENT_CATEGORY_PANEL_CLASS[sectionKey],
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">New feedback</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">Pinned to {elementLabel}</p>
        </div>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Cancel"
            disabled={submitting}
            onClick={onCancel}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="mb-3">
        <ClientLinkCommentSectionToggle
          activeSection={sectionKey}
          onSectionChange={setActiveSection}
          disabled={disabled || submitting}
        />
      </div>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        )}
        placeholder={PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS[sectionKey]}
        disabled={disabled || submitting}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      />
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={disabled || submitting || !body.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : resolvedSubmitLabel}
        </Button>
      </div>
    </div>
  );
});
