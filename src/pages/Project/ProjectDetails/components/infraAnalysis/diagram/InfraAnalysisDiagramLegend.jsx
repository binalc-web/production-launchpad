/** Compact legend for the infra analysis diagram. */
export function InfraAnalysisDiagramLegend() {
  return (
    <div className="absolute right-3 top-3 z-10 max-w-[220px] space-y-2 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Legend
      </p>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-8 rounded-full bg-[#00B38A]" />
        <span className="text-muted-foreground">Primary request flow</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-8 rounded border-t-2 border-dashed border-slate-400" />
        <span className="text-muted-foreground">Dependency / data</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full border border-emerald-600/45 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-900 dark:text-emerald-100">
          Detected
        </span>
        <span className="text-muted-foreground">From repo evidence</span>
      </div>
    </div>
  );
}
