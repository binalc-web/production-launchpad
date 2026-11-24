import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, CircleDashed, Loader2, Wand2 } from "lucide-react";
import {
  EnvironmentVariableLayerBadge,
  EnvironmentVariableRepoSummary,
} from "./EnvironmentVariableCatalogCells";

/**
 * Auto-resolved deploy vars (Cognito pool/client, generated secrets, etc.).
 * Platform can create/discover them; this board lets the user paste an explicit value.
 */
export function EnvironmentAutoResolvedBoard({
  rows,
  draftValues,
  onDraftChange,
  onSave,
  saving,
  pendingCount,
}) {
  if (!rows.length) return null;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Wand2 className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-sm font-semibold">Platform-managed — set your own</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          LaunchPad can create or discover these (for example Cognito user pool). Paste a value here
          when you want a specific ID instead of auto setup.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const hasValue = Boolean(row.hasValue);
          const hasDraft = String(draftValues[row.logicalId] ?? "").trim().length > 0;
          const repoKeys = (row.targets ?? [])
            .map((t) => t.key)
            .filter(Boolean)
            .filter((key, index, all) => all.indexOf(key) === index);
          return (
            <div
              key={row.logicalId}
              className="space-y-2 rounded-lg border border-border bg-muted/10 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{row.label || row.logicalId}</p>
                <Badge
                  variant="outline"
                  className="text-[10px] border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300"
                >
                  Auto
                </Badge>
                {row.layer ? <EnvironmentVariableLayerBadge layer={row.layer} /> : null}
                <Badge
                  variant={hasValue ? "secondary" : "outline"}
                  className={
                    hasValue
                      ? "gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : "gap-1 text-muted-foreground"
                  }
                >
                  {hasValue ? (
                    <CheckCircle2 className="size-3" aria-hidden />
                  ) : (
                    <CircleDashed className="size-3" aria-hidden />
                  )}
                  {hasValue ? "Saved" : "Not set"}
                </Badge>
              </div>
              {row.description ? (
                <p className="text-xs text-muted-foreground">{row.description}</p>
              ) : null}
              {repoKeys.length ? (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Env keys:</span>{" "}
                  <code className="font-mono">{repoKeys.join(", ")}</code>
                </p>
              ) : null}
              {row.sourceDetails?.length ? (
                <EnvironmentVariableRepoSummary sourceDetails={row.sourceDetails} />
              ) : null}
              <Input
                type="text"
                autoComplete="off"
                value={draftValues[row.logicalId] ?? ""}
                onChange={(e) => onDraftChange(row.logicalId, e.target.value)}
                placeholder={
                  hasValue
                    ? row.valueHint
                      ? `Saved ${row.valueHint} — enter a new value to replace`
                      : "Enter new value to replace saved value"
                    : "Paste value (e.g. us-east-1_AbCdEfGh)"
                }
                className="font-mono text-xs"
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">
                {hasDraft
                  ? "Will be saved when you click Save overrides. Dependent auto values (e.g. Cognito client) are cleared so setup can refresh them."
                  : hasValue
                    ? "Value stored server-side. Leave blank and use Run setup again to recreate/discover."
                    : "Empty — Run setup again to create or discover, or paste your own value."}
              </p>
            </div>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={!pendingCount || saving}
          className="gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save overrides
        </Button>
      </CardContent>
    </Card>
  );
}
