import { useState } from "react";
import { FileText, ImageOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePreviewDialog } from "@/components/images/ImagePreviewDialog";
import { cn } from "@/lib/utils";

function StagedImageThumb({ item, onPreview }) {
  const [status, setStatus] = useState("loading");
  if (status === "error") {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" title={item.fileName || "Image"}>
        <ImageOff className="size-4" aria-hidden />
        <span className="sr-only">{item.fileName || "Image couldn't be loaded"}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="relative size-11 shrink-0 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Preview ${item.fileName || "image"}`}
      onClick={() => onPreview(item)}
    >
      <img
        src={item.previewUrl}
        alt=""
        className="size-11 rounded-md object-cover"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-muted/60">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

/**
 * Staging chips for pending chat attachments.
 */
export function ChatAttachmentChips({ items = [], onRemove, disabled = false, className }) {
  const [preview, setPreview] = useState(null);
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;

  return (
    <>
      <ul className={cn("mb-2 flex flex-wrap gap-1.5", className)}>
        {list.map((item) => {
          const uploading = item.status === "uploading";
          const failed = item.status === "error";
          const isImage = item.kind === "image" && item.previewUrl;
          return (
            <li
              key={item.localId || item.id}
              className={cn(
                "flex max-w-full items-center gap-1.5 rounded-full border bg-muted/60 py-0.5 pl-1 pr-1 text-[11px]",
                failed && "border-destructive/40 text-destructive",
              )}
            >
              {isImage ? (
                <StagedImageThumb item={item} onPreview={setPreview} />
              ) : (
                <FileText className="ml-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="max-w-[140px] truncate">{item.fileName || "file"}</span>
              {uploading ? <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden /> : null}
              {onRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-5 rounded-full"
                  disabled={disabled || uploading}
                  aria-label={`Remove ${item.fileName || "attachment"}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(item);
                  }}
                >
                  <X className="size-3" aria-hidden />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ImagePreviewDialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        src={preview?.previewUrl || preview?.url}
        fileName={preview?.fileName}
        alt={preview?.fileName || "Attached image"}
      />
    </>
  );
}
