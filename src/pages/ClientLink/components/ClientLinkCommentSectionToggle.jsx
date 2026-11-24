import React from "react";
import { cn } from "@/lib/utils";
import {
  PREVIEW_COMMENT_SECTIONS,
  PREVIEW_COMMENT_CATEGORY_LABELS,
  PREVIEW_COMMENT_CATEGORY_HELPER_TEXT,
  PREVIEW_COMMENT_CATEGORY_TAB_ACTIVE_CLASS,
  normalizePreviewCommentSection,
} from "@/lib/previewCommentCategory.util";

/**
 * Horizontal segmented control for feedback type: what to change vs how it should work.
 */
export function ClientLinkCommentSectionToggle({
  activeSection = "comments",
  onSectionChange,
  disabled = false,
  showHelper = true,
  size = "default",
  className = "",
}) {
  const normalized = normalizePreviewCommentSection(activeSection);
  const isSm = size === "sm";

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex rounded-lg border border-border bg-muted/40 p-0.5"
        role="group"
        aria-label="Feedback type"
      >
        {PREVIEW_COMMENT_SECTIONS.map((key) => {
          const isActive = key === normalized;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-center font-medium transition-colors",
                isSm ? "text-[11px]" : "text-xs",
                isActive
                  ? cn("shadow-sm", PREVIEW_COMMENT_CATEGORY_TAB_ACTIVE_CLASS[key])
                  : "text-muted-foreground hover:text-foreground",
                disabled && "cursor-not-allowed opacity-50",
              )}
              onClick={() => {
                if (disabled || isActive) return;
                onSectionChange?.(key);
              }}
            >
              {PREVIEW_COMMENT_CATEGORY_LABELS[key]}
            </button>
          );
        })}
      </div>
      {showHelper ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {PREVIEW_COMMENT_CATEGORY_HELPER_TEXT[normalized]}
        </p>
      ) : null}
    </div>
  );
}
