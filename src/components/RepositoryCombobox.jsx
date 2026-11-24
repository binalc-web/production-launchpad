import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeDropdownStyle,
  resolveDropdownPortalRoot,
  useAnchoredDropdownPosition,
  useAnchoredDropdownWheel,
} from "@/hooks/useAnchoredDropdownPosition";
import { cn } from "@/lib/utils";
import { filterRepositoryOptions } from "@/utils/repositorySearch";

const MENU_MAX_HEIGHT = 320;

function renderOptionIcon(icon) {
  if (!isValidElement(icon)) return icon ?? null;
  return cloneElement(icon);
}

function RepoListSkeleton() {
  return (
    <li
      role="status"
      aria-busy="true"
      aria-label="Loading repositories"
      className="space-y-2 px-2 py-2"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </li>
  );
}

/**
 * Shared single-select repository picker. Type in the menu to filter by repo name or path.
 * @param {object} props
 * @param {string} [props.value]
 * @param {(next: string) => void} props.onValueChange
 * @param {Array<{ value: string, label: string, icon?: import("react").ReactNode }>} [props.options]
 * @param {string} [props.placeholder]
 * @param {string} [props.searchPlaceholder]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.hasMore]
 * @param {() => void} [props.onLoadMore]
 * @param {string} [props.triggerClassName]
 * @param {string} [props.optionClassName]
 * @param {string} [props.id]
 */
export function RepositoryCombobox({
  value = "",
  onValueChange,
  options = [],
  placeholder = "Choose repository",
  searchPlaceholder = "Search repository",
  disabled = false,
  loading = false,
  hasMore = false,
  onLoadMore,
  triggerClassName,
  optionClassName,
  id,
}) {
  const selectedValue = typeof value === "string" ? value : "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const optionRefs = useRef([]);

  const filtered = useMemo(() => filterRepositoryOptions(options, query), [options, query]);
  const selected = options.find((option) => option.value === selectedValue) ?? null;
  const selectedLabel = selected?.label || selectedValue;
  const triggerIcon = selected?.icon ?? null;
  const trimmedQuery = query.trim();
  const showLoadMore = Boolean(hasMore && onLoadMore);
  const showInitialSkeleton = loading && options.length === 0 && !selectedValue;

  useEffect(() => {
    setHighlight(0);
  }, [query, filtered.length]);

  const focusedSearchRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, filtered.length]);

  const portalTargetRef = useRef(null);
  const portalTarget =
    open && typeof document !== "undefined"
      ? (resolveDropdownPortalRoot(containerRef.current) ?? document.body)
      : null;
  portalTargetRef.current = portalTarget;

  const dropdownStyle = useAnchoredDropdownPosition({
    open,
    anchorRef,
    menuRef,
    portalRootRef: portalTargetRef,
    maxHeight: MENU_MAX_HEIGHT,
    deps: [filtered.length, loading, showLoadMore, portalTarget, trimmedQuery],
  });

  const menuStyle =
    dropdownStyle ??
    (open && anchorRef.current && portalTarget
      ? computeDropdownStyle(anchorRef.current, menuRef.current, portalTarget, MENU_MAX_HEIGHT)
      : null);

  useAnchoredDropdownWheel(menuRef, open, [filtered.length, loading, showLoadMore]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      focusedSearchRef.current = false;
      return;
    }
    if (!menuStyle || focusedSearchRef.current) return;
    const selectedIndex = filtered.findIndex((option) => option.value === selectedValue);
    if (selectedIndex >= 0) setHighlight(selectedIndex);
    searchRef.current?.focus();
    focusedSearchRef.current = true;
  }, [open, menuStyle, filtered, selectedValue]);

  const pick = (next) => {
    onValueChange(String(next || ""));
    setQuery("");
    setOpen(false);
    anchorRef.current?.querySelector("button")?.focus();
  };

  const onSearchKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length === 0) return;
      setHighlight((current) => Math.min(filtered.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[Math.min(highlight, filtered.length - 1)];
      if (option) pick(option.value);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      anchorRef.current?.querySelector("button")?.focus();
    }
  };

  if (showInitialSkeleton) {
    return (
      <Skeleton
        className="h-9 w-full rounded-md"
        role="status"
        aria-busy="true"
        aria-label="Loading repositories"
      />
    );
  }

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        style={menuStyle}
        className="pointer-events-auto overflow-auto overscroll-contain rounded-md border border-border bg-popover text-sm shadow-md"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoComplete="off"
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-md border bg-transparent pr-3 pl-8 text-sm outline-none focus-visible:ring-[3px]"
            />
          </div>
        </div>
        <ul role="listbox" aria-label="Repositories" className="p-1">
          {loading && options.length === 0 ? (
            <RepoListSkeleton />
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">
              {trimmedQuery
                ? showLoadMore
                  ? `No repository matches “${trimmedQuery}”. Load more to keep searching.`
                  : `No repository matches “${trimmedQuery}”.`
                : "No repositories found."}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === selectedValue;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent",
                      (isSelected || index === highlight) && "bg-accent",
                      optionClassName,
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(option.value)}
                  >
                    {option.icon ? (
                      <span className="shrink-0">{renderOptionIcon(option.icon)}</span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          )}
          {loading && options.length > 0 ? (
            <li
              className="px-2 py-2"
              role="status"
              aria-busy="true"
              aria-label="Loading more repositories"
            >
              <Skeleton className="h-8 w-full" />
            </li>
          ) : null}
        </ul>
        {showLoadMore ? (
          <div className="sticky bottom-0 border-t border-border bg-popover p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={() => onLoadMore()}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      <div ref={anchorRef}>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "border-input flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm shadow-xs outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedLabel && "text-muted-foreground",
            triggerClassName,
          )}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {triggerIcon ? <span className="shrink-0">{renderOptionIcon(triggerIcon)}</span> : null}
            <span className="truncate">{selectedLabel || placeholder}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </div>
      {open && portalTarget && menu ? createPortal(menu, portalTarget) : null}
    </div>
  );
}
