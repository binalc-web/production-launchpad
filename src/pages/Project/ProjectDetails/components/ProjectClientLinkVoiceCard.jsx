import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchProjectClientLinkVoice, patchProjectClientLinkVoice } from "@/api";

/**
 * Admin-only toggle for Client Link hands-free voice mode (off platform-wide unless overridden).
 */
export function ProjectClientLinkVoiceCard({ project }) {
  const projectId = project?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      setSettings(await fetchProjectClientLinkVoice(projectId));
    } catch (error) {
      toast.error(error?.message || "Could not load voice mode settings.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (enabled) => {
    setSaving(true);
    try {
      const data = await patchProjectClientLinkVoice(projectId, enabled);
      setSettings(data);
      toast.success(data?.enabled ? "Voice mode enabled." : "Voice mode disabled.");
    } catch (error) {
      toast.error(error?.message || "Could not save voice mode settings.");
    } finally {
      setSaving(false);
    }
  };

  const platformLabel = settings?.platformDefaultEnabled ? "on" : "off";
  const usingDefault = settings?.override == null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Link voice mode</CardTitle>
        <CardDescription>
          Lets clients talk to the agent hands-free on the preview page. Platform default is{" "}
          {platformLabel}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton
            className="h-14 w-full"
            role="status"
            aria-busy="true"
            aria-label="Loading voice mode setting"
          />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
            <div className="space-y-1">
              <Label htmlFor="client-link-voice-enabled">Enable voice mode for this project</Label>
              <p className="text-xs text-muted-foreground">
                {usingDefault
                  ? `Following the platform default (${platformLabel}).`
                  : `Overridden for this project (platform default is ${platformLabel}).`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!usingDefault ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void save(null)}
                >
                  Use platform default
                </Button>
              ) : null}
              <Switch
                id="client-link-voice-enabled"
                checked={Boolean(settings?.enabled)}
                disabled={saving || !settings}
                onCheckedChange={(v) => void save(Boolean(v))}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
