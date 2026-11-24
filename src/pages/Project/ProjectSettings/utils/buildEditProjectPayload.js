import {
  normalizeBackendDeployMode,
  normalizeBackendInfraStack,
} from "@/pages/Project/ProjectDetails/components/ReleaseLockBackendAgentCard";
import { isProjectListingActive } from "@/pages/Project/Projects/projectListingDisplay";
import { normalizeAwsAuthMode } from "../constants";

function normEmailListField(v) {
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}

export function buildEditProjectPayload({
  projectName,
  description,
  jiraProjectKey,
  gitRepoPath,
  developmentRepoUrl,
  assignedUserEmails,
  stakeholderEmails,
  settingsAccessEmails,
  project,
  selectedGithubConnectionId,
  selectedBitbucketConnectionId,
  selectedJiraConnectionId,
  sharedOAuthScmHost,
  backendLockAgentMode,
  backendInfraStack,
  backendDeployMode,
  backendCloudDeployConfig,
  awsAuthMode,
  projectIsActive,
}) {
  const payload = {};

  if (projectName !== undefined) {
    const trimmedName = String(projectName ?? "").trim();
    const prevName = String(project?.name ?? "").trim();
    if (trimmedName !== prevName) {
      payload.name = trimmedName;
    }
  }

  if (description !== undefined) {
    const t = description.trim();
    payload.description = t === "" ? null : t;
  }

  const jKey = String(jiraProjectKey ?? "").trim();
  const prevJiraKey = String(project?.jiraConnection?.jiraProjectKey ?? "").trim();
  if (jKey !== prevJiraKey) {
    payload.jiraProjectKey = jKey === "" ? null : jKey;
  }

  const repoPath = gitRepoPath.trim();
  if (repoPath && repoPath !== String(project?.gitRepoPath || "").trim()) {
    payload.gitRepoPath = repoPath;
  }

  const prevDev = String(project?.developmentRepoUrl ?? "").trim();
  const devTrim = developmentRepoUrl.trim();
  if (devTrim !== prevDev) {
    payload.developmentRepoUrl = devTrim === "" ? null : devTrim;
  }

  if (normEmailListField(assignedUserEmails) !== normEmailListField(project?.assignedUserEmails)) {
    payload.assignedUserEmails = normEmailListField(assignedUserEmails);
  }
  if (normEmailListField(stakeholderEmails) !== normEmailListField(project?.stakeholderEmails)) {
    payload.stakeholderEmails = normEmailListField(stakeholderEmails);
  }
  if (
    normEmailListField(settingsAccessEmails) !== normEmailListField(project?.settingsAccessEmails)
  ) {
    payload.settingsAccessEmails = normEmailListField(settingsAccessEmails);
  }
  const nextGh =
    selectedGithubConnectionId && String(selectedGithubConnectionId).trim()
      ? Number(selectedGithubConnectionId)
      : null;
  const nextBb =
    selectedBitbucketConnectionId && String(selectedBitbucketConnectionId).trim()
      ? Number(selectedBitbucketConnectionId)
      : null;
  const prevGh = project?.githubConnectionId != null ? Number(project.githubConnectionId) : null;
  const prevBb =
    project?.bitbucketConnectionId != null ? Number(project.bitbucketConnectionId) : null;
  if (
    (Number.isInteger(nextGh) && nextGh > 0 ? nextGh : null) !==
    (Number.isInteger(prevGh) && prevGh > 0 ? prevGh : null)
  ) {
    payload.githubConnectionId = Number.isInteger(nextGh) && nextGh > 0 ? nextGh : null;
  }
  if (
    (Number.isInteger(nextBb) && nextBb > 0 ? nextBb : null) !==
    (Number.isInteger(prevBb) && prevBb > 0 ? prevBb : null)
  ) {
    payload.bitbucketConnectionId = Number.isInteger(nextBb) && nextBb > 0 ? nextBb : null;
  }

  const prevJiraConn = project?.jiraConnectionId != null ? String(project.jiraConnectionId) : "";
  const nextJiraConn = selectedJiraConnectionId ? String(selectedJiraConnectionId) : "";
  if (nextJiraConn !== prevJiraConn) {
    payload.jiraConnectionId = selectedJiraConnectionId ? Number(selectedJiraConnectionId) : null;
  }

  const prevMode = String(project?.backendLockAgentMode ?? "code_auto").toLowerCase();
  const nextMode = String(backendLockAgentMode ?? "code_auto").toLowerCase();
  if (nextMode !== prevMode) {
    payload.backendLockAgentMode = nextMode;
  }

  const prevInfra = normalizeBackendInfraStack(project?.backendInfraStack);
  const nextInfra = normalizeBackendInfraStack(backendInfraStack);
  if (nextInfra !== prevInfra) {
    payload.backendInfraStack = nextInfra;
    if (nextInfra === "none") {
      payload.backendDeployMode = "server";
    }
  }

  const prevDeployMode = normalizeBackendDeployMode(project?.backendDeployMode);
  const nextDeployMode = normalizeBackendDeployMode(backendDeployMode);
  if (nextDeployMode !== prevDeployMode && nextInfra !== "none") {
    payload.backendDeployMode = nextDeployMode;
  }

  const prevDeployRows = JSON.stringify(
    (Array.isArray(project?.backendCloudDeployConfig) ? project.backendCloudDeployConfig : [])
      .map((row) => ({
        key: String(row?.key ?? "").trim(),
        value: String(row?.value ?? ""),
      }))
      .filter((row) => row.key),
  );
  const nextDeployRows = JSON.stringify(
    (Array.isArray(backendCloudDeployConfig) ? backendCloudDeployConfig : [])
      .map((row) => ({
        key: String(row?.key ?? "").trim(),
        value: String(row?.value ?? ""),
      }))
      .filter((row) => row.key),
  );
  if (nextDeployRows !== prevDeployRows) {
    payload.backendCloudDeployConfig = JSON.parse(nextDeployRows);
  }

  const prevAwsAuth = normalizeAwsAuthMode(project?.awsAuthMode);
  const nextAwsAuth = normalizeAwsAuthMode(awsAuthMode);
  if (nextAwsAuth !== prevAwsAuth) {
    payload.awsAuthMode = nextAwsAuth;
  }

  if (projectIsActive !== undefined) {
    const nextActive = projectIsActive === true;
    const prevActive = isProjectListingActive(project);
    if (nextActive !== prevActive) {
      payload.isActive = nextActive;
    }
  }

  return payload;
}
