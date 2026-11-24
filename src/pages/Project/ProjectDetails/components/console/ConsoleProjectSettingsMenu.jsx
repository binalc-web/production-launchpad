import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  ChevronDown,
  Compass,
  ExternalLink,
  Maximize2,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buildProjectClientUrls } from "@/lib/projectClientLinkUrls";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import { AGENT_ANALYTICS_SECTION } from "../../constants/projectAgentAnalyticsSection";
import { QA_ANALYTICS_SECTION } from "../../constants/projectQaAnalyticsSection";
import { buildProjectChatPath } from "../../lib/consoleQuickNavCatalog";

function workspacePath(projectId, section) {
  const base = `/projects/details/${encodeURIComponent(projectId)}`;
  if (!section) return base;
  const qs = new URLSearchParams();
  qs.set("section", section);
  return `${base}?${qs.toString()}`;
}

/**
 * Project-level settings menu — last item in the console top bar center strip.
 * Always exposes the same actions on workspace and platform chrome (e.g. Deployments).
 */
export function ConsoleProjectSettingsMenu({
  projectId = null,
  project = null,
  isAdmin = false,
  canAccessProjectSettings = false,
  agentAnalyticsActiveCount = 0,
  agentAnalyticsActive = false,
  collaborationActive = false,
  onNavigateCollaboration,
  onNavigateAgentAnalytics,
  onEditProject,
  onStartJourneyTour,
  onOpenReviewPortal,
  onOpenPreviewOnly,
  reviewPortalDisabled = false,
  previewOnlyDisabled = false,
  className,
}) {
  const navigate = useNavigate();
  if (!projectId) return null;

  const settingsHref = buildProjectSettingsPath(projectId);
  const { clientUrl, previewOnlyUrl } = buildProjectClientUrls(project);
  const reviewDisabled = Boolean(onOpenReviewPortal) ? reviewPortalDisabled : !clientUrl;
  const previewDisabled = Boolean(onOpenPreviewOnly) ? previewOnlyDisabled : !previewOnlyUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 shrink-0 gap-1.5 text-sidebar-foreground",
            "bg-sidebar-accent/50 border border-sidebar-border",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
          aria-label="Project settings"
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          <span className="hidden max-w-[11rem] truncate text-xs font-medium sm:inline">
            Project Settings
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
          Project
        </DropdownMenuLabel>
        {canAccessProjectSettings ? (
          <DropdownMenuItem
            onSelect={() => {
              if (onEditProject) onEditProject();
              else navigate(settingsHref);
            }}
          >
            <Settings className="size-4" />
            Project settings
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => navigate(buildProjectChatPath(projectId))}>
          <MessageSquare className="size-4" />
          Project chat
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (onStartJourneyTour) onStartJourneyTour();
            else {
              navigate(workspacePath(projectId), { state: { startJourneyTour: true } });
            }
          }}
        >
          <Compass className="size-4" />
          Tour
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={reviewDisabled}
          onSelect={() => {
            if (onOpenReviewPortal) onOpenReviewPortal();
            else if (clientUrl) window.open(clientUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <ExternalLink className="size-4" />
          Review portal
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={previewDisabled}
          onSelect={() => {
            if (onOpenPreviewOnly) onOpenPreviewOnly();
            else if (previewOnlyUrl) window.open(previewOnlyUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <Maximize2 className="size-4" />
          Preview only
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(collaborationActive && "bg-accent")}
          onSelect={() => {
            if (onNavigateCollaboration) onNavigateCollaboration();
            else navigate(workspacePath(projectId, "collaboration"));
          }}
        >
          <Activity className="size-4" />
          Team Activity
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate(workspacePath(projectId, QA_ANALYTICS_SECTION.id))}
        >
          <BarChart3 className="size-4" />
          {QA_ANALYTICS_SECTION.label}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem
            className={cn(agentAnalyticsActive && "bg-accent")}
            onSelect={() => {
              if (onNavigateAgentAnalytics) onNavigateAgentAnalytics();
              else navigate(workspacePath(projectId, AGENT_ANALYTICS_SECTION.id));
            }}
          >
            <Bot className="size-4" />
            {AGENT_ANALYTICS_SECTION.label}
            {agentAnalyticsActiveCount > 0 ? (
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {agentAnalyticsActiveCount}
              </span>
            ) : null}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
