import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeDropdownStyle,
  resolveDropdownPortalRoot,
  useAnchoredDropdownPosition,
  useAnchoredDropdownWheel,
} from "@/hooks/useAnchoredDropdownPosition";
import { cn } from "@/lib/utils";
import { filterDevBranchOptions, sortBranchMatches } from "@/utils/projectMultiRepoForm";

/** Minimum repo path length before branch field is shown (matches parent fetch debounce). */
export const DEV_BRANCH_MIN_REPO_PATH_LEN = 10;

/** Debounce before server branch search while typing. */
export const DEV_BRANCH_SEARCH_DEBOUNCE_MS = 300;

/** Minimum typed length before server branch search runs. */
export const DEV_BRANCH_SEARCH_MIN_LEN = 2;

/** Empty branch-list state for development repo rows. */
export const EMPTY_DEV_BRANCH_DATA = {
  loading: false,
  branches: [],
  defaultBranch: "",
  truncated: false,
};

function BranchListSkeleton() {
  return (
    <li
      role="status"
      aria-busy="true"
      aria-label="Loading branches"
      className="space-y-2 px-3 py-2"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </li>
  );
}

/**
 * Progressive branch picker: hidden until repo path is set; type-to-filter combobox when branches load.
 * Search query is separate from the selected value so prefilled branches do not hide search UX.
 * @param {object} props
 * @param {string} props.repoPath
 * @param {string} props.value
 * @param {(next: string) => void} props.onChange
 * @param {{ loading?: boolean, branches?: string[], defaultBranch?: string, truncated?: boolean }} [props.branchData]
 * @param {string} [props.branchError]
 * @param {(query: string) => Promise<{ branches?: string[], defaultBranch?: string, truncated?: boolean }>} [props.onSearchBranches]
 * @param {string} props.idSuffix
 * @param {boolean} [props.disabled]
 * @param {string} [props.label]
 * @param {string} [props.labelClassName]
 * @param {() => void} [props.onOpen]
 */
export function DevelopmentRepoBranchCombobox({
  repoPath,
  value,
  onChange,
  branchData,
  branchError = "",
  onSearchBranches,
  idSuffix,
  disabled = false,
  label = "Branch",
  labelClassName,
  onOpen,
}) {
  const selectedValue = typeof value === "string" ? value : "";
  const data = branchData ?? EMPTY_DEV_BRANCH_DATA;
  const path = String(repoPath || "").trim();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDefaultBranch, setSearchDefaultBranch] = useState("");
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const containerRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const onSearchBranchesRef = useRef(onSearchBranches);

  useEffect(() => {
    onSearchBranchesRef.current = onSearchBranches;
  }, [onSearchBranches]);

  const showField = path.length >= DEV_BRANCH_MIN_REPO_PATH_LEN;
  const hasBranches = Array.isArray(data.branches) && data.branches.length > 0;
  const branchesTruncated = Boolean(data.truncated);
  const trimmedQuery = searchQuery.trim();
  const isServerSearch =
    Boolean(onSearchBranches) &&
    open &&
    hasTyped &&
    trimmedQuery.length >= DEV_BRANCH_SEARCH_MIN_LEN;

  const filteredBranches = useMemo(
    () => filterDevBranchOptions(data.branches, searchQuery),
    [data.branches, searchQuery],
  );

  const dropdownBranches = useMemo(() => {
    if (isServerSearch && searchResults.length > 0) {
      return sortBranchMatches(searchResults, trimmedQuery);
    }
    return filteredBranches;
  }, [isServerSearch, searchResults, filteredBranches, trimmedQuery]);
  const dropdownDefaultBranch = isServerSearch
    ? searchDefaultBranch || data.defaultBranch
    : data.defaultBranch;
  const dropdownLoading =
    isServerSearch && searchLoading && searchResults.length === 0 && filteredBranches.length === 0;
  const inputValue = open ? searchQuery : selectedValue;
  const showDropdown = open;
  const canNavigateDropdown =
    (hasBranches || isServerSearch) &&
    !data.loading &&
    !dropdownLoading &&
    dropdownBranches.length > 0;

  useEffect(() => {
    setHighlight(0);
  }, [dropdownBranches.length, searchQuery, isServerSearch]);

  useEffect(() => {
    const search = onSearchBranchesRef.current;
    if (!isServerSearch || !search) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchDefaultBranch("");
      setSearchTruncated(false);
      return undefined;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      search(trimmedQuery)
        .then((result) => {
          if (cancelled) return;
          setSearchResults(Array.isArray(result?.branches) ? result.branches : []);
          setSearchDefaultBranch(
            typeof result?.defaultBranch === "string" ? result.defaultBranch : "",
          );
          setSearchTruncated(Boolean(result?.truncated));
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, DEV_BRANCH_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isServerSearch, trimmedQuery, path]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setHasTyped(false);
      setSearchResults([]);
      setSearchLoading(false);
      setSearchTruncated(false);
    }
  }, [open]);

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
    maxHeight: 192,
    deps: [dropdownBranches.length, dropdownLoading, data.loading, portalTarget],
  });

  const menuStyle =
    dropdownStyle ??
    (open && anchorRef.current && portalTarget
      ? computeDropdownStyle(anchorRef.current, menuRef.current, portalTarget, 192)
      : null);

  useAnchoredDropdownWheel(menuRef, open, [dropdownBranches.length, dropdownLoading, data.loading]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, dropdownBranches.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (ev) => {
      const target = ev.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  const openDropdown = useCallback(() => {
    onOpen?.();
    setOpen(true);
    setSearchQuery("");
    setHasTyped(false);
  }, [onOpen]);

  const pickBranch = useCallback(
    (name) => {
      onChange(String(name || "").trim());
      setSearchQuery("");
      setHasTyped(false);
      setOpen(false);
    },
    [onChange],
  );

  const onKeyDown = (e) => {
    if ((!hasBranches && !isServerSearch && !onSearchBranches) || data.loading || dropdownLoading)
      return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(Math.max(dropdownBranches.length - 1, 0), h + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Enter" && open && canNavigateDropdown) {
      e.preventDefault();
      pickBranch(dropdownBranches[Math.min(highlight, dropdownBranches.length - 1)]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!showField) return null;

  const inputPlaceholder =
    data.loading || dropdownLoading
      ? undefined
      : hasBranches || onSearchBranches
        ? "Select or type branch name"
        : "Enter branch name";

  const showChevron = hasBranches || Boolean(onSearchBranches);
  const inputBusy = Boolean(data.loading || (open && isServerSearch && searchLoading));

  const dropdownMenu =
    open && menuStyle ? (
      <ul
        ref={menuRef}
        data-branch-menu
        style={menuStyle}
        className="pointer-events-auto overflow-auto overscroll-contain rounded-md border border-border bg-popover py-1 text-sm shadow-md"
        role="listbox"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {(data.loading && !hasBranches) || dropdownLoading ? (
          <BranchListSkeleton />
        ) : dropdownBranches.length === 0 ? (
          <li className="px-3 py-2 text-muted-foreground">
            {hasTyped && trimmedQuery.length < DEV_BRANCH_SEARCH_MIN_LEN
              ? `Type ${DEV_BRANCH_SEARCH_MIN_LEN} or more characters to search all branches.`
              : branchesTruncated || onSearchBranches
                ? "No matching branches. Try a different search."
                : "No branches found."}
          </li>
        ) : (
          dropdownBranches.map((item, idx) => {
            const isDefault =
              dropdownDefaultBranch && String(item) === String(dropdownDefaultBranch);
            return (
              <li key={`${idSuffix}-${item}`} role="option" aria-selected={selectedValue === item}>
                <button
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent",
                    idx === highlight && "bg-accent",
                    selectedValue === item && "font-medium",
                  )}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pickBranch(item)}
                >
                  <span className="truncate">{item}</span>
                  {isDefault ? (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">(default)</span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
        {!dropdownLoading && !data.loading && branchesTruncated && !isServerSearch ? (
          <li className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Showing the first loaded branches. Type to search the full repository.
          </li>
        ) : null}
        {!dropdownLoading && isServerSearch && searchLoading ? (
          <li
            className="border-t border-border px-3 py-2"
            role="status"
            aria-busy="true"
            aria-label="Loading more branches"
          >
            <Skeleton className="h-4 w-2/3" />
          </li>
        ) : null}
        {!dropdownLoading && searchTruncated ? (
          <li className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            More matches exist — refine your search to narrow results.
          </li>
        ) : null}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className="relative space-y-1">
      <Label
        htmlFor={`dev-branch-${idSuffix}`}
        className={cn("text-xs font-normal text-muted-foreground", labelClassName)}
      >
        {label} <span className="text-destructive">*</span>
      </Label>
      <div ref={anchorRef} className="relative">
        <Input
          id={`dev-branch-${idSuffix}`}
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value;
            setHasTyped(true);
            setSearchQuery(next);
            setOpen(true);
            onChange(next);
          }}
          onFocus={() => {
            if (!open) {
              if (hasBranches || onSearchBranches) openDropdown();
              return;
            }
            onOpen?.();
          }}
          onKeyDown={onKeyDown}
          placeholder={inputPlaceholder}
          disabled={disabled || data.loading}
          autoComplete="off"
          className={cn((showChevron || inputBusy) && "pr-9")}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-busy={inputBusy || undefined}
          role="combobox"
        />
        {showChevron ? (
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
      {open && portalTarget && dropdownMenu ? createPortal(dropdownMenu, portalTarget) : null}
      {branchError ? (
        <p className="text-xs text-destructive" role="alert">
          {branchError}
        </p>
      ) : null}
    </div>
  );
}
