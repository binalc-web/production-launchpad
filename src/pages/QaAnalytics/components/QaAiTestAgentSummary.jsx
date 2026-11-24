import { formatRunTimeMs } from "@/pages/AgentAnalytics/agentAnalyticsDisplay";

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

/** @param {{ aiTest?: { runCount?: number, medianTurnDurationMs?: number|null, totalTokens?: number }|null }} props */
export function QaAiTestAgentSummary({ aiTest }) {
  const stats = aiTest || {};
  const runCount = Number(stats.runCount ?? 0) || 0;
  const medianMs = stats.medianTurnDurationMs;
  const combinedInOut = Number(stats.totalTokens ?? 0) || 0;

  if (runCount === 0 && combinedInOut === 0) return null;

  return (
    <section
      className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
      aria-label="AI Test agent usage"
    >
      <h3 className="text-sm font-semibold">AI Test agent</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Desktop live turns (not Playwright test run time).
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Turns</dt>
          <dd className="font-medium tabular-nums">{formatCount(runCount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Median turn time</dt>
          <dd className="font-medium tabular-nums">
            {medianMs != null ? formatRunTimeMs(medianMs) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Model usage (in + out)</dt>
          <dd className="font-medium tabular-nums">{formatCount(combinedInOut)}</dd>
        </div>
      </dl>
    </section>
  );
}

export default QaAiTestAgentSummary;
