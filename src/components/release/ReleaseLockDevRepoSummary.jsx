import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { buildProjectBackendCodePath } from "@/lib/onboardPreviewUrl";
import {
  formatBackendLockAgentModeDescription,
  formatBackendLockAgentModeShort,
  formatDevRepoInputModeLabel,
  formatDevRepoRowCompact,
} from "@/lib/releaseLockPresentation";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import { devRowsFromStored } from "@/utils/projectMultiRepoForm";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

/** @param {string | null | undefined} developmentRepoUrl */
function buildDevRepoRows(developmentRepoUrl) {
  const multiRows = devRowsFromStored(
    typeof developmentRepoUrl === "string" ? developmentRepoUrl : "",
  );
  if (multiRows?.length > 0) {
    return multiRows.map((row) => ({
      path: row.path,
      ref: row.ref?.trim() || "main",
      details: row.details?.trim() || "",
      inputMode: row.inputMode ?? "manual",
    }));
  }
  const legacy = String(developmentRepoUrl || "").trim();
  if (!legacy || legacy.startsWith("{")) return [];
  return [
    {
      path: legacy,
      ref: "main",
      details: "",
      inputMode: "manual",
    },
  ];
}

/**
 * Read-only lock-dialog summary: dev repos + backend lock agent mode.
 * @param {{ projectId?: number | null, developmentRepoUrl?: string | null, backendLockAgentMode?: string | null, variant?: "compact" | "full" }} props
 */
export function ReleaseLockDevRepoSummary({
  projectId,
  developmentRepoUrl,
  backendLockAgentMode,
  variant = "compact",
  canAccessProjectSettings = false,
}) {
  const rows = buildDevRepoRows(developmentRepoUrl);
  if (rows.length === 0) return null;

  const repositoriesSettingsPath =
    projectId != null && canAccessProjectSettings
      ? buildProjectSettingsPath(projectId, "repositories")
      : null;
  const backendCodePath = projectId != null ? buildProjectBackendCodePath(projectId) : null;
  const modeDescription = formatBackendLockAgentModeDescription(backendLockAgentMode);
  const modeShortLabel = formatBackendLockAgentModeShort(backendLockAgentMode);
  const showRepositoryDetails = rows.length > 1 || rows.some((row) => row.details);

  if (variant === "full") {
    return (
      <div className="space-y-6 border-t border-slate-200 pt-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900">Development repositories</h4>
              <p className="text-xs text-slate-600">
                Backend agents, migrate tooling, and release-lock code changes use these repository
                clones.
              </p>
            </div>
            {repositoriesSettingsPath ? (
              <Link
                to={repositoriesSettingsPath}
                className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Edit from here
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-slate-600">
            Link repositories your GitHub account can access. A branch is required for each row.
          </p>
          <div className="space-y-3 rounded-md border border-border bg-muted/15 p-3">
            {rows.map((row, idx) => (
              <div
                key={`${row.path}:${row.ref}:${idx}`}
                className="flex flex-col gap-2 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
              >
                <span className="text-xs text-muted-foreground">Repository {idx + 1}</span>
                <p className="text-sm text-foreground">
                  {formatDevRepoInputModeLabel(row.inputMode)}
                </p>
                <div className="space-y-1">
                  <Label className="sr-only">Repository path</Label>
                  <Input
                    readOnly
                    disabled
                    value={row.path}
                    className="bg-background/80 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Branch / ref</span>
                  <Input readOnly disabled value={row.ref} className="bg-background/80 text-xs" />
                </div>
                {row.details ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-normal text-muted-foreground">
                      Repo details (optional)
                    </Label>
                    <Textarea
                      readOnly
                      disabled
                      value={row.details}
                      rows={2}
                      className="min-h-[56px] resize-none bg-background/80 text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Optional notes for AI agents.</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only here. Changes apply in project settings.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Label className="text-sm font-semibold text-slate-900">
              Release-lock backend agent
            </Label>
            {backendCodePath ? (
              <Link
                to={backendCodePath}
                className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Edit from here
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            After a release lock with a development repository, the agent writes a backend plan
            (Plan) or implements backend code (Code + auto merge or Code + PR). Infrastructure and
            hosting are set under Cloud Infra. Edit prompts under Prompt Management.
          </p>
          <Input
            readOnly
            disabled
            value={modeDescription}
            className="bg-background/80 text-sm"
            aria-label="Release-lock backend agent mode"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 min-w-0 space-y-2 border-t border-slate-200 pt-3">
      <div className="min-w-0 space-y-2 overflow-hidden rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-slate-800">On lock</p>
        <ul className="min-w-0 space-y-1">
          {rows.map((row, idx) => {
            const compactLine = formatDevRepoRowCompact(row);
            return (
              <li
                key={`${row.path}:${row.ref}:${idx}`}
                className="min-w-0 truncate font-mono text-xs text-slate-700"
                title={compactLine}
              >
                {compactLine}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-slate-700">
          Backend agent: <span className="font-medium text-slate-900">{modeShortLabel}</span>
        </p>
        {repositoriesSettingsPath ? (
          <Link
            to={repositoriesSettingsPath}
            className="inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Edit in project settings
          </Link>
        ) : null}
      </div>

      {showRepositoryDetails ? (
        <Collapsible defaultOpen={false} className="min-w-0">
          <CollapsibleTrigger className="group flex w-full min-w-0 items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-left text-xs font-medium text-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/60">
            Repository details
            <ChevronDown className="ml-auto size-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ul className="min-w-0 space-y-2 overflow-hidden rounded-md border border-border bg-muted/15 p-3">
              {rows.map((row, idx) => (
                <li
                  key={`details:${row.path}:${row.ref}:${idx}`}
                  className="min-w-0 space-y-1 border-b border-border/60 pb-3 text-xs last:border-b-0 last:pb-0"
                >
                  <p
                    className="break-all font-mono text-slate-800"
                    title={formatDevRepoRowCompact(row)}
                  >
                    {formatDevRepoRowCompact(row)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDevRepoInputModeLabel(row.inputMode)}
                  </p>
                  {row.details ? (
                    <p className="whitespace-pre-wrap break-words text-slate-700">{row.details}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
