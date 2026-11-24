import { PERSONA_TABS } from "../../ProductManagement/constants.js";
import { AGENT_ANALYTICS_SECTION } from "../constants/projectAgentAnalyticsSection.js";
import {
  ADMIN_CONSOLE_LINKS,
  CONSOLE_SERVICES,
  DEFAULT_PAGE_BY_SERVICE,
  navForServicePage,
  PLATFORM_CONSOLE_LINKS,
} from "../constants/projectServices.js";
import {
  SETTINGS_TABS,
  buildProjectSettingsPath,
} from "../../ProjectSettings/constants.js";

export const QUICK_NAV_GROUPS = {
  PROJECTS: "Projects",
  SERVICES: "Services",
  PAGES: "Pages",
  OVERLAYS: "Overlays",
  SETTINGS: "Project settings",
  ACTIONS: "Project actions",
  ACCOUNT: "Account",
  ADMIN: "Admin",
};

export const QUICK_NAV_GROUP_ORDER = [
  QUICK_NAV_GROUPS.PROJECTS,
  QUICK_NAV_GROUPS.SERVICES,
  QUICK_NAV_GROUPS.PAGES,
  QUICK_NAV_GROUPS.OVERLAYS,
  QUICK_NAV_GROUPS.SETTINGS,
  QUICK_NAV_GROUPS.ACTIONS,
  QUICK_NAV_GROUPS.ACCOUNT,
  QUICK_NAV_GROUPS.ADMIN,
];

/**
 * @param {string | number} projectId
 * @param {{ section?: string | null, area?: string | null, profile?: string | null }} [opts]
 */
export function buildWorkspacePath(projectId, { section, area, profile } = {}) {
  const base = `/projects/details/${encodeURIComponent(String(projectId))}`;
  const qs = new URLSearchParams();
  if (section) qs.set("section", section);
  if (area) qs.set("area", area);
  if (profile) qs.set("profile", profile);
  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}

/** Global /chat with this project selected. */
export function buildProjectChatPath(projectId) {
  return `/chat?projectId=${encodeURIComponent(String(projectId))}`;
}

/**
 * Global /chat for the Help menu — all projects, no project binding.
 * Optional starter question is prefilled via `q` (consumed by AiHomePage).
 * @param {string} [question]
 */
export function buildAssistantHelpChatHref(question = "") {
  const q = String(question || "").trim();
  if (!q) return "/chat";
  const qs = new URLSearchParams();
  qs.set("q", q);
  return `/chat?${qs.toString()}`;
}

function navItem({
  id,
  group,
  label,
  parent = null,
  href = null,
  action = null,
  projectId = null,
  keywords = "",
}) {
  return { id, group, label, parent, href, action, projectId, keywords };
}

/**
 * @param {Array<{ id?: unknown, name?: unknown }>} projects
 */
export function buildConsoleQuickNavProjectItems(projects) {
  return (Array.isArray(projects) ? projects : []).map((project) => {
    const id = project?.id;
    const name = String(project?.name ?? "").trim() || String(id);
    return navItem({
      id: `project:${id}`,
      group: QUICK_NAV_GROUPS.PROJECTS,
      label: name,
      href: `/projects/details/${encodeURIComponent(String(id))}`,
      projectId: id,
      keywords: `${name} ${id}`,
    });
  });
}

/**
 * Static destinations for the current project (no project list).
 * @param {{ projectId?: string | number | null, isAdmin?: boolean, canAccessProjectSettings?: boolean }} [opts]
 */
export function buildConsoleQuickNavItems({
  projectId = null,
  isAdmin = false,
  canAccessProjectSettings = false,
} = {}) {
  if (projectId == null || projectId === "") return [];

  const items = [];

  for (const service of CONSOLE_SERVICES) {
    const pageId = DEFAULT_PAGE_BY_SERVICE[service.id];
    const { section, area } = navForServicePage(service.id, pageId);
    items.push(
      navItem({
        id: `service:${service.id}`,
        group: QUICK_NAV_GROUPS.SERVICES,
        label: service.label,
        href: buildWorkspacePath(projectId, { section, area }),
        keywords: `${service.label} ${service.id}`,
      }),
    );
  }

  for (const service of CONSOLE_SERVICES) {
    for (const page of service.pages) {
      items.push(
        navItem({
          id: `page:${service.id}:${page.id}`,
          group: QUICK_NAV_GROUPS.PAGES,
          label: page.label,
          parent: service.label,
          href: buildWorkspacePath(projectId, { section: page.section, area: page.area }),
          keywords: `${service.label} ${page.label} ${page.id}`,
        }),
      );
    }
  }

  for (const persona of PERSONA_TABS) {
    items.push(
      navItem({
        id: `persona:${persona.id}`,
        group: QUICK_NAV_GROUPS.PAGES,
        label: persona.label,
        parent: "Product Strategy / Profiles",
        href: buildWorkspacePath(projectId, {
          section: "discovery",
          area: "profiles",
          profile: persona.id,
        }),
        keywords: `profiles persona ${persona.label} ${persona.id}`,
      }),
    );
  }

  items.push(
    navItem({
      id: "overlay:collaboration",
      group: QUICK_NAV_GROUPS.OVERLAYS,
      label: "Team Activity",
      href: buildWorkspacePath(projectId, { section: "collaboration" }),
      keywords: "collaboration team activity",
    }),
  );

  if (isAdmin) {
    items.push(
      navItem({
        id: "overlay:agent-analytics",
        group: QUICK_NAV_GROUPS.OVERLAYS,
        label: AGENT_ANALYTICS_SECTION.label,
        href: buildWorkspacePath(projectId, { section: AGENT_ANALYTICS_SECTION.id }),
        keywords: `agent analytics ${AGENT_ANALYTICS_SECTION.label}`,
      }),
    );
  }

  if (canAccessProjectSettings) {
    for (const tab of SETTINGS_TABS) {
      items.push(
        navItem({
          id: `settings:${tab.id}`,
          group: QUICK_NAV_GROUPS.SETTINGS,
          label: tab.label,
          parent: "Project settings",
          href: buildProjectSettingsPath(projectId, tab.id),
          keywords: `settings ${tab.label} ${tab.id}`,
        }),
      );
    }
  }

  items.push(
    ...(canAccessProjectSettings
      ? [
          navItem({
            id: "action:project-settings",
            group: QUICK_NAV_GROUPS.ACTIONS,
            label: "Project settings",
            href: buildProjectSettingsPath(projectId),
            action: "project-settings",
            keywords: "edit project settings",
          }),
        ]
      : []),
    navItem({
      id: "action:project-chat",
      group: QUICK_NAV_GROUPS.ACTIONS,
      label: "Project chat",
      action: "project-chat",
      href: buildProjectChatPath(projectId),
      keywords: "assistant discovery chat",
    }),
    navItem({
      id: "action:tour",
      group: QUICK_NAV_GROUPS.ACTIONS,
      label: "Tour",
      action: "tour",
      href: buildWorkspacePath(projectId),
      keywords: "tour journey replay guide walkthrough",
    }),
    navItem({
      id: "action:review-portal",
      group: QUICK_NAV_GROUPS.ACTIONS,
      label: "Review portal",
      action: "review-portal",
      keywords: "client review portal",
    }),
    navItem({
      id: "action:preview-only",
      group: QUICK_NAV_GROUPS.ACTIONS,
      label: "Preview only",
      action: "preview-only",
      keywords: "preview only",
    }),
  );

  for (const link of PLATFORM_CONSOLE_LINKS) {
    items.push(
      navItem({
        id: `account:${link.href}`,
        group: QUICK_NAV_GROUPS.ACCOUNT,
        label: link.label,
        href: link.href,
        keywords: `account ${link.label}`,
      }),
    );
  }

  if (isAdmin) {
    for (const link of ADMIN_CONSOLE_LINKS) {
      const href = link.workspaceSection
        ? buildWorkspacePath(projectId, { section: link.workspaceSection })
        : link.href;
      items.push(
        navItem({
          id: `admin:${link.href}`,
          group: QUICK_NAV_GROUPS.ADMIN,
          label: link.label,
          href,
          keywords: `admin ${link.label}`,
        }),
      );
    }
  }

  return items;
}

/**
 * @param {Array<{ label?: string, group?: string, parent?: string | null, keywords?: string }>} items
 * @param {string} query
 */
export function filterConsoleQuickNavItems(items, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const hay = [item.label, item.group, item.parent, item.keywords]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/**
 * @param {Array<{ group: string }>} items
 * @returns {Array<{ group: string, items: typeof items }>}
 */
export function groupConsoleQuickNavItems(items) {
  const byGroup = new Map();
  for (const item of items) {
    const list = byGroup.get(item.group);
    if (list) list.push(item);
    else byGroup.set(item.group, [item]);
  }
  return QUICK_NAV_GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
    group,
    items: byGroup.get(group),
  }));
}
