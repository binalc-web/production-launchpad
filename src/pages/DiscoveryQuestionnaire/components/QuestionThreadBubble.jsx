import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, FileText, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime, getInitials } from "../discoveryUtils";

function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function QuestionThreadBubble({ response, isMe = false, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(response.text);
  const [saving, setSaving] = useState(false);

  const canEdit = isMe && onEdit;
  const attachment = response?.attachment;
  const attachmentUrl =
    attachment && typeof attachment.fileUrl === "string" ? attachment.fileUrl.trim() : "";
  const attachmentName =
    attachment && typeof attachment.fileName === "string" && attachment.fileName.trim()
      ? attachment.fileName.trim()
      : "Attached file";
  const sizeLabel = formatFileSize(attachment?.size);

  const startEdit = () => {
    setDraft(response.text);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(response.text);
    setEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    if (trimmed === response.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(response.id, trimmed);
      setEditing(false);
      toast.success("Answer updated");
    } catch (err) {
      toast.error(err?.error || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("space-y-1 group", isMe && "flex flex-col items-end")}>
      <div
        className={cn(
          "rounded-xl border px-4 py-3 text-sm max-w-[85%] relative",
          isMe ? "border-primary/30 bg-primary/5" : "bg-muted/30",
        )}
      >
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="text-sm resize-none min-h-[72px]"
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="size-3.5 mr-1" />
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={saveEdit} disabled={saving || !draft.trim()}>
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin mr-1" />
                ) : (
                  <Check className="size-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border bg-background/80 px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                >
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[220px]">{attachmentName}</span>
                  {sizeLabel ? <span className="text-muted-foreground">{sizeLabel}</span> : null}
                </a>
              ) : null}
              {response.text ? (
                <p className="whitespace-pre-wrap break-words">{response.text}</p>
              ) : null}
            </div>
            {canEdit && (
              <button
                type="button"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background/80"
                onClick={startEdit}
                title="Edit answer"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </>
        )}
      </div>
      <p
        className={cn(
          "text-xs text-muted-foreground flex items-center gap-2",
          isMe && "flex-row-reverse",
        )}
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
          {getInitials(response.stakeholderName)}
        </span>
        {response.stakeholderName} · {formatRelativeTime(response.updatedAt || response.createdAt)}
        {response.updatedAt && response.updatedAt !== response.createdAt ? " · edited" : null}
      </p>
    </div>
  );
}
