import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/** Hostname from OAuth `jiraBaseUrl`. */
export function jiraBaseUrlHostname(jiraBaseUrl) {
  const raw = typeof jiraBaseUrl === "string" ? jiraBaseUrl.trim() : "";
  if (!raw) return "";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
}

/** Jira Software mark (single-color; path after Simple Icons / Atlassian-style glyph). */
function JiraMarkIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
      fill="currentColor"
    >
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" />
    </svg>
  );
}

/**
 * Compact Jira connection indicator: hover shows summary, click opens details (popover).
 *
 * @param {object} props
 * @param {object|null|undefined} props.project — Launchpad project with `jiraConnection` / `jiraConnectionId`
 * @param {boolean} props.jiraEpicsStoriesReady — connection + project key (Epics & backlog only)
 * @param {string} [props.className]
 */
export function JiraConnectionStatusControl({ project, jiraEpicsStoriesReady, className }) {
  const jiraConnected = Boolean(project?.jiraConnectionId);
  const jiraProjectKeyDisplay = String(project?.jiraConnection?.jiraProjectKey ?? "").trim();
  const jiraSiteHost = jiraBaseUrlHostname(project?.jiraConnection?.jiraBaseUrl);

  const tooltipSummary = jiraConnected
    ? jiraEpicsStoriesReady
      ? `Jira: ${jiraProjectKeyDisplay}${jiraSiteHost ? ` · ${jiraSiteHost}` : ""} · connected`
      : `Jira${jiraSiteHost ? `: ${jiraSiteHost}` : ""} · connected`
    : "Jira not linked";

  const iconTone = jiraConnected ? "text-primary" : "text-destructive";

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 rounded-full text-foreground transition-colors duration-200 hover:bg-muted/80",
                className,
              )}
              aria-label={`Jira connection: ${tooltipSummary}`}
            >
              <JiraMarkIcon className={iconTone} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltipSummary}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 space-y-2 text-xs">
        <p className="text-sm font-medium text-foreground">Jira for this project</p>
        {jiraConnected ? (
          jiraEpicsStoriesReady ? (
            <p className="text-muted-foreground">
              Jira project{" "}
              <span className="font-mono font-semibold text-foreground">{jiraProjectKeyDisplay}</span>
              {jiraSiteHost ? (
                <>
                  {" "}
                  <span className="text-muted-foreground">({jiraSiteHost})</span>
                </>
              ) : null}
              . Epics &amp; Stories sync to Jira when you create or update a release.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Jira site linked
              {jiraSiteHost ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground">({jiraSiteHost})</span>
                </>
              ) : null}
              . Add a{" "}
              <span className="font-medium text-foreground">Jira project key</span> in{" "}
              <span className="font-medium text-foreground">Project settings</span> to enable Epics
              &amp; Stories and backlog loading in suggestions.
            </p>
          )
        ) : (
          <p className="text-muted-foreground">
            Connect a Jira site under{" "}
            <Link
              to="/settings/integrations"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Connected accounts
            </Link>
            , then link it in{" "}
            <span className="font-medium text-foreground">Project settings</span>.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
