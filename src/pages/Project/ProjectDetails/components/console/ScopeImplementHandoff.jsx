import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Destination cards after saving release scope — Preview vs App repositories implement.
 */
export function ScopeImplementHandoff({
  project,
  canImplement,
  isScopeDirty,
  scopeItemCount,
  onGoPreview,
  onGoApplication,
}) {
  const hasDevRepo =
    typeof project?.developmentRepoUrl === "string" && project.developmentRepoUrl.trim();
  const baseDisabled = !canImplement || isScopeDirty || scopeItemCount === 0;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Next: implement scoped stories</h4>
        <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
          <li>Add or sync stories on Board / Suggestions.</li>
          <li>Check them into this release and Save.</li>
          <li>Open Preview or App repositories to run agents.</li>
        </ol>
        {isScopeDirty ? (
          <p className="text-xs text-amber-700">Save scope before opening Implement.</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/40">
          <p className="text-sm font-medium text-foreground">Implement in Preview</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cursor agents write only to the LaunchPad frontend / preview workspace. Use this for
            preview UI, not the customer development repositories.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={baseDisabled}
            onClick={() => onGoPreview?.()}
          >
            Open Preview → Implement
          </Button>
        </div>

        <div
          className={cn(
            "rounded-lg border p-3",
            hasDevRepo
              ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40"
              : "border-border bg-muted/30",
          )}
        >
          <p className="text-sm font-medium text-foreground">Implement in App repositories</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cursor agents write to your development repository (working frontend and backend, single
            or multiple repos).
          </p>
          {!hasDevRepo ? (
            <p className="mt-2 text-xs text-amber-700">
              Add a development repository in project settings.
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={baseDisabled || !hasDevRepo}
            onClick={() => onGoApplication?.()}
          >
            Open App repositories → Implement
          </Button>
        </div>
      </div>
    </div>
  );
}
