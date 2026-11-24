import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLikelyHttpUrl, urlDedupeKey } from "@/utils/websiteList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function addUrlTag(current, raw) {
  const t = String(raw).trim();
  if (!t || !isLikelyHttpUrl(t)) return current;
  const key = urlDedupeKey(t);
  if (current.some((u) => urlDedupeKey(u) === key)) return current;
  return [...current, t];
}

/**
 * Tag-style URL input (same interaction pattern as {@link EmailMultiSelect}).
 *
 * @param {object} props
 * @param {string} props.id
 * @param {string[]} props.value
 * @param {(next: string[]) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string} [props.error]
 * @param {string} [props.placeholder]
 */
export function WebsiteUrlMultiSelect({
  id,
  value,
  onChange,
  disabled = false,
  error,
  placeholder = "https://…, then Enter",
}) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const next = addUrlTag(value, draft);
    if (next !== value) onChange(next);
    setDraft("");
  };

  const removeTag = (url) => {
    const key = urlDedupeKey(url);
    onChange(value.filter((u) => urlDedupeKey(u) !== key));
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 shadow-xs",
          disabled && "cursor-not-allowed opacity-60",
          error && "border-destructive",
        )}
      >
        {value.map((url) => (
          <Badge
            key={urlDedupeKey(url)}
            variant="secondary"
            className="h-7 max-w-full gap-0.5 pr-0.5 font-normal rounded-sm"
          >
            <span className="max-w-[220px] truncate px-1 font-mono text-xs">{url}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              disabled={disabled}
              onClick={() => removeTag(url)}
              aria-label={`Remove ${url}`}
            >
              <X className="size-3.5" />
            </Button>
          </Badge>
        ))}
        <Input
          id={id}
          disabled={disabled}
          placeholder={value.length ? "" : placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className="min-w-[140px] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}
