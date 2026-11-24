import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import {
  EnvironmentVariableLayerBadge,
  EnvironmentVariableRepoSummary,
} from "./EnvironmentVariableCatalogCells";

const TIER_LABELS = {
  user_required: "Required",
  optional: "Optional",
  auto_resolved: "Auto",
  naming_convention: "Name",
};

function tierBadgeClass(tier) {
  switch (tier) {
    case "optional":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "auto_resolved":
      return "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300";
    case "naming_convention":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  }
}

function setupStatusBadgeClass(setupStatus) {
  switch (setupStatus) {
    case "saved":
    case "optional_ok":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "pending_setup":
    case "waiting_dependencies":
      return "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  }
}

function readinessSummaryLabel(status) {
  switch (status) {
    case "ready":
      return "Ready";
    case "preparing":
      return "Setting up…";
    case "blocked":
      return "Action needed";
    case "needs_credentials":
    default:
      return "Needs credentials";
  }
}

function VariableStatusRow({ row, labelByLogicalId }) {
  const [open, setOpen] = useState(false);
  const dependsOnLabels = (row.dependsOn ?? [])
    .map((id) => labelByLogicalId.get(id) || id)
    .filter(Boolean);
  const targetKeys = (row.targets ?? []).map((t) => t.key).filter(Boolean);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-muted/10">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/20"
          >
            <ChevronDown
              className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {row.label || row.logicalId}
                </p>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${tierBadgeClass(row.tier)}`}
                >
                  {TIER_LABELS[row.tier] ?? "Required"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${setupStatusBadgeClass(row.setupStatus)}`}
                >
                  {row.setupStatusLabel || row.setupStatus}
                </Badge>
                {row.layer ? (
                  <EnvironmentVariableLayerBadge layer={row.layer} />
                ) : null}
              </div>
              {row.description ? (
                <p className="text-xs text-muted-foreground">
                  {row.description}
                </p>
              ) : null}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">ID:</span>{" "}
              <code className="font-mono">{row.logicalId}</code>
            </p>
            {row.resolutionKind ? (
              <p>
                <span className="font-medium text-foreground">Setup type:</span>{" "}
                {row.resolutionKind.replace(/_/g, " ")}
              </p>
            ) : null}
            {dependsOnLabels.length ? (
              <p>
                <span className="font-medium text-foreground">Waiting on:</span>{" "}
                {dependsOnLabels.join(", ")}
              </p>
            ) : null}
            {targetKeys.length ? (
              <p>
                <span className="font-medium text-foreground">Repo keys:</span>{" "}
                {targetKeys.join(", ")}
              </p>
            ) : null}
            {row.sourceDetails?.length ? (
              <EnvironmentVariableRepoSummary
                sourceDetails={row.sourceDetails}
              />
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Lists every deploy-map variable with setup status for one environment.
 */
export function EnvironmentStatusModal({
  open,
  onOpenChange,
  environment,
  readiness,
  onRetrySetup,
  retrying,
}) {
  const rows = environment?.allVariables ?? [];
  const labelByLogicalId = useMemo(
    () =>
      new Map(rows.map((row) => [row.logicalId, row.label || row.logicalId])),
    [rows],
  );
  const pendingSetupCount = readiness?.pendingSetupCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="space-y-2 border-b border-border px-6 py-4">
          <DialogTitle>Environment variables</DialogTitle>
          {environment ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{environment.name}</p>
              {readiness ? (
                <p className="text-xs text-muted-foreground">
                  {readinessSummaryLabel(readiness.status)}
                  {readiness.canDeploy
                    ? " · Ready to deploy"
                    : " · Not ready to deploy"}
                  {readiness.message ? ` — ${readiness.message}` : ""}
                </p>
              ) : null}
              {pendingSetupCount > 0 ? (
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {pendingSetupCount} variable
                  {pendingSetupCount === 1 ? "" : "s"} still need platform setup
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {!rows.length ? (
            <p className="text-sm text-muted-foreground">
              No variables found. Run a repository scan first.
            </p>
          ) : (
            rows.map((row) => (
              <VariableStatusRow
                key={row.logicalId}
                row={row}
                labelByLogicalId={labelByLogicalId}
              />
            ))
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => onRetrySetup?.()}
            disabled={retrying || !environment?.id}
          >
            {retrying ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            Run setup again
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
