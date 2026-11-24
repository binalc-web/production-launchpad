import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ENGAGEMENT_PHASES,
  PERSONA_TABS,
  TIMELINE_FILTERS,
} from "@/pages/Project/ProductManagement/constants";
import { personaCompleteness } from "@/pages/Project/ProductManagement/utils/personaCompleteness";
import {
  getActiveRelease,
  getReleaseStatusCounts,
} from "@/pages/Project/ProductManagement/utils/releaseWorkflowStatus";
import {
  formatBackendInfraLabel,
  formatBackendLockAgentModeLabel,
} from "@/lib/projectStatusPresentation";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import { STAGE_GUIDE_COPY } from "../constants/stageGuideCopy";
import { StageAboutPopover } from "./StageAboutPopover";

const STATUS_LABELS = {
  done: "Complete",
  partial: "In progress",
  todo: "Not started",
};

const STATUS_VARIANT = {
  done: "default",
  partial: "secondary",
  todo: "outline",
};

function SidebarSection({ title, children, className, plain = false }) {
  return (
    <div
      className={cn(
        plain ? "space-y-1.5" : "rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5",
        className,
      )}
    >
      {title ? (
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
            plain ? "" : "mb-1.5",
          )}
        >
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function StatRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function CaptureExtras({ clientDetails, discoveryData }) {
  const timeline = clientDetails?.timeline || [];
  const phaseId = discoveryData?.engagementPhase || "prospect_known";
  const phaseLabel = ENGAGEMENT_PHASES.find((p) => p.id === phaseId)?.label ?? phaseId;

  const counts = {};
  for (const f of TIMELINE_FILTERS) {
    if (f.id === "all") {
      counts.all = timeline.length;
    } else if (f.id === "questionnaires") {
      counts.questionnaires = (discoveryData?.questionnaires || []).length;
    } else {
      counts[f.id] = timeline.filter((e) => {
        if (f.id === "granola") return e?.meta?.source === "granola";
        if (f.id === "confluence") return e?.meta?.source === "confluence";
        if (f.id === "website") return e?.type === "website_enrich";
        if (f.id === "text_note") {
          return (
            e.type === "text_note" &&
            e?.meta?.source !== "granola" &&
            e?.meta?.source !== "confluence"
          );
        }
        return e.type === f.id;
      }).length;
    }
  }

  return (
    <>
      <StatRow label="Engagement phase" value={phaseLabel} />
      <StatRow label="Total captures" value={counts.all} />
      {TIMELINE_FILTERS.filter((f) => f.id !== "all" && counts[f.id] > 0).map((f) => (
        <StatRow key={f.id} label={f.label} value={counts[f.id]} />
      ))}
    </>
  );
}

function ProfilesExtras({ clientDetails }) {
  const personas = clientDetails?.personas;
  return (
    <div className="space-y-1.5">
      {PERSONA_TABS.map((tab) => {
        const pct = personaCompleteness(personas, tab.id);
        return (
          <div key={tab.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{tab.label}</span>
            <span className="font-medium">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function DocumentsExtras({ clientDetails }) {
  const docs = clientDetails?.documents || [];
  const latest = docs.reduce((acc, d) => {
    if (!d?.updatedAt) return acc;
    return !acc || new Date(d.updatedAt) > new Date(acc) ? d.updatedAt : acc;
  }, null);
  return (
    <>
      <StatRow label="Documents" value={docs.length} />
      {latest ? (
        <StatRow label="Last updated" value={new Date(latest).toLocaleDateString()} />
      ) : null}
    </>
  );
}

function BriefExtras({ discoveryData, onNavigate }) {
  const openQs = (discoveryData?.openQuestionsRegister || []).filter(
    (q) => q.status === "open",
  ).length;
  return (
    <>
      <StatRow label="Open questions" value={openQs} />
      {onNavigate ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={() => onNavigate("capture")}
        >
          Go to Capture
        </Button>
      ) : null}
    </>
  );
}

function BacklogExtras({ project, releases }) {
  const jiraReady = isProjectJiraBacklogReady(project);
  const active = getActiveRelease(releases);
  return (
    <>
      <StatRow label="Jira sync" value={jiraReady ? "Connected" : "Not connected"} />
      {active ? (
        <>
          <StatRow label="Active release" value={active.name} />
          <StatRow label="Scope items" value={active.scopeItemCount ?? 0} />
        </>
      ) : null}
    </>
  );
}

function ReleasesExtras({ releases }) {
  const counts = getReleaseStatusCounts(releases);
  return (
    <>
      <StatRow label="Active" value={counts.active} />
      <StatRow label="Locked" value={counts.locked} />
      <StatRow label="Draft" value={counts.draft} />
    </>
  );
}

function FrontendExtras({ project, clientUrl }) {
  const versions = Array.isArray(project?.versions) ? project.versions : [];
  const hasLive = versions.some((v) => v?.isActive);
  return (
    <>
      <StatRow label="Live version" value={hasLive ? "Yes" : "No"} />
      <StatRow label="Client link" value={clientUrl ? "Ready" : "Not configured"} />
    </>
  );
}

function BackendExtras({ project }) {
  const hasDevRepo = Boolean(String(project?.developmentRepoUrl ?? "").trim());
  const infraStack = String(project?.backendInfraStack ?? "").trim();
  return (
    <>
      <StatRow label="Dev repo" value={hasDevRepo ? "Connected" : "Not set"} />
      {infraStack && infraStack !== "none" ? (
        <StatRow
          label="Infra stack"
          value={formatBackendInfraLabel(project?.backendInfraStack, project?.backendDeployMode)}
        />
      ) : null}
      {project?.backendLockAgentMode ? (
        <StatRow
          label="Lock agent"
          value={formatBackendLockAgentModeLabel(project.backendLockAgentMode)}
        />
      ) : null}
    </>
  );
}

function CloudExtras({ project }) {
  const infraStack = String(project?.backendInfraStack ?? "").trim();
  const hasInfra = Boolean(infraStack) && infraStack !== "none";
  return (
    <>
      <StatRow
        label="Infra stack"
        value={
          hasInfra
            ? formatBackendInfraLabel(project?.backendInfraStack, project?.backendDeployMode)
            : "Not configured"
        }
      />
    </>
  );
}

function StageExtras({
  stageId,
  clientDetails,
  discoveryData,
  project,
  releases,
  clientUrl,
  onNavigate,
}) {
  switch (stageId) {
    case "capture":
      return <CaptureExtras clientDetails={clientDetails} discoveryData={discoveryData} />;
    case "profiles":
      return <ProfilesExtras clientDetails={clientDetails} />;
    case "documents":
      return <DocumentsExtras clientDetails={clientDetails} />;
    case "brief":
      return <BriefExtras discoveryData={discoveryData} onNavigate={onNavigate} />;
    case "backlog":
      return <BacklogExtras project={project} releases={releases} />;
    case "releases":
      return <ReleasesExtras releases={releases} />;
    case "frontend":
      return <FrontendExtras project={project} clientUrl={clientUrl} />;
    case "backend":
      return <BackendExtras project={project} />;
    case "cloud":
      return <CloudExtras project={project} />;
    default:
      return null;
  }
}

/** Contextual sidebar for the active journey stage — guide, status, next step, stats. */
export function StageContextSidebar({
  stageId,
  indicators,
  suggestion,
  onNavigate,
  clientDetails,
  discoveryData,
  project,
  releases,
  clientUrl,
  className,
}) {
  const copy = STAGE_GUIDE_COPY[stageId];
  const indicator = indicators?.[stageId];
  const status = indicator?.status ?? "todo";

  if (!copy) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <SidebarSection>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </p>
          <StageAboutPopover stageId={stageId} align="end" />
        </div>
        <div className="space-y-1.5">
          <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="text-[10px]">
            {STATUS_LABELS[status] ?? status}
          </Badge>
          {indicator?.badge ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{indicator.badge}</p>
          ) : null}
        </div>
      </SidebarSection>

      {suggestion?.text && onNavigate ? (
        <SidebarSection title="Suggested next step">
          <p className="text-xs text-muted-foreground">{suggestion.text}</p>
          {!suggestion.satisfied ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 h-7 w-full text-xs"
              onClick={() => onNavigate(suggestion.stageId, { area: suggestion.area })}
            >
              Go
            </Button>
          ) : null}
        </SidebarSection>
      ) : null}

      <SidebarSection title="Details" plain>
        <StageExtras
          stageId={stageId}
          clientDetails={clientDetails}
          discoveryData={discoveryData}
          project={project}
          releases={releases}
          clientUrl={clientUrl}
          onNavigate={onNavigate}
        />
      </SidebarSection>
    </div>
  );
}
