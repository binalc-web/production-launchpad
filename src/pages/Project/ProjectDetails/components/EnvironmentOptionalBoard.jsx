import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, CircleDashed, Globe, Loader2, Trash2 } from "lucide-react";
import {
  EnvironmentVariableLayerBadge,
  EnvironmentVariableRepoSummary,
} from "./EnvironmentVariableCatalogCells";

const CUSTOM_DOMAIN_LOGICAL_ID = "infra.custom.domain";
const TLS_CERTIFICATE_LOGICAL_ID = "infra.tls.certificate_arn";
const CORS_ORIGINS_LOGICAL_ID = "app.cors.origins";
const API_BASE_URL_LOGICAL_ID = "api.base_url";

/**
 * Plain-language hint for an empty optional variable, derived from its kind so
 * we never imply a vendor secret "uses template defaults".
 */
function getOptionalEmptyHint(logicalId, isConditionallyRequired) {
  if (isConditionallyRequired) {
    return "Required because you set a custom domain.";
  }
  if (
    logicalId === CORS_ORIGINS_LOGICAL_ID ||
    logicalId === API_BASE_URL_LOGICAL_ID ||
    /(redirect[._]ur[il]|callback[._]url|callback[._]uri)$/i.test(String(logicalId ?? ""))
  ) {
    return "Filled automatically from your app URL after deploy.";
  }
  return "Empty is OK — stack uses template defaults.";
}

/**
 * Optional deploy settings — leave blank to use CloudFormation defaults (e.g. default CloudFront URL).
 */
export function EnvironmentOptionalBoard({
  rows,
  draftValues,
  onDraftChange,
  onSave,
  onRemoveVariable,
  saving,
  pendingCount,
}) {
  if (!rows.length) return null;

  const customDomainRow = rows.find((r) => r.logicalId === CUSTOM_DOMAIN_LOGICAL_ID);
  const customDomainDraft = String(draftValues[CUSTOM_DOMAIN_LOGICAL_ID] ?? "").trim();
  const customDomainSet = customDomainDraft.length > 0 || Boolean(customDomainRow?.hasValue);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-sm font-semibold">Optional — custom domain</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave blank to deploy with the default CloudFront URL. Fill these only if you use a custom
          domain and ACM certificate.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const hasValue = Boolean(row.hasValue);
          const hasDraft = String(draftValues[row.logicalId] ?? "").trim().length > 0;
          const isSecretField = row.logicalId?.includes("certificate");
          const isConditionallyRequired =
            row.logicalId === TLS_CERTIFICATE_LOGICAL_ID && customDomainSet;
          return (
            <div
              key={row.logicalId}
              className="space-y-2 rounded-lg border border-border bg-muted/10 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {row.label || row.logicalId}
                  {isConditionallyRequired ? (
                    <>
                      {" "}
                      <span className="text-destructive" aria-hidden>
                        *
                      </span>
                      <span className="sr-only">required when custom domain is set</span>
                    </>
                  ) : null}
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
                  {hasValue ? "Saved" : "Using default"}
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
              <Input
                type={isSecretField ? "password" : "text"}
                autoComplete="off"
                value={draftValues[row.logicalId] ?? ""}
                onChange={(e) => onDraftChange(row.logicalId, e.target.value)}
                placeholder={
                  hasValue
                    ? "Enter new value to replace saved value"
                    : "Leave blank for default deploy"
                }
                className="font-mono text-xs"
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">
                {hasDraft
                  ? "Will be saved when you click Save."
                  : hasValue
                    ? "Value stored server-side."
                    : getOptionalEmptyHint(row.logicalId, isConditionallyRequired)}
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
          Save optional settings
        </Button>
      </CardContent>
    </Card>
  );
}
