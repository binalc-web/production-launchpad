import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProject } from "@/api";
import { useAuth } from "@/context/AuthContext";
import {
  PROJECT_SETTINGS_ACCESS_HINT,
  userCanAccessProjectSettings,
} from "@/lib/releasePresentation";
import appConfig from "@/config";
import jiraMarkSvg from "@/assets/apps/Jira.svg";
import {
  getEmbedAllowedDomains,
  normalizeFeedbackConfigurations,
} from "@/lib/feedbackConfigurations.js";
import { normalizeEmbedDomain } from "@/lib/embedDomainRules.js";
import EmbedDomainRulesEditor from "./EmbedDomainRulesEditor.jsx";
import EmbedSnippetJiraAutoCreateControl from "./EmbedSnippetJiraAutoCreateControl.jsx";
import {
  buildFeedbackEmbedSnippetHtml,
  resolveEmbedProjectRef,
  trimFrontendBaseUrl,
} from "@/utils/feedbackEmbedSnippet.js";

const EmbedJiraStatus = memo(function EmbedJiraStatus({ project }) {
  const jiraConnection = project?.jiraConnection;
  const jiraProjectKey = jiraConnection?.jiraProjectKey;
  const jiraConnectionId = project?.jiraConnectionId;
  const projectName = project?.name;

  if (!jiraConnectionId) {
    return (
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        Jira is not linked for this project. From{" "}
        <span className="font-medium">Project settings</span>, connect Jira, and choose a Jira
        project then you can use this feature.
      </div>
    );
  }

  const siteHost = (() => {
    const raw = String(jiraConnection?.jiraBaseUrl || "").trim();
    if (!raw) return "";
    try {
      return new URL(raw).host;
    } catch {
      return raw.replace(/^https?:\/\//i, "").split("/")[0];
    }
  })();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted py-2 px-4 text-sm font-medium text-foreground">
      <img src={jiraMarkSvg} alt="" className="size-5 shrink-0 dark:opacity-90" aria-hidden />
      <span className="min-w-0 truncate">
        {jiraProjectKey ? (
          <>
            <span className="font-semibold tabular-nums">{String(jiraProjectKey)}</span>
            {projectName ? (
              <>
                <span className="mx-1.5 font-normal text-muted-foreground">—</span>
                <span className="font-normal">{projectName}</span>
              </>
            ) : null}
          </>
        ) : (
          <span className="font-normal text-muted-foreground">
            Jira connected — select a project key in Project settings
            {siteHost ? (
              <>
                <span className="text-muted-foreground"> · </span>
                <span>{siteHost}</span>
              </>
            ) : null}
          </span>
        )}
      </span>
    </div>
  );
});

const SnippetBlock = memo(function SnippetBlock({ snippet }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [snippet]);

  return (
    <div className="min-w-0 space-y-2">
      <div>
        <Label className="text-sm font-medium">Install snippet</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Insert this code in the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
            &lt;HEAD&gt;
          </code>{" "}
          tag of each page where you want the widget to appear.
        </p>
      </div>
      <div className="relative min-w-0 w-full max-w-full overflow-hidden rounded-md border border-border bg-muted/40">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!snippet}
          onClick={() => void handleCopy()}
          className="absolute right-2 top-2 z-10 h-8 gap-1.5 bg-background/90 px-2 shadow-sm hover:bg-background"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <pre className="w-full max-w-full overflow-x-auto overflow-y-hidden whitespace-pre-wrap break-all p-5 text-xs leading-relaxed">
          {snippet || "—"}
        </pre>
      </div>
    </div>
  );
});

function serializeAllowedDomains(rules) {
  const seen = new Set();
  const out = [];
  for (const raw of rules) {
    const domain = normalizeEmbedDomain(raw?.domain);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push({
      enabled: raw?.enabled !== false,
      domain,
      restrictPaths: Array.isArray(raw?.restrictPaths) ? raw.restrictPaths : [],
      jiraPrefix: String(raw?.jiraPrefix ?? "").trim() || null,
    });
  }
  return out;
}

function ProjectFeedbackEmbedCard({ project, onSaved, inDialog = false }) {
  const { user } = useAuth();
  const canAccessProjectSettings = userCanAccessProjectSettings(user, project);
  const [allowedDomains, setAllowedDomains] = useState(() =>
    getEmbedAllowedDomains(normalizeFeedbackConfigurations(project?.feedbackConfigurations)),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAllowedDomains(
      getEmbedAllowedDomains(normalizeFeedbackConfigurations(project?.feedbackConfigurations)),
    );
  }, [project?.id, project?.feedbackConfigurations]);

  const frontendBase = useMemo(() => trimFrontendBaseUrl(appConfig.FRONTEND_URL), []);

  const embedProjectRef = useMemo(
    () => resolveEmbedProjectRef(project),
    [project?.projectId, project?.id],
  );

  const snippet = useMemo(
    () =>
      buildFeedbackEmbedSnippetHtml({
        projectRef: embedProjectRef,
        shimBaseUrl: frontendBase,
      }),
    [embedProjectRef, frontendBase],
  );

  const handleSave = useCallback(async () => {
    if (!project?.id) return;
    if (!userCanAccessProjectSettings(user, project)) {
      toast.error(PROJECT_SETTINGS_ACCESS_HINT);
      return;
    }
    const invalid = allowedDomains.some((r) => r.domain.trim() && !normalizeEmbedDomain(r.domain));
    if (invalid) {
      toast.error("Fix invalid domain hostnames before saving.");
      return;
    }
    setSaving(true);
    try {
      const base = normalizeFeedbackConfigurations(project.feedbackConfigurations);
      const updated = await updateProject(project.id, {
        feedbackConfigurations: {
          allowedDomains: serializeAllowedDomains(allowedDomains),
          autoCreateJiraTicket: base.autoCreateJiraTicket === true,
        },
      });
      toast.success("Embed domain settings saved.");
      onSaved?.(updated);
    } catch (e) {
      const msg =
        e?.message || e?.error || (typeof e === "string" ? e : "Could not save embed settings.");
      toast.error(String(msg));
    } finally {
      setSaving(false);
    }
  }, [allowedDomains, onSaved, project, user]);

  const rootClass = inDialog
    ? "flex min-w-0 flex-col gap-5"
    : "mb-6 rounded-lg border border-border bg-card p-5 shadow-sm";

  return (
    <div className={rootClass}>
      {!inDialog ? (
        <div>
          <h2 className="text-base font-semibold text-foreground">Code Snippet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add this script to allowed domains only. Submissions go to Launchpad as pending review.
            Turn on <span className="font-medium text-foreground">Create Jira ticket automatically</span>{" "}
            to open a Jira issue when someone reports from the snippet; otherwise your team can create
            one when they approve.
          </p>
        </div>
      ) : null}

      <EmbedJiraStatus project={project} />

      <EmbedDomainRulesEditor
        value={allowedDomains}
        onChange={setAllowedDomains}
        disabled={saving || !canAccessProjectSettings}
        headerEnd={
          <EmbedSnippetJiraAutoCreateControl project={project} onSaved={onSaved} className="sm:pt-0.5" />
        }
      />

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={saving || !canAccessProjectSettings}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save domain settings"
          )}
        </Button>
      </div>

      <SnippetBlock snippet={snippet} />
    </div>
  );
}

export default memo(ProjectFeedbackEmbedCard);
