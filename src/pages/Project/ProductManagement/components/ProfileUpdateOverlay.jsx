import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";

export function ProfileUpdateOverlay({ children }) {
  const { isProfileUpdating, profileUpdate } = useClientInfoContext();
  const pendingCount = profileUpdate?.pendingEntryIds?.length || 0;
  const queueLabel =
    pendingCount > 1 ? `${pendingCount} captures queued for profile update` : null;

  return (
    <div className="relative">
      {isProfileUpdating ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <Loader2 className="size-4 shrink-0 animate-spin mt-0.5" />
          <div>
            <p className="font-medium">Updating profiles from new capture…</p>
            <p className="text-xs mt-0.5 opacity-80">
              Profile fields are read-only until enrichment finishes.
              {queueLabel ? ` ${queueLabel}.` : null}
            </p>
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          isProfileUpdating && "pointer-events-none opacity-60 select-none",
        )}
        aria-busy={isProfileUpdating}
      >
        {children}
      </div>
    </div>
  );
}
