import { FileText, FolderGit, Plug, Server, Users } from "lucide-react";

export const AWS_AUTH_MODES = Object.freeze({
  ACCESS_KEYS: "access_keys",
  INSTANCE_ROLE: "instance_role",
});

/** @param {unknown} raw */
export function normalizeAwsAuthMode(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase() === AWS_AUTH_MODES.INSTANCE_ROLE
    ? AWS_AUTH_MODES.INSTANCE_ROLE
    : AWS_AUTH_MODES.ACCESS_KEYS;
}

export const SETTINGS_TAB_IDS = ["general", "team", "integrations", "repositories", "backend"];

export const SETTINGS_TABS = [
  { id: "general", label: "General", icon: FileText },
  { id: "team", label: "Team", icon: Users },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "repositories", label: "App repositories", icon: FolderGit },
  { id: "backend", label: "Backend setup", icon: Server },
];

export function normalizeSettingsTab(raw) {
  const id = String(raw ?? "")
    .trim()
    .toLowerCase();
  return SETTINGS_TAB_IDS.includes(id) ? id : "general";
}

export function buildProjectSettingsPath(projectId, tab) {
  const base = `/projects/details/${encodeURIComponent(projectId)}/settings`;
  const normalized = normalizeSettingsTab(tab);
  if (normalized === "general") return base;
  return `${base}?tab=${normalized}`;
}

const TEAM_ERROR_KEYS = new Set([
  "assignedUserEmails",
  "stakeholderEmails",
  "settingsAccessEmails",
]);
const INTEGRATION_ERROR_KEYS = new Set(["integrations", "jiraProjectKey"]);
const REPOSITORY_ERROR_KEYS = new Set(["gitRepoPath", "developmentRepoUrl"]);

/** Pick settings tab to show when validation fails. */
export function tabForValidationErrors(errors) {
  const keys = Object.keys(errors ?? {});
  if (keys.some((k) => TEAM_ERROR_KEYS.has(k))) return "team";
  if (keys.some((k) => REPOSITORY_ERROR_KEYS.has(k))) return "repositories";
  if (keys.some((k) => INTEGRATION_ERROR_KEYS.has(k))) return "integrations";
  return "general";
}
