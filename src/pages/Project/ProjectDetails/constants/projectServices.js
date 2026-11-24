import {
  AppWindow,
  ClipboardCheck,
  Cloud,
  Code2,
  Compass,
  Globe,
  KanbanSquare,
  Package,
  Settings,
  Zap,
} from "lucide-react";
import { PROJECT_AUTOMATIONS_SECTION } from "./projectAutomationsSection.js";
import { ALL_PROJECT_REPORTS_SECTION } from "./projectAllReportsSection.js";

export const DEFAULT_SERVICE_ID = "product-strategy";
export const DEFAULT_PAGE_BY_SERVICE = {
  "product-strategy": "capture",
  "backlog-management": "board",
  "release-management": "overview",
  preview: "app",
  application: "code",
  infrastructure: "environment",
  validation: "qa-reports",
  "code-snippet": "snippet",
  "project-reports": "list",
};

export const CONSOLE_SERVICE_GROUPS = [
  { id: "product-strategy", label: "Product Strategy", serviceIds: ["product-strategy"] },
  { id: "backlog-management", label: "Backlog Management", serviceIds: ["backlog-management"] },
  { id: "release-management", label: "Release Management", serviceIds: ["release-management"] },
  {
    id: "development",
    label: "Development",
    serviceIds: ["preview", "application", "infrastructure"],
  },
  { id: "validation", label: "QA", serviceIds: ["validation"] },
  { id: "code-snippet", label: "Code Snippet", serviceIds: ["code-snippet"] },
  { id: "project-reports", label: "Project reports", serviceIds: ["project-reports"] },
];

export const CONSOLE_SERVICES = [
  {
    id: "product-strategy",
    label: "Product Strategy",
    groupId: "product-strategy",
    icon: Compass,
    pages: [
      { id: "capture", label: "Capture", section: "discovery", area: "capture" },
      { id: "profiles", label: "Profiles", section: "discovery", area: "profiles" },
      { id: "documents", label: "Documents", section: "discovery", area: "documents" },
      { id: "brief", label: "Brief", section: "discovery", area: "brief" },
    ],
  },
  {
    id: "backlog-management",
    label: "Backlog Management",
    groupId: "backlog-management",
    icon: KanbanSquare,
    pages: [
      { id: "board", label: "Board", section: "backlog", area: "board" },
      { id: "suggestions", label: "Suggestions", section: "backlog", area: "suggestions" },
    ],
  },
  {
    id: "release-management",
    label: "Release Management",
    groupId: "release-management",
    icon: Package,
    pages: [
      { id: "overview", label: "Overview", section: "releases", area: "overview" },
      { id: "active", label: "Active release", section: "releases", area: "active" },
      { id: "roadmap", label: "Roadmap", section: "releases", area: "roadmap" },
    ],
  },
  {
    id: "preview",
    label: "Preview",
    groupId: "development",
    icon: Globe,
    description: "LaunchPad frontend repo and preview only.",
    pages: [
      { id: "app", label: "App", section: "web-app", area: "preview" },
      { id: "implement", label: "Implement", section: "web-app", area: "implement" },
      { id: "agent-config", label: "Agent config", section: "web-app", area: "agent-config" },
    ],
  },
  {
    id: "application",
    label: "App repositories",
    groupId: "development",
    icon: AppWindow,
    description: "Working frontend and backend repositories — one repo or many.",
    pages: [
      { id: "code", label: "Chat", section: "backend", area: "backend-code" },
      { id: "implement", label: "Implement", section: "backend", area: "implement" },
      { id: "architecture", label: "Architecture", section: "backend", area: "architecture" },
      { id: "agent-config", label: "Agent config", section: "backend", area: "agent-config" },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    groupId: "development",
    icon: Cloud,
    pages: [
      { id: "environment", label: "Environment", section: "environment", area: null },
      { id: "deploy", label: "Deploy", section: "cloud-infra", area: "deploy" },
      {
        id: "infra-analysis",
        label: "Infra analysis",
        section: "cloud-infra",
        area: "infra-analysis",
      },
      { id: "debugging", label: "Debugging", section: "cloud-infra", area: "debugging" },
    ],
  },
  {
    id: "validation",
    label: "QA",
    groupId: "validation",
    icon: ClipboardCheck,
    pages: [
      { id: "qa-reports", label: "Failed Playwright runs", section: "qa-reports", area: null },
      { id: "qa-chat", label: "QA Chat", section: "qa-reports", area: "qa-chat" },
      {
        id: "export-test-cases",
        label: "Export Test Cases",
        section: "qa-reports",
        area: "export-test-cases",
      },
      {
        id: "qa-app-configuration",
        label: "QA App Configuration",
        section: "qa-reports",
        area: "qa-app-configuration",
      },
      { id: "feedbacks", label: "Feedbacks", section: "feedback", area: null },
    ],
  },
  {
    id: "code-snippet",
    label: "Code Snippet",
    groupId: "code-snippet",
    icon: Code2,
    description:
      "Embed domain rules and install the report-issue snippet into your development repo.",
    pages: [{ id: "snippet", label: "Snippet", section: "code-snippet", area: null }],
  },
  {
    id: "project-reports",
    label: PROJECT_AUTOMATIONS_SECTION.label,
    groupId: "project-reports",
    icon: Zap,
    description: "Scheduled reports and automations for this project.",
    pages: [
      {
        id: "list",
        label: "Reports",
        section: PROJECT_AUTOMATIONS_SECTION.id,
        area: null,
      },
    ],
  },
];

/** Sidebar-only: project settings & workspace overlays (not a URL-routed console service). */
export const CONSOLE_SETTINGS_SERVICE = {
  id: "settings",
  label: "Settings",
  icon: Settings,
  pages: [],
};

export const SIDEBAR_CONSOLE_SERVICES = [...CONSOLE_SERVICES, CONSOLE_SETTINGS_SERVICE];

export const PLATFORM_CONSOLE_LINKS = [
  { label: "Connected accounts", href: "/settings/integrations" },
  { label: "Notifications", href: "/settings/notifications" },
];

export const ADMIN_CONSOLE_LINKS = [
  {
    label: ALL_PROJECT_REPORTS_SECTION.label,
    href: "/jobs",
    workspaceSection: ALL_PROJECT_REPORTS_SECTION.id,
  },
  { label: "Prompt Management", href: "/prompt-management" },
  { label: "Deployments", href: "/deployments" },
  { label: "Platform Analytics", href: "/platform-analytics" },
  { label: "Cost Analytics", href: "/cost-analytics" },
  { label: "QA Analytics", href: "/qa-analytics" },
  { label: "Model Router", href: "/model-router" },
  { label: "Cursor API keys", href: "/cursor-api-keys" },
];

const SERVICE_BY_ID = new Map(CONSOLE_SERVICES.map((s) => [s.id, s]));

export function getService(serviceId) {
  return SERVICE_BY_ID.get(serviceId) ?? SERVICE_BY_ID.get(DEFAULT_SERVICE_ID);
}

export function navForServicePage(serviceId, pageId) {
  const service = getService(serviceId);
  const page =
    service.pages.find((p) => p.id === pageId) ??
    service.pages.find((p) => p.id === DEFAULT_PAGE_BY_SERVICE[service.id]) ??
    service.pages[0];
  return { section: page.section, area: page.area ?? null };
}

export function resolveConsoleLocation(rawSection, rawArea) {
  const section = rawSection || "";
  const area = rawArea || null;
  for (const service of CONSOLE_SERVICES) {
    const page = service.pages.find((p) => {
      if (p.section !== section) return false;
      if (p.area == null) return !area;
      return p.area === area;
    });
    if (page) return { serviceId: service.id, pageId: page.id };
  }
  return {
    serviceId: DEFAULT_SERVICE_ID,
    pageId: DEFAULT_PAGE_BY_SERVICE[DEFAULT_SERVICE_ID],
  };
}

/**
 * Map console service/page to legacy STAGE_GUIDE_COPY stage id.
 * @param {string} serviceId
 * @param {string} pageId
 * @returns {string | null}
 */
export function guideStageIdForConsolePage(serviceId, pageId) {
  if (serviceId === "product-strategy") {
    if (["capture", "profiles", "documents", "brief"].includes(pageId)) return pageId;
    return "capture";
  }
  if (serviceId === "backlog-management") return "backlog";
  if (serviceId === "release-management") return "releases";
  if (serviceId === "preview") return "frontend";
  if (serviceId === "application") return "backend";
  if (serviceId === "infrastructure") return "cloud";
  if (serviceId === "validation") return "qa";
  if (serviceId === "code-snippet") return null;
  if (serviceId === "project-reports") return null;
  return null;
}

/**
 * SectionPanel visibility keys that ProjectJourneyShell must mount for each catalog page.
 * Used by coverage tests — keep in sync with shell SectionPanels.
 */
export const CONSOLE_PAGE_PANEL_KEYS = [
  "discovery",
  "backlog",
  "releases",
  "web-app:preview",
  "web-app:implement",
  "web-app:agent-config",
  "feedback",
  "backend:backend-code",
  "backend:implement",
  "backend:architecture",
  "backend:agent-config",
  "environment",
  "cloud-infra:deploy",
  "cloud-infra:infra-analysis",
  "cloud-infra:debugging",
  "qa-reports",
  "qa-reports:qa-chat",
  "qa-reports:export-test-cases",
  "qa-reports:qa-app-configuration",
  "code-snippet",
  "automations",
];

/** @param {{ section: string, area: string | null }} page */
export function panelKeyForPage(page) {
  if (page.area == null) return page.section;
  if (page.section === "discovery") return "discovery";
  if (page.section === "backlog") return "backlog";
  if (page.section === "releases") return "releases";
  return `${page.section}:${page.area}`;
}
