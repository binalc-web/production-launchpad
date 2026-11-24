import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Clock,
  MoreVertical,
  Sparkles,
  Star,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { setProjectFavorite, updateProject } from "@/api";
import { toast } from "sonner";
import DeleteProjectDialog from "./DeleteProjectDialog";
import { getProjectCardMeta } from "./projectCardDisplay";
import { ProjectCardShortcuts } from "./ProjectCardShortcuts";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import {
  isProjectListingActive,
  PROJECT_LISTING_LABELS,
} from "@/pages/Project/Projects/projectListingDisplay";

const ProjectCard = ({ project, onProjectDeleted, onProjectUpdated }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [favoriteUpdating, setFavoriteUpdating] = useState(false);

  const meta = useMemo(() => getProjectCardMeta(project), [project]);
  const projectIsActive = isProjectListingActive(project);
  const isFavorite = Boolean(project?.isFavorite);

  const canManageProject = useMemo(() => {
    if (!user) return false;
    if (isLaunchpadAdmin(user.role)) return true;
    const creatorId = project?.createdBy?.id ?? project?.createdById;
    if (creatorId == null) return false;
    return Number(user.id) === Number(creatorId);
  }, [user, project]);

  const openDetails = () => navigate(buildProjectDetailsPathWithResume(project.id));

  const handleToggleActive = useCallback(
    async (nextActive) => {
      if (!project?.id || statusUpdating) return;
      setStatusUpdating(true);
      try {
        await updateProject(project.id, { isActive: nextActive });
        onProjectUpdated?.({ ...project, isActive: nextActive });
        toast.success(
          nextActive
            ? PROJECT_LISTING_LABELS.reactivatedToast
            : PROJECT_LISTING_LABELS.deactivatedToast,
        );
      } catch (err) {
        const message =
          typeof err?.error === "string"
            ? err.error
            : (err?.message ?? PROJECT_LISTING_LABELS.statusUpdateError);
        toast.error(message);
      } finally {
        setStatusUpdating(false);
      }
    },
    [project, statusUpdating, onProjectUpdated],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!project?.id || favoriteUpdating) return;
    const nextFavorite = !isFavorite;
    setFavoriteUpdating(true);
    onProjectUpdated?.({ ...project, isFavorite: nextFavorite });
    try {
      await setProjectFavorite(project.id, nextFavorite);
    } catch (err) {
      onProjectUpdated?.({ ...project, isFavorite });
      const message =
        typeof err?.error === "string" ? err.error : (err?.message ?? "Failed to update favorite");
      toast.error(message);
    } finally {
      setFavoriteUpdating(false);
    }
  }, [project, favoriteUpdating, isFavorite, onProjectUpdated]);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetails();
          }
        }}
        className={cn(
          "group flex h-full cursor-pointer flex-col rounded-xl border bg-card p-4 shadow-sm ring-1 transition-all duration-200 sm:p-5",
          projectIsActive
            ? "border-primary/30 ring-primary/10 hover:border-primary/45 hover:bg-muted/10 hover:shadow-md"
            : "border-border/80 bg-muted/20 ring-border/40 opacity-90 hover:border-border hover:bg-muted/30",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2
                className="line-clamp-2 break-words text-base font-semibold text-foreground group-hover:text-primary"
                title={project.name}
              >
                {project.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {!projectIsActive ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[11px] font-medium text-muted-foreground"
                  >
                    {PROJECT_LISTING_LABELS.inactiveBadge}
                  </Badge>
                ) : null}
                {meta.releaseChip ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 border-0 text-[11px] font-medium",
                      meta.releaseChip.className,
                    )}
                  >
                    {meta.releaseChip.label}
                    {meta.releaseChip.releaseName ? ` · ${meta.releaseChip.releaseName}` : ""}
                  </Badge>
                ) : null}
                {meta.fromScratch ? (
                  <Badge variant="outline" className="shrink-0 gap-1 text-[11px] font-medium">
                    <Sparkles className="size-3" aria-hidden />
                    From scratch
                  </Badge>
                ) : null}
                {meta.showNoSlugChip ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[11px] font-medium text-muted-foreground"
                  >
                    No slug
                  </Badge>
                ) : null}
              </div>
            </div>

            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0 transition-colors",
                  isFavorite
                    ? "text-amber-500 hover:text-amber-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={isFavorite ? `Unfavorite ${project.name}` : `Favorite ${project.name}`}
                aria-pressed={isFavorite}
                disabled={favoriteUpdating}
                onClick={handleToggleFavorite}
              >
                <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
              </Button>

              {canManageProject ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Actions for ${project.name}`}
                      disabled={statusUpdating}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {projectIsActive ? (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={statusUpdating}
                        onSelect={() => handleToggleActive(false)}
                      >
                        <Archive className="h-4 w-4" />
                        {PROJECT_LISTING_LABELS.markInactive}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={statusUpdating}
                        onSelect={() => handleToggleActive(true)}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        {PROJECT_LISTING_LABELS.markActive}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer"
                      onSelect={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>

          {meta.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {meta.description}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <User className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate" title={meta.creatorLabel}>
                {meta.creatorLabel}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Updated {meta.updatedRelative}</span>
            </div>
            {meta.activeVersionLabel ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <Tag className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">Live v{meta.activeVersionLabel}</span>
              </div>
            ) : null}
            {meta.budgetRemainingLabel ? (
              <div className="flex min-w-0 items-center gap-1.5 sm:col-span-2">
                <span className="truncate tabular-nums">{meta.budgetRemainingLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto border-t border-border/60 pt-4">
          <ProjectCardShortcuts
            projectId={project.id}
            clientUrl={meta.clientUrl}
            previewOnlyUrl={meta.previewOnlyUrl}
            linksDisabledHint={meta.linksDisabledHint}
          />
        </div>
      </article>

      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        project={project}
        onProjectDeleted={onProjectDeleted}
      />
    </>
  );
};

export default ProjectCard;
