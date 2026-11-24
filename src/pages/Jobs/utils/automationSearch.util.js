/**
 * Short owner/repo label for list search (e.g. github.com/org/repo → org/repo).
 * @param {string|null|undefined} repoPath
 */
export function formatAutomationRepoSearchLabel(repoPath) {
  const normalized = String(repoPath ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  const hostMatch = normalized.match(
    /(?:github\.com|bitbucket\.org)\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
  );
  if (hostMatch) return `${hostMatch[1]}/${hostMatch[2]}`;
  if (/^[^/]+\/[^/]+$/.test(normalized)) return normalized;
  return normalized;
}

/**
 * Project labels to match in automation list search.
 * @param {{ project?: { name?: string }, projectName?: string, projectId?: number }} target
 * @returns {string[]}
 */
export function collectAutomationProjectSearchLabels(target) {
  const labels = [];
  const name = String(target?.project?.name ?? target?.projectName ?? "").trim();
  if (name) labels.push(name.toLowerCase());
  const projectId = Number(target?.projectId);
  if (Number.isInteger(projectId) && projectId > 0) {
    labels.push(`project ${projectId}`);
  }
  return labels;
}

/**
 * Whether an automation matches the jobs list search query.
 * @param {object} job
 * @param {string} query
 */
export function automationMatchesSearch(job, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;

  /** @type {string[]} */
  const haystack = [String(job?.name ?? "").toLowerCase()];

  for (const target of Array.isArray(job?.targets) ? job.targets : []) {
    haystack.push(String(target.repoPath ?? "").toLowerCase());
    haystack.push(formatAutomationRepoSearchLabel(target.repoPath));
    haystack.push(String(target.branch ?? "").toLowerCase());
    haystack.push(...collectAutomationProjectSearchLabels(target));
  }

  for (const docTarget of Array.isArray(job?.documentTargets) ? job.documentTargets : []) {
    haystack.push(...collectAutomationProjectSearchLabels(docTarget));
    haystack.push(String(docTarget.documentId ?? "").toLowerCase());
  }

  return haystack.some((part) => part && part.includes(q));
}
