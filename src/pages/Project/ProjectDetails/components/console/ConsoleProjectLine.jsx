import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ProjectDetailsModelBadge } from "../ProjectDetailsModelBadge";
import { ProjectDetailsStatusChips } from "../ProjectDetailsStatusChips";

/**
 * Single-line project identity for the console top bar.
 * When `href` is set, the name is a link back to the project workspace.
 */
export function ConsoleProjectLine({
  projectName,
  project = null,
  projectDescription = null,
  href = null,
  showDeferredScratchCard = false,
  scratchAgentBannerOpen = false,
  scratchAgentStatusLine = null,
  scratchPreviewBuildingBanner = false,
  showScratchVersionFailedBanner = false,
  className,
}) {
  const name = projectName?.trim() || "Project";
  const title = projectDescription?.trim() || name;

  const nameEl = href ? (
    <Link
      to={href}
      className="min-w-0 max-w-[7rem] truncate text-sm font-semibold text-sidebar-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring sm:max-w-[10rem]"
      title={`Open ${name}`}
    >
      {name}
    </Link>
  ) : (
    <span
      className="min-w-0 max-w-[7rem] truncate text-sm font-semibold text-sidebar-foreground sm:max-w-[10rem]"
      title={name}
    >
      {name}
    </span>
  );

  return (
    <div
      className={cn("flex min-w-0 items-center gap-1.5 overflow-hidden px-1", className)}
      title={title}
    >
      {nameEl}
      <ProjectDetailsModelBadge modelRouter={project?.modelRouter} dense />
      <ProjectDetailsStatusChips
        showDeferredScratchCard={showDeferredScratchCard}
        scratchAgentBannerOpen={scratchAgentBannerOpen}
        scratchAgentStatusLine={scratchAgentStatusLine}
        scratchPreviewBuildingBanner={scratchPreviewBuildingBanner}
        showScratchVersionFailedBanner={showScratchVersionFailedBanner}
      />
    </div>
  );
}
