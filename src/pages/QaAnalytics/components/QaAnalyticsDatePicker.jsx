import { DatePickerSingle } from "@/components/ui/date-picker-single";
import { formatQaDateOnly, parseQaDateOnly } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";

/**
 * QA Analytics date field backed by the project's standard calendar popover
 * (Popover + Calendar, as in Create/Edit Release) instead of the browser's
 * native `<input type="date">` picker, whose dialog matches no app styling.
 * Values stay `yyyy-mm-dd` strings; `min`/`max` (also `yyyy-mm-dd`) disable
 * out-of-range days in the calendar.
 *
 * @param {{ id?: string, label: string, value: string, onChange: (value: string) => void,
 *   min?: string, max?: string, className?: string }} props
 */
export function QaAnalyticsDatePicker({ id, label, value, onChange, min, max, className }) {
  const minDate = parseQaDateOnly(min);
  const maxDate = parseQaDateOnly(max);
  const disabledDate = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <DatePickerSingle
        id={id}
        ariaLabel={label}
        className={className ?? "h-9 w-[180px]"}
        date={parseQaDateOnly(value)}
        onDateChange={(date) => {
          // Keep the current value when the pick is cleared/deselected.
          if (date) onChange(formatQaDateOnly(date));
        }}
        placeholder="Pick a date"
        displayFormat="dd/MM/yyyy"
        disabledDate={disabledDate.length ? disabledDate : undefined}
      />
    </div>
  );
}
