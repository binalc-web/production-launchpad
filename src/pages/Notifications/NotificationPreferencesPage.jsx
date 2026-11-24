import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import {
  fetchNotificationPreferences,
  unmuteProjectNotifications,
  updateNotificationPreferences,
} from "@/api";
import { useBrowserPush } from "@/hooks/useBrowserPush";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

const CHANNEL_LABELS = {
  in_app: "In-app",
  email: "Email",
  push: "Push",
};

function NotificationPreferencesSkeleton() {
  return (
    <div data-tour="notification-preferences">
      <PageShell>
        <div
          className="space-y-6"
          role="status"
          aria-busy="true"
          aria-label="Loading notification preferences"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          ))}
        </div>
      </PageShell>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState(["in_app", "email", "push"]);
  /** @type {Map<string, boolean>} */
  const [prefMap, setPrefMap] = useState(() => new Map());
  const [mutes, setMutes] = useState([]);
  const { pushBusy, pushSupported, pushEnabled, enablePush, disablePush } = useBrowserPush();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotificationPreferences();
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
      setChannels(Array.isArray(data?.channels) ? data.channels : ["in_app", "email", "push"]);
      const map = new Map();
      for (const p of data?.preferences || []) {
        map.set(`${p.type}:${p.channel}`, Boolean(p.enabled));
      }
      setPrefMap(map);
      setMutes(Array.isArray(data?.mutes) ? data.mutes : []);
    } catch (err) {
      logger.error("notification_prefs_load", err);
      toast.error("Could not load notification preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setCell = (type, channel, enabled) => {
    setPrefMap((prev) => {
      const next = new Map(prev);
      next.set(`${type}:${channel}`, enabled);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const preferences = [];
      for (const [key, enabled] of prefMap.entries()) {
        const [type, channel] = key.split(":");
        preferences.push({ type, channel, enabled });
      }
      const data = await updateNotificationPreferences({ preferences });
      const map = new Map();
      for (const p of data?.preferences || []) {
        map.set(`${p.type}:${p.channel}`, Boolean(p.enabled));
      }
      setPrefMap(map);
      setMutes(Array.isArray(data?.mutes) ? data.mutes : []);
      toast.success("Preferences saved");
    } catch (err) {
      logger.error("notification_prefs_save", err);
      toast.error("Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  const unmute = async (projectId) => {
    try {
      await unmuteProjectNotifications(projectId);
      setMutes((prev) => prev.filter((m) => m.projectId !== projectId));
      toast.success("Project unmuted");
    } catch {
      toast.error("Could not unmute project");
    }
  };

  if (loading) {
    return <NotificationPreferencesSkeleton />;
  }

  return (
    <div data-tour="notification-preferences">
      <PageShell>
        <PageHeader
          title="Notification preferences"
          description="All types and channels are on by default. Toggle any cell to change delivery."
        >
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </PageHeader>
        <Link
          to="/notifications"
          className="-mt-4 inline-block text-xs text-muted-foreground hover:underline"
        >
          Back to inbox
        </Link>

        <div
          className="rounded-lg border border-border bg-card p-4"
          data-testid="browser-push-settings"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">Browser push</p>
                  <span
                    data-testid="browser-push-status"
                    data-state={pushEnabled ? "enabled" : "disabled"}
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      pushEnabled
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-live="polite"
                  >
                    {pushEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!pushSupported
                    ? "Browser push is not supported in this browser."
                    : pushEnabled
                      ? "You'll receive notifications when LaunchPad is closed."
                      : "Enable to receive notifications when LaunchPad is closed."}
                </p>
              </div>
            </div>
            <div className="flex gap-2" role="group" aria-label="Browser push notifications">
              <Button
                type="button"
                size="sm"
                variant={pushEnabled ? "ghost" : "outline"}
                disabled={!pushSupported || pushBusy || pushEnabled}
                aria-pressed={pushEnabled}
                data-testid="browser-push-enable"
                onClick={() => void enablePush()}
              >
                {pushBusy && !pushEnabled ? "Enabling…" : "Enable"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pushEnabled ? "outline" : "ghost"}
                disabled={!pushSupported || pushBusy || !pushEnabled}
                aria-pressed={!pushEnabled}
                data-testid="browser-push-disable"
                onClick={() => void disablePush()}
              >
                {pushBusy && pushEnabled ? "Disabling…" : "Disable"}
              </Button>
            </div>
          </div>
        </div>

        {categories.map((cat) => (
          <section key={cat.id} className="rounded-lg border border-border bg-card">
            <h2 className="border-b border-border px-4 py-2.5 text-sm font-medium">{cat.label}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Type</th>
                    {channels.map((ch) => (
                      <th key={ch} className="px-3 py-2 font-medium text-center">
                        {CHANNEL_LABELS[ch] || ch}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(cat.types || []).map((t) => (
                    <tr key={t.type} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">{t.label || t.type}</td>
                      {channels.map((ch) => {
                        const key = `${t.type}:${ch}`;
                        const enabled = prefMap.has(key) ? prefMap.get(key) : true;
                        return (
                          <td key={ch} className="px-3 py-2 text-center">
                            <Switch
                              checked={enabled}
                              onCheckedChange={(v) => setCell(t.type, ch, v)}
                              aria-label={`${t.label} ${CHANNEL_LABELS[ch]}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {mutes.length > 0 ? (
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium">Muted projects</h2>
            <ul className="mt-3 divide-y divide-border">
              {mutes.map((m) => (
                <li
                  key={m.projectId}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span>{m.project?.name || `Project #${m.projectId}`}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void unmute(m.projectId)}
                  >
                    Unmute
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PageShell>
    </div>
  );
}
