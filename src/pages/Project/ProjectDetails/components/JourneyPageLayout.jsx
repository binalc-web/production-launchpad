import { cn } from "@/lib/utils";

/** Sticky sidebar + scrollable main on xl+; stacks on smaller breakpoints. */
export function JourneyPageLayout({ sidebar, children, layout = "sidebar", className }) {
  const useSidebar = layout === "sidebar" && sidebar;

  if (!useSidebar) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(260px,20rem)_minmax(0,1fr)] xl:items-start",
        className,
      )}
    >
      <aside
        className={cn(
          "min-w-0 space-y-4",
          "xl:sticky xl:top-[calc(var(--journey-nav-offset,0px)+1rem)]",
          "xl:max-h-[calc(100vh-var(--journey-nav-offset,0px)-2rem)] xl:overflow-y-auto",
        )}
      >
        {sidebar}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
