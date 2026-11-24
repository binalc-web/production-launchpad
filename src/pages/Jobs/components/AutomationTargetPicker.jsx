import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchProjectAutomationRepos, validateProjectJobBranch } from "@/api";
import { filterRepositoryOptions } from "@/utils/repositorySearch";

function targetKey(projectId, repoPath) {
  return `${projectId}:${repoPath}`;
}

function TargetPickerSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading projects">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="space-y-2 rounded-lg border border-border p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   projects: Array<{ id: number, name: string }>,
 *   projectsLoading: boolean,
 *   targets: Array<{ projectId: number, repoPath: string, branch: string, projectName?: string }>,
 *   onChange: (targets: Array<{ projectId: number, repoPath: string, branch: string, projectName?: string }>) => void,
 *   error?: string,
 * }} props
 */
export function AutomationTargetPicker({ projects, projectsLoading, targets, onChange, error }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [reposByProject, setReposByProject] = useState({});
  const [reposLoading, setReposLoading] = useState({});
  const [branchErrors, setBranchErrors] = useState({});
  const [projectQuery, setProjectQuery] = useState("");
  const [repoQueryByProject, setRepoQueryByProject] = useState({});

  const selectedProjectIds = new Set([...new Set((targets ?? []).map((t) => t.projectId))]);

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((proj) =>
      String(proj.name ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [projects, projectQuery]);

  const loadRepos = useCallback(async (projectId) => {
    setReposLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetchProjectAutomationRepos(projectId);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setReposByProject((prev) => ({ ...prev, [projectId]: list }));
    } catch {
      setReposByProject((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setReposLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  }, []);

  useEffect(() => {
    for (const pid of selectedProjectIds) {
      if (!reposByProject[pid] && !reposLoading[pid]) {
        loadRepos(pid);
      }
    }
  }, [selectedProjectIds, reposByProject, reposLoading, loadRepos]);

  const toggleProject = (proj, checked) => {
    const pid = Number(proj.id);
    if (!checked) {
      onChange((targets ?? []).filter((t) => t.projectId !== pid));
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(pid));
    loadRepos(pid);
  };

  const toggleRepo = (proj, repo, checked) => {
    const pid = Number(proj.id);
    const path = String(repo.path ?? "").trim();
    const key = targetKey(pid, path);
    if (!checked) {
      onChange((targets ?? []).filter((t) => targetKey(t.projectId, t.repoPath) !== key));
      return;
    }
    const branch = String(repo.defaultRef ?? "main").trim() || "main";
    onChange([
      ...(targets ?? []).filter((t) => targetKey(t.projectId, t.repoPath) !== key),
      {
        projectId: pid,
        repoPath: path,
        branch,
        projectName: proj.name,
      },
    ]);
  };

  const updateBranch = (projectId, repoPath, branch) => {
    onChange(
      (targets ?? []).map((t) =>
        t.projectId === projectId && t.repoPath === repoPath ? { ...t, branch } : t,
      ),
    );
  };

  useEffect(() => {
    const timers = [];
    for (const t of targets ?? []) {
      const branch = String(t.branch ?? "").trim();
      if (!branch) continue;
      const key = targetKey(t.projectId, t.repoPath);
      const timer = setTimeout(async () => {
        try {
          const res = await validateProjectJobBranch({
            projectId: t.projectId,
            branch,
            repoPath: t.repoPath,
          });
          setBranchErrors((prev) => {
            const next = { ...prev };
            if (res?.valid) delete next[key];
            else next[key] = res?.error || "Invalid branch";
            return next;
          });
        } catch (e) {
          setBranchErrors((prev) => ({
            ...prev,
            [key]: typeof e?.error === "string" ? e.error : "Could not validate branch",
          }));
        }
      }, 400);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, [targets]);

  if (projectsLoading) {
    return <TargetPickerSkeleton />;
  }

  if (!projects.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No projects available. Create a project with a development repository first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Select one or more projects, then choose development repositories. Each selection runs
        separately on your schedule.
      </p>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={projectQuery}
          onChange={(e) => setProjectQuery(e.target.value)}
          placeholder="Search projects…"
          className="h-9 w-full pl-10 text-sm"
          aria-label="Search projects"
        />
      </div>
      {filteredProjects.length === 0 ? (
        <p className="rounded-lg border border-border px-3 py-4 text-center text-sm text-muted-foreground">
          No projects match “{projectQuery.trim()}”.
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border border-border divide-y divide-border">
          {filteredProjects.map((proj) => {
            const pid = Number(proj.id);
            const isOpen = expanded.has(pid) || selectedProjectIds.has(pid);
            const repos = reposByProject[pid] ?? [];
            const loadingRepos = reposLoading[pid];
            const repoQuery = repoQueryByProject[pid] ?? "";
            const filteredRepos = filterRepositoryOptions(
              repos,
              repoQuery,
              (repo) => `${repo.path ?? ""} ${repo.directory ?? ""}`,
            );

            return (
              <div key={proj.id} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(pid)) next.delete(pid);
                        else next.add(pid);
                        return next;
                      });
                      if (!reposByProject[pid]) loadRepos(pid);
                    }}
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Checkbox
                    id={`target-proj-${proj.id}`}
                    checked={selectedProjectIds.has(pid)}
                    onCheckedChange={(c) => toggleProject(proj, c === true)}
                  />
                  <label
                    htmlFor={`target-proj-${proj.id}`}
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    {proj.name}
                  </label>
                </div>
                {isOpen ? (
                  <div className="ml-8 mt-2 space-y-2 border-l border-border/80 pl-3">
                    {loadingRepos ? (
                      <div
                        className="space-y-2"
                        role="status"
                        aria-busy="true"
                        aria-label="Loading repositories"
                      >
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-9 w-full rounded-md" />
                        ))}
                      </div>
                    ) : repos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No development repository configured on this project.
                      </p>
                    ) : (
                      <>
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            type="search"
                            value={repoQuery}
                            onChange={(e) =>
                              setRepoQueryByProject((prev) => ({
                                ...prev,
                                [pid]: e.target.value,
                              }))
                            }
                            placeholder="Search repositories…"
                            className="h-8 w-full pl-8 text-xs"
                            aria-label="Search repositories"
                          />
                        </div>
                        {filteredRepos.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No repositories match “{repoQuery.trim()}”.
                          </p>
                        ) : (
                          filteredRepos.map((repo) => {
                            const path = String(repo.path ?? "").trim();
                            const key = targetKey(pid, path);
                            const selected = (targets ?? []).some(
                              (t) => targetKey(t.projectId, t.repoPath) === key,
                            );
                            const selTarget = (targets ?? []).find(
                              (t) => targetKey(t.projectId, t.repoPath) === key,
                            );
                            const branchErr = branchErrors[key];

                            return (
                              <div
                                key={path}
                                className={cn(
                                  "rounded-md border border-border/60 p-2.5 space-y-2",
                                  selected && "border-primary/30 bg-primary/5",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`target-repo-${key}`}
                                    checked={selected}
                                    onCheckedChange={(c) => toggleRepo(proj, repo, c === true)}
                                  />
                                  <label
                                    htmlFor={`target-repo-${key}`}
                                    className="cursor-pointer text-xs font-medium text-foreground break-all"
                                  >
                                    {path}
                                    {repo.directory ? (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}
                                        ({repo.directory})
                                      </span>
                                    ) : null}
                                  </label>
                                </div>
                                {selected ? (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Branch</Label>
                                    <Input
                                      value={selTarget?.branch ?? "main"}
                                      onChange={(e) => updateBranch(pid, path, e.target.value)}
                                      placeholder="main"
                                      className={cn(
                                        "h-8 text-sm",
                                        branchErr && "border-destructive",
                                      )}
                                    />
                                    {branchErr ? (
                                      <p className="text-xs text-destructive">{branchErr}</p>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {(targets ?? []).length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {(targets ?? []).length} target{(targets ?? []).length === 1 ? "" : "s"} selected — each
          runs on its own when triggered.
        </p>
      ) : null}
    </div>
  );
}
