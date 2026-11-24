import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CONSOLE_PAGE_PANEL_KEYS,
  CONSOLE_SERVICE_GROUPS,
  CONSOLE_SERVICES,
  CONSOLE_SETTINGS_SERVICE,
  guideStageIdForConsolePage,
  navForServicePage,
  panelKeyForPage,
  resolveConsoleLocation,
} from "../src/pages/Project/ProjectDetails/constants/projectServices.js";
import { buildJourneyTourSteps } from "../src/pages/Project/ProjectDetails/constants/projectJourneyTourSteps.js";

/**
 * Manual smoke checklist (console coverage):
 * 1. Product Strategy → Profiles → switch all 4 personas
 * 2. Discovery Assistant opens from top bar on Product Strategy
 * 3. About popover works on each service
 * 4. Tour completes without hanging on missing selectors
 * 5. All left-nav pages still show prior tab content
 */

/** Legacy PROJECT_STAGES section/area pairs (avoids importing Vite-style relative imports). */
const LEGACY_STAGE_NAV = [
  { section: "discovery", area: "capture" },
  { section: "discovery", area: "profiles" },
  { section: "discovery", area: "documents" },
  { section: "discovery", area: "brief" },
  { section: "backlog", area: "board" },
  { section: "backlog", area: "suggestions" },
  { section: "releases", area: "overview" },
  { section: "releases", area: "active" },
  { section: "releases", area: "roadmap" },
  { section: "web-app", area: "preview" },
  { section: "web-app", area: "implement" },
  { section: "feedback", area: null },
  { section: "web-app", area: "agent-config" },
  { section: "backend", area: "backend-code" },
  { section: "backend", area: "implement" },
  { section: "backend", area: "architecture" },
  { section: "backend", area: "agent-config" },
  { section: "environment", area: null },
  { section: "cloud-infra", area: "deploy" },
  { section: "cloud-infra", area: "infra-analysis" },
  { section: "cloud-infra", area: "debugging" },
  { section: "qa-reports", area: null },
];

test("seven groups; Code Snippet sits below QA", () => {
  assert.deepEqual(
    CONSOLE_SERVICE_GROUPS.map((g) => g.id),
    [
      "product-strategy",
      "backlog-management",
      "release-management",
      "development",
      "validation",
      "code-snippet",
      "project-reports",
    ],
  );
  const development = CONSOLE_SERVICE_GROUPS.find((g) => g.id === "development");
  assert.deepEqual(development.serviceIds, ["preview", "application", "infrastructure"]);
  const codeSnippet = CONSOLE_SERVICE_GROUPS.find((g) => g.id === "code-snippet");
  assert.deepEqual(codeSnippet.serviceIds, ["code-snippet"]);
});

test("navForServicePage returns legacy section/area", () => {
  assert.deepEqual(navForServicePage("product-strategy", "capture"), {
    section: "discovery",
    area: "capture",
  });
  assert.deepEqual(navForServicePage("preview", "implement"), {
    section: "web-app",
    area: "implement",
  });
  assert.deepEqual(navForServicePage("application", "implement"), {
    section: "backend",
    area: "implement",
  });
  assert.deepEqual(navForServicePage("preview", "app"), {
    section: "web-app",
    area: "preview",
  });
  assert.deepEqual(navForServicePage("application", "code"), {
    section: "backend",
    area: "backend-code",
  });
  assert.deepEqual(navForServicePage("validation", "qa-reports"), {
    section: "qa-reports",
    area: null,
  });
  assert.deepEqual(navForServicePage("validation", "qa-chat"), {
    section: "qa-reports",
    area: "qa-chat",
  });
  assert.deepEqual(navForServicePage("validation", "export-test-cases"), {
    section: "qa-reports",
    area: "export-test-cases",
  });
  assert.deepEqual(navForServicePage("validation", "feedbacks"), {
    section: "feedback",
    area: null,
  });
  assert.deepEqual(navForServicePage("code-snippet", "snippet"), {
    section: "code-snippet",
    area: null,
  });
  assert.deepEqual(navForServicePage("backlog-management", "board"), {
    section: "backlog",
    area: "board",
  });
  assert.deepEqual(navForServicePage("release-management", "active"), {
    section: "releases",
    area: "active",
  });
});

test("resolveConsoleLocation maps legacy URLs onto consoles", () => {
  assert.deepEqual(resolveConsoleLocation("discovery", "brief"), {
    serviceId: "product-strategy",
    pageId: "brief",
  });
  assert.deepEqual(resolveConsoleLocation("releases", "active"), {
    serviceId: "release-management",
    pageId: "active",
  });
  assert.deepEqual(resolveConsoleLocation("web-app", "implement"), {
    serviceId: "preview",
    pageId: "implement",
  });
  assert.deepEqual(resolveConsoleLocation("backend", "implement"), {
    serviceId: "application",
    pageId: "implement",
  });
  assert.deepEqual(resolveConsoleLocation("feedback", null), {
    serviceId: "validation",
    pageId: "feedbacks",
  });
  assert.deepEqual(resolveConsoleLocation("environment", null), {
    serviceId: "infrastructure",
    pageId: "environment",
  });
  assert.deepEqual(resolveConsoleLocation("qa-reports", null), {
    serviceId: "validation",
    pageId: "qa-reports",
  });
  assert.deepEqual(resolveConsoleLocation("code-snippet", null), {
    serviceId: "code-snippet",
    pageId: "snippet",
  });
  assert.deepEqual(resolveConsoleLocation("automations", null), {
    serviceId: "project-reports",
    pageId: "list",
  });
});

test("unknown section falls back to Product Strategy Capture", () => {
  assert.deepEqual(resolveConsoleLocation("not-a-section", "x"), {
    serviceId: "product-strategy",
    pageId: "capture",
  });
});

test("every legacy stage nav target resolves via resolveConsoleLocation", () => {
  for (const target of LEGACY_STAGE_NAV) {
    const loc = resolveConsoleLocation(target.section, target.area);
    assert.ok(loc.serviceId && loc.pageId, `${target.section}/${target.area} must resolve`);
    const roundTrip = navForServicePage(loc.serviceId, loc.pageId);
    assert.equal(roundTrip.section, target.section);
    assert.equal(roundTrip.area, target.area);
  }
});

test("every CONSOLE_SERVICES page has a known SectionPanel key", () => {
  const allowed = new Set(CONSOLE_PAGE_PANEL_KEYS);
  for (const service of CONSOLE_SERVICES) {
    for (const page of service.pages) {
      const key = panelKeyForPage(page);
      assert.ok(
        allowed.has(key),
        `${service.id}/${page.id} → panel key ${key} must be in CONSOLE_PAGE_PANEL_KEYS`,
      );
    }
  }
});

test("guideStageIdForConsolePage maps to stage guide copy ids", () => {
  assert.equal(guideStageIdForConsolePage("product-strategy", "capture"), "capture");
  assert.equal(guideStageIdForConsolePage("product-strategy", "profiles"), "profiles");
  assert.equal(guideStageIdForConsolePage("backlog-management", "board"), "backlog");
  assert.equal(guideStageIdForConsolePage("release-management", "active"), "releases");
  assert.equal(guideStageIdForConsolePage("preview", "app"), "frontend");
  assert.equal(guideStageIdForConsolePage("application", "code"), "backend");
  assert.equal(guideStageIdForConsolePage("infrastructure", "deploy"), "cloud");
  assert.equal(guideStageIdForConsolePage("validation", "qa-reports"), "qa");
  assert.equal(guideStageIdForConsolePage("validation", "feedbacks"), "qa");
});

test("tour steps cover project switcher, each service, settings, and header replay", () => {
  const steps = buildJourneyTourSteps([]);
  assert.equal(steps.length, 12);

  for (const step of steps) {
    assert.doesNotMatch(step.selector, /data-tour-stage/);
    assert.ok(Array.isArray(step.content?.points));
    assert.ok(step.content.points.length >= 1);
    assert.ok(step.content.title);
  }

  assert.match(steps[0].selector, /project-console-switcher/);
  assert.equal(steps[0].serviceId, null);

  for (const service of CONSOLE_SERVICES) {
    const step = steps.find((s) => s.serviceId === service.id);
    assert.ok(step, `missing tour step for service ${service.id}`);
    assert.match(step.selector, new RegExp(`project-console-service-${service.id}`));
  }

  const settingsStep = steps.find((s) => s.serviceId === CONSOLE_SETTINGS_SERVICE.id);
  assert.ok(settingsStep);
  assert.match(settingsStep.selector, /project-console-service-settings/);

  const replayStep = steps.at(-1);
  assert.match(replayStep.selector, /workspace-tour-button/);
  assert.equal(replayStep.serviceId, null);
  assert.equal(replayStep.position, "bottom");
});

test("sidebar exposes tour anchors and removed settings tour row", () => {
  const sidebarPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/console/ProjectConsoleSidebar.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(sidebarPath, "utf8");
  assert.match(source, /data-tour="project-console-switcher"/);
  assert.match(source, /dataTour=\{`project-console-service-\$\{service\.id\}`\}/);
  assert.doesNotMatch(source, /label="Tour"/);
});

test("tour service steps follow sidebar order and match service titles", () => {
  const steps = buildJourneyTourSteps([]);
  const serviceSteps = steps.filter((step) => step.serviceId && step.serviceId !== "settings");
  assert.equal(serviceSteps.length, CONSOLE_SERVICES.length);

  for (let index = 0; index < CONSOLE_SERVICES.length; index += 1) {
    const service = CONSOLE_SERVICES[index];
    const step = serviceSteps[index];
    assert.equal(step.serviceId, service.id, `step order mismatch at index ${index}`);
    assert.equal(step.content.title, SERVICE_TOUR_COPY_EXPECTED_TITLE[service.id] ?? service.label);
    assert.equal(
      step.selector,
      `[data-tour="project-console-service-${service.id}"]`,
      `selector mismatch for ${service.id}`,
    );
  }

  const settingsStep = steps.find((step) => step.serviceId === CONSOLE_SETTINGS_SERVICE.id);
  assert.equal(settingsStep.content.title, "Settings");
  assert.equal(
    settingsStep.selector,
    `[data-tour="project-console-service-${CONSOLE_SETTINGS_SERVICE.id}"]`,
  );
});

/** Titles intentionally differ from sidebar label for some services. */
const SERVICE_TOUR_COPY_EXPECTED_TITLE = {
  validation: "QA",
  application: "App repositories",
  "project-reports": "Project reports",
};

test("each tour step maps to a unique sidebar anchor", () => {
  const steps = buildJourneyTourSteps([]);
  const selectors = steps.map((step) => step.selector);
  assert.equal(selectors.length, new Set(selectors).size, "duplicate tour selectors");

  const expectedByTitle = {
    "Your project": '[data-tour="project-console-switcher"]',
    "Product Strategy": '[data-tour="project-console-service-product-strategy"]',
    "Backlog Management": '[data-tour="project-console-service-backlog-management"]',
    "Release Management": '[data-tour="project-console-service-release-management"]',
    Preview: '[data-tour="project-console-service-preview"]',
    "App repositories": '[data-tour="project-console-service-application"]',
    Infrastructure: '[data-tour="project-console-service-infrastructure"]',
    QA: '[data-tour="project-console-service-validation"]',
    "Code Snippet": '[data-tour="project-console-service-code-snippet"]',
    "Project reports": '[data-tour="project-console-service-project-reports"]',
    Settings: '[data-tour="project-console-service-settings"]',
    "See this again": '[data-tour="workspace-tour-button"]',
  };

  for (const step of steps) {
    assert.equal(step.selector, expectedByTitle[step.content.title], step.content.title);
  }
});

test("service tour steps observe sidebar layout changes", () => {
  const steps = buildJourneyTourSteps([]);
  const serviceSteps = steps.filter((step) => step.serviceId);
  assert.ok(serviceSteps.length >= 10);
  for (const step of serviceSteps) {
    assert.deepEqual(step.mutationObservables, ['[data-tour="project-console-sidebar"]']);
    assert.deepEqual(step.resizeObservables, ['[data-tour="project-console-sidebar"]']);
  }
});

test("ProjectJourneyShell mounts implement and core section panels", () => {
  const shellPath = fileURLToPath(
    new URL(
      "../src/pages/Project/ProjectDetails/components/ProjectJourneyShell.jsx",
      import.meta.url,
    ),
  );
  const source = readFileSync(shellPath, "utf8");
  assert.match(source, /activeSection === "discovery"/);
  assert.match(source, /activeSection === "backlog"/);
  assert.match(source, /activeSection === "releases"/);
  assert.match(source, /activeWebAppArea === "preview"/);
  assert.match(source, /activeWebAppArea === "implement"/);
  assert.match(source, /activeWebAppArea === "agent-config"/);
  assert.match(source, /activeSection === "feedback"/);
  assert.match(source, /activeBackendArea === "backend-code"/);
  assert.match(source, /activeBackendArea === "implement"/);
  assert.match(source, /activeBackendArea === "architecture"/);
  assert.match(source, /activeBackendArea === "agent-config"/);
  assert.match(source, /activeSection === "environment"/);
  assert.match(source, /activeCloudInfraArea === "deploy"/);
  assert.match(source, /activeCloudInfraArea === "infra-analysis"/);
  assert.match(source, /activeCloudInfraArea === "debugging"/);
  assert.match(source, /activeSection === "qa-reports"/);
  assert.match(source, /activeSection === "code-snippet"/);
  assert.match(source, /onNavigateProfile/);
  assert.match(source, /ProjectConsoleSidebar/);
  assert.match(source, /WorkspaceTopBar/);
  assert.doesNotMatch(source, /ServiceLeftNav/);
});

test("services launcher is 9-dot style with catalog tiles", () => {
  const source = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/ServicesMegaMenu.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  assert.match(source, /Grid3x3/);
  assert.match(source, /onNavigateService/);
  assert.match(source, /grid-cols-3/);
  assert.doesNotMatch(source, /onNavigateAutomations/);
});

test("console chrome restores profiles, settings, switcher in project sidebar", () => {
  const sidebar = readFileSync(
    fileURLToPath(
      new URL(
        "../src/pages/Project/ProjectDetails/components/console/ProjectConsoleSidebar.jsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );
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
  assert.match(sidebar, /PERSONA_TABS/);
  assert.match(sidebar, /onNavigateProfile/);
  assert.match(sidebar, /ProjectSwitcher/);
  assert.match(sidebar, /CONSOLE_SERVICES/);
  assert.match(sidebar, /buildProjectChatPath/);
  assert.match(sidebar, /onNavigateAllReports/);
  assert.match(sidebar, /ADMIN_CONSOLE_LINKS/);
  assert.doesNotMatch(sidebar, /onNavigateAutomations/);
  assert.match(workspaceTopBar, /buildProjectChatPath/);
  assert.match(workspaceTopBar, /fixed bottom-6 right-6/);
  assert.match(workspaceTopBar, /ConsoleQuickNav/);
  assert.doesNotMatch(workspaceTopBar, /DiscoveryAssistantSheet/);
  assert.match(platformTopBar, /ProjectSwitcher/);
  assert.match(platformTopBar, /ConsoleSettingsMenu/);
});
