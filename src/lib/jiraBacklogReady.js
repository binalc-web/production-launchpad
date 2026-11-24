/** @param {{ jiraConnectionId?: number|null, jiraConnection?: { jiraProjectKey?: string|null }|null }} project */
export function isProjectJiraBacklogReady(project) {
  if (!project?.jiraConnectionId) return false;
  const key = String(project?.jiraConnection?.jiraProjectKey ?? "").trim();
  return Boolean(key);
}
