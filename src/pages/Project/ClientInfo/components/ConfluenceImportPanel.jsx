import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchIntegrationsStatus, fetchProjectById, ingestConfluencePage } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  buildConfluencePageUrl,
  confluenceWikiUrlPrefix,
  normalizeConfluencePagePath,
} from "@/lib/confluenceUrl";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import {
  PROJECT_SETTINGS_ACCESS_HINT,
  userCanAccessProjectSettings,
} from "@/lib/releasePresentation";

export function ConfluenceImportPanel({ projectId, onImported, disabled }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [jiraReady, setJiraReady] = useState(false);
  const [accountJiraConnected, setAccountJiraConnected] = useState(false);
  const [wikiUrlPrefix, setWikiUrlPrefix] = useState("");
  const [importing, setImporting] = useState(false);
  const [pagePath, setPagePath] = useState("");
  const [applyToProfiles, setApplyToProfiles] = useState(true);
  const [loadedProject, setLoadedProject] = useState(null);

  const checkProject = useCallback(async () => {
    if (!projectId) {
      setJiraReady(false);
      setAccountJiraConnected(false);
      setWikiUrlPrefix("");
      setLoadedProject(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const [project, integrations] = await Promise.all([
        fetchProjectById(projectId),
        fetchIntegrationsStatus().catch(() => null),
      ]);
      const jiraConnections = integrations?.jira?.connections ?? [];
      setAccountJiraConnected(jiraConnections.length > 0);
      setJiraReady(Boolean(project?.jiraConnectionId));
      setWikiUrlPrefix(confluenceWikiUrlPrefix(project?.jiraConnection?.jiraBaseUrl));
      setLoadedProject(project ?? null);
    } catch {
      setJiraReady(false);
      setAccountJiraConnected(false);
      setWikiUrlPrefix("");
      setLoadedProject(null);
    } finally {
      setChecking(false);
    }
  }, [projectId]);

  useEffect(() => {
    checkProject();
  }, [checkProject]);

  useEffect(() => {
    const onFocus = () => {
      checkProject();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkProject]);

  const openProjectSettings = () => {
    if (!userCanAccessProjectSettings(user, loadedProject)) {
      toast.error(PROJECT_SETTINGS_ACCESS_HINT);
      return;
    }
    navigate(buildProjectSettingsPath(projectId, "integrations"));
  };

  const handlePagePathChange = (value) => {
    setPagePath(normalizeConfluencePagePath(value, wikiUrlPrefix));
  };

  const handlePagePathPaste = (event) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted?.trim()) return;
    event.preventDefault();
    setPagePath(normalizeConfluencePagePath(pasted, wikiUrlPrefix));
  };

  const fullPageUrl = buildConfluencePageUrl(wikiUrlPrefix, pagePath);

  const importPage = async () => {
    const url = fullPageUrl.trim();
    if (!url) {
      toast.error("Enter a Confluence page path or URL.");
      return;
    }
    setImporting(true);
    try {
      const data = await ingestConfluencePage(projectId, {
        pageUrl: url,
        applyToProfiles,
      });
      setPagePath("");
      const count = data?.pageCount ?? 1;
      if (data?.pageCapped) {
        toast.success(
          `Imported ${count} page${count === 1 ? "" : "s"} (limit reached). Import the same URL again to fetch more.`,
        );
      } else {
        toast.success(
          applyToProfiles
            ? `Imported ${count} page${count === 1 ? "" : "s"} — profiles updating in background`
            : `Imported ${count} Confluence page${count === 1 ? "" : "s"}`,
        );
      }
      onImported?.(data);
    } catch (err) {
      const code = typeof err?.code === "string" ? err.code : "";
      const status = Number(err?.status || err?.statusCode || 0);
      if (code === "CONFLUENCE_ALREADY_IMPORTED" || status === 409) {
        toast.error(
          err?.error ||
            "This Confluence page tree was already imported. Open Capture to view it, or import a different page URL.",
        );
      } else if (status === 404) {
        toast.error(
          err?.error ||
            "Confluence page not found or you do not have access. Check the URL and connection.",
        );
      } else if (status === 403 || /scope|reconnect/i.test(String(err?.error || ""))) {
        toast.error(
          err?.error ||
            "Confluence access is missing required scopes. Reconnect Confluence in Connected accounts.",
        );
      } else {
        toast.error(err?.error || "Confluence import failed");
      }
    } finally {
      setImporting(false);
    }
  };

  if (checking) {
    return (
      <div
        className="rounded-xl border bg-card p-4 space-y-4"
        role="status"
        aria-busy="true"
        aria-label="Loading Confluence import"
      >
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    );
  }

  if (!jiraReady) {
    return (
      <div className="rounded-xl border border-dashed p-4 space-y-3 text-sm text-muted-foreground">
        {accountJiraConnected ? (
          <>
            <p>
              Jira is connected to your account, but not linked to this project. Open{" "}
              <span className="font-medium text-foreground">Project settings</span>, choose your
              Jira site, and save — then you can import Confluence pages here.
            </p>
            {userCanAccessProjectSettings(user, loadedProject) ? (
              <Button type="button" size="sm" variant="outline" onClick={openProjectSettings}>
                Link Jira to this project
              </Button>
            ) : (
              <p className="text-xs">{PROJECT_SETTINGS_ACCESS_HINT}</p>
            )}
          </>
        ) : (
          <>
            <p>
              Connect Jira under Connected accounts, then link it to this project in Project
              settings → Integrations to import Confluence pages.
            </p>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/settings/integrations">Connect Jira</Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Import Confluence page</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Paste a page or space Overview URL. We import the homepage and all descendant child pages in
        its tree.
      </p>
      <div className="space-y-2">
        <Label htmlFor="confluence-page-path" className="text-sm font-medium">
          Page URL
        </Label>
        <div className="flex rounded-md border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-ring/50 overflow-hidden">
          {wikiUrlPrefix ? (
            <span
              className="shrink-0 max-w-[45%] truncate border-r border-input bg-muted/50 px-3 py-2 text-xs text-muted-foreground sm:max-w-[55%] sm:text-sm"
              title={wikiUrlPrefix}
            >
              {wikiUrlPrefix}
            </span>
          ) : null}
          <Input
            id="confluence-page-path"
            value={pagePath}
            onChange={(e) => handlePagePathChange(e.target.value)}
            onPaste={handlePagePathPaste}
            placeholder="spaces/…/pages/… or spaces/…/overview?homepageId=…"
            disabled={disabled || importing}
            className="min-w-0 flex-1 border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Domain is set from your linked Atlassian site. Paste the path after{" "}
          <span className="font-mono">/wiki/</span>, a page link, or a space Overview link.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="confluence-apply-profiles"
          checked={applyToProfiles}
          onCheckedChange={(c) => setApplyToProfiles(Boolean(c))}
        />
        <Label htmlFor="confluence-apply-profiles" className="text-sm font-normal">
          Update profiles from content
        </Label>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={disabled || importing || !fullPageUrl.trim()}
        onClick={importPage}
      >
        {importing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Import to Capture
      </Button>
    </div>
  );
}
