import React, { useMemo, useCallback } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteProject } from "@/api/index";
import { listLaunchpadGithubHostPaths } from "@/utils/projectMultiRepoForm";
import { toast } from "sonner";

const DeleteProjectDialog = ({
  open,
  onOpenChange,
  project,
  onProjectDeleted,
}) => {
  const [deleting, setDeleting] = React.useState(false);
  const [deleteMode, setDeleteMode] = React.useState(null);

  const launchpadGithubRepos = useMemo(
    () => listLaunchpadGithubHostPaths(project?.gitRepoPath),
    [project?.gitRepoPath],
  );
  const hasLaunchpadGithubRepo = launchpadGithubRepos.length > 0;

  const resetState = useCallback(() => {
    setDeleting(false);
    setDeleteMode(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen && deleting) return;
      if (!nextOpen) resetState();
      onOpenChange(nextOpen);
    },
    [deleting, onOpenChange, resetState],
  );

  const handleConfirmDelete = useCallback(
    async (withGithubRepo) => {
      if (!project?.id) return;
      setDeleteMode(withGithubRepo ? "withGithub" : "projectOnly");
      setDeleting(true);
      try {
        const result = await deleteProject(project.id, {
          deleteLaunchpadGithubRepo: withGithubRepo,
        });
        toast.success(result?.message || "Project deleted");
        handleOpenChange(false);
        onProjectDeleted?.(project.id);
      } catch (err) {
        const message =
          typeof err?.error === "string"
            ? err.error
            : (err?.message ?? "Could not delete project");
        toast.error(message);
      } finally {
        setDeleting(false);
        setDeleteMode(null);
      }
    },
    [project?.id, handleOpenChange, onProjectDeleted],
  );

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!deleting}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <div className="space-y-4 px-6 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1.5 pt-0.5">
                <DialogTitle>Delete this project?</DialogTitle>
                <DialogDescription asChild>
                  <p className="text-sm text-muted-foreground">
                    This action is permanent and cannot be undone.
                  </p>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-left text-sm text-muted-foreground">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p>
                  You are about to delete{" "}
                  <span className="font-medium text-foreground">
                    {project.name}
                  </span>
                  . This removes the project from Launchpad, its preview files,
                  and nginx configuration.
                </p>
              </div>

              {hasLaunchpadGithubRepo ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div>
                    <p className="font-medium text-foreground">
                      Launchpad GitHub{" "}
                      {launchpadGithubRepos.length === 1
                        ? "repository"
                        : "repositories"}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {launchpadGithubRepos.map((repoPath) => (
                        <li
                          key={repoPath}
                          className="truncate font-mono text-xs text-foreground/90"
                        >
                          {repoPath}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Choose whether to keep or permanently delete{" "}
                    {launchpadGithubRepos.length === 1
                      ? "this repository"
                      : "these repositories"}{" "}
                    on GitHub. Development repositories are never deleted.
                  </p>
                </div>
              ) : null}
            </div>
        </div>

        <DialogFooter className="mt-6 flex-col gap-3 border-t border-border bg-muted/30 px-6 py-4 sm:flex-col sm:items-stretch">
          {hasLaunchpadGithubRepo ? (
            <>
              <p className="text-left text-xs font-medium text-muted-foreground">
                Choose an action
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleConfirmDelete(false)}
                  disabled={deleting}
                  className="h-auto min-h-10 whitespace-normal border-destructive/40 py-2.5 text-destructive transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                >
                  {deleting && deleteMode === "projectOnly" ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Spinner className="size-4 shrink-0 opacity-90" />
                      Deleting project…
                    </span>
                  ) : (
                    "Delete project only"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleConfirmDelete(true)}
                  disabled={deleting}
                  className="h-auto min-h-10 whitespace-normal py-2.5 transition-all duration-200"
                >
                  {deleting && deleteMode === "withGithub" ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Spinner className="size-4 shrink-0 opacity-90" />
                      Deleting with GitHub…
                    </span>
                  ) : (
                    "Delete project and GitHub repo"
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={deleting}
                className="w-full transition-all duration-200 sm:ml-auto sm:w-auto"
              >
                Cancel
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={deleting}
                className="transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleConfirmDelete(false)}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 transition-all duration-200"
              >
                {deleting && deleteMode === "projectOnly" ? (
                  <>
                    <Spinner className="size-4 shrink-0 opacity-90" />
                    Deleting project…
                  </>
                ) : (
                  "Delete project"
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProjectDialog;
