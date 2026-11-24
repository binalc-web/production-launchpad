import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function VisualCompareSnapshotPanel({ snapshot }) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const mismatch = snapshot.pixel?.mismatchPercentage;
  const failedChecks = Array.isArray(snapshot.failedChecks) ? snapshot.failedChecks : [];

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Visual compare</Badge>
        {mismatch != null ? (
          <Badge variant="outline" className="tabular-nums">
            {mismatch}% mismatch
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <MetaRow label="Web URL" value={snapshot.webUrl} />
        <MetaRow label="Figma URL" value={snapshot.figmaUrl} />
        {snapshot.viewport?.label ? (
          <MetaRow
            label="Viewport"
            value={`${snapshot.viewport.label}${snapshot.viewport.width ? ` · ${snapshot.viewport.width}×${snapshot.viewport.height}` : ""}`}
          />
        ) : null}
      </div>

      {failedChecks.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Top failed checks</p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {failedChecks.slice(0, 8).map((row, index) =>
              (row.checks || []).slice(0, 2).map((check, checkIndex) => (
                <li
                  key={`${index}-${checkIndex}`}
                  className={cn("rounded-md bg-background/70 px-2 py-1 leading-snug")}
                >
                  [{check.category || "check"}] {check.property || ""} — expected{" "}
                  {check.expected ?? "—"} · actual {check.actual ?? "—"}
                  {row.domSelector ? ` @ ${row.domSelector}` : ""}
                </li>
              )),
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
