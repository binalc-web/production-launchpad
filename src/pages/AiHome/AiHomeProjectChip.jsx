import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { searchProjects } from "@/api/index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { partitionSwitcherProjects, readRecentProjectIds } from "@/lib/lastProject";
import { cn } from "@/lib/utils";
import { AI_HOME_COMPOSER_SURFACE, ALL_PROJECTS_LABEL } from "./aiHomeClasses";

/**
 * Composer project context — All projects or one project (ChatGPT-style selector).
 */
export function AiHomeProjectChip({ projectId = null, projectName = null, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const label = projectId ? projectName?.trim() || `Project ${projectId}` : ALL_PROJECTS_LABEL;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await searchProjects({ includeInactive: true });
      setProjects(Array.isArray(rows) ? rows : []);
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

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? projects
      : projects.filter((p) =>
          String(p.name ?? "")
            .toLowerCase()
            .includes(q),
        );
    const { recent, favorites, others } = partitionSwitcherProjects(list, readRecentProjectIds());
    const seen = new Set();
    const ordered = [];
    for (const p of [...recent, ...favorites, ...others]) {
      const id = String(p.id);
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(p);
    }
    return ordered;
  }, [projects, query]);

  const pick = (id, name) => {
    onChange?.({ projectId: id, projectName: name });
    setOpen(false);
    setQuery("");
  };

  const isSelected = (id) => {
    if (id == null) return !projectId;
    return String(projectId) === String(id);
  };

  const itemClassName = (id) =>
    cn(
      "mx-1 rounded-lg px-3 py-2 text-sm",
      isSelected(id) &&
        "bg-sidebar-accent text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground",
    );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-[20rem] cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:hover:bg-zinc-800",
            AI_HOME_COMPOSER_SURFACE,
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={10}
        className="w-80 overflow-hidden rounded-xl border border-border/80 p-0 shadow-lg"
      >
        <div className="border-b border-border/80 p-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="h-9 border-0 bg-muted/40 pl-8 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          <DropdownMenuItem onSelect={() => pick(null, null)} className={itemClassName(null)}>
            <span className="min-w-0 flex-1 truncate">{ALL_PROJECTS_LABEL}</span>
            {isSelected(null) ? (
              <Check className="size-4 shrink-0 text-foreground" aria-hidden />
            ) : null}
          </DropdownMenuItem>
          {loading ? (
            <div
              className="space-y-1 px-1 py-1"
              role="status"
              aria-busy="true"
              aria-label="Loading projects"
            >
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No projects found</p>
          ) : (
            filteredProjects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => pick(String(p.id), p.name)}
                className={itemClassName(p.id)}
              >
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {isSelected(p.id) ? (
                  <Check className="size-4 shrink-0 text-foreground" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
