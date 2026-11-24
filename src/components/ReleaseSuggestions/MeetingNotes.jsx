import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Loader2, RefreshCw, ScanSearch } from "lucide-react";
import { useState } from "react";

export const MeetingNotes = ({ meetingNotes, sourcesLoading }) => {
  const {
    labelProps,
    textareaProps,
    characterCount,
    hasSelectedHubMeetings,
    hub,
    repoScan,
  } = meetingNotes;
  const { multiSelect: hubMulti, slotsLeft: hubSlotsLeft } = hub;

  const [hubMeetingsOpen, setHubMeetingsOpen] = useState(false);

  return (
    <section className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label {...labelProps} className="text-sm font-medium">
          Meeting notes
        </Label>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Popover open={hubMeetingsOpen} onOpenChange={setHubMeetingsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="transition-colors duration-200 shrink-0 gap-1.5"
                disabled={
                  !hub.canUseHub ||
                  hub.loading ||
                  sourcesLoading ||
                  hub.rowsLoaded === 0
                }
                aria-label="Choose Hub meetings for meeting notes"
              >
                Hub meetings
                {hubMulti.selectedKeys.length > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 rounded-full px-1.5 text-[10px] font-normal tabular-nums"
                  >
                    {hubMulti.selectedKeys.length}
                  </Badge>
                ) : null}
                <ChevronsUpDown
                  className="h-3.5 w-3.5 opacity-50"
                  aria-hidden
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(calc(100vw-2rem),22rem)] p-0"
              align="end"
              sideOffset={6}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground">
                  Up to {hub.maxMeetings} meetings
                </p>
                {hubMulti.items.length > 1 ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto shrink-0 p-0 text-xs"
                    onClick={() => hubMulti.selectInListOrder()}
                  >
                    Fill up to {hub.maxMeetings} (list order)
                  </Button>
                ) : null}
              </div>
              <ul
                className="max-h-64 list-none space-y-0.5 overflow-y-auto p-2 m-0"
                aria-label="Hub meetings multi-select"
              >
                {hubMulti.items.map(({ key, label }) => {
                  const checked = hubMulti.selectedKeys.includes(key);
                  const atCap =
                    hubSlotsLeft <= 0 ||
                    (!checked &&
                      hubMulti.selectedKeys.length >= hub.maxMeetings);
                  const disabled = atCap;
                  return (
                    <li key={key}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors duration-200",
                          disabled && "cursor-not-allowed opacity-60",
                          checked && "bg-primary/5",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => hubMulti.toggle(key)}
                          aria-label={label}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1 leading-snug text-foreground">
                          {label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="transition-colors duration-200 shrink-0"
            disabled={!hub.canUseHub || hub.loading || sourcesLoading}
            onClick={hub.load}
          >
            {hub.loading ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 animate-spin mr-1.5"
                  aria-hidden
                />
                Loading…
              </>
            ) : (
              <RefreshCw />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground shrink-0"
            onClick={hub.clear}
            disabled={repoScan?.loading || sourcesLoading}
          >
            Clear
          </Button>
          {repoScan?.showOption ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="transition-colors duration-200 shrink-0 gap-1.5"
              disabled={repoScan.loading || sourcesLoading}
              onClick={repoScan.fetch}
            >
              {repoScan.loading ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden
                  />
                  Scanning repo…
                </>
              ) : (
                <>
                  <ScanSearch className="h-3.5 w-3.5" aria-hidden />
                  Fetch project details
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
      {!hub.canUseHub ? (
        <p className="text-xs text-muted-foreground">
          Hub meeting notes require a linked Hub project id on this project.
        </p>
      ) : null}
      {repoScan?.showOption ? (
        <p className="text-xs text-muted-foreground">
          No Hub meetings yet. Fetch project details to run Cursor in ask mode
          over your launchpad repository (same as AI chat) and fill meeting notes
          with discovered product features.
        </p>
      ) : null}
      {hub.canUseHub && hub.rowsLoaded > 0 ? (
        <p className="text-xs text-muted-foreground">
          {hub.meetingsSelectedCount} / {hub.maxMeetings} Hub meetings in notes
          {hub.meetingsSelectedCount >= hub.maxMeetings
            ? " (maximum — deselect in Hub meetings or clear)."
            : null}
        </p>
      ) : null}
      {hasSelectedHubMeetings ? (
        <p className="text-xs text-muted-foreground">
          Hub meetings are merged into this field when your selection changes. You
          can always edit the text before running suggestions.
        </p>
      ) : null}
      <Textarea {...textareaProps} />
      <p className="text-xs text-muted-foreground text-right">
        {characterCount.max != null
          ? `${characterCount.current.toLocaleString()} / ${characterCount.max.toLocaleString()}`
          : `${characterCount.current.toLocaleString()} characters`}
      </p>
    </section>
  );
};
