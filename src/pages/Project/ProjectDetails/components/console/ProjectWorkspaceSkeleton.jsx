import { LaunchpadLogo } from "@/components/common/LaunchpadLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { readSidebarOpen } from "./projectSidebarState";

const SIDEBAR_ROW_WIDTHS = ["w-32", "w-24", "w-36", "w-28", "w-20", "w-32", "w-24"];

function SidebarSkeleton() {
  return (
    <aside className="flex h-full min-h-0 w-[270px] shrink-0 flex-col self-stretch overflow-hidden border-r border-sidebar-border bg-sidebar">
      <div className="flex h-12 shrink-0 items-center px-4">
        <LaunchpadLogo alt="Launchpad" className="h-[30px] w-auto max-w-[9rem] object-contain" />
      </div>
      <div className="px-3 pb-1 pt-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border px-3 py-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>
      <div className="space-y-1 px-3 pt-4">
        <Skeleton className="mx-2 mb-3 h-3 w-16" />
        {SIDEBAR_ROW_WIDTHS.map((width, i) => (
          <div key={i} className="flex items-center gap-2 px-2.5 py-1.5">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className={`h-3.5 ${width}`} />
          </div>
        ))}
      </div>
    </aside>
  );
}

function CollapsedRailSkeleton() {
  return (
    <aside className="flex h-full min-h-0 w-[60px] shrink-0 flex-col items-center gap-3 self-stretch overflow-hidden border-r border-sidebar-border bg-sidebar pt-3">
      <Skeleton className="size-8 rounded-lg" />
      {SIDEBAR_ROW_WIDTHS.slice(0, 5).map((_, i) => (
        <Skeleton key={i} className="size-6" />
      ))}
    </aside>
  );
}

/** Placeholder for the project console (sidebar, top bar, content) while a project loads. */
export function ProjectWorkspaceSkeleton() {
  const sidebarOpen = readSidebarOpen(true);

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 items-stretch"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading project"
    >
      {sidebarOpen ? <SidebarSkeleton /> : <CollapsedRailSkeleton />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4">
          <Skeleton className="size-6" />
          <Skeleton className="h-4 w-40" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="size-7 rounded-full" />
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-hidden bg-muted/40 p-4 md:p-5">
          <div className="min-w-0 space-y-5 rounded-lg bg-card p-4 md:p-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3 rounded-lg border border-border p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Skeleton className="h-4 w-32" />
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
