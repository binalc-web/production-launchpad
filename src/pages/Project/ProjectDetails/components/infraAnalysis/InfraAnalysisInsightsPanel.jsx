import { useState } from "react";
import { cn } from "@/lib/utils";
import { InfraTopRecommendationsPanel } from "./recommendations/InfraTopRecommendationsPanel.jsx";

/** Metric cells that stay in the equal-height strip (runtime is meta, not a cell). */
const STRIP_KPI_IDS = new Set(["components", "suggestions", "iac", "confidence"]);

/** Soft fill for metric cells; dividers stay on the grid, not the tone border. */
function kpiToneClass(tone) {
  switch (tone) {
    case "good":
      return "bg-emerald-500/5";
    case "warning":
      return "bg-amber-500/5";
    default:
      return "bg-background";
  }
}

/**
 * Overview band, metrics strip, and recommendation blocks from insightsSnapshot.
 */
export function InfraAnalysisInsightsPanel({
  insightsSnapshot,
  executiveSummary,
  architectureGraph = null,
  selectedNodeId = null,
  onFocusDiagram,
  onFixSuggestion,
  afterKpis = null,
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const kpis = Array.isArray(insightsSnapshot?.kpis) ? insightsSnapshot.kpis : [];
  const recommendations = Array.isArray(insightsSnapshot?.recommendations)
    ? insightsSnapshot.recommendations
    : [];
  const securityChecklist = Array.isArray(insightsSnapshot?.securityChecklist)
    ? insightsSnapshot.securityChecklist
    : [];

  const summary = executiveSummary?.trim() || insightsSnapshot?.executiveSummary?.trim() || "";
  const runtimeKpi = kpis.find((kpi) => kpi.id === "runtime");
  const stripKpis = kpis.filter((kpi) => STRIP_KPI_IDS.has(kpi.id));
  const showOverview = Boolean(summary || runtimeKpi || stripKpis.length > 0);
  /** Short summaries need no expand control; ~180 chars ≈ 3 lines of body text. */
  const summaryNeedsExpand = summary.length > 180;

  return (
    <div className="space-y-4">
      {showOverview ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {summary ? (
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Summary</p>
              <p
                className={cn(
                  "mt-1.5 max-w-[75ch] text-sm leading-relaxed text-foreground",
                  !summaryExpanded && summaryNeedsExpand && "line-clamp-3",
                )}
              >
                {summary}
              </p>
              {summaryNeedsExpand ? (
                <button
                  type="button"
                  className="mt-1.5 text-xs font-medium text-primary hover:underline"
                  onClick={() => setSummaryExpanded((open) => !open)}
                >
                  {summaryExpanded ? "Show less" : "Expand"}
                </button>
              ) : null}
            </div>
          ) : null}

          {runtimeKpi ? (
            <div className="border-b border-border px-4 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{runtimeKpi.value}</span>
                {runtimeKpi.helper ? (
                  <>
                    <span className="mx-1.5 text-border" aria-hidden>
                      ·
                    </span>
                    <span>{runtimeKpi.helper}</span>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}

          {stripKpis.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {stripKpis.map((kpi, index) => (
                <div
                  key={kpi.id}
                  className={cn(
                    "flex min-h-[5.5rem] flex-col border-border p-3",
                    index % 2 === 1 && "border-l",
                    index >= 2 && "border-t lg:border-t-0",
                    index >= 1 && "lg:border-l",
                    kpiToneClass(kpi.tone),
                  )}
                >
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
                    {kpi.value}
                  </p>
                  {kpi.helper ? (
                    <p className="mt-auto pt-1 line-clamp-2 text-xs text-muted-foreground">
                      {kpi.helper}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {afterKpis}

      {recommendations.length > 0 ? (
        <InfraTopRecommendationsPanel
          recommendations={recommendations}
          architectureGraph={architectureGraph}
          selectedNodeId={selectedNodeId}
          onFocusDiagram={onFocusDiagram}
          onFixSuggestion={onFixSuggestion}
        />
      ) : null}

      {securityChecklist.length > 0 ? (
        <div className="rounded-lg border border-border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Security notes</p>
          <ul className="mt-2 space-y-1.5">
            {securityChecklist.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <span className="text-foreground">{item.title}</span>
                <span className="shrink-0 text-xs capitalize text-muted-foreground">
                  {item.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
