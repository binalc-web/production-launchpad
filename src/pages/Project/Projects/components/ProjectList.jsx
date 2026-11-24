import { FolderOpen, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectButton } from "@/pages/Project/CreateProject";
import ProjectCard from "@/pages/Project/components/ProjectCard";
import { PROJECT_LISTING_LABELS } from "../projectListingDisplay";
import { LIST_GRID_CLASS_THREE_COL } from "@/constants/responsiveLayout";

const GRID_CLASS = LIST_GRID_CLASS_THREE_COL;

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="mt-4 h-9 w-full rounded-lg" />
    </div>
  );
}

export function ProjectListSkeleton({ count = 6 }) {
  return (
    <div className={GRID_CLASS} role="status" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

const ProjectList = ({
  projects,
  onProjectDeleted,
  onProjectUpdated,
  searchQuery = "",
  hasInactiveOnly = false,
}) => {
  const trimmedSearch = searchQuery.trim();
  const isSearchEmpty = trimmedSearch.length > 0;

  if (hasInactiveOnly) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
        aria-live="polite"
      >
        <p className="text-base font-medium text-foreground">
          {PROJECT_LISTING_LABELS.noActiveProjects}
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {PROJECT_LISTING_LABELS.noActiveHint}
        </p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    if (isSearchEmpty) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
          aria-live="polite"
        >
          <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
            <SearchX className="size-10" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No matching projects</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Nothing matches &ldquo;{trimmedSearch}&rdquo;. Try a different name or description.
          </p>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
        aria-live="polite"
      >
        <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
          <FolderOpen className="size-10" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Create your first project to start discovery, releases, and client review.
        </p>
        <div className="mt-6">
          <CreateProjectButton />
        </div>
      </div>
    );
  }

  return (
    <div className={GRID_CLASS}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onProjectDeleted={onProjectDeleted}
          onProjectUpdated={onProjectUpdated}
        />
      ))}
    </div>
  );
};

export default ProjectList;
