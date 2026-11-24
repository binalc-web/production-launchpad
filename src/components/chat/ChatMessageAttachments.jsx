import { useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import { ImagePreviewDialog } from "@/components/images/ImagePreviewDialog";
import { cn } from "@/lib/utils";

function PersistedImageThumb({ att, onPreview }) {
  const [status, setStatus] = useState("loading");
  if (status === "error") {
    return (
      <span className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-md border bg-muted/40 px-2 text-center text-muted-foreground">
        <ImageOff className="size-4" aria-hidden />
        <span className="max-w-full truncate text-[10px]">{att.fileName || "Image couldn't be loaded"}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="relative block w-full overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Preview ${att.fileName || "image"}`}
      onClick={() => onPreview(att)}
    >
      <img
        src={att.url}
        alt={att.fileName || "Attached image"}
        className="max-h-28 w-full rounded-md border object-cover"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? (
        <span className="absolute inset-0 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : null}
    </button>
  );
}

/**
 * Render persisted message attachments.
 */
export function ChatMessageAttachments({ attachments, className }) {
  const [preview, setPreview] = useState(null);
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return null;

  return (
    <>
      <ul className={cn("mt-2 flex flex-wrap gap-2", className)}>
        {list.map((att) => {
          const isImage = att.kind === "image" && att.url;
          if (isImage) {
            return (
              <li key={att.id || att.fileName} className="w-[180px] max-w-[180px]">
                <PersistedImageThumb att={att} onPreview={setPreview} />
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{att.fileName}</p>
              </li>
            );
          }
          return (
            <li
              key={att.id || att.fileName}
              className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px]"
            >
              <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {att.url ? (
                <a href={att.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                  {att.fileName || "PDF"}
                </a>
              ) : (
                <span className="truncate">{att.fileName || "PDF"}</span>
              )}
            </li>
          );
        })}
      </ul>
      <ImagePreviewDialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        src={preview?.url}
        fileName={preview?.fileName}
        alt={preview?.fileName || "Attached image"}
      />
    </>
  );
}
