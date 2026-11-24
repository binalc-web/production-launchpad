import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import {
  deleteProjectSentryIntegration,
  fetchProjectSentryIntegration,
  fetchProjectSentryProjects,
  importProjectSentryIssues,
  saveProjectSentryIntegration,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SENTRY_LEVEL_OPTIONS, formatSentryImportSummary } from "@/lib/sentryIntegration";

const DEFAULT_FORM = {
  sentryProjectSlugs: [],
  autoFixEnabled: true,
  enabled: true,
  minLevel: "error",
  maxAutoFixesPerHour: 5,
};

function errorMessage(err, fallback) {
  return err?.error || err?.message || fallback;
}

/** Enter inside these inputs must not submit the surrounding Project settings form. */
function stopEnterSubmit(e) {
  if (e.key === "Enter") e.preventDefault();
}

function linkedSlugsOf(integration) {
  if (!integration?.linked) return [];
  if (integration.sentryProjectSlugs?.length) return integration.sentryProjectSlugs;
  return (integration.links || []).map((link) => link.sentryProjectSlug).filter(Boolean);
}

function parseSlugList(text) {
  return [
    ...new Set(
      String(text || "")
        .split(/[\s,]+/)
        .map((slug) => slug.trim())
        .filter(Boolean),
    ),
  ];
}

/** Selected slugs missing from the Sentry list (renamed or deleted) stay visible so they can be unchecked. */
function projectChoices(projects, selectedSlugs) {
  const known = new Set(projects.map((project) => project.slug));
  const missing = selectedSlugs
    .filter((slug) => !known.has(slug))
    .map((slug) => ({ slug, name: slug, linkedToOtherProject: false, linkedProject: null }));
  return [...missing, ...projects];
}

function SentrySettingsSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading Sentry settings">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

function SentryProjectChecklist({ selected, onChange, projects, projectId, loadingProjects }) {
  const [manualText, setManualText] = useState(() => selected.join(", "));

  if (projects.length === 0) {
    return (
      <Input
        id="sentry-projects"
        value={manualText}
        onChange={(e) => {
          setManualText(e.target.value);
          onChange(parseSlugList(e.target.value));
        }}
        onKeyDown={stopEnterSubmit}
        placeholder={loadingProjects ? undefined : "Sentry project slugs, separated by commas"}
      />
    );
  }

  const selectedSet = new Set(selected);
  const toggle = (slug, checked) =>
    onChange(checked ? [...selected, slug] : selected.filter((s) => s !== slug));

  return (
    <div
      id="sentry-projects"
      role="group"
      aria-label="Sentry projects"
      className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border"
    >
      {projectChoices(projects, selected).map((project) => {
        const checkboxId = `sentry-project-${project.slug}`;
        const owner = project.linkedProject;
        const ownedHere = owner && Number(owner.id) === Number(projectId);
        return (
          <label
            key={project.slug}
            htmlFor={checkboxId}
            className={`flex items-center gap-3 px-3 py-2 text-sm ${
              project.linkedToOtherProject
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:bg-muted/50"
            }`}
          >
            <Checkbox
              id={checkboxId}
              checked={selectedSet.has(project.slug)}
              disabled={project.linkedToOtherProject}
              onCheckedChange={(checked) => toggle(project.slug, checked === true)}
            />
            <span className="min-w-0 flex-1 truncate">
              {project.name}
              <span className="ml-1 text-muted-foreground">({project.slug})</span>
            </span>
            {owner ? (
              <Badge
                variant={ownedHere ? "secondary" : "outline"}
                className="max-w-[45%] shrink-0 truncate"
                title={`Linked to ${owner.name}`}
              >
                {ownedHere ? "Linked here" : `Linked to ${owner.name}`}
              </Badge>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

export function SentryIntegrationSection({ projectId }) {
  const [integration, setIntegration] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sentryProjects, setSentryProjects] = useState([]);
  const [projectsError, setProjectsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [importing, setImporting] = useState(false);

  const applyIntegration = useCallback((data) => {
    setIntegration(data);
    if (data?.linked) {
      setForm({
        sentryProjectSlugs: linkedSlugsOf(data),
        autoFixEnabled: data.autoFixEnabled,
        enabled: data.enabled,
        minLevel: data.minLevel,
        maxAutoFixesPerHour: data.maxAutoFixesPerHour,
      });
    }
  }, []);

  const loadSentryProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectsError("");
    try {
      const data = await fetchProjectSentryProjects(projectId);
      setSentryProjects(data?.projects || []);
    } catch (err) {
      setSentryProjects([]);
      setProjectsError(errorMessage(err, "Could not load Sentry projects"));
    } finally {
      setLoadingProjects(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    fetchProjectSentryIntegration(projectId)
      .then((data) => {
        if (cancelled) return;
        applyIntegration(data);
        if (data?.configured) loadSentryProjects();
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err, "Could not load Sentry settings"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyIntegration, loadSentryProjects, projectId]);

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const linked = Boolean(integration?.linked);
  const configured = Boolean(integration?.configured);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await saveProjectSentryIntegration(projectId, {
        sentryProjectSlugs: form.sentryProjectSlugs,
        enabled: form.enabled,
        autoFixEnabled: form.autoFixEnabled,
        minLevel: form.minLevel,
        maxAutoFixesPerHour: Number(form.maxAutoFixesPerHour),
      });
      applyIntegration(data);
      loadSentryProjects();
      const linkedCount = data?.links?.length || (data?.linked ? 1 : 0);
      toast.success(
        linked
          ? "Sentry settings saved"
          : linkedCount > 1
            ? "Sentry projects linked"
            : "Sentry project linked",
      );
      if (data?.import?.error) {
        toast.error(`Could not import existing issues: ${data.import.error}`);
      } else if (data?.import) {
        toast.success(formatSentryImportSummary(data.import));
      }
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save Sentry settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleImportIssues = async () => {
    setImporting(true);
    try {
      toast.success(formatSentryImportSummary(await importProjectSentryIssues(projectId)));
    } catch (err) {
      toast.error(errorMessage(err, "Could not import Sentry issues"));
    } finally {
      setImporting(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await deleteProjectSentryIntegration(projectId);
      setIntegration((prev) => ({ ...prev, linked: false }));
      setForm(DEFAULT_FORM);
      setUnlinkOpen(false);
      loadSentryProjects();
      toast.success("Sentry unlinked");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to unlink Sentry"));
    } finally {
      setUnlinking(false);
    }
  };

  const canSave = configured && form.sentryProjectSlugs.length > 0;
  const linkedSlugs = linkedSlugsOf(integration);
  const linkedLabel =
    linkedSlugs.length > 3 ? `${linkedSlugs.length} Sentry projects` : linkedSlugs.join(", ");

  return (
    <Card className="max-w-3xl mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Sentry</CardTitle>
          {loading ? null : linked ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Linked to {linkedLabel}
            </Badge>
          ) : (
            <Badge variant="outline">Not linked</Badge>
          )}
        </div>
        <CardDescription>
          Select every Sentry project that reports this LaunchPad project&apos;s errors, for example
          separate frontend, backend and worker projects in one repository. Unresolved issues (up to
          50 per Sentry project) are imported when you link, and new issues arrive automatically
          under Feedbacks as Sentry Issues. Fix with AI works on the development repository: choose
          Fix, Fix and merge, or Fix, merge and deploy per issue. Auto-generated fixes always stop
          at a pull request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <SentrySettingsSkeleton />
        ) : !configured ? (
          <p className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Sentry isn&apos;t configured on this LaunchPad server yet. An admin needs to set
            SENTRY_AUTH_TOKEN and SENTRY_CLIENT_SECRET for the shared Sentry integration.
          </p>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Sentry projects
                  {integration?.sentryBaseUrl ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      in{" "}
                      <a
                        href={integration.sentryBaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {integration.sentryBaseUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </span>
                  ) : null}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadSentryProjects}
                  disabled={loadingProjects}
                >
                  <RefreshCw
                    className={`size-3.5 ${loadingProjects ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  Refresh
                </Button>
              </div>
              <SentryProjectChecklist
                selected={form.sentryProjectSlugs}
                onChange={setField("sentryProjectSlugs")}
                projects={sentryProjects}
                projectId={projectId}
                loadingProjects={loadingProjects}
              />
              <p className="text-xs text-muted-foreground">
                {form.sentryProjectSlugs.length
                  ? `${form.sentryProjectSlugs.length} selected. `
                  : ""}
                A Sentry project can belong to only one LaunchPad project; ones linked elsewhere are
                shown but can&apos;t be selected.
              </p>
              {projectsError ? <p className="text-xs text-destructive">{projectsError}</p> : null}
              {linked
                ? (integration.links?.length ? integration.links : [integration]).map((link) => (
                    <div key={link.id || link.sentryProjectSlug} className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {link.sentryProjectSlug}:{" "}
                        {link.lastWebhookAt
                          ? `last issue webhook ${new Date(link.lastWebhookAt).toLocaleString()}`
                          : "no issue webhook received yet."}
                      </p>
                      {link.lastWebhookError ? (
                        <p className="flex items-start gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {link.lastWebhookError}
                        </p>
                      ) : null}
                    </div>
                  ))
                : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Ingest issues</p>
                  <p className="text-xs text-muted-foreground">Accept new Sentry issue webhooks.</p>
                </div>
                <Switch checked={form.enabled} onCheckedChange={setField("enabled")} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Auto-generate fix PR</p>
                  <p className="text-xs text-muted-foreground">
                    Open a fix PR for every new issue (not for imported ones).
                  </p>
                </div>
                <Switch
                  checked={form.autoFixEnabled}
                  onCheckedChange={setField("autoFixEnabled")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sentry-min-level">Minimum level</Label>
                <Select value={form.minLevel} onValueChange={setField("minLevel")}>
                  <SelectTrigger id="sentry-min-level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENTRY_LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sentry-max-fixes">Max auto-fixes per hour</Label>
                <p className="text-xs text-muted-foreground">
                  Counted separately for each linked Sentry project.
                </p>
                <Input
                  id="sentry-max-fixes"
                  type="number"
                  min={0}
                  max={50}
                  value={form.maxAutoFixesPerHour}
                  onChange={(e) => setField("maxAutoFixesPerHour")(e.target.value)}
                  onKeyDown={stopEnterSubmit}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              {linked ? (
                <Button type="button" variant="ghost" onClick={() => setUnlinkOpen(true)}>
                  <Unlink className="size-4" aria-hidden />
                  Unlink Sentry
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap gap-2">
                {linked ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportIssues}
                    disabled={importing || saving}
                  >
                    {importing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    Import existing issues
                  </Button>
                ) : null}
                <Button type="button" onClick={handleSave} disabled={saving || !canSave}>
                  {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {linked
                    ? "Save Sentry settings"
                    : form.sentryProjectSlugs.length > 1
                      ? "Link Sentry projects"
                      : "Link Sentry project"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Sentry?</DialogTitle>
            <DialogDescription>
              New issues from{" "}
              {linkedSlugs.length > 1 ? "these Sentry projects" : "this Sentry project"} will stop
              creating feedback items and fix PRs. Existing Sentry Issues and PRs stay, and you can
              link again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUnlinkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleUnlink} disabled={unlinking}>
              {unlinking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
