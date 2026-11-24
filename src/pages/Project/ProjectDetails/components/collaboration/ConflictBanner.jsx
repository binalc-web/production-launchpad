import { AlertTriangle, GitBranch, Layers, FileWarning } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ICON_BY_TYPE = {
  branch: GitBranch,
  release: Layers,
  file: FileWarning,
};

/**
 * Warns when 2+ people/agents work on the same branch, release, or overlapping areas.
 * @param {{ conflicts: object[] }} props
 */
export function ConflictBanner({ conflicts }) {
  if (!conflicts?.length) return null;

  return (
    <Alert
      variant="destructive"
      className="border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>
        {conflicts.length === 1
          ? "Possible conflict detected"
          : `${conflicts.length} possible conflicts detected`}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-2">
          {conflicts.map((c) => {
            const Icon = ICON_BY_TYPE[c.type] ?? AlertTriangle;
            return (
              <li key={c.key} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm">{c.message}</p>
                  {Array.isArray(c.actors) && c.actors.length ? (
                    <p className="text-xs opacity-80">{c.actors.map((a) => a.label).join(" · ")}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
