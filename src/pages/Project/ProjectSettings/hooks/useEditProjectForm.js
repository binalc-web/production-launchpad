import { useCallback, useEffect, useRef, useState } from "react";
import { updateProject, fetchExternalHubProjects, fetchCreatorIntegrationConnections } from "@/api";
import {
  validateOptionalCommaSeparatedEmails,
  uniqueEmailsForHubProject,
  emailsArrayToStorageString,
  storageStringToEmailsArray,
} from "@/utils/emailList";
import {
  normalizeBackendDeployMode,
  normalizeBackendInfraStack,
  normalizeBackendLockAgentMode,
} from "@/pages/Project/ProjectDetails/components/ReleaseLockBackendAgentCard";
import { parseCloudDeployConfigFromProject } from "@/pages/Project/ProjectDetails/components/BackendCloudDeploySection";
import { buildEditProjectPayload } from "../utils/buildEditProjectPayload";
import { normalizeAwsAuthMode, tabForValidationErrors } from "../constants";
import { isProjectListingActive } from "@/pages/Project/Projects/projectListingDisplay";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { integrationToastFromAxios } from "@/utils/integrationErrors";
import { readServerlessCompatibilityFailure } from "@/utils/serverlessCompatibilityFixHandoff.util";

export function useEditProjectForm({ project, active, onSaved, onValidationTabChange }) {
  const gitJiraRef = useRef(null);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectIsActive, setProjectIsActive] = useState(true);
  const [assignedUserEmailTags, setAssignedUserEmailTags] = useState([]);
  const [stakeholderEmailTags, setStakeholderEmailTags] = useState([]);
  const [settingsAccessEmailTags, setSettingsAccessEmailTags] = useState([]);
  const [backendLockAgentMode, setBackendLockAgentMode] = useState("code_auto");
  const [backendInfraStack, setBackendInfraStack] = useState("cloudformation");
  const [backendDeployMode, setBackendDeployMode] = useState("server");
  const [backendCloudDeployConfig, setBackendCloudDeployConfig] = useState([
    { key: "", value: "" },
  ]);
  const [awsAuthMode, setAwsAuthMode] = useState("access_keys");
  const [hubProjectsForEmails, setHubProjectsForEmails] = useState([]);

  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [serverlessCompatibilityError, setServerlessCompatibilityError] = useState(null);
  const [creatorIntegrations, setCreatorIntegrations] = useState(null);
  const [loadingCreatorInt, setLoadingCreatorInt] = useState(false);

  useEffect(() => {
    if (!active || !project) return;
    setProjectName(project.name ?? "");
    setProjectDescription(project.description ?? "");
    setProjectIsActive(isProjectListingActive(project));
    setAssignedUserEmailTags(storageStringToEmailsArray(project.assignedUserEmails));
    setStakeholderEmailTags(storageStringToEmailsArray(project.stakeholderEmails));
    setSettingsAccessEmailTags(storageStringToEmailsArray(project.settingsAccessEmails));
    setBackendLockAgentMode(normalizeBackendLockAgentMode(project.backendLockAgentMode));
    setBackendInfraStack(normalizeBackendInfraStack(project.backendInfraStack));
    setBackendDeployMode(normalizeBackendDeployMode(project.backendDeployMode));
    setBackendCloudDeployConfig(parseCloudDeployConfigFromProject(project));
    setAwsAuthMode(normalizeAwsAuthMode(project.awsAuthMode));
    setValidationErrors({});
  }, [active, project]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchExternalHubProjects();
        if (!cancelled) setHubProjectsForEmails(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setHubProjectsForEmails([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !project?.id) return;
    let cancelled = false;
    const loadCreatorConnections = async ({ silent = false } = {}) => {
      if (!silent) setLoadingCreatorInt(true);
      try {
        const creatorData = await fetchCreatorIntegrationConnections(project.id, {
          checkHealth: true,
        });
        if (!cancelled) {
          setCreatorIntegrations(creatorData);
        }
      } catch {
        if (!cancelled && !silent) setCreatorIntegrations(null);
      } finally {
        if (!silent && !cancelled) setLoadingCreatorInt(false);
      }
    };
    loadCreatorConnections();
    const timer = window.setInterval(
      () => {
        loadCreatorConnections({ silent: true });
      },
      2 * 60 * 1000,
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, project?.id]);

  const validateForm = useCallback(async () => {
    const errors = {};
    const trimmedName = String(projectName ?? "").trim();
    if (!trimmedName) {
      errors.projectName = "Project name is required";
    } else if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.projectName = "Name must be between 3 and 100 characters";
    }

    const gitJiraErrors = gitJiraRef.current?.validateEditAsync
      ? await gitJiraRef.current.validateEditAsync(project, loadingCreatorInt)
      : (gitJiraRef.current?.validateEdit?.(project, loadingCreatorInt) ?? {});
    Object.assign(errors, gitJiraErrors);
    setValidationWarnings(gitJiraRef.current?.getEditRepositoryWarnings?.() ?? []);

    const assignedErr = validateOptionalCommaSeparatedEmails(
      emailsArrayToStorageString(assignedUserEmailTags),
      "Assigned users",
    );
    if (assignedErr) errors.assignedUserEmails = assignedErr;
    const stakeholderErr = validateOptionalCommaSeparatedEmails(
      emailsArrayToStorageString(stakeholderEmailTags),
      "Stakeholders",
    );
    if (stakeholderErr) errors.stakeholderEmails = stakeholderErr;
    const settingsAccessErr = validateOptionalCommaSeparatedEmails(
      emailsArrayToStorageString(settingsAccessEmailTags),
      "Project settings access",
    );
    if (settingsAccessErr) errors.settingsAccessEmails = settingsAccessErr;

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      onValidationTabChange?.(tabForValidationErrors(errors));
    }
    return Object.keys(errors).length === 0;
  }, [
    assignedUserEmailTags,
    loadingCreatorInt,
    onValidationTabChange,
    project,
    projectName,
    settingsAccessEmailTags,
    stakeholderEmailTags,
  ]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!project?.id) return;

      if (!(await validateForm())) {
        toast.error("Please fix the validation errors");
        return;
      }

      setSaving(true);
      try {
        const resolvedGitPath = gitJiraRef.current?.getEditResolvedGitRepoPath?.(project) ?? "";
        const resolvedDevelopmentRepo = gitJiraRef.current?.getDevelopmentRepoUrl?.() ?? "";
        const resolvedJiraKey = gitJiraRef.current?.getJiraProjectKey?.() ?? "";
        const resolvedGhConn = gitJiraRef.current?.getSelectedGithubConnectionId?.() ?? "";
        const resolvedBbConn = gitJiraRef.current?.getSelectedBitbucketConnectionId?.() ?? "";
        const resolvedJiConn = gitJiraRef.current?.getSelectedJiraConnectionId?.() ?? "";
        const sharedScmHost = gitJiraRef.current?.getScmHost?.() ?? "github";

        const payload = buildEditProjectPayload({
          projectName,
          description: projectDescription,
          jiraProjectKey: resolvedJiraKey,
          gitRepoPath: resolvedGitPath,
          developmentRepoUrl: resolvedDevelopmentRepo,
          assignedUserEmails: emailsArrayToStorageString(assignedUserEmailTags),
          stakeholderEmails: emailsArrayToStorageString(stakeholderEmailTags),
          settingsAccessEmails: emailsArrayToStorageString(settingsAccessEmailTags),
          project,
          selectedGithubConnectionId: resolvedGhConn,
          selectedBitbucketConnectionId: resolvedBbConn,
          selectedJiraConnectionId: resolvedJiConn,
          sharedOAuthScmHost: sharedScmHost,
          backendLockAgentMode,
          backendInfraStack,
          backendDeployMode,
          backendCloudDeployConfig,
          awsAuthMode,
          projectIsActive,
        });

        if (Object.keys(payload).length === 0) {
          toast.error("No changes to save");
          setSaving(false);
          return;
        }

        const updated = await updateProject(project.id, payload);
        setServerlessCompatibilityError(null);
        const serverWarnings = Array.isArray(updated?.repositoryAccessWarnings)
          ? updated.repositoryAccessWarnings.filter(
              (warning) => typeof warning === "string" && warning.trim(),
            )
          : [];
        const clientWarnings = gitJiraRef.current?.getEditRepositoryWarnings?.() ?? [];
        const warnings = [...clientWarnings];
        for (const warning of serverWarnings) {
          if (!warnings.includes(warning)) warnings.push(warning);
        }
        setValidationWarnings(warnings);
        if (warnings.length > 0) {
          toast.warning(warnings.join(" "));
        }
        toast.success("Project updated successfully");
        onSaved?.();
      } catch (err) {
        logger.error("edit_project_save", err);
        const compatibility = readServerlessCompatibilityFailure(err);
        if (compatibility) {
          setBackendDeployMode(normalizeBackendDeployMode(project?.backendDeployMode));
          setServerlessCompatibilityError(compatibility);
          onValidationTabChange?.("backend");
          toast.error("Changes were not saved. Hosting stayed With Server.");
        } else {
          toast.error(integrationToastFromAxios(err, "Failed to update project"));
        }
      } finally {
        setSaving(false);
      }
    },
    [
      assignedUserEmailTags,
      awsAuthMode,
      backendCloudDeployConfig,
      backendDeployMode,
      backendInfraStack,
      backendLockAgentMode,
      onSaved,
      project,
      projectDescription,
      onValidationTabChange,
      projectIsActive,
      projectName,
      settingsAccessEmailTags,
      stakeholderEmailTags,
      validateForm,
    ],
  );

  const hubRowForProject = hubProjectsForEmails.find((p) => p.id === project?.projectId);
  const assignedHubSuggestions = hubRowForProject
    ? uniqueEmailsForHubProject(hubRowForProject)
    : [];

  const checkingServerlessCompatibility =
    saving &&
    normalizeBackendDeployMode(project?.backendDeployMode) === "server" &&
    normalizeBackendDeployMode(backendDeployMode) === "serverless" &&
    normalizeBackendInfraStack(backendInfraStack) !== "none";

  return {
    gitJiraRef,
    projectName,
    setProjectName,
    projectDescription,
    setProjectDescription,
    projectIsActive,
    setProjectIsActive,
    assignedUserEmailTags,
    setAssignedUserEmailTags,
    stakeholderEmailTags,
    setStakeholderEmailTags,
    settingsAccessEmailTags,
    setSettingsAccessEmailTags,
    backendLockAgentMode,
    setBackendLockAgentMode,
    backendInfraStack,
    setBackendInfraStack,
    backendDeployMode,
    setBackendDeployMode,
    backendCloudDeployConfig,
    setBackendCloudDeployConfig,
    awsAuthMode,
    setAwsAuthMode,
    validationErrors,
    validationWarnings,
    saving,
    creatorIntegrations,
    loadingCreatorInt,
    assignedHubSuggestions,
    checkingServerlessCompatibility,
    serverlessCompatibilityError,
    handleSubmit,
  };
}
