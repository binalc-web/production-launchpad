import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QA_ANALYTICS_RANGE_OPTIONS } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import { useQaProjectEnvironments } from "@/pages/QaAnalytics/hooks/useQaProjectEnvironments.js";
import { QaAnalyticsDatePicker } from "@/pages/QaAnalytics/components/QaAnalyticsDatePicker.jsx";

const ALL_ENVIRONMENTS = "__all__";
const DAY_MS = 86_400_000;
const PRESET_DAYS = { "7d": 7, "30d": 30 };

const utcDate = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Same window the API uses for a preset: the N UTC days ending today (inclusive). */
function presetWindow(range) {
  const today = Date.parse(utcDate(Date.now()));
  if (range === "today") return { from: utcDate(today), to: utcDate(today) };
  const days = PRESET_DAYS[range] ?? 30;
  return { from: utcDate(today - (days - 1) * DAY_MS), to: utcDate(today) };
}

/**
 * @param {{ state: object, projectId?: number|string, onChange: (patch: object) => void }} props
 */
export function QaAnalyticsProjectFilterRail({ state, projectId, onChange }) {
  const { environments, loading } = useQaProjectEnvironments(projectId);

  const environmentOptions = [...environments];
  const selectedEnv = state.environment?.trim();
  if (selectedEnv && !environmentOptions.some((env) => env.id === selectedEnv)) {
    environmentOptions.unshift({ id: selectedEnv, name: selectedEnv });
  }

  const environmentValue = selectedEnv || ALL_ENVIRONMENTS;
  const range = state.range || "30d";
  const from = state.from ? state.from.slice(0, 10) : "";
  const to = state.to ? state.to.slice(0, 10) : "";
  const today = utcDate(Date.now());

  const handleRangeChange = (value) => {
    if (value === "custom") {
      onChange({ range: value, ...(from && to ? { from, to } : presetWindow(range)) });
    } else {
      onChange({ range: value, from: "", to: "" });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-background/95 p-3">
      <div className="flex min-w-[140px] flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Range</label>
        <Select value={range} onValueChange={handleRangeChange}>
          <SelectTrigger className="h-9" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QA_ANALYTICS_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {range === "custom" ? (
        <>
          <QaAnalyticsDatePicker
            id="qa-range-from"
            label="From (UTC)"
            className="h-9 w-[160px]"
            value={from}
            max={to || today}
            onChange={(value) => onChange({ from: value })}
          />
          <QaAnalyticsDatePicker
            id="qa-range-to"
            label="To (UTC, inclusive)"
            className="h-9 w-[160px]"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(value) => onChange({ to: value })}
          />
        </>
      ) : null}

      <div className="flex min-w-[180px] flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Environment</label>
        <Select
          value={environmentValue}
          onValueChange={(value) =>
            onChange({ environment: value === ALL_ENVIRONMENTS ? "" : value })
          }
          disabled={loading && environmentOptions.length === 0}
        >
          <SelectTrigger className="h-9" aria-label="Environment filter">
            <SelectValue placeholder={loading ? undefined : "All environments"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ENVIRONMENTS}>All environments</SelectItem>
            {environmentOptions.map((env) => (
              <SelectItem key={env.id} value={env.id}>
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
