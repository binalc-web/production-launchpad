import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDelta } from "../platformAnalyticsDisplay";

const TONE_STYLES = {
  up: { icon: ArrowUpRight, className: "text-emerald-600 dark:text-emerald-400" },
  down: { icon: ArrowDownRight, className: "text-rose-600 dark:text-rose-400" },
  flat: { icon: Minus, className: "text-muted-foreground" },
  new: { icon: Sparkles, className: "text-sky-600 dark:text-sky-400" },
};

/**
 * KPI tile with optional previous-period delta.
 * @param {{ label: string, value: string, deltaPct?: number|null, hint?: string }} props
 */
export function KpiCard({ label, value, deltaPct, hint }) {
  const hasDelta = deltaPct !== undefined;
  const delta = hasDelta ? formatDelta(deltaPct) : null;
  const tone = delta ? TONE_STYLES[delta.tone] : null;
  const Icon = tone?.icon;

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {delta ? (
            <span
              className={cn("inline-flex items-center gap-0.5 text-xs font-medium", tone.className)}
            >
              <Icon className="size-3.5" aria-hidden />
              {delta.label}
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
