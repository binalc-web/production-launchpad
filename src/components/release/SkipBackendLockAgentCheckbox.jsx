import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** User-facing copy for the York-internal skip-backend-sync lock option. */
export const SKIP_BACKEND_LOCK_AGENT_LABEL = "Lock without Backend Agent Operations";
export const SKIP_BACKEND_LOCK_AGENT_DESCRIPTION =
  "Skips updating the development repo and generating a backend plan.";

/**
 * York internal only: opt out of dev-repo sync and backend plan agent when locking.
 */
export function SkipBackendLockAgentCheckbox({ checked, onCheckedChange, disabled }) {
  const checkboxId = "skip-backend-lock-agent";

  return (
    <div className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          disabled={disabled}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 space-y-1">
          <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-medium text-slate-900">
            {SKIP_BACKEND_LOCK_AGENT_LABEL}
          </Label>
          <p className="text-xs leading-relaxed text-slate-600">
            {SKIP_BACKEND_LOCK_AGENT_DESCRIPTION}
          </p>
        </div>
      </div>
    </div>
  );
}
