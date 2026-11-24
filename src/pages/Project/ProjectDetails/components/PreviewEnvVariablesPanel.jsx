import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { fetchProjectPreviewEnv, putProjectPreviewEnv } from "@/api";
import { toast } from "sonner";

const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * One-way KEY=VALUE editor for LaunchPad preview `.env` (stored under `.platform`).
 */
export function PreviewEnvVariablesPanel({ projectId }) {
  const [loading, setLoading] = useState(Boolean(projectId));
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [draftValues, setDraftValues] = useState({});
  const [removedKeys, setRemovedKeys] = useState([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchProjectPreviewEnv(projectId);
      const variables = Array.isArray(data?.variables) ? data.variables : [];
      setRows(variables);
      setDraftValues({});
      setRemovedKeys([]);
      setNewKey("");
      setNewValue("");
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not load preview env vars");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => {
    let count = removedKeys.length;
    for (const value of Object.values(draftValues)) {
      if (String(value ?? "").trim()) count += 1;
    }
    if (newKey.trim() && ENV_KEY_RE.test(newKey.trim()) && newValue.trim()) count += 1;
    return count;
  }, [draftValues, removedKeys, newKey, newValue]);

  const handleAdd = () => {
    const key = newKey.trim();
    if (!key || !ENV_KEY_RE.test(key)) {
      toast.error("Use a valid env key (letters, numbers, underscore).");
      return;
    }
    if (!String(newValue).trim()) {
      toast.error("Enter a value before adding.");
      return;
    }
    if (rows.some((row) => row.key === key) && !removedKeys.includes(key)) {
      toast.error("That variable already exists.");
      return;
    }
    const value = newValue;
    setRows((prev) => {
      const without = prev.filter((row) => row.key !== key);
      return [...without, { key, hasValue: Boolean(String(value).trim()) }];
    });
    setRemovedKeys((prev) => prev.filter((k) => k !== key));
    setDraftValues((prev) => ({ ...prev, [key]: value }));
    setNewKey("");
    setNewValue("");
  };

  const handleRemove = (key) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
    setDraftValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRemovedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const handleSave = async () => {
    if (!projectId || saving || pendingCount < 1) return;
    const updates = [];
    for (const [key, value] of Object.entries(draftValues)) {
      if (String(value ?? "").trim()) {
        updates.push({ key, value: String(value) });
      }
    }
    if (newKey.trim() && ENV_KEY_RE.test(newKey.trim()) && newValue.trim()) {
      updates.push({ key: newKey.trim(), value: newValue });
    }
    setSaving(true);
    try {
      const data = await putProjectPreviewEnv(projectId, {
        updates,
        removals: removedKeys,
      });
      const variables = Array.isArray(data?.variables) ? data.variables : [];
      setRows(variables);
      setDraftValues({});
      setRemovedKeys([]);
      setNewKey("");
      setNewValue("");
      toast.success(
        data?.restarted
          ? "Preview env saved — preview restarting to apply `.env`."
          : "Preview env saved to `.env`.",
      );
    } catch (err) {
      toast.error(err?.error || err?.message || "Could not save preview env vars");
    } finally {
      setSaving(false);
    }
  };

  if (!projectId) return null;

  return (
    <Card className="gap-0 border-border py-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-3 py-3 sm:px-4">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-sm font-medium">Preview environment variables</CardTitle>
          <p className="text-xs text-muted-foreground">
            Saved to <span className="font-mono">.env</span> in the preview app folder. Values are
            hidden after saving. Restart the preview to apply changes.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 gap-1.5"
          disabled={saving || pendingCount < 1}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3.5" aria-hidden />
          )}
          Save{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        {loading ? (
          <div
            className="space-y-3"
            role="status"
            aria-busy="true"
            aria-label="Loading preview variables"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No variables yet.</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => {
                  const key = row.key;
                  const draft = draftValues[key];
                  const placeholder = row.hasValue ? row.valueHint || "•••• saved" : "Enter value";
                  return (
                    <li
                      key={key}
                      className="flex flex-col gap-1.5 rounded-md border border-border/80 p-2 sm:flex-row sm:items-center"
                    >
                      <Label className="min-w-0 shrink-0 font-mono text-xs sm:w-40" title={key}>
                        <span className="block truncate">{key}</span>
                      </Label>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Input
                          type="password"
                          className="h-8 font-mono text-xs"
                          autoComplete="off"
                          placeholder={placeholder}
                          value={draft ?? ""}
                          onChange={(e) =>
                            setDraftValues((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          disabled={saving}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(key)}
                          disabled={saving}
                          aria-label={`Remove ${key}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <Label
                  htmlFor="preview-env-new-key"
                  className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Key
                </Label>
                <Input
                  id="preview-env-new-key"
                  className="h-8 font-mono text-xs"
                  placeholder="VITE_API_URL"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  disabled={saving}
                  autoComplete="off"
                />
              </div>
              <div className="min-w-0 flex-[1.4] space-y-1">
                <Label
                  htmlFor="preview-env-new-value"
                  className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Value
                </Label>
                <Input
                  id="preview-env-new-value"
                  className="h-8 font-mono text-xs"
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  disabled={saving}
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleAdd}
                disabled={saving || !newKey.trim() || !newValue.trim()}
              >
                <Plus className="size-3.5" aria-hidden />
                Add
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
