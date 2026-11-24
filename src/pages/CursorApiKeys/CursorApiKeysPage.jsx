import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import {
  activatePlatformCursorApiKey,
  createPlatformCursorApiKey,
  deletePlatformCursorApiKey,
  fetchPlatformCursorApiKeys,
} from "@/api";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";

function sourceLabel(source) {
  if (source === "env_cursor_api_key") return "From env";
  if (source === "env_cursor_api_keys") return "From env pool";
  if (source === "ui") return "Added in UI";
  return source || "—";
}

function formatUpdatedAt(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function CursorApiKeysSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading Cursor API keys">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

/**
 * Admin page: manage platform Cursor API keys (add many, activate exactly one).
 */
export default function CursorApiKeysPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [busyId, setBusyId] = useState(/** @type {number|null} */ (null));
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addKey, setAddKey] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformCursorApiKeys();
      setKeys(Array.isArray(data?.keys) ? data.keys : []);
    } catch (error) {
      toast.error(error?.message || "Could not load Cursor API keys.");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isLaunchpadAdmin(user?.role)) {
    return <Navigate to="/projects" replace />;
  }

  const onActivate = async (id) => {
    setBusyId(id);
    try {
      await activatePlatformCursorApiKey(id);
      toast.success("Active Cursor API key updated. Apps pick it up on the next request.");
      await load();
    } catch (error) {
      toast.error(error?.message || "Could not activate key.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id) => {
    setBusyId(id);
    try {
      await deletePlatformCursorApiKey(id);
      toast.success("Key removed.");
      await load();
    } catch (error) {
      toast.error(error?.message || "Could not delete key.");
    } finally {
      setBusyId(null);
    }
  };

  const onAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await createPlatformCursorApiKey({
        label: addLabel.trim() || undefined,
        apiKey: addKey.trim(),
      });
      toast.success("Key added.");
      setAddOpen(false);
      setAddLabel("");
      setAddKey("");
      await load();
    } catch (error) {
      toast.error(error?.message || "Could not add key.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Cursor API keys"
        description="Add Cursor billing keys and activate exactly one. Backend, cloud agent, queue drains, and preview desktop use the active key on the next interaction. Keys from env are seeded once into this list."
      />
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" aria-hidden />
              Keys
            </CardTitle>
            <CardDescription>
              Only one key can be active. Exhausted keys are not rotated automatically — activate
              another when needed.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Add key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CursorApiKeysSkeleton />
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keys yet. Set <code className="text-xs">CURSOR_API_KEY</code> /{" "}
              <code className="text-xs">CURSOR_API_KEYS</code> in the environment and refresh to
              seed, or add a key here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((row) => {
                  const busy = busyId === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.label || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.maskedKey || "••••"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sourceLabel(row.source)}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.isActive ? (
                          <Badge>Active</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatUpdatedAt(row.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!row.isActive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void onActivate(row.id)}
                            >
                              {busy ? "…" : "Activate"}
                            </Button>
                          ) : null}
                          {!row.isActive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              aria-label={`Delete ${row.label || "key"}`}
                              onClick={() => void onDelete(row.id)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <form onSubmit={onAdd}>
            <DialogHeader>
              <DialogTitle>Add Cursor API key</DialogTitle>
              <DialogDescription>
                Paste a Cursor API key. It is stored encrypted and never shown in full again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cursor-key-label">Label</Label>
                <Input
                  id="cursor-key-label"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="e.g. Billing team B"
                  maxLength={120}
                  disabled={adding}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cursor-key-value">API key</Label>
                <Input
                  id="cursor-key-value"
                  type="password"
                  autoComplete="off"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="Paste key"
                  required
                  minLength={8}
                  disabled={adding}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adding || addKey.trim().length < 8}>
                {adding ? "Adding…" : "Add key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
