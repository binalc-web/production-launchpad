import { cn } from "@/lib/utils";

/** Visual depth for each nested journey nav row (1 = phases, 2 = stages, 3 = sub-areas). */
export const JOURNEY_NAV_ROW_LEVEL = {
  1: "px-3 py-2.5 bg-muted/10",
  2: "border-t border-border/50 bg-muted/35 py-2.5 pl-6 pr-3 shadow-[inset_5px_0_0_0_hsl(var(--primary)/0.1)] sm:pl-8",
  3: "border-t border-border/50 bg-muted/55 py-2.5 pl-10 pr-3 shadow-[inset_5px_0_0_0_hsl(var(--primary)/0.18)] sm:pl-12",
};

/** Parent name pinned on the left of each nested journey nav row. */
export function NavRowParentLabel({ label, depth = 2 }) {
  return (
    <span
      className={cn(
        "shrink-0 border-r border-border/50 pr-3 text-[11px] font-semibold uppercase tracking-wide",
        depth === 3
          ? "min-w-[5.5rem] text-muted-foreground/90"
          : "min-w-[4.5rem] text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
