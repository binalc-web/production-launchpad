import { JobScheduleType } from "@/pages/Project/CreateProject/constants/constants.js";
import {
  DAY_INDEX_TO_API,
  API_DAY_TO_INDEX,
  BASH_SCRIPT_TEMPLATE,
  SCRIPT_INLINE,
} from "./JobFormFields";

export const AUTOMATION_TYPE_AI = "AI_PROMPT";
export const AUTOMATION_TYPE_SCRIPT = "SCRIPT";
export const AUTOMATION_TYPE_SCRIPT_AI = "SCRIPT_AI";

export const AUTOMATION_TYPE_OPTIONS = [
  {
    value: AUTOMATION_TYPE_AI,
    label: "AI on repository",
    description: "Clone the dev repo and run AI analysis on the codebase.",
  },
  {
    value: AUTOMATION_TYPE_SCRIPT,
    label: "Script on repository",
    description: "Clone the dev repo and run your bash script.",
  },
  {
    value: AUTOMATION_TYPE_SCRIPT_AI,
    label: "Script + AI",
    description: "Run a script, then AI analyzes the script output and repo context.",
  },
];

const VALIDATION_MSG = {
  name: "Name is required",
  scheduleTime: "Time is required",
  scheduleDayWeekly: "Day is required for weekly schedule",
  scheduleCron: "Enter a 5-field cron expression (minute hour day month weekday)",
  scheduleDateOneTime: "Pick the date for this one-time run",
  targets: "Select at least one project and development repository",
  reportPrompt: "Add AI instructions or pick a skill",
  scriptContent: "Add a bash script.",
  reportRecipientEmail: "Enter a valid recipient email",
};

export function buildInitialForm() {
  return {
    name: "",
    automationType: AUTOMATION_TYPE_SCRIPT_AI,
    targets: [],
    documentTargets: [],
    reportPrompt: "",
    hubSkillId: null,
    scriptDrafts: { bash: BASH_SCRIPT_TEMPLATE },
    scheduleType: JobScheduleType.DAILY,
    scheduleTime: "09:00",
    scheduleDay: "1",
    scheduleDate: "",
    scheduleCron: "0 9 * * *",
    timezone: "Asia/Kolkata",
    reportEmailNotificationsEnabled: true,
    reportRecipientEmail: "",
  };
}

/**
 * @param {Record<string, unknown>} job
 */
export function mapApiJobToEditForm(job) {
  if (!job || typeof job !== "object") {
    throw new Error("Invalid job");
  }

  const st = String(job.scriptType ?? "")
    .trim()
    .toLowerCase();
  const automationType =
    String(job.automationType ?? "")
      .trim()
      .toUpperCase() ||
    (st === "inline" && job.reportPrompt
      ? AUTOMATION_TYPE_SCRIPT_AI
      : st === "inline"
        ? AUTOMATION_TYPE_SCRIPT
        : AUTOMATION_TYPE_AI);

  const targets = Array.isArray(job.targets)
    ? job.targets.map((t) => ({
        projectId: Number(t.projectId),
        repoPath: String(t.repoPath ?? "").trim(),
        branch: String(t.branch ?? "").trim() || "main",
        projectName: t.project?.name ?? "",
      }))
    : [];

  const documentTargets = Array.isArray(job.documentTargets)
    ? job.documentTargets.map((t) => ({
        projectId: Number(t.projectId),
        documentId: String(t.documentId ?? "").trim(),
        documentName: t.document?.name ?? t.documentName ?? "",
      }))
    : [];

  const scheduleType = String(job.scheduleType ?? JobScheduleType.DAILY);
  const dayKey = String(job.scheduleDay ?? "").toUpperCase();
  const scheduleDay =
    scheduleType === JobScheduleType.WEEKLY && dayKey && API_DAY_TO_INDEX[dayKey] != null
      ? API_DAY_TO_INDEX[dayKey]
      : "1";

  return {
    name: job.name != null ? String(job.name) : "",
    automationType,
    targets,
    documentTargets,
    reportPrompt: job.reportPrompt != null ? String(job.reportPrompt) : "",
    hubSkillId: job.hubSkillId != null ? String(job.hubSkillId) : null,
    scriptDrafts: {
      bash:
        st === "inline" && String(job.scriptContent ?? "").trim()
          ? String(job.scriptContent)
          : BASH_SCRIPT_TEMPLATE,
    },
    scheduleType,
    scheduleTime:
      job.scheduleTime != null && String(job.scheduleTime).trim()
        ? String(job.scheduleTime)
        : "09:00",
    scheduleDay,
    scheduleDate:
      scheduleType === JobScheduleType.ONETIME ? String(job.scheduleDate ?? "").trim() : "",
    scheduleCron:
      scheduleType === JobScheduleType.CUSTOM ? String(job.scheduleCron ?? "").trim() : "",
    timezone:
      job.timezone != null && String(job.timezone).trim() ? String(job.timezone) : "Asia/Kolkata",
    reportEmailNotificationsEnabled: job.reportEmailNotificationsEnabled !== false,
    reportRecipientEmail: (() => {
      const r = job.reportRecipientEmail;
      if (Array.isArray(r)) return r.map((x) => String(x ?? "").trim()).filter(Boolean);
      if (r == null) return "";
      return String(r).trim();
    })(),
  };
}

/**
 * @param {Record<string, unknown>} form
 */
export function validateAutomationForm(form) {
  const next = {};
  if (!String(form.name ?? "").trim()) next.name = VALIDATION_MSG.name;
  if (form.scheduleType !== JobScheduleType.CUSTOM && !form.scheduleTime) {
    next.scheduleTime = VALIDATION_MSG.scheduleTime;
  }
  if (form.scheduleType === JobScheduleType.WEEKLY && form.scheduleDay === "") {
    next.scheduleDay = VALIDATION_MSG.scheduleDayWeekly;
  }
  if (form.scheduleType === JobScheduleType.CUSTOM && !String(form.scheduleCron ?? "").trim()) {
    next.scheduleCron = VALIDATION_MSG.scheduleCron;
  }
  if (form.scheduleType === JobScheduleType.ONETIME && !String(form.scheduleDate ?? "").trim()) {
    next.scheduleDate = VALIDATION_MSG.scheduleDateOneTime;
  }

  const targets = Array.isArray(form.targets) ? form.targets : [];
  if (targets.length === 0) next.targets = VALIDATION_MSG.targets;

  const at = form.automationType ?? AUTOMATION_TYPE_SCRIPT_AI;
  const hasReport = String(form.reportPrompt ?? "").trim().length > 0;
  const hasSkill = Boolean(form.hubSkillId);
  const hasScript = String(form.scriptDrafts?.bash ?? "").trim().length > 0;

  if ((at === AUTOMATION_TYPE_AI || at === AUTOMATION_TYPE_SCRIPT_AI) && !hasReport && !hasSkill) {
    next.reportPrompt = VALIDATION_MSG.reportPrompt;
  }
  if ((at === AUTOMATION_TYPE_SCRIPT || at === AUTOMATION_TYPE_SCRIPT_AI) && !hasScript) {
    next.scriptContent = VALIDATION_MSG.scriptContent;
  }

  return next;
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildAutomationApiBody(form) {
  const at = form.automationType ?? AUTOMATION_TYPE_SCRIPT_AI;
  const needsScript = at === AUTOMATION_TYPE_SCRIPT || at === AUTOMATION_TYPE_SCRIPT_AI;

  const body = {
    name: String(form.name ?? "").trim(),
    automationType: at,
    targets: (Array.isArray(form.targets) ? form.targets : []).map((t) => ({
      projectId: Number(t.projectId),
      repoPath: String(t.repoPath ?? "").trim(),
      branch: String(t.branch ?? "").trim() || "main",
    })),
    documentTargets: (Array.isArray(form.documentTargets) ? form.documentTargets : []).map((t) => ({
      projectId: Number(t.projectId),
      documentId: String(t.documentId ?? "").trim(),
    })),
    scheduleType: form.scheduleType,
    scheduleTime: form.scheduleTime,
    timezone: form.timezone,
    reportPrompt: String(form.reportPrompt ?? "").trim() || null,
    hubSkillId: form.hubSkillId || null,
    reportEmailNotificationsEnabled: form.reportEmailNotificationsEnabled !== false,
  };

  if (needsScript) {
    body.scriptType = SCRIPT_INLINE;
    body.scriptLanguage = "bash";
    body.scriptContent =
      typeof form.scriptDrafts?.bash === "string" ? form.scriptDrafts.bash : BASH_SCRIPT_TEMPLATE;
  } else {
    body.scriptType = null;
    body.scriptLanguage = null;
    body.scriptContent = null;
  }

  if (form.scheduleType === "WEEKLY") {
    const idx = Number(form.scheduleDay);
    body.scheduleDay = DAY_INDEX_TO_API[idx] ?? "MONDAY";
  } else {
    body.scheduleDay = null;
  }
  if (form.scheduleType === "CUSTOM") {
    body.scheduleCron = String(form.scheduleCron ?? "").trim();
    body.scheduleDate = null;
    body.scheduleTime = "00:00";
  } else if (form.scheduleType === "ONETIME") {
    body.scheduleDate = String(form.scheduleDate ?? "").trim();
    body.scheduleCron = null;
  } else {
    body.scheduleDate = null;
    body.scheduleCron = null;
  }

  return body;
}
