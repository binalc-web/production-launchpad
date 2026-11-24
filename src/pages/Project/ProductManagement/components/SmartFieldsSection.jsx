import { useEffect, useState } from "react";
import { patchClientDetails, refreshPersonaSmartFields } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { EvidenceBadge } from "./EvidenceBadge";

function emptySmartField() {
  return {
    id: crypto.randomUUID(),
    label: "",
    prompt: "",
    value: "",
    lastGeneratedAt: null,
    sourceEntryId: null,
  };
}

function hasGeneratedValue(field) {
  return Boolean(field?.lastGeneratedAt);
}

const SMART_FIELDS_DESCRIPTIONS = {
  brief:
    "Extend the discovery brief with custom AI-generated fields. Values update from timeline captures and profile refreshes.",
};

export function SmartFieldsSection({ personaType }) {
  const { projectId, clientDetails, refresh, isProfileUpdating } =
    useClientInfoContext();
  const serverFields =
    clientDetails?.personas?.[personaType]?.smartFields || [];
  const fieldSources = clientDetails?.fieldSources || {};
  const [local, setLocal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fields = local ?? serverFields;
  const isDirty = local !== null;
  const canRefresh = fields.some((field) => field.prompt?.trim());

  const serverFieldsKey = JSON.stringify(serverFields);

  useEffect(() => {
    setLocal(null);
  }, [serverFieldsKey, personaType]);

  const updateField = (id, patch) => {
    setLocal((prev) => {
      const base = prev ?? serverFields;
      return base.map((f) => (f.id === id ? { ...f, ...patch } : f));
    });
  };

  const addField = () => {
    setLocal((prev) => [...(prev ?? serverFields), emptySmartField()]);
  };

  const removeField = (id) => {
    setLocal((prev) => (prev ?? serverFields).filter((f) => f.id !== id));
  };

  const save = async () => {
    if (!local) return;
    setSaving(true);
    try {
      await patchClientDetails(projectId, {
        personas: { [personaType]: { smartFields: local } },
      });
      setLocal(null);
      await refresh();
      toast.success("Smart fields saved");
    } catch (err) {
      toast.error(err?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (!canRefresh) {
      toast.error("Add a prompt to at least one smart field first");
      return;
    }
    if (isDirty) {
      toast.error("Save smart field changes before refreshing");
      return;
    }
    setRefreshing(true);
    try {
      await refreshPersonaSmartFields(projectId, personaType);
      await refresh();
      toast.success("Smart fields refreshed");
    } catch (err) {
      toast.error(err?.error || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="mt-8 space-y-4 border-t pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">Smart fields</h4>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            {SMART_FIELDS_DESCRIPTIONS[personaType] ||
              "Values are auto-generated from timeline captures and profile refresh actions. You can edit them; the next capture or refresh will update them."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRefresh ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || isProfileUpdating || isDirty}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="size-4 mr-2" />
              )}
              Refresh values
            </Button>
          ) : null}
          {isDirty ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save smart fields
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={addField}>
            <Plus className="size-4 mr-2" />
            Add smart field
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
          <Sparkles className="size-5 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No smart fields yet. Add one to capture AI-generated insights
            tailored to this profile.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => {
            const valueSource =
              fieldSources[
                `personas.${personaType}.smartFields.${field.id}.value`
              ];
            return (
              <div
                key={field.id}
                className={cn(
                  "rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3",
                  isProfileUpdating && "opacity-80",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-normal gap-1"
                  >
                    <Sparkles className="size-3" />
                    Smart field
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeField(field.id)}
                    aria-label="Remove smart field"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={field.label || ""}
                    onChange={(e) =>
                      updateField(field.id, { label: e.target.value })
                    }
                    placeholder="e.g. Risk appetite"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Expected value prompt</Label>
                  <Textarea
                    value={field.prompt || ""}
                    onChange={(e) =>
                      updateField(field.id, { prompt: e.target.value })
                    }
                    placeholder="Describe what the AI should produce for this field…"
                    rows={2}
                  />
                </div>

                {hasGeneratedValue(field) ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Value</Label>
                      <EvidenceBadge source={valueSource} />
                      {isProfileUpdating ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" />
                          Updating…
                        </span>
                      ) : null}
                    </div>
                    <Textarea
                      value={field.value || ""}
                      onChange={(e) =>
                        updateField(field.id, { value: e.target.value })
                      }
                      rows={3}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Last generated{" "}
                      {new Date(field.lastGeneratedAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-primary/20 bg-background/60 px-3 py-2.5">
                    {(isProfileUpdating || refreshing) &&
                    field.prompt?.trim() ? (
                      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin shrink-0" />
                        Generating value…
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {field.prompt?.trim()
                          ? "Value will appear after a timeline capture or when you refresh this profile."
                          : "Save a prompt, then capture timeline notes or refresh this profile."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
