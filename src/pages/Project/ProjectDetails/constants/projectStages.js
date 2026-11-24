import {
  ClipboardCheck,
  Cloud,
  Compass,
  FileText,
  Globe,
  KanbanSquare,
  NotebookPen,
  Package,
  Server,
  Users,
} from "lucide-react";
import { normalizeSection } from "./projectSections";

/**
 * The project journey is a single ordered pipeline. Each stage maps onto the
 * underlying `(section, area)` URL contract that the existing content
 * components read/write, so stages are a presentation layer over that model.
 */

export const STAGE_PHASES = [
  { id: "discover", label: "Product Strategy" },
  { id: "plan", label: "Planning" },
  { id: "build", label: "Development" },
  { id: "validate", label: "QA" },
];

/**
 * Ordered journey stages. `section`/`area` describe the default underlying nav
 * target. `areas` (when present) lists selectable sub-areas; each carries its
 * own `section`/`area` so a stage can span multiple legacy sections (e.g.
 * QA = Failed Playwright runs + Feedbacks).
 */
export const PROJECT_STAGES = [
  {
    id: "capture",
    label: "Capture",
    phase: "discover",
    icon: Compass,
    section: "discovery",
    area: "capture",
  },
  {
    id: "profiles",
    label: "Profiles",
    phase: "discover",
    icon: Users,
    section: "discovery",
    area: "profiles",
    hasProfiles: true,
  },
  {
    id: "documents",
    label: "Documents",
    phase: "discover",
    icon: FileText,
    section: "discovery",
    area: "documents",
  },
  {
    id: "brief",
    label: "Brief",
    phase: "discover",
    icon: NotebookPen,
    section: "discovery",
    area: "brief",
  },
  {
    id: "backlog",
    label: "Backlog",
    phase: "plan",
    icon: KanbanSquare,
    section: "backlog",
    areas: [
      { id: "board", label: "Board", section: "backlog", area: "board" },
      {
        id: "suggestions",
        label: "Suggestions",
        section: "backlog",
        area: "suggestions",
      },
    ],
  },
  {
    id: "releases",
    label: "Releases",
    phase: "plan",
    icon: Package,
    section: "releases",
    areas: [
      { id: "overview", label: "Overview", section: "releases", area: "overview" },
      { id: "active", label: "Active release", section: "releases", area: "active" },
      { id: "roadmap", label: "Roadmap", section: "releases", area: "roadmap" },
    ],
  },
  {
    id: "frontend",
    label: "Preview",
    phase: "build",
    icon: Globe,
    section: "web-app",
    areas: [
      { id: "preview", label: "App", section: "web-app", area: "preview" },
      { id: "implement", label: "Implement", section: "web-app", area: "implement" },
      { id: "agent-config", label: "Agent config", section: "web-app", area: "agent-config" },
    ],
  },
  {
    id: "backend",
    label: "App repositories",
    phase: "build",
    icon: Server,
    section: "backend",
    areas: [
      { id: "backend-code", label: "Chat", section: "backend", area: "backend-code" },
      { id: "implement", label: "Implement", section: "backend", area: "implement" },
      { id: "architecture", label: "Architecture", section: "backend", area: "architecture" },
      { id: "agent-config", label: "Agent config", section: "backend", area: "agent-config" },
    ],
  },
  {
    id: "cloud",
    label: "Infrastructure",
    phase: "build",
    icon: Cloud,
    section: "environment",
    areas: [
      { id: "environment", label: "Environment", section: "environment", area: null },
      { id: "deploy", label: "Deploy", section: "cloud-infra", area: "deploy" },
      {
        id: "infra-analysis",
        label: "Infra analysis",
        section: "cloud-infra",
        area: "infra-analysis",
      },
      {
        id: "debugging",
        label: "Debugging",
        section: "cloud-infra",
        area: "debugging",
      },
    ],
  },
  {
    id: "qa",
    label: "QA",
    phase: "validate",
    icon: ClipboardCheck,
    section: "qa-reports",
    areas: [
      { id: "qa-reports", label: "Failed Playwright runs", section: "qa-reports", area: null },
      { id: "qa-chat", label: "QA Chat", section: "qa-reports", area: "qa-chat" },
      {
        id: "export-test-cases",
        label: "Export Test Cases",
        section: "qa-reports",
        area: "export-test-cases",
      },
      { id: "feedbacks", label: "Feedbacks", section: "feedback", area: null },
    ],
  },
];

export const DEFAULT_STAGE = "capture";

const STAGE_BY_ID = new Map(PROJECT_STAGES.map((stage) => [stage.id, stage]));

/** @param {string} stageId */
export function getStage(stageId) {
  return STAGE_BY_ID.get(stageId) ?? null;
}

/**
 * Map a legacy `(section, area)` pair to the active journey stage. This is the
 * back-compat bridge for existing deep links and child navigation writes.
 * @param {string | null | undefined} rawSection
 * @param {string | null | undefined} rawArea
 */
export function normalizeStage(rawSection, rawArea) {
  const section = normalizeSection(rawSection);
  const area = rawArea || "";

  switch (section) {
    case "discovery": {
      const discoveryStages = ["capture", "profiles", "documents", "brief"];
      return discoveryStages.includes(area) ? area : DEFAULT_STAGE;
    }
    case "backlog":
      return "backlog";
    case "releases":
      return "releases";
    case "web-app":
      return "frontend";
    case "feedback":
    case "qa-reports":
      return "qa";
    case "backend":
      return "backend";
    case "cloud-infra":
    case "environment":
      return "cloud";
    default:
      return DEFAULT_STAGE;
  }
}

/**
 * Resolve which sub-area of a stage is active given the legacy params.
 * @param {string} stageId
 * @param {string | null | undefined} rawSection
 * @param {string | null | undefined} rawArea
 */
export function activeAreaForStage(stageId, rawSection, rawArea) {
  const stage = getStage(stageId);
  if (!stage?.areas) return null;
  const section = normalizeSection(rawSection);
  const area = rawArea || "";

  if (stageId === "frontend") {
    if (section === "web-app" && area === "implement") return "implement";
    if (section === "web-app" && area === "agent-config") return "agent-config";
    return "preview";
  }
  if (stageId === "qa") {
    if (section === "feedback") return "feedbacks";
    if (section === "qa-reports" && area === "export-test-cases") return "export-test-cases";
    if (section === "qa-reports" && area === "qa-chat") return "qa-chat";
    return "qa-reports";
  }
  if (stageId === "cloud") {
    if (section === "environment") return "environment";
    if (section === "cloud-infra") {
      const match = stage.areas.find((a) => a.area === area);
      return match?.id ?? "deploy";
    }
    return stage.areas[0].id;
  }
  // backend / releases / backlog share the legacy area id directly.
  const match = stage.areas.find((a) => a.area === area);
  return match?.id ?? stage.areas[0].id;
}

/**
 * Resolve the underlying `(section, area)` target for a stage (and optional
 * sub-area), applying sensible defaults.
 * @param {string} stageId
 * @param {{ area?: string, jiraReady?: boolean }} [opts]
 */
export function navForStage(stageId, opts = {}) {
  const stage = getStage(stageId) ?? getStage(DEFAULT_STAGE);

  if (!stage.areas) {
    return { section: stage.section, area: stage.area ?? null };
  }

  let target = null;
  if (opts.area) {
    target = stage.areas.find((a) => a.id === opts.area) ?? null;
  }
  if (!target) {
    if (stage.id === "backlog") {
      target =
        stage.areas.find((a) => a.id === (opts.jiraReady ? "suggestions" : "board")) ??
        stage.areas[0];
    } else if (stage.id === "cloud" && opts.hasDeployEnvironments) {
      target = stage.areas.find((a) => a.id === "deploy") ?? stage.areas[0];
    } else {
      target = stage.areas[0];
    }
  }
  return { section: target.section, area: target.area ?? null };
}
