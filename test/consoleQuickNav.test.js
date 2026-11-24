import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CONSOLE_SERVICES,
  ADMIN_CONSOLE_LINKS,
  PLATFORM_CONSOLE_LINKS,
} from "../src/pages/Project/ProjectDetails/constants/projectServices.js";
import { PERSONA_TABS } from "../src/pages/Project/ProductManagement/constants.js";
import { SETTINGS_TABS } from "../src/pages/Project/ProjectSettings/constants.js";
import { AGENT_ANALYTICS_SECTION } from "../src/pages/Project/ProjectDetails/constants/projectAgentAnalyticsSection.js";
import {
  buildAssistantHelpChatHref,
  buildConsoleQuickNavItems,
  buildConsoleQuickNavProjectItems,
  filterConsoleQuickNavItems,
  groupConsoleQuickNavItems,
  QUICK_NAV_GROUPS,
} from "../src/pages/Project/ProjectDetails/lib/consoleQuickNavCatalog.js";

const PROJECT_ID = 42;

function labels(items, group) {
  return items.filter((item) => item.group === group).map((item) => item.label);
}

test("catalog includes every service, page, persona, settings tab, and platform link", () => {
  const items = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: false,
    canAccessProjectSettings: true,
  });
  const byId = new Map(items.map((item) => [item.id, item]));

  for (const service of CONSOLE_SERVICES) {
    assert.ok(byId.has(`service:${service.id}`), `missing service ${service.id}`);
    for (const page of service.pages) {
      const item = byId.get(`page:${service.id}:${page.id}`);
      assert.ok(item, `missing page ${service.id}/${page.id}`);
      assert.equal(item.label, page.label);
      assert.equal(item.parent, service.label);
    }
  }

  assert.ok(labels(items, QUICK_NAV_GROUPS.SERVICES).includes("Project reports"));
  assert.ok(byId.has("service:project-reports"));

  for (const persona of PERSONA_TABS) {
    const item = byId.get(`persona:${persona.id}`);
    assert.ok(item, `missing persona ${persona.id}`);
    assert.equal(item.label, persona.label);
    assert.match(item.href, /profile=/);
  }

  for (const tab of SETTINGS_TABS) {
    const item = byId.get(`settings:${tab.id}`);
    assert.ok(item, `missing settings tab ${tab.id}`);
    assert.equal(item.label, tab.label);
  }

  for (const link of PLATFORM_CONSOLE_LINKS) {
    assert.ok(
      items.some((item) => item.href === link.href && item.label === link.label),
      `missing platform link ${link.label}`,
    );
  }

  assert.ok(items.some((item) => item.label === "Team Activity"));
  const projectChat = items.find((item) => item.label === "Project chat");
  assert.ok(projectChat);
  assert.equal(projectChat.href, "/chat?projectId=42");
  assert.equal(projectChat.action, "project-chat");
  assert.ok(items.some((item) => item.label === "Tour"));
  assert.ok(items.some((item) => item.label === "Review portal"));
  assert.ok(items.some((item) => item.label === "Preview only"));
  assert.ok(items.some((item) => item.label === "Project settings"));
});

test("settings destinations are gated without canAccessProjectSettings", () => {
  const denied = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: false,
    canAccessProjectSettings: false,
  });
  const allowed = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: false,
    canAccessProjectSettings: true,
  });

  assert.equal(
    denied.some((item) => item.label === "Project settings"),
    false,
  );
  assert.equal(
    denied.some((item) => item.id?.startsWith("settings:")),
    false,
  );
  assert.ok(allowed.some((item) => item.label === "Project settings"));
  assert.ok(allowed.some((item) => item.id?.startsWith("settings:")));
});

test("admin-only destinations are gated", () => {
  const member = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: false,
    canAccessProjectSettings: true,
  });
  const admin = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: true,
    canAccessProjectSettings: true,
  });

  assert.equal(
    member.some((item) => item.label === AGENT_ANALYTICS_SECTION.label),
    false,
  );
  assert.ok(admin.some((item) => item.label === AGENT_ANALYTICS_SECTION.label));

  for (const link of ADMIN_CONSOLE_LINKS) {
    const expectedHref = link.workspaceSection
      ? `/projects/details/${PROJECT_ID}?section=${encodeURIComponent(link.workspaceSection)}`
      : link.href;
    assert.equal(
      member.some((item) => item.label === link.label && item.group === QUICK_NAV_GROUPS.ADMIN),
      false,
      `member must not see ${link.label}`,
    );
    assert.ok(
      admin.some((item) => item.href === expectedHref && item.label === link.label),
      `admin missing ${link.label}`,
    );
  }
});

test("catalog without projectId is empty", () => {
  assert.deepEqual(buildConsoleQuickNavItems({ projectId: null, isAdmin: true }), []);
});

test("project items map names and ids", () => {
  const items = buildConsoleQuickNavProjectItems([
    { id: 7, name: "Acme" },
    { id: "p2", name: "  " },
  ]);
  assert.equal(items[0].label, "Acme");
  assert.equal(items[0].group, QUICK_NAV_GROUPS.PROJECTS);
  assert.equal(items[1].label, "p2");
  assert.match(items[0].href, /\/projects\/details\/7/);
});

test("filter is case-insensitive and matches parent path", () => {
  const items = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: true,
    canAccessProjectSettings: true,
  });

  const capture = filterConsoleQuickNavItems(items, "  CaPtUrE  ");
  assert.ok(capture.some((item) => item.label === "Capture"));

  const implement = filterConsoleQuickNavItems(items, "app repositories");
  assert.ok(
    implement.some((item) => item.label === "Implement" && item.parent === "App repositories"),
  );

  const none = filterConsoleQuickNavItems(items, "zzz-no-such-destination");
  assert.equal(none.length, 0);

  assert.equal(filterConsoleQuickNavItems(items, "").length, items.length);
  assert.equal(filterConsoleQuickNavItems(items, "   ").length, items.length);
});

test("groupConsoleQuickNavItems preserves group order", () => {
  const items = [
    ...buildConsoleQuickNavProjectItems([{ id: 1, name: "One" }]),
    ...buildConsoleQuickNavItems({
      projectId: PROJECT_ID,
      isAdmin: true,
      canAccessProjectSettings: true,
    }),
  ];
  const grouped = groupConsoleQuickNavItems(items);
  assert.deepEqual(
    grouped.map((g) => g.group),
    [
      "Projects",
      "Services",
      "Pages",
      "Overlays",
      "Project settings",
      "Project actions",
      "Account",
      "Admin",
    ],
  );
});

test("quick nav trigger sits in workspace and platform chrome", () => {
  const workspaceTopBar = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/WorkspaceTopBar.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  const platformTopBar = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/ConsoleTopBar.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  const quickNav = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/ConsoleQuickNav.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );

  assert.match(workspaceTopBar, /import \{ ConsoleQuickNav \} from "\.\/ConsoleQuickNav"/);
  assert.match(workspaceTopBar, /data-tour="workspace-top-bar"/);
  assert.match(workspaceTopBar, /<ConsoleQuickNav/);
  assert.match(platformTopBar, /import \{ ConsoleQuickNav \} from "\.\/ConsoleQuickNav"/);
  assert.match(platformTopBar, /data-tour="console-project-info-bar"/);
  assert.match(platformTopBar, /ConsoleProjectSettingsMenu/);
  assert.match(platformTopBar, /<ConsoleQuickNav/);

  const barIdx = platformTopBar.indexOf('data-tour="console-project-info-bar"');
  const settingsIdx = platformTopBar.indexOf("ConsoleProjectSettingsMenu", barIdx);
  const quickIdx = platformTopBar.indexOf("<ConsoleQuickNav", barIdx);
  assert.ok(barIdx >= 0 && settingsIdx > barIdx && quickIdx > settingsIdx);
  assert.match(platformTopBar.slice(settingsIdx, quickIdx), /<\/div>/);

  assert.match(quickNav, /item\.action === "project-chat"/);
  assert.match(quickNav, /navigate\(item\.href\)/);
  assert.match(quickNav, /data-testid="console-quick-nav-trigger"/);
  assert.match(quickNav, /data-testid="console-quick-nav"/);
  assert.match(quickNav, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(quickNav, /No matches/);
  assert.match(quickNav, /<DialogTitle>Search<\/DialogTitle>/);
  assert.match(quickNav, /DialogFooter/);
  assert.match(quickNav, />\s*Close\s*</);
  // Standard dialog shell (not command-palette): DialogContent keeps default padding
  assert.match(
    quickNav,
    /<DialogContent[\s\S]*?className="max-h-\[min\(90vh,640px\)\] overflow-y-auto sm:max-w-lg"/,
  );
  assert.doesNotMatch(quickNav, /Enter to go · Esc to close/);
  assert.match(quickNav, /md:w-56 md:min-w-0/);
  assert.match(workspaceTopBar, /data-tour="workspace-tour-button"/);
  assert.match(workspaceTopBar, /Replay the project tour/);
  assert.match(workspaceTopBar, />\s*Tour\s*</);
  assert.match(workspaceTopBar, /onStartJourneyTour/);
});

test("quick nav finds Tour when searching tour", () => {
  const items = buildConsoleQuickNavItems({
    projectId: PROJECT_ID,
    isAdmin: false,
    canAccessProjectSettings: true,
  });
  for (const query of ["tour", "Tour", "replay", "walkthrough"]) {
    const matches = filterConsoleQuickNavItems(items, query);
    assert.ok(
      matches.some((item) => item.action === "tour"),
      `expected Tour in results for query "${query}"`,
    );
  }
});

test("workspace top bar places tour button before theme toggle", () => {
  const workspaceTopBar = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/WorkspaceTopBar.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );

  const tourIdx = workspaceTopBar.indexOf('data-tour="workspace-tour-button"');
  const themeIdx = workspaceTopBar.indexOf("onClick={toggleTheme}");
  assert.ok(tourIdx >= 0 && themeIdx > tourIdx);
});

test("buildAssistantHelpChatHref opens all projects without a project param", () => {
  assert.equal(buildAssistantHelpChatHref("How does lock work?"), "/chat?q=How+does+lock+work%3F");
  assert.equal(buildAssistantHelpChatHref("General question"), "/chat?q=General+question");
  assert.equal(buildAssistantHelpChatHref(), "/chat");
  assert.equal(buildAssistantHelpChatHref("   "), "/chat");
});

test("workspace top bar renders Help menu before Tour", () => {
  const workspaceTopBar = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/WorkspaceTopBar.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );

  const helpIdx = workspaceTopBar.indexOf("AssistantHelpMenu");
  const tourIdx = workspaceTopBar.indexOf('data-tour="workspace-tour-button"');
  assert.ok(helpIdx >= 0 && tourIdx > helpIdx);

  const helpMenu = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/AssistantHelpMenu.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  assert.match(helpMenu, /data-tour="workspace-help-button"/);
});
