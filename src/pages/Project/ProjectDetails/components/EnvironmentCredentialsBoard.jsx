import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  EnvironmentVariableLayerBadge,
  EnvironmentVariableRepoSummary,
} from "./EnvironmentVariableCatalogCells";

/**
 * Board 1 — credentials only the user can provide.
 */
export function EnvironmentCredentialsBoard({
  rows,
  draftValues,
  onDraftChange,
  onSave,
  onAddVariable,
  onRemoveVariable,
  saving,
  pendingCount,
}) {
  const [visibleIds, setVisibleIds] = useState({});

  const savedValueSignature = rows
    .map((row) => `${row.logicalId}:${row.hasValue ? "1" : "0"}`)
    .join("|");

  useEffect(() => {
    setVisibleIds({});
  }, [savedValueSignature]);

  const toggleVisibility = (logicalId) => {
    setVisibleIds((prev) => ({ ...prev, [logicalId]: !prev[logicalId] }));
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden />
            <CardTitle className="text-sm font-semibold">Your credentials</CardTitle>
          </div>
          {onAddVariable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onAddVariable}
              disabled={saving}
            >
              <Plus className="size-3.5" aria-hidden />
              Add variable
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Only you can provide these — we never guess passwords or API keys.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows.length ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Run a scan to find credential fields, or add a variable manually.
            </p>
            {onAddVariable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onAddVariable}
                disabled={saving}
              >
                <Plus className="size-3.5" aria-hidden />
                Add variable
              </Button>
            ) : null}
          </div>
        ) : (
          rows.map((row) => {
            const hasValue = Boolean(row.hasValue);
            const hasDraft = String(draftValues[row.logicalId] ?? "").trim().length > 0;
            const isVisible = Boolean(visibleIds[row.logicalId]);
            const draftValue = draftValues[row.logicalId] ?? "";
            const valueHint = row.valueHint ?? "";
            const showingHintOnly = !hasDraft && isVisible && Boolean(valueHint);
            const displayValue = hasDraft ? draftValue : showingHintOnly ? valueHint : "";
            const canReveal = hasDraft || Boolean(valueHint);

            return (
              <div
                key={row.logicalId}
                className="space-y-2 rounded-lg border border-border bg-muted/10 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {row.label || row.logicalId}{" "}
                    <span className="text-destructive" aria-hidden>
                      *
                    </span>
                    <span className="sr-only">required</span>
                  </p>
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
                  {onRemoveVariable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoveVariable(row)}
                      disabled={saving}
                      aria-label={`Remove ${row.label || row.logicalId}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
                {row.description ? (
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                ) : null}
                {row.sourceDetails?.length ? (
                  <EnvironmentVariableRepoSummary sourceDetails={row.sourceDetails} />
                ) : null}
                <div className="relative">
                  <Input
                    type={isVisible || showingHintOnly ? "text" : "password"}
                    autoComplete="off"
                    value={displayValue}
                    onChange={(e) => onDraftChange(row.logicalId, e.target.value)}
                    placeholder={
                      hasValue ? "Enter new value to replace saved secret" : "Enter value"
                    }
                    className="pr-10 font-mono text-xs"
                    disabled={saving || showingHintOnly}
                    readOnly={showingHintOnly}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground"
                    onClick={() => toggleVisibility(row.logicalId)}
                    disabled={!canReveal || saving}
                    aria-label={
                      isVisible
                        ? `Hide ${row.label || row.logicalId}`
                        : `View ${row.label || row.logicalId}`
                    }
                  >
                    {isVisible ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {hasDraft
                    ? "Will be saved when you click Save credentials."
                    : hasValue
                      ? isVisible
                        ? "Showing last 4 characters only. Enter text above to replace."
                        : "Value saved. Click the eye to see the last 4 characters."
                      : "No value saved yet."}
                </p>
              </div>
            );
          })
        )}
        {rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={!pendingCount || saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save credentials
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
