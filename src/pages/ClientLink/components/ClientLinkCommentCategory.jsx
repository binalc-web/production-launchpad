import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PREVIEW_COMMENT_CATEGORY_BADGE_CLASS,
  PREVIEW_COMMENT_CATEGORY_LABELS,
  normalizePreviewCommentCategory,
} from "@/lib/previewCommentCategory.util";

/**
 * Read-only category badge for comment list rows.
 */
export function ClientLinkCommentCategoryBadge({ category, className = "" }) {
  const value = normalizePreviewCommentCategory(category);
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-[10px] font-medium",
        PREVIEW_COMMENT_CATEGORY_BADGE_CLASS[value],
        className,
      )}
    >
      {PREVIEW_COMMENT_CATEGORY_LABELS[value]}
    </Badge>
  );
}
