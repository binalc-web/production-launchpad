import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SKIP_BACKEND_LOCK_AGENT_DESCRIPTION,
  SKIP_BACKEND_LOCK_AGENT_LABEL,
} from "@/components/release/SkipBackendLockAgentCheckbox";

/** Badge label for releases locked with skipLockAgentOperations. */
export const RELEASE_BACKEND_SYNC_SKIPPED_BADGE = "Backend sync skipped";

/**
 * Small badge shown on locked releases that skipped backend lock agent operations.
 */
export function ReleaseBackendSyncSkippedBadge({ className = "" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`h-5 shrink-0 cursor-default rounded-full px-2 py-0 text-[10px] font-semibold leading-none text-slate-700 ${className}`}
        >
          {RELEASE_BACKEND_SYNC_SKIPPED_BADGE}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-left leading-snug">
        <span className="font-medium">{SKIP_BACKEND_LOCK_AGENT_LABEL}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {SKIP_BACKEND_LOCK_AGENT_DESCRIPTION}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
