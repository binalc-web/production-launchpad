"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePickerSingle({
  id,
  ariaLabel,
  className,
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  /** react-day-picker `disabled` matcher for days that cannot be picked */
  disabledDate,
  /** date-fns format string for the trigger label */
  displayFormat = "LLL dd, y",
}) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (d) => {
    onDateChange?.(d ?? null);
    // Close on successful day pick so tests and users leave the popover reliably.
    if (d) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          aria-label={ariaLabel}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal border-border bg-transparent",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, displayFormat) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={handleSelect}
          disabled={disabledDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
