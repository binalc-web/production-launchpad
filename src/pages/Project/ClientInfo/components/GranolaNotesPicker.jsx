import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGranolaNotes, fetchIntegrationsStatus, ingestGranolaNote } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Video } from "lucide-react";
import { toast } from "sonner";

export function GranolaNotesPicker({ projectId, onImported, disabled }) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [applyToProfiles, setApplyToProfiles] = useState(true);

  const checkConnection = useCallback(async () => {
    try {
      const status = await fetchIntegrationsStatus();
      setConnected(Boolean(status?.granola?.connected));
    } catch {
      setConnected(false);
    }
  }, []);

  const load = useCallback(
    async (quiet = false) => {
      if (!projectId) return;
      setLoading(true);
      try {
        const data = await fetchGranolaNotes(projectId);
        const list = data?.notes || [];
        setRows(list);
        setSelectedId("");
        if (!quiet) {
          if (!list.length) toast.message("No Granola meetings available yet.");
          else toast.success(`${list.length} meeting${list.length === 1 ? "" : "s"} loaded`);
        }
      } catch (err) {
        if (!quiet) toast.error(err?.error || "Could not load Granola meetings");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connected && projectId) load(true);
  }, [connected, projectId, load]);

  const importSelected = async () => {
    if (!selectedId) {
      toast.error("Select a meeting to import.");
      return;
    }
    setImporting(true);
    try {
      await ingestGranolaNote(projectId, {
        noteId: selectedId,
        applyToProfiles,
      });
      setSelectedId("");
      toast.success(
        applyToProfiles ? "Imported — profiles updating in background" : "Imported into Notes",
      );
      onImported?.();
    } catch (err) {
      toast.error(err?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!connected) {
    return (
      <div className="rounded-xl border border-dashed p-4 space-y-2 text-sm text-muted-foreground">
        <p>Connect Granola in Connected accounts to import meeting notes.</p>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link to="/settings/integrations">Connect Granola</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Import Granola meeting</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => load(false)}
          disabled={disabled || loading}
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
          Load meetings from your connected Granola account, then select one to import as a note.
        </p>
      ) : (
        <ul className="max-h-56 overflow-y-auto space-y-1 border rounded-lg p-2">
          {rows.map((row) => (
            <li key={row.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50",
                  selectedId === row.id && "bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="granola-note"
                  className="mt-1"
                  checked={selectedId === row.id}
                  onChange={() => setSelectedId(row.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.heldAt ? new Date(row.heldAt).toLocaleDateString() : "—"}
                    {row.attendeeCount ? ` · ${row.attendeeCount} attendees` : ""}
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="granola-apply-profiles"
          checked={applyToProfiles}
          onCheckedChange={(c) => setApplyToProfiles(Boolean(c))}
        />
        <Label htmlFor="granola-apply-profiles" className="text-sm font-normal">
          Update profiles from content
        </Label>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={disabled || importing || !selectedId}
        onClick={importSelected}
      >
        {importing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Import to Notes
      </Button>
    </div>
  );
}
