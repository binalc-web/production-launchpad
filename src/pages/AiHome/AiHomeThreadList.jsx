import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquarePlus, MoreHorizontal, PanelLeft, Pencil, Trash2 } from "lucide-react";
import { LaunchpadLogo } from "@/components/common/LaunchpadLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AI_HOME_HIGHLIGHT, AI_HOME_HIGHLIGHT_HOVER } from "./aiHomeClasses";

const TITLE_MAX = 80;

function ThreadTitleEditor({ initialTitle, onSave, onCancel }) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(initialTitle);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel();
  };

  const commit = async () => {
    if (doneRef.current || saving) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Chat name cannot be empty");
      inputRef.current?.focus();
      return;
    }
    if (trimmed === initialTitle.trim()) {
      cancel();
      return;
    }
    setSaving(true);
    setError("");
    try {
      doneRef.current = true;
      await onSave(trimmed.slice(0, TITLE_MAX));
    } catch {
      doneRef.current = false;
      setError("Could not rename chat");
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-w-0 flex-1 px-2 py-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={TITLE_MAX}
        disabled={saving}
        aria-label="Rename chat"
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full min-w-0 rounded-md border bg-background px-2 py-1.5 text-sm text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
          error ? "border-destructive" : "border-border",
        )}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError("");
        }}
        onBlur={() => {
          if (!draft.trim()) {
            cancel();
            return;
          }
          void commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
      />
      {error ? <p className="mt-0.5 px-0.5 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function AiHomeThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onToggleNav,
  onBackToWorkspace,
  className,
}) {
  const [editingId, setEditingId] = useState(null);

  return (
    <aside
      className={cn(
        "flex min-h-0 w-72 shrink-0 flex-col self-stretch border-r border-border bg-sidebar",
        className,
      )}
    >
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="flex min-w-0 cursor-pointer items-center rounded-md px-1 py-0.5 hover:opacity-80"
            aria-label="Back to workspace"
          >
            <LaunchpadLogo
              alt="LaunchPad"
              className="h-[30px] w-auto max-w-[9rem] object-contain"
            />
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onBackToWorkspace}
              aria-label="Back to workspace"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onToggleNav}
              aria-label="Close chats"
            >
              <PanelLeft className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <MessageSquarePlus className="size-4 shrink-0 opacity-70" aria-hidden />
          New chat
        </button>

        <div className="mt-6">
          <p className="mb-2 px-3 text-xs text-muted-foreground">Chats</p>
          {threads.length === 0 ? (
            <p className="px-3 py-1 text-sm text-muted-foreground/80">No chats yet</p>
          ) : (
            <ul className="space-y-0.5">
              {threads.map((t) => {
                const title = t.title || "New chat";
                const isActive = activeId === t.id;
                const isEditing = editingId === t.id;

                return (
                  <li key={t.id}>
                    <div
                      className={cn(
                        "group relative flex items-center rounded-[1rem] transition-colors",
                        isActive && !isEditing && AI_HOME_HIGHLIGHT,
                        !isActive && !isEditing && AI_HOME_HIGHLIGHT_HOVER,
                      )}
                    >
                      {isEditing ? (
                        <ThreadTitleEditor
                          initialTitle={title}
                          onCancel={() => setEditingId(null)}
                          onSave={async (nextTitle) => {
                            await onRename?.(t.id, nextTitle);
                            setEditingId(null);
                          }}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelect(t.id)}
                            className="min-w-0 flex-1 cursor-pointer truncate px-3 py-2.5 pr-9 text-left text-sm text-sidebar-foreground"
                            title={title}
                          >
                            {title}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="absolute right-1 size-7 shrink-0 opacity-0 transition-opacity hover:bg-transparent dark:hover:bg-transparent group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                aria-label={`Options for ${title}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="size-4" aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(t.id);
                                }}
                              >
                                <Pencil aria-hidden />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(t.id);
                                }}
                              >
                                <Trash2 aria-hidden />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
