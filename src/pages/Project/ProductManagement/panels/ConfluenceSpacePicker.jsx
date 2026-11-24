import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE = 40;

/**
 * @param {object} props
 * @param {{ id: string, key: string, name: string }[]} props.spaces
 * @param {string} props.value — selected space id
 * @param {(space: { id: string, key: string, name: string }) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export function ConfluenceSpacePicker({
  spaces,
  value,
  onChange,
  disabled = false,
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchRef = useRef(null);

  const rows = useMemo(() => (Array.isArray(spaces) ? spaces : []), [spaces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (space) =>
        String(space.name || "")
          .toLowerCase()
          .includes(q) ||
        String(space.key || "")
          .toLowerCase()
          .includes(q) ||
        String(space.id || "")
          .toLowerCase()
          .includes(q),
    );
  }, [rows, search]);

  const hasSearch = search.trim().length > 0;
  const visibleRows = useMemo(() => {
    if (hasSearch || showAll || filtered.length <= INITIAL_VISIBLE)
      return filtered;
    return filtered.slice(0, INITIAL_VISIBLE);
  }, [filtered, hasSearch, showAll]);

  const selected = rows.find((s) => s.id === value);

  useEffect(() => {
    if (disabled) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [disabled]);

  useEffect(() => {
    setShowAll(false);
  }, [search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${rows.length} spaces by name or key…`}
          disabled={disabled}
          className="pr-9 pl-9"
          aria-label="Search Confluence spaces"
        />
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {selected ? (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selected.name} ({selected.key})
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {rows.length > INITIAL_VISIBLE && !hasSearch
            ? `Showing first ${INITIAL_VISIBLE} — search to find others.`
            : "Select a space for the exported page."}
        </p>
      )}

      <div
        className="max-h-[min(50vh,20rem)] overflow-y-auto rounded-md border border-border bg-background shadow-inner"
        role="listbox"
        aria-label="Confluence spaces"
      >
        {visibleRows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "No spaces available."
              : "No spaces match your search."}
          </p>
        ) : (
          visibleRows.map((space) => {
            const isActive = value === space.id;
            return (
              <button
                key={space.id}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={disabled}
                onClick={() => onChange(space)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm transition-colors duration-150 last:border-b-0",
                  "hover:bg-accent/70 focus-visible:bg-accent focus-visible:outline-none",
                  isActive && "bg-accent",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <Check
                  className={cn(
                    "size-4 shrink-0 text-primary",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {space.name}
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {space.key}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {hasSearch
            ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
            : `Showing ${visibleRows.length} of ${rows.length} spaces`}
        </span>
        {!hasSearch && filtered.length > INITIAL_VISIBLE && !showAll ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => setShowAll(true)}
          >
            Show all {filtered.length}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
