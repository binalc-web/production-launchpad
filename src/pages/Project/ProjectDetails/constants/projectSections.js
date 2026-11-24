import {
  Activity,
  ClipboardCheck,
  Cloud,
  Code2,
  Compass,
  Globe,
  KanbanSquare,
  MessageSquareQuote,
  Package,
  Server,
  Settings2,
} from "lucide-react";
import { QA_ANALYTICS_SECTION } from "./projectQaAnalyticsSection.js";
import { PROJECT_AUTOMATIONS_SECTION } from "./projectAutomationsSection.js";
import { ALL_PROJECT_REPORTS_SECTION } from "./projectAllReportsSection.js";

export const PROJECT_SECTIONS = [
  { id: "discovery", label: "Product Strategy", icon: Compass, group: "product" },
  { id: "backlog", label: "Backlog", icon: KanbanSquare, group: "product" },
  { id: "releases", label: "Releases", icon: Package, group: "product" },
  { id: "web-app", label: "Preview", icon: Globe, group: "product" },
  { id: "backend", label: "App repositories", icon: Server, group: "platform" },
  { id: "cloud-infra", label: "Infrastructure", icon: Cloud, group: "platform" },
  {
    id: "feedback",
    label: "Feedback",
    icon: MessageSquareQuote,
    group: "quality",
  },
  {
    id: "qa-reports",
    label: "QA",
    icon: ClipboardCheck,
    group: "quality",
  },
  {
    id: "code-snippet",
    label: "Code Snippet",
    icon: Code2,
    group: "quality",
  },
  {
    id: QA_ANALYTICS_SECTION.id,
    label: QA_ANALYTICS_SECTION.label,
    icon: QA_ANALYTICS_SECTION.icon,
    group: "quality",
  },
  {
    id: "environment",
    label: "Environment",
    icon: Settings2,
    group: "platform",
  },
  {
    id: "collaboration",
    label: "Team Activity",
    icon: Activity,
    group: "quality",
  },
];

export const DEFAULT_SECTION = "discovery";

const LEGACY_SECTION_MAP = {
  "product-experience": "discovery",
  "project-management": "discovery",
  "product-management": "releases",
  "prompt-skills": "web-app",
};

/** @param {string | null | undefined} raw */
export function isLegacyPromptSkillsSection(raw) {
  return raw === "prompt-skills";
}

export function normalizeSection(raw, opts = {}) {
  if (!raw) return DEFAULT_SECTION;
  if (raw === PROJECT_AUTOMATIONS_SECTION.id) {
    return PROJECT_AUTOMATIONS_SECTION.id;
  }
  if (raw === ALL_PROJECT_REPORTS_SECTION.id) {
    return opts.isAdmin ? ALL_PROJECT_REPORTS_SECTION.id : DEFAULT_SECTION;
  }
  if (raw === "agent-analytics") {
    return opts.isAdmin ? "agent-analytics" : DEFAULT_SECTION;
  }
  if (LEGACY_SECTION_MAP[raw]) return LEGACY_SECTION_MAP[raw];
  if (PROJECT_SECTIONS.some((s) => s.id === raw)) return raw;
  return DEFAULT_SECTION;
}
