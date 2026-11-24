import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("Project settings route is registered", () => {
  const routesPath = fileURLToPath(new URL("../src/Routes/Routes.jsx", import.meta.url));
  const source = readFileSync(routesPath, "utf8");

  assert.match(source, /\/projects\/details\/:projectId\/settings/);
  assert.match(source, /ProjectSettingsPage/);
  assert.doesNotMatch(source, /EditProjectDialog/);
});

test("ProjectDetails navigates to settings instead of opening edit modal", () => {
  const detailsPath = fileURLToPath(
    new URL("../src/pages/Project/ProjectDetails/ProjectDetails.jsx", import.meta.url),
  );
  const source = readFileSync(detailsPath, "utf8");

  assert.match(source, /buildProjectSettingsPath/);
  assert.doesNotMatch(source, /EditProjectDialog/);
  assert.doesNotMatch(source, /editProjectOpen/);
  assert.match(
    source,
    /editProject[\s\S]{0,400}buildProjectSettingsPath\(projectId,\s*"integrations"\)/,
    "?editProject=1 legacy deep link must redirect to settings integrations tab",
  );
});

test("Edit project header action uses project settings path when allowed", () => {
  const shellPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/ProjectJourneyShell.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(shellPath, "utf8");

  assert.match(source, /userCanAccessProjectSettings\(user,\s*project\)/);
  assert.match(source, /buildProjectSettingsPath\(project\.id\)/);
});

test("Team tab exposes Project settings access email field", () => {
  const tabPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectSettings/components/EditProjectTeamTab.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(tabPath, "utf8");

  assert.match(source, /Project settings access/);
  assert.match(source, /settings-access-emails/);
  assert.match(source, /settingsAccessEmails/);
});

test("Project settings page bounces users without settings access", () => {
  const pagePath = fileURLToPath(
    new URL("../src/pages/Project/ProjectSettings/ProjectSettingsPage.jsx", import.meta.url),
  );
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /userCanAccessProjectSettings/);
  assert.match(source, /canAccessProjectSettings/);
});

test("Confluence import links to project settings integrations tab", () => {
  const panelPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ClientInfo/components/ConfluenceImportPanel.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(panelPath, "utf8");

  assert.match(source, /buildProjectSettingsPath\(projectId,\s*"integrations"\)/);
  assert.doesNotMatch(source, /editProject/);
});

test("buildProjectSettingsPath returns settings URLs", async () => {
  const { buildProjectSettingsPath, normalizeSettingsTab } =
    await import("../src/pages/Project/ProjectSettings/constants.js");

  assert.equal(buildProjectSettingsPath(42), "/projects/details/42/settings");
  assert.equal(
    buildProjectSettingsPath(42, "integrations"),
    "/projects/details/42/settings?tab=integrations",
  );
  assert.equal(normalizeSettingsTab("backend"), "backend");
  assert.equal(normalizeSettingsTab("unknown"), "general");
});

test("ProjectGitJiraOAuthCard supports edit settings section split", () => {
  const cardPath = fileURLToPath(
    new URL(
      "../src/pages/Project/CreateProject/components/ProjectGitJiraOAuthCard.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(cardPath, "utf8");

  assert.match(source, /editSettingsSection/);
  assert.match(source, /showOAuthIntegrations/);
  assert.match(source, /showRepositoriesConfig/);
});

test("Project settings separates integrations and repositories tabs", () => {
  const constantsPath = fileURLToPath(
    new URL("../src/pages/Project/ProjectSettings/constants.js", import.meta.url),
  );
  const source = readFileSync(constantsPath, "utf8");

  assert.match(source, /"repositories"/);
  assert.match(source, /REPOSITORY_ERROR_KEYS/);
});

test("platform chrome Project chat FAB links to /chat with the selected project", () => {
  const chromePath = fileURLToPath(
    new URL("../src/layouts/PlatformConsoleChrome.jsx", import.meta.url),
  );
  const topBarPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/console/ConsoleTopBar.jsx",
      import.meta.url,
    ),
  );
  const workspaceTopBarPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/console/WorkspaceTopBar.jsx",
      import.meta.url,
    ),
  );
  const menuPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/console/ConsoleProjectSettingsMenu.jsx",
      import.meta.url,
    ),
  );

  const chrome = readFileSync(chromePath, "utf8");
  const topBar = readFileSync(topBarPath, "utf8");
  const workspaceTopBar = readFileSync(workspaceTopBarPath, "utf8");
  const menu = readFileSync(menuPath, "utf8");

  assert.match(chrome, /WorkspaceTopBar/);
  assert.match(topBar, /buildProjectChatPath\(projectId\)/);
  assert.match(workspaceTopBar, /buildProjectChatPath\(projectId\)/);
  assert.doesNotMatch(topBar, /DiscoveryAssistantSheet/);
  assert.doesNotMatch(topBar, /ClientInfoChatPanel/);
  assert.match(menu, /buildProjectChatPath\(projectId\)/);
  assert.match(menu, />\s*Project chat\s*</);

  const journeyNav = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/ProjectJourneyTopNav.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  assert.match(journeyNav, /buildProjectChatPath\(project\.id\)/);
  assert.doesNotMatch(journeyNav, /DiscoveryAssistantSheet/);
});

test("platform chrome Project Settings menu matches workspace actions", () => {
  const chromePath = fileURLToPath(
    new URL("../src/layouts/PlatformConsoleChrome.jsx", import.meta.url),
  );
  const menuPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/console/ConsoleProjectSettingsMenu.jsx",
      import.meta.url,
    ),
  );
  const detailsPath = fileURLToPath(
    new URL("../src/pages/Project/ProjectDetails/ProjectDetails.jsx", import.meta.url),
  );
  const topBarPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/console/ConsoleTopBar.jsx",
      import.meta.url,
    ),
  );

  const chrome = readFileSync(chromePath, "utf8");
  const menu = readFileSync(menuPath, "utf8");
  const details = readFileSync(detailsPath, "utf8");
  const topBar = readFileSync(topBarPath, "utf8");

  assert.match(chrome, /userCanAccessProjectSettings/);
  assert.match(chrome, /isAdmin=\{isAdmin\}/);
  assert.match(chrome, /onNavigateCollaboration/);
  assert.match(chrome, /onNavigateAgentAnalytics/);
  assert.doesNotMatch(chrome, /onNavigateAutomations/);
  assert.match(chrome, /onEditProject/);
  assert.match(chrome, /onStartJourneyTour/);
  assert.match(chrome, /startJourneyTour:\s*true/);
  assert.match(topBar, /project=\{project\}/);
  assert.doesNotMatch(topBar, /onNavigateAutomations/);
  assert.match(menu, /Team Activity/);
  assert.doesNotMatch(menu, /PROJECT_AUTOMATIONS_SECTION/);
  assert.doesNotMatch(menu, /onNavigateAutomations/);
  assert.match(menu, /Review portal/);
  assert.match(menu, /Preview only/);
  assert.match(menu, />\s*Tour\s*</);
  assert.match(details, /location\.state\?\.startJourneyTour/);
});

test("tabForValidationErrors routes team, integration, and repository errors", async () => {
  const { tabForValidationErrors } =
    await import("../src/pages/Project/ProjectSettings/constants.js");

  assert.equal(tabForValidationErrors({ assignedUserEmails: "bad" }), "team");
  assert.equal(tabForValidationErrors({ settingsAccessEmails: "bad" }), "team");
  assert.equal(tabForValidationErrors({ gitRepoPath: "required" }), "repositories");
  assert.equal(tabForValidationErrors({ jiraProjectKey: "required" }), "integrations");
  assert.equal(tabForValidationErrors({}), "general");
});

test("Project settings General tab places delete project below project status", () => {
  const tabPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectSettings/components/EditProjectGeneralTab.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(tabPath, "utf8");
  const statusIdx = source.indexOf("settings-project-active");
  const deleteIdx = source.indexOf("Permanently remove this project");

  assert.ok(statusIdx >= 0, "General tab must include project status");
  assert.ok(deleteIdx >= 0, "General tab must expose delete project copy");
  assert.ok(deleteIdx > statusIdx, "Delete project UI must appear below project status");
  assert.match(source, /onRequestDeleteProject/);
  assert.match(source, /type="button"/);
  assert.match(source, /Delete project/);
});

test("Project settings page reuses DeleteProjectDialog and leaves after delete", () => {
  const pagePath = fileURLToPath(
    new URL("../src/pages/Project/ProjectSettings/ProjectSettingsPage.jsx", import.meta.url),
  );
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /DeleteProjectDialog/);
  assert.match(source, /onRequestDeleteProject/);
  assert.match(source, /onProjectDeleted/);
  assert.match(source, /navigate\(["']\/projects["']/);
  assert.match(source, /forgetProjectId|clearLastProjectId|LAST_PROJECT_ID_KEY|readLastProjectId/);
});
