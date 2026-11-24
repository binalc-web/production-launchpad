import React from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PromptPreviewButton } from "../PromptPreviewButton";
import { getCategoryLabel } from "../managedPromptUiLabels";

function formatUpdatedFooter(iso, editorName) {
  const who = editorName?.trim() || "—";
  if (!iso) return `— · ${who}`;
  try {
    return `${format(new Date(iso), "d MMM, HH:mm")} · ${who}`;
  } catch {
    return `— · ${who}`;
  }
}

function cardDescriptionOnly(row) {
  const d = row?.description;
  if (typeof d === "string" && d.trim()) return d.trim();
  return "No description.";
}

/**
 * @param {object} props
 * @param {object} props.row
 * @param {(row: object) => void} props.onEdit
 * @param {(row: object) => void} props.onOpenFullPreview
 */
export function PromptCard({ row, onEdit, onOpenFullPreview }) {
  const categoryLabel = getCategoryLabel(row.category);
  const description = cardDescriptionOnly(row);

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 sm:p-5",
        "ring-1 ring-transparent hover:border-primary/30 hover:shadow-md hover:ring-primary/10",
      )}
    >
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground line-clamp-2">
              {row.name}
            </h3>
            <Badge
              variant="secondary"
              className="shrink-0 truncate font-normal text-muted-foreground"
              title={categoryLabel.summary}
            >
              {categoryLabel.title}
            </Badge>
          </div>
          {row.key ? (
            <p className="truncate font-mono text-xs text-muted-foreground" title={row.key}>
              {row.key}
            </p>
          ) : null}
        </div>

        <p
          className="line-clamp-2 text-sm leading-relaxed text-muted-foreground"
          title={description}
        >
          {description}
        </p>

        {typeof row.contentLength === "number" ? (
          <p className="text-xs text-muted-foreground">
            {row.contentLength.toLocaleString()} characters
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        {row.updatedBy ? (
          <p
            className="min-w-0 flex-1 text-xs text-muted-foreground"
            title={row.updatedAt ? new Date(row.updatedAt).toLocaleString() : undefined}
          >
            {formatUpdatedFooter(row.updatedAt, row.updatedBy?.name)}
          </p>
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <PromptPreviewButton row={row} onOpenFullPreview={onOpenFullPreview} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-2 rounded-md border-border bg-background px-4 text-sm font-semibold text-foreground shadow-none hover:bg-muted/60"
            onClick={() => onEdit(row)}
          >
            <Pencil className="size-4 shrink-0" aria-hidden />
            Edit
          </Button>
        </div>
      </div>
    </article>
  );
}
