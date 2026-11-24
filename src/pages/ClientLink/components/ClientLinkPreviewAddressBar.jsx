import React, { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatPathForDisplay(path) {
  const t = String(path ?? "").trim();
  if (!t) return "/";
  const cleaned = t.replace(/\?&/, "?").replace(/\?$/, "");
  return cleaned === "" ? "/" : cleaned;
}

/**
 * Editable preview path bar — Enter navigates the iframe to the typed route.
 */
export function ClientLinkPreviewAddressBar({ browsePath, onNavigate, onSync, className }) {
  const displayPath = formatPathForDisplay(browsePath);
  const [draft, setDraft] = useState(displayPath);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(displayPath);
    }
  }, [displayPath, editing]);

  const submit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onNavigate?.(trimmed);
    setEditing(false);
  }, [draft, onNavigate]);

  return (
    <form
      className={cn("flex min-w-0 flex-1 items-center", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        value={draft}
        onChange={(e) => {
          setEditing(true);
          setDraft(e.target.value);
        }}
        onFocus={() => {
          onSync?.();
          setEditing(true);
        }}
        onBlur={() => {
          setEditing(false);
          setDraft(displayPath);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(displayPath);
            e.currentTarget.blur();
          }
        }}
        className="h-8 font-mono text-xs"
        aria-label="Preview URL path"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="/"
      />
    </form>
  );
}
