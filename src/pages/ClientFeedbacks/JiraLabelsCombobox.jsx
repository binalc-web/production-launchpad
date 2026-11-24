import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { fetchProjectClientFeedbackJiraLabels } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

/** Stable hue per label string using theme chart colors. */
function labelChipToneClass(label) {
  const s = String(label || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  const tones = [
    "border-chart-1/45 bg-chart-1/12 text-chart-1",
    "border-chart-2/45 bg-chart-2/12 text-chart-2",
    "border-chart-3/45 bg-chart-3/12 text-chart-3",
    "border-chart-4/45 bg-chart-4/12 text-chart-4",
    "border-chart-5/45 bg-chart-5/12 text-chart-5",
  ];
  return tones[Math.abs(h) % tones.length];
}

function sanitizeLabel(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!s || s.length > 64) return null;
  if (!/^[a-z0-9._-]+$/.test(s)) return null;
  return s;
}

/**
 * Jira-style multi-label field: chips + typeahead + “(New label)” row.
 *
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.projectId
 * @param {string[]} props.value
 * @param {(next: string[]) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {number} [props.max]
 */
export function JiraLabelsCombobox({ id, projectId, value, onChange, disabled = false, max = 10 }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef(null);
  const fetchIdRef = useRef(0);
  const containerRef = useRef(null);

  const filteredRemote = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return (remote || []).filter((l) => {
      if (!l || value.includes(l)) return false;
      if (!q) return true;
      return String(l).toLowerCase().includes(q);
    });
  }, [remote, value, draft]);

  const newLabelSanitized = useMemo(() => sanitizeLabel(draft), [draft]);
  const showNewRow = Boolean(
    newLabelSanitized &&
    !value.includes(newLabelSanitized) &&
    !filteredRemote.some((l) => String(l).toLowerCase() === newLabelSanitized),
  );

  const rows = useMemo(() => {
    const list = filteredRemote.map((label) => ({ kind: "existing", label }));
    if (showNewRow && newLabelSanitized) {
      list.push({ kind: "new", label: newLabelSanitized, display: draft.trim() });
    }
    return list;
  }, [filteredRemote, showNewRow, newLabelSanitized, draft]);

  useEffect(() => {
    setHighlight(0);
  }, [rows.length, draft]);

  const runFetch = useCallback(
    async (q) => {
      if (!projectId || disabled) {
        setRemote([]);
        return;
      }
      const myId = ++fetchIdRef.current;
      setLoading(true);
      try {
        const data = await fetchProjectClientFeedbackJiraLabels(projectId, q);
        if (fetchIdRef.current !== myId) return;
        const labels = Array.isArray(data?.labels) ? data.labels : [];
        setRemote(labels);
      } catch (err) {
        if (fetchIdRef.current !== myId) return;
        logger.error("jira_labels_suggest", err);
        setRemote([]);
      } finally {
        if (fetchIdRef.current === myId) setLoading(false);
      }
    },
    [projectId, disabled],
  );

  useEffect(() => {
    if (!open || !projectId) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runFetch(draft.trim());
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, open, projectId, runFetch]);

  const addLabel = (raw) => {
    const s = sanitizeLabel(raw);
    if (!s || value.length >= max || value.includes(s)) return;
    onChange([...value, s]);
    setDraft("");
    setRemote([]);
    setOpen(true);
  };

  const removeTag = (label) => {
    onChange(value.filter((x) => x !== label));
  };

  const pickRow = (idx) => {
    const row = rows[idx];
    if (!row) return;
    if (row.kind === "new") addLabel(row.label);
    else addLabel(row.label);
    setOpen(true);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min((rows.length || 1) - 1, h + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && rows.length > 0) {
        pickRow(Math.min(highlight, rows.length - 1));
      } else {
        addLabel(draft);
      }
      return;
    }
    if (e.key === "Tab" || e.key === ",") {
      if (draft.trim()) {
        e.preventDefault();
        addLabel(draft);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (ev) => {
      const el = containerRef.current;
      if (el && !el.contains(ev.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={containerRef} className="relative space-y-1">
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 shadow-xs transition-all duration-200",
          open && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {value.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className={cn(
              "h-7 max-w-full gap-0.5 rounded-md pr-0.5 font-normal",
              labelChipToneClass(label),
            )}
          >
            <span className="max-w-[200px] truncate px-1">{label}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              disabled={disabled}
              onClick={() => removeTag(label)}
              aria-label={`Remove label ${label}`}
            >
              <X className="size-3.5" />
            </Button>
          </Badge>
        ))}
        <Input
          id={id}
          disabled={disabled}
          placeholder="Type to add labels…"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className="min-w-[120px] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-1"
        />
        {draft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 shrink-0 text-muted-foreground"
            disabled={disabled}
            onClick={() => setDraft("")}
            aria-label="Clear input"
          >
            <X className="size-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="size-7 shrink-0 text-muted-foreground"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle label suggestions"
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
          />
        </Button>
      </div>

      {open && (loading || rows.length > 0 || draft.trim()) ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="border-b border-border bg-muted/40 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            All labels
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {loading && rows.length === 0 ? (
              <div
                className="space-y-1 p-1"
                role="status"
                aria-busy="true"
                aria-label="Loading labels"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-sm" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No matching labels. Type a valid name and press Enter.
              </p>
            ) : (
              rows.map((row, idx) => {
                const active = idx === highlight;
                const isNew = row.kind === "new";
                return (
                  <button
                    key={`${row.kind}-${row.label}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "relative flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors duration-150",
                      active ? "bg-accent" : "hover:bg-accent/70",
                    )}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => pickRow(idx)}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        "ml-1.5 rounded border px-2 py-0.5 font-medium",
                        isNew
                          ? "border-muted-foreground/35 bg-muted/50 text-muted-foreground"
                          : labelChipToneClass(row.label),
                      )}
                    >
                      {isNew ? `${row.display} (New label)` : row.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
