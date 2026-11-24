import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AUTOMATION_LABELS } from "../automationDisplay";

export function AutomationsToolbar({
  search,
  onSearchChange,
  showInactive,
  onShowInactiveChange,
  activeCount,
  inactiveCount,
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative min-w-0 w-full">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={AUTOMATION_LABELS.searchPlaceholder}
          className="h-11 w-full rounded-lg border-border bg-card pl-10 transition-all duration-200"
          aria-label={AUTOMATION_LABELS.searchPlaceholder}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="shrink-0 text-sm text-muted-foreground whitespace-nowrap">
          <span className="font-medium text-foreground">
            {AUTOMATION_LABELS.activeCount(activeCount)}
          </span>
          <span className="mx-2 text-border">·</span>
          <span className="font-medium text-foreground">
            {AUTOMATION_LABELS.inactiveCount(inactiveCount)}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            id="show-inactive-automations"
            checked={showInactive}
            onCheckedChange={onShowInactiveChange}
            aria-label={AUTOMATION_LABELS.showInactive}
          />
          <Label
            htmlFor="show-inactive-automations"
            className="cursor-pointer whitespace-nowrap text-sm font-normal text-foreground"
          >
            {AUTOMATION_LABELS.showInactive}
          </Label>
        </div>
      </div>
    </div>
  );
}
