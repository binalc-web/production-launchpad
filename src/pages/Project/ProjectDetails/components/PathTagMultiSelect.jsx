import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeEmbedPathPattern } from "@/lib/embedPathRules.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function addPathTag(current, raw) {
  const t = normalizeEmbedPathPattern(raw);
  if (!t) return current;
  if (current.includes(t)) return current;
  return [...current, t];
}

export function PathTagMultiSelect({
  id,
  value,
  onChange,
  disabled = false,
  error,
  placeholder = "/login or /projects/:projectSlug, then Enter",
}) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const next = addPathTag(value, draft);
    if (next !== value) onChange(next);
    setDraft("");
  };

  const removeTag = (path) => {
    onChange(value.filter((p) => p !== path));
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
        {value.map((path) => (
          <Badge
            key={path}
            variant="secondary"
            className="h-7 max-w-full gap-0.5 pr-0.5 font-normal rounded-sm"
          >
            <span className="max-w-[220px] truncate px-1 font-mono text-xs">{path}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              disabled={disabled}
              onClick={() => removeTag(path)}
              aria-label={`Remove ${path}`}
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
          onBlur={commitDraft}
          autoComplete="off"
          className="min-w-[120px] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-1 font-mono text-sm"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
