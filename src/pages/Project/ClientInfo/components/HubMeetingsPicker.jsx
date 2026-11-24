import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHubMeetingNotesAggregated, ingestDiscoveryHubMeetings } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatSingleHubMeetingToPlainText,
  getHubMeetingRowLabel,
  getHubMeetingRowStableKey,
} from "@/utils/hubMeetingNotes";
import { Loader2, RefreshCw, Video } from "lucide-react";
import { toast } from "sonner";

const MAX_MEETINGS = 5;

export function HubMeetingsPicker({ projectId, hubProjectId, onIngested, disabled }) {
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const canUseHub = Boolean(hubProjectId);

  const items = useMemo(
    () =>
      rows.map((row, index) => ({
        key: getHubMeetingRowStableKey(row, index),
        label: getHubMeetingRowLabel(row, index),
        text: formatSingleHubMeetingToPlainText(row).trim(),
        index,
      })),
    [rows],
  );

  const load = useCallback(
    async (quiet = false) => {
      if (!hubProjectId) {
        if (!quiet) {
          toast.error("Link this project to a Hub project to load meeting notes.");
        }
        return;
      }
      setLoading(true);
      try {
        const data = await fetchHubMeetingNotesAggregated(hubProjectId);
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        setSelectedKeys([]);
        if (!quiet) {
          if (!list.length) toast.message("No meeting notes returned from Hub yet.");
          else toast.success(`${list.length} Hub meeting${list.length === 1 ? "" : "s"} loaded`);
        }
      } catch (err) {
        if (!quiet) toast.error(err?.message || err?.error || "Could not load meeting notes");
        setRows([]);
        setSelectedKeys([]);
      } finally {
        setLoading(false);
      }
    },
    [hubProjectId],
  );

  useEffect(() => {
    if (canUseHub) load(true);
  }, [canUseHub, load]);

  const toggle = (key) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_MEETINGS) {
        toast.message(`You can select at most ${MAX_MEETINGS} meetings.`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const ingestSelected = async () => {
    const meetings = items
      .filter((item) => selectedKeys.includes(item.key) && item.text)
      .map((item) => ({ name: item.label, text: item.text }));
    if (!meetings.length) {
      toast.error("Select at least one meeting with note text.");
      return;
    }
    setIngesting(true);
    try {
      await ingestDiscoveryHubMeetings(projectId, meetings);
      setSelectedKeys([]);
      toast.success(
        `Added ${meetings.length} meeting${meetings.length === 1 ? "" : "s"} — profiles updating in background`,
      );
      onIngested?.();
    } catch (err) {
      toast.error(err?.error || "Failed to extract meeting notes");
    } finally {
      setIngesting(false);
    }
  };

  if (!canUseHub) {
    return (
      <p className="text-xs text-muted-foreground">
        Hub meeting notes require a linked Hub project on this Launchpad project.
      </p>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Hub meetings</p>
          {rows.length > 0 ? (
            <span className="text-xs text-muted-foreground">{rows.length} loaded</span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || loading}
          onClick={() => load(false)}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading meetings">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Load meetings from your linked Hub project, then select up to {MAX_MEETINGS} to add to the
          timeline.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Select meetings to extract into Capture. Loaded meetings appear here before they are
            added to the timeline.
          </p>
          <ul className="max-h-56 overflow-y-auto space-y-1 border rounded-lg p-2">
            {items.map(({ key, label, text }) => {
              const checked = selectedKeys.includes(key);
              const atCap = !checked && selectedKeys.length >= MAX_MEETINGS;
              const missingText = !text;
              return (
                <li key={key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50",
                      (atCap || missingText) && "cursor-not-allowed opacity-60",
                      checked && "bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={atCap || missingText}
                      onCheckedChange={() => toggle(key)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{label}</p>
                      {missingText ? (
                        <p className="text-xs text-destructive">No note text in this meeting</p>
                      ) : (
                        <p className="text-xs text-muted-foreground line-clamp-2">{text}</p>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Button
        type="button"
        size="sm"
        disabled={disabled || ingesting || selectedKeys.length === 0}
        onClick={ingestSelected}
      >
        {ingesting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Extract selected to timeline
      </Button>
    </div>
  );
}
