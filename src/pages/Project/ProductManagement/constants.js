import {
  BookOpen,
  ClipboardList,
  CloudUpload,
  Globe,
  MessageSquare,
  Mic,
  Video,
} from "lucide-react";

export const GRANOLA_TIMELINE_SOURCE = "granola";
export const CONFLUENCE_TIMELINE_SOURCE = "confluence";
export const WEBSITE_ENRICH_TIMELINE_SOURCE = "website_enrich";

/** @param {{ meta?: { source?: string } }} entry */
export function isGranolaTimelineEntry(entry) {
  return entry?.meta?.source === GRANOLA_TIMELINE_SOURCE;
}

/** @param {{ meta?: { source?: string } }} entry */
export function isConfluenceTimelineEntry(entry) {
  return entry?.meta?.source === CONFLUENCE_TIMELINE_SOURCE;
}

/** @param {{ type?: string, meta?: { source?: string } }} entry */
export function isWebsiteEnrichTimelineEntry(entry) {
  return entry?.type === "website_enrich" || entry?.meta?.source === WEBSITE_ENRICH_TIMELINE_SOURCE;
}

export const ENGAGEMENT_PHASES = [
  { id: "prospect_known", label: "Prospect known" },
  { id: "first_call", label: "First call" },
  { id: "discovery_calls", label: "Discovery calls" },
  { id: "signed", label: "Signed" },
  { id: "pre_kickoff", label: "Pre-kickoff" },
  { id: "kickoff", label: "Kickoff" },
  { id: "post_kickoff", label: "Post-kickoff" },
];

export const DISCOVERY_AREAS = [
  { id: "capture", label: "Capture" },
  { id: "profiles", label: "Profiles" },
  { id: "documents", label: "Documents" },
  { id: "brief", label: "Brief" },
];

/** @deprecated Use DISCOVERY_AREAS */
export const PRIMARY_TABS = DISCOVERY_AREAS;

export const PERSONA_TABS = [
  { id: "client", label: "Client" },
  { id: "company", label: "Company" },
  { id: "competitors", label: "Competitors" },
  { id: "product", label: "SaaS Product" },
];

export const TIMELINE_PAGE_SIZE = 10;

export const TIMELINE_FILTERS = [
  { id: "all", label: "All" },
  { id: "text_note", label: "Notes" },
  { id: "file_upload", label: "Files" },
  { id: "website", label: "Websites" },
  { id: "hub_meeting", label: "Hub" },
  { id: "granola", label: "Granola" },
  { id: "confluence", label: "Confluence" },
  { id: "questionnaires", label: "Questionnaires" },
];

export const QUESTIONNAIRE_TIMELINE_TYPES = [
  "questionnaire_created",
  "questionnaire_generated",
  "questionnaire_response",
  "questionnaire_published",
  "questionnaire_captured",
];

const LEGACY_AREA_MAP = {
  timeline: "capture",
  personas: "profiles",
  config: "capture",
  questionnaire: "capture",
};

const LEGACY_FILTER_AREAS = new Set(["questionnaire", "config"]);

export function normalizeDiscoveryArea(raw) {
  if (!raw) return "capture";
  if (LEGACY_AREA_MAP[raw]) return LEGACY_AREA_MAP[raw];
  if (DISCOVERY_AREAS.some((a) => a.id === raw)) return raw;
  return "capture";
}

export function isLegacyQuestionnaireArea(raw) {
  return LEGACY_FILTER_AREAS.has(raw);
}

export function normalizeTimelineFilter(raw, areaRaw) {
  if (raw && TIMELINE_FILTERS.some((f) => f.id === raw)) return raw;
  if (isLegacyQuestionnaireArea(areaRaw)) return "questionnaires";
  return "all";
}

export const RELEASE_AREAS = [
  { id: "overview", label: "Overview" },
  { id: "roadmap", label: "Roadmap" },
  { id: "active", label: "Active release" },
];

export const BACKLOG_AREAS = [
  { id: "board", label: "Board" },
  { id: "suggestions", label: "Suggestions" },
];

export function normalizeBacklogArea(raw, { jiraReady = false } = {}) {
  if (jiraReady) return "suggestions";
  if (!raw) return "board";
  if (BACKLOG_AREAS.some((a) => a.id === raw)) return raw;
  return "board";
}

export function normalizeReleaseArea(raw) {
  if (!raw) return "overview";
  if (RELEASE_AREAS.some((a) => a.id === raw)) return raw;
  return "overview";
}

export const CLOUD_INFRA_AREAS = [
  { id: "deploy", label: "Deploy" },
  { id: "infra-analysis", label: "Infra Analysis" },
  { id: "debugging", label: "Debugging" },
];

/** @param {string | null | undefined} raw */
export function normalizeCloudInfraArea(raw) {
  if (!raw) return "deploy";
  if (CLOUD_INFRA_AREAS.some((a) => a.id === raw)) return raw;
  return "deploy";
}

export const WEB_APP_AREAS = [
  { id: "preview", label: "App" },
  { id: "implement", label: "Implement" },
  { id: "agent-config", label: "Agent config" },
];

/** @param {string | null | undefined} raw */
export function normalizeWebAppArea(raw) {
  if (!raw) return "preview";
  if (WEB_APP_AREAS.some((a) => a.id === raw)) return raw;
  return "preview";
}

export const BACKEND_AREAS = [
  { id: "backend-code", label: "Chat" },
  { id: "implement", label: "Implement" },
  { id: "architecture", label: "Architecture" },
  { id: "agent-config", label: "Agent config" },
];

/** @param {string | null | undefined} raw */
export function normalizeBackendArea(raw) {
  if (!raw) return "backend-code";
  if (BACKEND_AREAS.some((a) => a.id === raw)) return raw;
  return "backend-code";
}

export const TIMELINE_EMPTY_STATES = {
  all: {
    icon: MessageSquare,
    title: "No timeline entries yet",
    description:
      "Capture discovery from notes, files, websites, Hub meetings, Granola, or Confluence. Questionnaire responses appear here too.",
    actionKey: "note",
    actionLabel: "Write note",
  },
  text_note: {
    icon: MessageSquare,
    title: "No notes yet",
    description: "Write call notes or meeting summaries from discovery conversations.",
    actionKey: "note",
    actionLabel: "Write note",
  },
  file_upload: {
    icon: CloudUpload,
    title: "No uploaded files yet",
    description: "Upload a .txt, .md, or .pdf file to extract insights.",
    actionKey: "upload",
    actionLabel: "Upload file",
  },
  website: {
    icon: Globe,
    title: "No website enrichments yet",
    description: "Enrich a company or client website to fill profiles and add a timeline entry.",
    actionKey: "website",
    actionLabel: "Enrich website",
  },
  hub_meeting: {
    icon: Video,
    title: "No Hub meetings yet",
    description: "Link a Hub recording or transcript to add it to the timeline.",
    actionKey: "hub",
    actionLabel: "Link Hub meeting",
  },
  granola: {
    icon: Mic,
    title: "No Granola meetings yet",
    description: "Import meeting notes from your connected Granola account.",
    actionKey: "granola",
    actionLabel: "Import Granola meeting",
  },
  confluence: {
    icon: BookOpen,
    title: "No Confluence imports yet",
    description: "Import a Confluence page and its child pages into Capture.",
    actionKey: "confluence",
    actionLabel: "Import Confluence page",
  },
  questionnaires: {
    icon: ClipboardList,
    title: "Questionnaires",
    description: "Create questionnaires, publish shareable links, and collect client answers.",
    actionKey: "questionnaire",
    actionLabel: "New questionnaire",
  },
};
