import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PREVIEW_COMMENT_CATEGORY_MESSAGE_CLASS,
  PREVIEW_COMMENT_CATEGORY_PANEL_CLASS,
  PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS,
  PREVIEW_COMMENT_PANEL_WIDTH_CLASS,
  normalizePreviewCommentSection,
  previewCommentElementLabel,
} from "@/lib/previewCommentCategory.util";
import { CheckCircle2, MapPin, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { ClientLinkCommentAuthorRow } from "./ClientLinkCommentAuthorRow";
import { ClientLinkCommentSectionToggle } from "./ClientLinkCommentSectionToggle";

/**
 * Thread detail: feedback conversation vs behavior rules, with resolve/delete actions.
 */
export function ClientLinkCommentThreadPanel({
  comment,
  disabled = false,
  onReply,
  onResolve,
  onReopen,
  onDelete,
  onClose,
  onFocusOnPage,
  onLogicBodyChange,
  onFixWithAi,
  className = "",
}) {
  const [activeSection, setActiveSection] = useState("comments");
  const [replyBody, setReplyBody] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [logicDraft, setLogicDraft] = useState("");
  const [logicBusy, setLogicBusy] = useState(false);

  useEffect(() => {
    setLogicDraft(comment?.logicBody || "");
  }, [comment?.id, comment?.logicBody]);

  if (!comment) return null;

  const sectionKey = normalizePreviewCommentSection(activeSection);
  const rootBody = typeof comment.body === "string" ? comment.body.trim() : "";
  const elementLabel = previewCommentElementLabel(comment);

  const handleReply = async () => {
    const text = replyBody.trim();
    if (!text) return;
    setReplyBusy(true);
    try {
      await onReply?.(comment.id, text);
      setReplyBody("");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleSaveLogic = async () => {
    setLogicBusy(true);
    try {
      await onLogicBodyChange?.(comment.id, logicDraft.trim());
    } finally {
      setLogicBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-lg",
        PREVIEW_COMMENT_PANEL_WIDTH_CLASS,
        PREVIEW_COMMENT_CATEGORY_PANEL_CLASS[sectionKey],
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Feedback on {elementLabel}
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Close thread"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="mb-3">
        <ClientLinkCommentSectionToggle
          activeSection={sectionKey}
          onSectionChange={setActiveSection}
          disabled={disabled}
          size="sm"
        />
      </div>

      {sectionKey === "comments" ? (
        <>
          <div
            className={cn(
              "mb-3 max-h-56 space-y-2 overflow-y-auto rounded-md border p-2",
              PREVIEW_COMMENT_CATEGORY_MESSAGE_CLASS.comments,
            )}
          >
            {rootBody ? (
              <div className="text-xs">
                <p className="font-medium">{comment.body}</p>
                <ClientLinkCommentAuthorRow
                  authorEmail={comment.authorEmail}
                  createdAt={comment.createdAt}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No feedback yet. Reply below to start the conversation.
              </p>
            )}
            {(comment.replies || []).map((reply) => (
              <div key={reply.id} className="border-t border-dashed border-border pt-2 text-xs">
                <p>{reply.body}</p>
                <ClientLinkCommentAuthorRow
                  authorEmail={reply.authorEmail}
                  createdAt={reply.createdAt}
                  compact
                />
              </div>
            ))}
          </div>
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={3}
            className="mb-3 min-h-[72px] resize-none text-xs"
            placeholder="Reply…"
            disabled={disabled || replyBusy}
          />
        </>
      ) : (
        <>
          <Textarea
            value={logicDraft}
            onChange={(e) => setLogicDraft(e.target.value)}
            rows={6}
            className={cn(
              "mb-3 min-h-[144px] resize-none text-xs",
              PREVIEW_COMMENT_CATEGORY_MESSAGE_CLASS.logic,
            )}
            placeholder={PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS.logic}
            disabled={disabled || logicBusy}
          />
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={disabled || logicBusy || !onLogicBodyChange}
              onClick={() => void handleSaveLogic()}
            >
              Save rules
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-2">
          {sectionKey === "comments" ? (
            <>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={disabled || replyBusy || !replyBody.trim()}
                onClick={() => void handleReply()}
              >
                Reply
              </Button>
              {onFixWithAi ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1 text-xs"
                  disabled={disabled}
                  onClick={() => onFixWithAi?.(comment)}
                >
                  <Sparkles className="size-3.5" />
                  Fix with AI
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onFocusOnPage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={disabled}
              onClick={() => onFocusOnPage?.(comment)}
            >
              <MapPin className="size-3.5" />
              Show on page
            </Button>
          ) : null}
          {comment.status === "open" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={disabled}
              onClick={() => onResolve?.(comment.id)}
            >
              <CheckCircle2 className="size-3.5" />
              Resolve
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={disabled}
              onClick={() => onReopen?.(comment.id)}
            >
              <RotateCcw className="size-3.5" />
              Reopen
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={() => onDelete?.(comment.id)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
