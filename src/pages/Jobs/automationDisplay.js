import { formatDistanceToNow, parseISO } from "date-fns";
import { BarChart3, Sparkles, Terminal } from "lucide-react";
import {
  formatNextRunRelative,
  formatScheduleCardLine,
  isNextRunApplicable,
} from "@/utils/jobSchedule";
import {
  AUTOMATION_TYPE_AI,
  AUTOMATION_TYPE_SCRIPT,
  AUTOMATION_TYPE_SCRIPT_AI,
} from "./automationFormShared";
import { isJobRunTimedOut } from "./utils/jobRunStatus.util";
export {
  automationMatchesSearch,
  formatAutomationRepoSearchLabel,
} from "./utils/automationSearch.util";
export {
  isRunInProgress,
  isJobRunTimedOut,
  JOB_RUN_MAX_RUNTIME_MS,
} from "./utils/jobRunStatus.util";

/** User-facing copy for Project reports (jobs/automations) UI. */
export const AUTOMATION_LABELS = Object.freeze({
  pageTitle: "Project reports",
  pageDescription: "Scheduled reports that run on your repositories.",
  newAutomation: "+ New project report",
  searchPlaceholder: "Search project reports, projects, or repos…",
  showInactive: "Show inactive",
  activeCount: (n) => `${n} active`,
  inactiveCount: (n) => `${n} inactive`,
  noAutomations: "No project reports yet",
  noAutomationsHint:
    "Create a project report to define targets, schedule, and what runs on each repository.",
  noActiveAutomations: "No active project reports",
  noActiveHint: "Turn on Show inactive to see paused project reports.",
  noSearchMatches: "No project reports match your search.",
  loading: "Loading project reports…",
  loadError: "Could not load project reports",
  pausedToast: "Project report paused",
  resumedToast: "Project report resumed",
  updateError: "Failed to update project report",
  runCompleted: "Project report run completed",
  runFailed: "Project report run failed",
  runError: "Run failed",
  noRunsYet: "No runs yet",
  nextRunLabel: "Next run",
  pausedBadge: "Paused",
  scheduleLabel: "Schedule",
  lastRunLabel: "Last run",
  scheduleActive: "Active",
  pauseSchedule: "Pause schedule",
  resumeSchedule: "Resume schedule",
  runTimedOut: "Timed out",
  deleteAutomation: "Delete",
  deleteConfirmTitle: "Delete project report?",
  deleteConfirmDescription:
    "This permanently removes the project report, its schedule, and all run history.",
  deletedToast: "Project report deleted",
  deleteError: "Could not delete project report",
  cancel: "Cancel",
  allReports: "All project reports",
  detailsAria: "Project report details",
  notFound: "Project report not found",
  loadOneError: "Failed to load project report",
  refreshError: "Could not refresh project report",
  editTitle: "Edit project report",
  newTitle: "New project report",
  createButton: "Create project report",
  createSuccess: "Project report created",
  createSuccessSkill: "Project report created — skill cached for runs",
  createError: "Failed to create project report",
  updateSuccess: "Project report updated",
  updateSuccessSkill: "Project report updated — skill cached for runs",
  loadingOne: "Loading project report…",
  typeLabel: "Project report type",
  skillCacheHint:
    "Skill is not cached. Edit the project report, confirm the skill, and save while signed in.",
});

export function formatLastRunDisplay(latestRun) {
  if (!latestRun) {
    return {
      status: AUTOMATION_LABELS.noRunsYet,
      ago: null,
      tone: "muted",
    };
  }
  const status = String(latestRun.status || "").toUpperCase();
  const when = latestRun.finishedAt || latestRun.startedAt;
  let ago = null;
  if (when) {
    try {
      ago = formatDistanceToNow(parseISO(when), { addSuffix: true });
    } catch {
      ago = null;
    }
  }
  if (isJobRunTimedOut(latestRun)) {
    return { status: AUTOMATION_LABELS.runTimedOut, ago, tone: "error" };
  }
  if (status === "RUNNING" || status === "PENDING") {
    return { status: "Running", ago, tone: "running" };
  }
  if (status === "FAILED") {
    return { status: "Failed", ago, tone: "error" };
  }
  if (status === "COMPLETED") {
    return { status: "Completed", ago, tone: "success" };
  }
  return {
    status: status || AUTOMATION_LABELS.noRunsYet,
    ago,
    tone: "muted",
  };
}

/**
 * @param {object} job
 */
export function getAutomationTypeMeta(job) {
  const at = String(job.automationType ?? "")
    .trim()
    .toUpperCase();
  if (at === AUTOMATION_TYPE_AI) {
    return { Icon: Sparkles, label: "AI on repo", pill: "AI on repo" };
  }
  if (at === AUTOMATION_TYPE_SCRIPT) {
    return { Icon: Terminal, label: "Script on repo", pill: "Script on repo" };
  }
  if (at === AUTOMATION_TYPE_SCRIPT_AI) {
    return { Icon: BarChart3, label: "Script + AI", pill: "Script + AI" };
  }
  return { Icon: Sparkles, label: "Project report", pill: "Project report" };
}

export function getScopedAutomationTargets(job, opts = {}) {
  const scopeProjectId = Number(opts.projectId);
  const hasScope = Number.isInteger(scopeProjectId) && scopeProjectId > 0;
  const targets = (Array.isArray(job?.targets) ? job.targets : []).filter((t) =>
    hasScope ? Number(t.projectId) === scopeProjectId : true,
  );
  const docTargets = (Array.isArray(job?.documentTargets) ? job.documentTargets : []).filter((t) =>
    hasScope ? Number(t.projectId) === scopeProjectId : true,
  );
  return { targets, docTargets };
}

export function formatTargetSummary(job, opts = {}) {
  const { targets, docTargets } = getScopedAutomationTargets(job, opts);
  if (targets.length === 0 && docTargets.length === 0) return "No targets";
  const projects = new Set(targets.map((t) => t.project?.name || `Project ${t.projectId}`));
  const projPart =
    projects.size === 1 ? [...projects][0] : projects.size > 0 ? `${projects.size} projects` : "";
  const repoPart =
    targets.length > 0 ? `${targets.length} repo${targets.length === 1 ? "" : "s"}` : "";
  const docPart =
    docTargets.length > 0 ? `${docTargets.length} doc${docTargets.length === 1 ? "" : "s"}` : "";
  const parts = [repoPart, docPart].filter(Boolean);
  const summary = parts.join(" · ");
  return projPart ? `${summary} · ${projPart}` : summary;
}

export { formatScheduleCardLine, formatNextRunRelative, isNextRunApplicable };
