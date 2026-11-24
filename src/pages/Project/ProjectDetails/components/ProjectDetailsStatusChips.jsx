import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CHIP_VARIANTS = {
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-primary/25 bg-primary/10 text-primary",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  danger:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
  muted: "border-border bg-muted/60 text-muted-foreground",
};

function StatusChip({ variant = "muted", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        CHIP_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProjectDetailsStatusChips({
  showDeferredScratchCard,
  scratchAgentBannerOpen,
  scratchAgentStatusLine,
  scratchPreviewBuildingBanner,
  showScratchVersionFailedBanner,
}) {
  const chips = [];

  if (showDeferredScratchCard) {
    chips.push(
      <StatusChip key="setup" variant="primary">
        Setup needed
      </StatusChip>,
    );
  }

  if (scratchAgentBannerOpen) {
    chips.push(
      <StatusChip key="agent" variant="success">
        <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">{scratchAgentStatusLine?.trim() || "Agent running"}</span>
      </StatusChip>,
    );
  }

  if (showScratchVersionFailedBanner) {
    chips.push(
      <StatusChip key="failed" variant="danger">
        Build failed
      </StatusChip>,
    );
  }

  if (scratchPreviewBuildingBanner) {
    chips.push(
      <StatusChip key="preview" variant="warning">
        <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
        Preview building
      </StatusChip>,
    );
  }

  if (chips.length === 0) return null;

  return <div className="flex min-w-0 flex-wrap items-center gap-1.5">{chips}</div>;
}
