/** Max age for automation report → backend code fix handoff in sessionStorage. */
const AUTOMATION_REPORT_FIX_HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;

const STORAGE_KEY_PREFIX = "automation_report_backend_fix_handoff_";

function storageKey(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return null;
  return `${STORAGE_KEY_PREFIX}${pid}`;
}

function trimText(value, maxLen = 6000) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n\n[Truncated]`;
}

/**
 * Join the fixes the user selected in the report modal.
 * @param {Array<{ id?: string, title?: string, summary?: string, prompt?: string }>|null|undefined} options
 * @param {string[]} selectedIds
 */
export function buildSelectedFixesExcerpt(options, selectedIds) {
  const wanted = new Set((selectedIds || []).map((id) => String(id)));
  return (options || [])
    .filter((opt) => opt && wanted.has(String(opt.id)))
    .map((opt) => {
      const title = String(opt.title || "").trim();
      const summary = String(opt.summary || "").trim();
      const prompt = String(opt.prompt || "").trim();
      return [`## ${title}`, summary, prompt].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * @param {unknown} raw
 * @returns {null | { status: "none" } | { status: "one", single: { title: string, summary: string } } | { status: "many", options: Array<{ id: string, title: string, summary: string, prompt: string }> } | { status: "unavailable" }}
 * `null` means the decision has not arrived yet.
 */
export function normalizeReportFixDecision(raw) {
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { status: "unavailable" };
  if (raw.status === "none") return { status: "none" };
  if (raw.status === "one") {
    const title = String(raw.single?.title ?? "").trim();
    const summary = String(raw.single?.summary ?? "").trim();
    if (!title) return { status: "unavailable" };
    return { status: "one", single: { title, summary } };
  }
  if (raw.status === "many" && Array.isArray(raw.options)) {
    const options = raw.options
      .map((opt) => ({
        id: String(opt?.id ?? "").trim(),
        title: String(opt?.title ?? "").trim(),
        summary: String(opt?.summary ?? "").trim(),
        prompt: String(opt?.prompt ?? "").trim(),
      }))
      .filter((opt) => opt.id && opt.title && opt.summary && opt.prompt);
    if (options.length >= 2) return { status: "many", options };
  }
  return { status: "unavailable" };
}

/**
 * Agent-mode backend code prompt from automation report findings.
 * @param {{ excerpt?: string, jobName?: string, repoPath?: string, branch?: string, selectedFixes?: boolean }} input
 */
export function buildAutomationReportFixPrompt({
  excerpt = "",
  jobName = "",
  repoPath = "",
  branch = "",
  selectedFixes = false,
} = {}) {
  const reportExcerpt = trimText(excerpt, 6000);
  const parts = [
    selectedFixes
      ? "Implement only the selected fixes below in the development repository. Do not apply other findings from the automation report."
      : "Review the automation report excerpt below and implement the necessary code fixes in the development repository.",
  ];
  if (jobName) {
    parts.push("", `Automation: ${jobName}`);
  }
  if (repoPath) {
    const branchPart = branch ? ` @ ${branch}` : "";
    parts.push(`Repository: ${repoPath}${branchPart}`);
  }
  if (reportExcerpt) {
    parts.push("", selectedFixes ? "Selected fixes:" : "Report excerpt:", reportExcerpt);
  }
  return parts.join("\n");
}

/**
 * @param {string} raw
 * @returns {{ prompt: string } | null}
 */
function parseHandoff(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const prompt = typeof parsed?.prompt === "string" ? parsed.prompt.trim() : "";
    const ts = Number(parsed?.ts);
    if (!prompt) return null;
    if (Number.isFinite(ts) && Date.now() - ts > AUTOMATION_REPORT_FIX_HANDOFF_MAX_AGE_MS) {
      return null;
    }
    return { prompt };
  } catch {
    return null;
  }
}

/**
 * Stage backend-code agent follow-up from an automation report.
 * @param {number|string} projectId
 * @param {{ excerpt?: string, jobName?: string, repoPath?: string, branch?: string, selectedFixes?: boolean }} payload
 */
export function persistAutomationReportBackendFixHandoff(projectId, payload) {
  if (typeof window === "undefined") return;
  const key = storageKey(projectId);
  if (!key) return;
  const prompt = buildAutomationReportFixPrompt(payload);
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ prompt, ts: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Read and clear staged automation report fix handoff.
 * @param {number|string} projectId
 * @returns {{ prompt: string } | null}
 */
export function consumeAutomationReportBackendFixHandoff(projectId) {
  if (typeof window === "undefined") return null;
  const key = storageKey(projectId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return parseHandoff(raw);
  } catch {
    return null;
  }
}

/**
 * Collect unique project ids from job targets for project picker.
 * @param {{ targets?: Array<{ projectId?: number, project?: { name?: string } }>, documentTargets?: Array<{ projectId?: number, project?: { name?: string } }> }} job
 * @param {number|string|undefined|null} runProjectId
 */
export function resolveAutomationReportProjectOptions(job, runProjectId) {
  const seen = new Map();
  const add = (projectId, project) => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1 || seen.has(pid)) return;
    const label = project?.name?.trim() || `Project ${pid}`;
    seen.set(pid, { projectId: pid, label });
  };

  for (const t of Array.isArray(job?.targets) ? job.targets : []) {
    add(t.projectId, t.project);
  }
  for (const t of Array.isArray(job?.documentTargets) ? job.documentTargets : []) {
    add(t.projectId, t.project);
  }

  const runPid = Number(runProjectId);
  if (Number.isInteger(runPid) && runPid > 0) {
    const match = seen.get(runPid);
    return [match ?? { projectId: runPid, label: `Project ${runPid}` }];
  }

  return [...seen.values()];
}
