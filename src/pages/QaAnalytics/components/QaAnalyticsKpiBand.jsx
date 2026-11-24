import { Skeleton } from "@/components/ui/skeleton";
import {
  formatQaRate,
  withoutQaTargetReference,
} from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { QaAnalyticsTruncatedText } from "@/pages/QaAnalytics/components/QaAnalyticsTruncatedText.jsx";

const HIDDEN_KPI_IDS = new Set(["medianRunDurationMs"]);

function Delta({ kpi }) {
  if (kpi.deltaPct == null && kpi.deltaAbs == null) return null;
  if (kpi.deltaPct === 0) {
    return <span className="text-[11px] text-muted-foreground">0%</span>;
  }
  if (kpi.deltaPct > 0) {
    return <span className="text-[11px] font-medium text-primary">{kpi.deltaPct}%</span>;
  }
  return (
    <span className="text-[11px] font-medium text-destructive">{Math.abs(kpi.deltaPct)}%</span>
  );
}

function formatKpiValue(kpi) {
  if (kpi.value == null) return "—";
  if (
    kpi.id === "testCasePassRate" ||
    kpi.id === "testCaseFlakyRate" ||
    kpi.id === "passRate" ||
    kpi.id === "flakyRate" ||
    kpi.id === "interruptionRate"
  ) {
    return formatQaRate(kpi.value);
  }
  return String(kpi.value);
}

/**
 * @param {{ kpis?: object[], loading?: boolean }} props
 */
export function QaAnalyticsKpiBand({ kpis = [], loading = false }) {
  const visibleKpis = kpis.filter((kpi) => !HIDDEN_KPI_IDS.has(kpi.id));

  if (loading) {
    return (
      <div
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border md:grid-cols-3 xl:grid-cols-6"
        role="status"
        aria-busy="true"
        aria-label="Loading KPIs"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-2 bg-card px-4 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border md:grid-cols-3 xl:grid-cols-6">
      {visibleKpis.map((kpi) => (
        <div key={kpi.id} className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <QaAnalyticsTruncatedText
              as="p"
              text={kpi.label}
              className="text-xs font-medium text-muted-foreground"
            />
            <Delta kpi={kpi} />
          </div>
          <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
            {formatKpiValue(kpi)}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{ narrative?: object }} props
 */
export function QaAnalyticsNarrative({ narrative }) {
  const text = withoutQaTargetReference(narrative?.text);
  if (!text) return null;
  return (
    <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground">
      {text}
    </p>
  );
}
