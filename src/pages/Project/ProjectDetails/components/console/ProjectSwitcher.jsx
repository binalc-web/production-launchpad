import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Folder, Loader2, Plus, Search, Star } from "lucide-react";
import { searchProjects, setProjectFavorite } from "@/api/index";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import {
  partitionSwitcherProjects,
  readRecentProjectIds,
  writeLastProjectId,
} from "@/lib/lastProject";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { toast } from "sonner";
import { PROJECT_CONSOLE_SWITCHER_INSET_PX } from "./projectSidebarState";

const OTHERS_VISIBLE_CAP = 5;
const PROJECT_ROW_SKELETON_WIDTHS = ["w-36", "w-28", "w-40", "w-24", "w-32"];

/**
 * Top-right project switcher: searchable list + recent, then favorites, then the rest.
 * @param {"default"|"sidebar"} [variant]
 */
export function ProjectSwitcher({
  projectId = null,
  projectName = null,
  variant = "default",
  className,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState(null);
  const [switchingTo, setSwitchingTo] = useState(null);
  const isSwitching = switchingTo != null;
  const label = isSwitching
    ? switchingTo.name?.trim() || switchingTo.id
    : projectName?.trim() || "Select project";
  const initial = (label[0] || "P").toUpperCase();
  const isSidebar = variant === "sidebar";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projectRows = await searchProjects({ includeInactive: true });
      setProjects(Array.isArray(projectRows) ? projectRows : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!switchingTo || projectId == null) return;
    if (String(projectId) === String(switchingTo.id)) {
      setSwitchingTo(null);
    }
  }, [projectId, switchingTo]);

  useEffect(() => {
    if (!switchingTo) return;
    const timeoutId = window.setTimeout(() => setSwitchingTo(null), 20000);
    return () => window.clearTimeout(timeoutId);
  }, [switchingTo]);

  const { recent, favorites, others, filtered, othersHiddenCount, isSearching } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isSearching = q.length > 0;
    const list = !isSearching
      ? projects
      : projects.filter((p) =>
          String(p.name ?? "")
            .toLowerCase()
            .includes(q),
        );
    const groups = partitionSwitcherProjects(list, readRecentProjectIds());
    const othersVisible = groups.others.slice(0, OTHERS_VISIBLE_CAP);
    const othersHiddenCount = Math.max(0, groups.others.length - othersVisible.length);
    return {
      ...groups,
      others: othersVisible,
      filtered: list,
      othersHiddenCount,
      isSearching,
    };
  }, [projects, query]);

  const openProject = (id, name) => {
    const pid = String(id);
    if (projectId != null && String(projectId) === pid) {
      setOpen(false);
      setQuery("");
      return;
    }
    setSwitchingTo({ id: pid, name: name?.trim() || pid });
    writeLastProjectId(pid);
    navigate(buildProjectDetailsPathWithResume(pid, { isAdmin }));
    setOpen(false);
    setQuery("");
  };

  const toggleFavorite = async (project, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!project?.id || favoriteUpdatingId != null) return;
    const id = project.id;
    const nextFavorite = !Boolean(project.isFavorite);
    setFavoriteUpdatingId(id);
    setProjects((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? { ...p, isFavorite: nextFavorite } : p)),
    );
    try {
      await setProjectFavorite(id, nextFavorite);
    } catch (err) {
      setProjects((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, isFavorite: !nextFavorite } : p)),
      );
      toast.error(
        typeof err?.error === "string" ? err.error : (err?.message ?? "Failed to update favorite"),
      );
    } finally {
      setFavoriteUpdatingId(null);
    }
  };

  const sectionLabelClass =
    "px-3 pb-0.5 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60";

  const renderProjectRow = (project) => {
    const id = String(project.id);
    const active = projectId != null && String(projectId) === id;
    const isFavorite = Boolean(project.isFavorite);
    const starring = favoriteUpdatingId != null && String(favoriteUpdatingId) === id;

    return (
      <DropdownMenuItem
        key={id}
        className={cn(
          "group mx-1.5 gap-2 rounded-md px-2 py-1 pr-1 text-[13.5px] text-sidebar-foreground/85",
          "focus:bg-sidebar-accent/70 focus:text-sidebar-foreground",
          "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
          active && "bg-primary/10 font-medium text-primary focus:bg-primary/10 focus:text-primary",
        )}
        onSelect={(e) => {
          e.preventDefault();
          openProject(id, project.name);
        }}
      >
        {active ? (
          <Check className="size-3 shrink-0 text-primary" aria-hidden />
        ) : (
          <span className="size-3 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">{project.name || id}</span>
        <button
          type="button"
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
            isFavorite
              ? "text-amber-500 opacity-100 hover:bg-amber-500/10 hover:text-amber-600"
              : "text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-sidebar-foreground group-focus-within:opacity-100 group-hover:opacity-100",
          )}
          aria-label={
            isFavorite ? `Unfavorite ${project.name || id}` : `Favorite ${project.name || id}`
          }
          aria-pressed={isFavorite}
          disabled={starring}
          onClick={(e) => void toggleFavorite(project, e)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Star className={cn("size-3", isFavorite && "fill-current")} aria-hidden />
        </button>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu
      open={open && !isSwitching}
      onOpenChange={(next) => {
        if (isSwitching) return;
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isSwitching}
          className={cn(
            isSidebar
              ? "h-auto w-full justify-start gap-2.5 rounded-xl border border-sidebar-border bg-transparent px-3 py-2 text-[14px] font-semibold text-sidebar-foreground hover:bg-sidebar-accent/60"
              : [
                  "h-8 shrink-0 max-w-[14rem] gap-1.5 text-sidebar-foreground",
                  "bg-sidebar-accent/50 border border-sidebar-border",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                ],
            isSwitching && "cursor-wait opacity-90",
            className,
          )}
          aria-label={isSwitching ? `Switching to ${label}` : "Switch project"}
          aria-busy={isSwitching}
        >
          {isSidebar ? (
            <>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                  isSwitching && "opacity-70",
                )}
                style={{ background: "linear-gradient(135deg, #f4a04a, #e07b2a)" }}
                aria-hidden
              >
                {initial}
              </span>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              {isSwitching ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
              )}
            </>
          ) : (
            <>
              {isSwitching ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <Folder className="size-4 shrink-0" aria-hidden />
              )}
              <span className="h-4 w-px shrink-0 bg-sidebar-border" aria-hidden />
              <span className="min-w-0 truncate text-xs font-medium">{label}</span>
              {!isSwitching ? (
                <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
              ) : null}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isSidebar ? "start" : "end"}
        alignOffset={isSidebar ? -PROJECT_CONSOLE_SWITCHER_INSET_PX : 0}
        className={cn(
          "overflow-hidden rounded-xl border-sidebar-border bg-popover p-0 text-popover-foreground shadow-lg",
          isSidebar ? "w-[280px]" : "w-72",
        )}
      >
        <div
          className="border-b border-sidebar-border px-2.5 py-2"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") return;
            e.stopPropagation();
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            const items = e.currentTarget
              .closest('[role="menu"]')
              ?.querySelectorAll('[role="menuitem"]:not([data-disabled])');
            if (!items?.length) return;
            e.preventDefault();
            items[e.key === "ArrowDown" ? 0 : items.length - 1].focus();
          }}
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="h-8 rounded-lg border-sidebar-border bg-transparent pl-8 text-[13.5px] shadow-none focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring/40"
              autoComplete="off"
              autoFocus
              aria-label="Search projects"
            />
          </div>
        </div>
        <div className="max-h-[min(22rem,50vh)] overflow-y-auto pb-1">
          {loading ? (
            <div
              className="space-y-1 px-1.5 py-1"
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Loading projects"
            >
              {PROJECT_ROW_SKELETON_WIDTHS.map((width, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="size-3 shrink-0" />
                  <Skeleton className={cn("h-3.5", width)} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-muted-foreground">No projects found</p>
          ) : isSearching ? (
            <div className="py-1">{filtered.map((p) => renderProjectRow(p))}</div>
          ) : (
            <>
              {recent.length > 0 ? (
                <div className="pb-0.5">
                  <DropdownMenuLabel className={sectionLabelClass}>Recent</DropdownMenuLabel>
                  {recent.map((p) => renderProjectRow(p))}
                </div>
              ) : null}
              {favorites.length > 0 ? (
                <div className="pb-0.5">
                  <DropdownMenuLabel className={sectionLabelClass}>Favorites</DropdownMenuLabel>
                  {favorites.map((p) => renderProjectRow(p))}
                </div>
              ) : null}
              {others.length > 0 ? (
                <div className="pb-0.5">
                  {recent.length > 0 || favorites.length > 0 ? (
                    <DropdownMenuLabel className={sectionLabelClass}>More</DropdownMenuLabel>
                  ) : null}
                  {others.map((p) => renderProjectRow(p))}
                  {othersHiddenCount > 0 ? (
                    <p className="px-3 py-1.5 text-[12px] leading-snug text-muted-foreground">
                      {othersHiddenCount} more — search to find
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
        <DropdownMenuSeparator className="m-0 bg-sidebar-border" />
        <DropdownMenuLabel className="sr-only">Actions</DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          className="mx-1.5 mb-1 gap-2 rounded-md px-2 py-1.5 text-[13.5px] text-sidebar-foreground/85 focus:bg-sidebar-accent/70 focus:text-sidebar-foreground"
        >
          <Link to="/projects/onboarding" onClick={() => setOpen(false)}>
            <Plus className="size-3.5" aria-hidden />
            Create project
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
