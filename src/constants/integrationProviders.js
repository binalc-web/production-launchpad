export const INTEGRATION_PROVIDERS = Object.freeze({
  GITHUB: Object.freeze({ name: "github", label: "GitHub" }),
  BITBUCKET: Object.freeze({ name: "bitbucket", label: "Bitbucket" }),
  JIRA: Object.freeze({ name: "jira_atlassian", label: "Jira" }),
  FIGMA: Object.freeze({ name: "figma", label: "Figma" }),
  GRANOLA: Object.freeze({ name: "granola", label: "Granola" }),
});

/** Account-level OAuth/apps page (`/settings/integrations`). */
export const ACCOUNT_CONNECTIONS_PATH = "/settings/integrations";
export const ACCOUNT_CONNECTIONS_LABEL = "Connected accounts";

/** Project settings tab for linking a code host + Jira (`?tab=integrations`). */
export const PROJECT_GIT_JIRA_TAB = "integrations";
export const PROJECT_GIT_JIRA_LABEL = "Integrations";
