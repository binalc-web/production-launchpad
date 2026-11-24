import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { InfraDisasterRecoveryMaturityChart } from "./rto/InfraDisasterRecoveryMaturityChart.jsx";
import { resolveRtoRpoView } from "./rto/resolveRtoRpoStages.js";

const CONFIDENCE_BADGE_CLASS = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  medium:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  low: "border-border bg-muted text-muted-foreground",
};

const PRIORITY_BADGE_CLASS = {
  critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  medium: "border-border bg-muted text-muted-foreground",
};

function normalizeConfidence(confidence) {
  const key = String(confidence ?? "medium").toLowerCase();
  return CONFIDENCE_BADGE_CLASS[key] ? key : "medium";
}

function normalizeRecommendedChange(item) {
  if (typeof item === "string") {
    return { title: item, description: "", priority: null };
  }
  if (!item || typeof item !== "object") {
    return { title: "Infrastructure change", description: "", priority: null };
  }
  const priority = ["critical", "high", "medium"].includes(
    String(item.priority ?? "").toLowerCase(),
  )
    ? String(item.priority).toLowerCase()
    : null;
  return {
    title: String(item.title ?? "Infrastructure change"),
    description: String(item.description ?? ""),
    priority,
  };
}

/** Whether rtoRpo payload has content worth rendering. */
export function hasMeaningfulRtoRpo(rtoRpo) {
  if (!rtoRpo || typeof rtoRpo !== "object") return false;
  const textFields = [
    rtoRpo.currentPattern,
    rtoRpo.targetPattern,
    rtoRpo.whyItMatters,
    rtoRpo.reason,
  ];
  if (textFields.some((value) => String(value ?? "").trim())) return true;
  const changes = Array.isArray(rtoRpo.recommendedChanges) ? rtoRpo.recommendedChanges : [];
  const files = Array.isArray(rtoRpo.filesToChange) ? rtoRpo.filesToChange : [];
  return changes.length > 0 || files.length > 0;
}

function ProfileSummaryCard({ title, profile, variant }) {
  const isTarget = variant === "target";
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isTarget
          ? "border-primary/25 bg-primary/5"
          : "border-amber-200/80 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-500/10",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          isTarget ? "text-primary" : "text-amber-700 dark:text-amber-300",
        )}
      >
        {profile.pattern}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">RTO</p>
          <p className="font-mono font-semibold text-foreground">{profile.rto}</p>
        </div>
        <div>
          <p className="text-muted-foreground">RPO</p>
          <p className="font-mono font-semibold text-foreground">{profile.rpo}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact RTO/RPO readiness panel with change details behind progressive disclosure.
 */
export function InfraAnalysisRtoRpoPanel({ rtoRpo }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!hasMeaningfulRtoRpo(rtoRpo)) return null;

  const view = resolveRtoRpoView(rtoRpo);
  const confidence = normalizeConfidence(rtoRpo.confidence);
  const recommendedChanges = (
    Array.isArray(rtoRpo.recommendedChanges) ? rtoRpo.recommendedChanges : []
  )
    .map(normalizeRecommendedChange)
    .filter((item) => item.title);
  const filesToChange = (Array.isArray(rtoRpo.filesToChange) ? rtoRpo.filesToChange : [])
    .map(String)
    .filter(Boolean)
    .slice(0, 5);
  const hasChangeDetails = recommendedChanges.length > 0 || filesToChange.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">RTO/RPO readiness</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Disaster recovery maturity</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 rounded-md px-1.5 text-[10px] font-medium capitalize",
              CONFIDENCE_BADGE_CLASS[confidence],
            )}
          >
            Confidence: {confidence}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileSummaryCard
            title="Current state"
            profile={view.currentProfile}
            variant="current"
          />
          <ProfileSummaryCard title="Target state" profile={view.targetProfile} variant="target" />
        </div>

        <InfraDisasterRecoveryMaturityChart
          currentStage={view.currentStage}
          targetStage={view.targetStage}
          summary={view.summary || undefined}
        />

        {hasChangeDetails ? (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Change details
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  detailsOpen && "rotate-180",
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {recommendedChanges.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recommended changes
                  </p>
                  <ul className="mt-2 space-y-2">
                    {recommendedChanges.map((change, index) => (
                      <li
                        key={`${change.title}-${index}`}
                        className="rounded-lg border border-border bg-background p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium text-foreground">{change.title}</p>
                          {change.priority ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 rounded-md px-1.5 text-[10px] font-medium capitalize",
                                PRIORITY_BADGE_CLASS[change.priority] ??
                                  PRIORITY_BADGE_CLASS.medium,
                              )}
                            >
                              {change.priority}
                            </Badge>
                          ) : null}
                        </div>
                        {change.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{change.description}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {filesToChange.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Files to change
                  </p>
                  <ul className="mt-1.5 space-y-1 font-mono text-xs text-muted-foreground">
                    {filesToChange.map((file) => (
                      <li key={file} className="truncate">
                        • {file}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        <p className="text-[10px] text-muted-foreground">
          Exact RTO/RPO targets appear only when set in infra config.
        </p>
      </CardContent>
    </Card>
  );
}
