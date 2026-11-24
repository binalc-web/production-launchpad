import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, Search } from "lucide-react";
import { searchProjects } from "@/api/index";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildProjectClientUrls } from "@/lib/projectClientLinkUrls";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { writeLastProjectId } from "@/lib/lastProject";
import {
  buildConsoleQuickNavItems,
  buildConsoleQuickNavProjectItems,
  filterConsoleQuickNavItems,
  groupConsoleQuickNavItems,
} from "../../lib/consoleQuickNavCatalog";

/**
 * Icon-triggered search dialog for console destinations.
 * Uses the same DialogHeader / body / DialogFooter pattern as other app dialogs
 * (Create Release, Topic Picker, Stop Agent, etc.) — not a command-palette shell.
 */
export function ConsoleQuickNav({
  projectId,
  project = null,
  isAdmin = false,
  canAccessProjectSettings = false,
  onEditProject,
  onStartJourneyTour,
  onOpenReviewPortal,
  onOpenPreviewOnly,
  reviewPortalDisabled = false,
  previewOnlyDisabled = false,
  /** Wider search-bar trigger (workspace top bar). */
  wideTrigger = false,
  className,
}) {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { clientUrl, previewOnlyUrl } = buildProjectClientUrls(project);
  const reviewDisabled = Boolean(onOpenReviewPortal) ? reviewPortalDisabled : !clientUrl;
  const previewDisabled = Boolean(onOpenPreviewOnly) ? previewOnlyDisabled : !previewOnlyUrl;

  const items = useMemo(() => {
    const staticItems = buildConsoleQuickNavItems({
      projectId,
      isAdmin,
      canAccessProjectSettings,
    });
    return [...buildConsoleQuickNavProjectItems(projects), ...staticItems];
  }, [projectId, isAdmin, canAccessProjectSettings, projects]);

  const filtered = useMemo(() => filterConsoleQuickNavItems(items, query), [items, query]);
  const grouped = useMemo(() => groupConsoleQuickNavItems(filtered), [filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, filtered.length, open]);

  useEffect(() => {
    if (!open || !projectId) return undefined;
    let cancelled = false;
    setLoadingProjects(true);
    (async () => {
      try {
        const rows = await searchProjects({ includeInactive: true });
        if (!cancelled) setProjects(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    const node = listRef.current?.querySelector("[data-active='true']");
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const selectItem = useCallback(
    (item) => {
      if (!item) return;
      if (item.action === "review-portal" && reviewDisabled) return;
      if (item.action === "preview-only" && previewDisabled) return;

      close();

      if (item.action === "project-chat") {
        if (item.href) navigate(item.href);
        return;
      }
      if (item.action === "tour") {
        if (onStartJourneyTour) onStartJourneyTour();
        else {
          navigate(item.href || `/projects/details/${encodeURIComponent(projectId)}`, {
            state: { startJourneyTour: true },
          });
        }
        return;
      }
      if (item.action === "review-portal") {
        if (onOpenReviewPortal) onOpenReviewPortal();
        else if (clientUrl) window.open(clientUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (item.action === "preview-only") {
        if (onOpenPreviewOnly) onOpenPreviewOnly();
        else if (previewOnlyUrl) window.open(previewOnlyUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (item.action === "project-settings") {
        if (onEditProject) onEditProject();
        else if (item.href) navigate(item.href);
        return;
      }
      if (item.projectId != null) {
        writeLastProjectId(String(item.projectId));
        navigate(buildProjectDetailsPathWithResume(item.projectId, { isAdmin }));
        return;
      }
      if (item.href) navigate(item.href);
    },
    [
      close,
      reviewDisabled,
      previewDisabled,
      onStartJourneyTour,
      onOpenReviewPortal,
      onOpenPreviewOnly,
      onEditProject,
      navigate,
      projectId,
      clientUrl,
      previewOnlyUrl,
      isAdmin,
    ],
  );

  const isItemDisabled = useCallback(
    (item) =>
      (item.action === "review-portal" && reviewDisabled) ||
      (item.action === "preview-only" && previewDisabled),
    [reviewDisabled, previewDisabled],
  );

  useEffect(() => {
    if (!projectId) return undefined;
    const onKey = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setOpen((current) => {
        const next = !current;
        if (!next) setQuery("");
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId]);

  const onInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item && !isItemDisabled(item)) selectItem(item);
    }
  };

  if (!projectId) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="console-quick-nav-trigger"
        aria-label="Search anything in LaunchPad"
        title="Search anything in LaunchPad (⌘K)"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => setOpen(true)}
        className={cn(
          "h-8 shrink-0 text-sidebar-foreground",
          "bg-sidebar-accent/50 border border-sidebar-border",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          wideTrigger
            ? "size-8 justify-center p-0 md:h-8 md:w-56 md:min-w-0 md:max-w-[18rem] md:justify-start md:gap-2 md:px-3"
            : "gap-1 px-2",
          className,
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        {wideTrigger ? (
          <>
            <span className="hidden min-w-0 flex-1 truncate text-left text-[13px] font-normal text-muted-foreground md:block">
              Search…
            </span>
            <kbd
              className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:flex"
              aria-hidden
            >
              <Command className="size-3" strokeWidth={2.25} />
              <span>K</span>
            </kbd>
          </>
        ) : (
          <span
            className="flex items-center gap-0.5 text-[10px] font-medium leading-none text-muted-foreground"
            aria-hidden
          >
            <Command className="size-3" strokeWidth={2.25} />
            <span>K</span>
          </span>
        )}
      </Button>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg"
        data-testid="console-quick-nav"
      >
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
          <DialogDescription className="text-left">
            Search menus, pages, settings, and projects. Press Enter to open a result, Esc to close,
            or ⌘K to toggle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="console-quick-nav-input">Query</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="console-quick-nav-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search menus, pages, and projects…"
                className="h-10 bg-background pl-9"
                autoComplete="off"
                autoFocus
                aria-label="Search navigation"
                aria-controls="console-quick-nav-list"
                aria-activedescendant={
                  filtered[activeIndex]
                    ? `console-quick-nav-option-${filtered[activeIndex].id}`
                    : undefined
                }
              />
            </div>
          </div>

          <div
            id="console-quick-nav-list"
            ref={listRef}
            role="listbox"
            aria-label="Navigation results"
            className="max-h-[min(40vh,280px)] min-h-[160px] overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2"
          >
            {loadingProjects && projects.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Loading projects…
              </p>
            ) : null}
            {filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">No matches</p>
            ) : (
              grouped.map((section, sectionIndex) => {
                const offset = grouped
                  .slice(0, sectionIndex)
                  .reduce((sum, group) => sum + group.items.length, 0);
                return (
                  <div key={section.group} className="pb-2 last:pb-0">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {section.group}
                    </p>
                    {section.items.map((item, itemIndex) => {
                      const index = offset + itemIndex;
                      const active = index === activeIndex;
                      const disabled = isItemDisabled(item);
                      return (
                        <button
                          key={item.id}
                          id={`console-quick-nav-option-${item.id}`}
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-active={active ? "true" : undefined}
                          disabled={disabled}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectItem(item)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                            active && !disabled && "bg-primary/10 text-foreground",
                            !active && !disabled && "hover:bg-background",
                            disabled && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <span className="min-w-0 truncate font-medium">{item.label}</span>
                          {item.parent ? (
                            <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">
                              {item.parent}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
