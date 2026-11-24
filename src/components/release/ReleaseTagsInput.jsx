import { useState } from "react";
import { X } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const RELEASE_TAGS_MAX = 10;
export const RELEASE_TAG_MAX_LEN = 32;

/**
 * Compact chip input for free-form release tags (Enter / comma to add).
 */
export function ReleaseTagsInput({
  tags = [],
  onChange,
  disabled = false,
  id = "release-tags",
  className,
}) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(tags) ? tags : [];

  const addTag = (raw) => {
    const tag = String(raw || "").trim();
    if (!tag) return;
    if (tag.length > RELEASE_TAG_MAX_LEN) return;
    if (list.length >= RELEASE_TAGS_MAX) return;
    const key = tag.toLowerCase();
    if (list.some((t) => String(t).toLowerCase() === key)) {
      setDraft("");
      return;
    }
    onChange?.([...list, tag.slice(0, RELEASE_TAG_MAX_LEN)]);
    setDraft("");
  };

  const removeAt = (index) => {
    onChange?.(list.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>Tags (optional)</Label>
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {list.map((tag, i) => (
          <Badge
            key={`${String(tag).toLowerCase()}-${i}`}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            <span className="max-w-[10rem] truncate">{tag}</span>
            {!disabled ? (
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label={`Remove tag ${tag}`}
                onClick={() => removeAt(i)}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </Badge>
        ))}
        {!disabled && list.length < RELEASE_TAGS_MAX ? (
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, RELEASE_TAG_MAX_LEN))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(draft.replace(/,/g, ""));
              } else if (e.key === "Backspace" && !draft && list.length) {
                removeAt(list.length - 1);
              }
            }}
            onBlur={() => {
              if (draft.trim()) addTag(draft);
            }}
            placeholder={list.length ? "Add tag…" : "e.g. hotfix, client-facing"}
            className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            disabled={disabled}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Up to {RELEASE_TAGS_MAX} tags. Press Enter or comma to add.
      </p>
    </div>
  );
}

/** Read-only badge row for release cards / roadmap.
 * @param {{ tags?: string[], className?: string, onTagClick?: (tag: string) => void, activeTags?: string[] }} props
 */
export function ReleaseTagsBadges({ tags, className, onTagClick, activeTags }) {
  const list = Array.isArray(tags) ? tags.filter((t) => String(t || "").trim()) : [];
  if (!list.length) return null;
  const active = new Set(
    (Array.isArray(activeTags) ? activeTags : []).map((t) => String(t).toLowerCase()),
  );
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      role="list"
      aria-label="Release tags"
    >
      {list.map((tag, i) => {
        const isActive = active.has(String(tag).toLowerCase());
        const interactive = typeof onTagClick === "function";
        const common = cn(
          "h-6 max-w-[12rem] truncate px-2 py-0 text-[11px] font-medium normal-case tracking-normal",
          isActive
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-muted/80 text-foreground",
          interactive &&
            "cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5",
        );
        if (interactive) {
          return (
            <button
              key={`${String(tag).toLowerCase()}-${i}`}
              type="button"
              role="listitem"
              title={isActive ? `Clear filter: ${tag}` : `Filter by ${tag}`}
              className={cn(badgeVariants({ variant: "outline" }), common)}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              {tag}
            </button>
          );
        }
        return (
          <Badge
            key={`${String(tag).toLowerCase()}-${i}`}
            variant="outline"
            role="listitem"
            className={common}
            title={tag}
          >
            {tag}
          </Badge>
        );
      })}
    </div>
  );
}
