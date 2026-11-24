import { Cloud, Code2, Compass, FileArchive, Rocket, Settings, Sparkles } from "lucide-react";
import YorkLogo from "@/assets/fevicon.png";
import figmaAppIcon from "@/assets/apps/Figma.svg";
import githubAppIcon from "@/assets/apps/GitHub.svg";
import jiraAppIcon from "@/assets/apps/Jira.svg";

export const INIT_OPTIONS = [
  {
    id: "zip",
    label: "Upload ZIP",
    description: "Upload your Figma make ZIP bundle to start quickly.",
    icon: FileArchive,
  },
  {
    id: "scratch",
    label: "Starting from scratch",
    description: "Describe what you want, and we will generate your first version.",
    iconSrc: YorkLogo,
  },
  {
    id: "figma",
    label: "Figma Integration",
    description: "Use the Figma plugin to convert from Figma to code.",
    iconSrc: figmaAppIcon,
  },
  {
    id: "migrate",
    label: "Migrate Existing Project",
    description: "Connect an existing frontend repo and branch.",
    iconSrc: githubAppIcon,
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Create issues from any site with the embed code snippet",
    iconSrc: jiraAppIcon,
  },
  {
    id: "blank",
    label: "Initiate product discovery",
    description:
      "Not sure what to build yet? Define the problem, users and scope first, then move into building.",
    icon: Compass,
  },
];

export const ONBOARDING_STEPS = [
  { id: 1, title: "Name your project", icon: Code2 },
  { id: 2, title: "Starting point", icon: Sparkles },
  { id: 3, title: "Backend & Cloud", icon: Cloud },
  { id: 4, title: "Configure setup", icon: Settings },
  { id: 5, title: "Initializing", icon: Rocket },
];

/** Backend & Cloud (step 3) only applies to existing code; blank ends after picking a start. */
export function visibleOnboardingSteps(method) {
  if (method === "blank") return ONBOARDING_STEPS.filter((s) => s.id <= 2);
  if (method === "migrate") return ONBOARDING_STEPS;
  return ONBOARDING_STEPS.filter((s) => s.id !== 3);
}

/** Starter prompts on "Describe your idea"; `templateFolder` is a design-library template folder. */
export const IDEA_STARTER_CHIPS = [
  {
    id: "dashboard",
    label: "Dashboard",
    templateFolder: "od-live-dashboard",
    prompt:
      "A dashboard where managers track weekly team updates, with a KPI summary, a filterable table of updates, and a chart of progress over time.",
  },
  {
    id: "landing",
    label: "Landing page",
    templateFolder: "od-saas-landing",
    prompt:
      "A landing page for a SaaS product with a hero section, feature highlights, customer testimonials, pricing tiers, and a sign-up call to action.",
  },
  {
    id: "admin",
    label: "Admin panel",
    templateFolder: "od-dashboard",
    prompt:
      "An admin panel to manage users, roles, and settings, with a sidebar, searchable user list, user detail page, and audit log.",
  },
  {
    id: "booking",
    label: "Booking app",
    templateFolder: "od-web-prototype",
    prompt:
      "A booking app where customers pick a service, choose an available time slot on a calendar, and confirm their appointment, plus a page to manage bookings.",
  },
];

export const METHOD_IDS = INIT_OPTIONS.map((item) => item.id);

export const CONFIGURE_PHASE_DESCRIPTION = {
  zip: "Upload the ZIP exported from Figma Make.",
  scratch: "Describe what you want, and we will generate your first version.",
  figma: "Connect Figma for API access, install the plugin, then send your design to LaunchPad.",
  migrate: "Add your repo URL and choose the branch to import.",
  feedback: "Connect Jira for tickets, then copy the embed snippet from your project settings.",
  blank: "No setup required — create the project and start with product discovery.",
};

export const FONT_STYLE_OPTIONS = [
  "Modern Sans-serif",
  "Humanist Sans-serif",
  "Geometric Sans-serif",
  "Classic Serif",
  "Elegant Serif",
  "Tech Monospace",
];

export const FONT_STYLE_GOOGLE_FAMILY = {
  "Modern Sans-serif": { family: "Inter", fallback: "sans-serif" },
  "Humanist Sans-serif": { family: "Open Sans", fallback: "sans-serif" },
  "Geometric Sans-serif": { family: "Poppins", fallback: "sans-serif" },
  "Classic Serif": { family: "Merriweather", fallback: "serif" },
  "Elegant Serif": { family: "Cormorant Garamond", fallback: "serif" },
  "Tech Monospace": { family: "Roboto Mono", fallback: "monospace" },
};

export const BRAND_TONE_OPTIONS = [
  "Professional",
  "Playful",
  "Bold",
  "Minimal",
  "Luxurious",
  "Friendly",
];

export const INDUSTRY_OPTIONS = [
  "SaaS / Tech",
  "E-commerce",
  "Finance",
  "Healthcare",
  "Education",
  "Hospitality",
  "Real Estate",
  "Media & Entertainment",
  "Other",
];

export const ONBOARDING_DRAFT_KEY = "onboarding-draft";
export const ONBOARDING_DRAFT_VERSION = 4;

import {
  AGENT_UI_POLL_MAX_MS,
  shouldContinueAgentUiPoll,
} from "../../../../constants/agentPollTimeouts.js";

/** Align with backend `CURSOR_AGENT_POLL_MAX_RUNTIME_MS` (UI stops slightly earlier). `0` = uncapped. */
export const SCRATCH_AGENT_POLL_TIMEOUT_MS = AGENT_UI_POLL_MAX_MS;
export { shouldContinueAgentUiPoll };
export const SCRATCH_AGENT_POLL_INTERVAL_MS = 3000;
export const MAX_BRAND_COLORS = 6;
export const EMPTY_SCRATCH_ENHANCEMENT_STATE = {
  status: "idle",
  originalPrompt: "",
  enhancedPrompt: "",
};

/**
 * Job repeat schedule (`Job.scheduleType`; must match backend API).
 * @type {{ readonly DAILY: "DAILY", readonly WEEKLY: "WEEKLY", readonly CUSTOM: "CUSTOM", readonly ONETIME: "ONETIME" }}
 */
export const JobScheduleType = Object.freeze({
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  CUSTOM: "CUSTOM",
  ONETIME: "ONETIME",
});

export {
  FIGMA_PLUGIN_DOWNLOAD_URL,
  FIGMA_PLUGIN_GUIDE_URL,
} from "@/components/integrations/figmaPat.constants";
