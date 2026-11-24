import { AGENT_ANALYTICS_SECTION } from "../pages/Project/ProjectDetails/constants/projectAgentAnalyticsSection.js";
import { PROJECT_AUTOMATIONS_SECTION } from "../pages/Project/ProjectDetails/constants/projectAutomationsSection.js";
import { ALL_PROJECT_REPORTS_SECTION } from "../pages/Project/ProjectDetails/constants/projectAllReportsSection.js";
import { normalizeSection } from "../pages/Project/ProjectDetails/constants/projectSections.js";
import {
  BACKEND_AREAS,
  BACKLOG_AREAS,
  CLOUD_INFRA_AREAS,
  DISCOVERY_AREAS,
  PERSONA_TABS,
  RELEASE_AREAS,
  WEB_APP_AREAS,
  normalizeTimelineFilter,
} from "../pages/Project/ProductManagement/constants.js";

const OVERLAY_SECTIONS = new Set([
  AGENT_ANALYTICS_SECTION.id,
  PROJECT_AUTOMATIONS_SECTION.id,
  ALL_PROJECT_REPORTS_SECTION.id,
  "collaboration",
]);

const STAGE_AREA_IDS = {
  backlog: new Set(BACKLOG_AREAS.map((item) => item.id)),
  releases: new Set(RELEASE_AREAS.map((item) => item.id)),
  frontend: new Set(["preview", "implement", "agent-config"]),
  backend: new Set(BACKEND_AREAS.map((item) => item.id)),
  cloud: new Set(["environment", ...CLOUD_INFRA_AREAS.map((item) => item.id)]),
  qa: new Set(["qa-reports", "qa-chat", "export-test-cases", "feedbacks"]),
};

/** @param {string} section */
function stageIdForSection(section) {
  switch (section) {
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
      return null;
  }
}

/**
 * Map a validated (section, area) to a journey stage sub-area, if the stage has sub-nav.
 * @param {string} section
 * @param {string | null} area
 * @returns {{ stageId: string, areaId: string } | null}
 */
function stageAreaFromLocation(section, area) {
  const stageId = stageIdForSection(section);
  if (!stageId) return null;
  const allowed = STAGE_AREA_IDS[stageId];
  if (stageId === "frontend") {
    if (allowed.has(area)) return { stageId, areaId: area };
    return null;
  }
  if (stageId === "qa") {
    if (section === "feedback") return { stageId, areaId: "feedbacks" };
    if (section === "qa-reports" && area === "export-test-cases") {
      return { stageId, areaId: "export-test-cases" };
    }
    if (section === "qa-reports" && area === "qa-chat") return { stageId, areaId: "qa-chat" };
    if (section === "qa-reports") return { stageId, areaId: "qa-reports" };
    return null;
  }
  if (stageId === "cloud") {
    if (section === "environment") return { stageId, areaId: "environment" };
    if (allowed.has(area)) return { stageId, areaId: area };
    return null;
  }
  if (allowed.has(area)) return { stageId, areaId: area };
  return null;
}

/** localStorage key prefix for per-project last journey location. */
export const PROJECT_JOURNEY_RESUME_KEY_PREFIX = "launchpad:project-journey:last:";

/** @param {string | number} projectId */
export function projectJourneyResumeStorageKey(projectId) {
  return `${PROJECT_JOURNEY_RESUME_KEY_PREFIX}${String(projectId).trim()}`;
}

/** @param {string | null | undefined} section */
export function isOverlayJourneySection(section) {
  return OVERLAY_SECTIONS.has(String(section ?? "").trim());
}

/**
 * Keep only known stage ids with a valid sub-area for that stage.
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
export function normalizeAreasByStage(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next = {};
  for (const [stageId, areaId] of Object.entries(raw)) {
    const id = String(areaId ?? "").trim();
    if (!STAGE_AREA_IDS[stageId]?.has(id)) continue;
    next[stageId] = id;
  }
  return next;
}

/**
 * @param {Record<string, string> | null | undefined} areasByStage
 * @param {string} stageId
 * @returns {string | undefined}
 */
export function rememberedAreaForStage(areasByStage, stageId) {
  const id = areasByStage?.[stageId];
  return typeof id === "string" && id ? id : undefined;
}

/**
 * @param {{
 *   section?: string | null,
 *   area?: string | null,
 *   filter?: string | null,
 *   profile?: string | null,
 *   scopeReleaseId?: string | number | null,
 * }} location
 * @returns {string}
 */
export function buildProjectJourneyQuery({ section, area, filter, profile, scopeReleaseId }) {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  if (area) params.set("area", area);
  if (filter) params.set("filter", filter);
  if (profile) params.set("profile", profile);
  if (scopeReleaseId != null && String(scopeReleaseId).trim()) {
    params.set("scopeReleaseId", String(scopeReleaseId).trim());
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * @param {string | null | undefined} raw
 * @returns {{
 *   section: string,
 *   area: string | null,
 *   filter: string | null,
 *   profile: string | null,
 *   scopeReleaseId: string | null,
 *   areasByStage: Record<string, string>,
 *   lastProfile: string | null,
 * } | null}
 */
export function parseProjectJourneyResume(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const section = String(parsed?.section ?? "").trim();
    if (!section) return null;
    const areaRaw = parsed?.area;
    const area = areaRaw == null || areaRaw === "" ? null : String(areaRaw).trim() || null;
    const filterRaw = parsed?.filter;
    const filter = filterRaw == null || filterRaw === "" ? null : String(filterRaw).trim() || null;
    const profileRaw = parsed?.profile;
    const profile =
      profileRaw == null || profileRaw === "" ? null : String(profileRaw).trim() || null;
    const scopeRaw = parsed?.scopeReleaseId;
    const scopeReleaseId =
      scopeRaw == null || scopeRaw === "" ? null : String(scopeRaw).trim() || null;
    const lastProfileRaw = parsed?.lastProfile;
    const lastProfile =
      lastProfileRaw == null || lastProfileRaw === ""
        ? null
        : String(lastProfileRaw).trim() || null;
    return {
      section,
      area,
      filter,
      profile,
      scopeReleaseId,
      areasByStage: normalizeAreasByStage(parsed?.areasByStage),
      lastProfile,
    };
  } catch {
    return null;
  }
}

/** @param {string | null | undefined} raw */
function normalizeProfile(raw) {
  const id = String(raw ?? "").trim();
  if (PERSONA_TABS.some((tab) => tab.id === id)) return id;
  return "company";
}

/** @param {string | null | undefined} raw */
function normalizeStoredLastProfile(raw) {
  const id = String(raw ?? "").trim();
  if (!id) return null;
  if (PERSONA_TABS.some((tab) => tab.id === id)) return id;
  return null;
}

/**
 * @param {object} base
 * @param {{ areasByStage?: unknown, lastProfile?: string | null }} [location]
 */
function withJourneyMemory(base, location) {
  return {
    ...base,
    areasByStage: normalizeAreasByStage(location?.areasByStage),
    lastProfile: normalizeStoredLastProfile(location?.lastProfile),
  };
}

/** @param {string | null | undefined} scopeReleaseId */
function normalizeScopeReleaseId(scopeReleaseId) {
  const raw = String(scopeReleaseId ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return String(Math.trunc(num));
}

/**
 * Validate a stored or requested journey location against known section/area contracts.
 * @param {{
 *   section?: string | null,
 *   area?: string | null,
 *   filter?: string | null,
 *   profile?: string | null,
 *   scopeReleaseId?: string | number | null,
 *   areasByStage?: Record<string, string> | null,
 *   lastProfile?: string | null,
 * }} location
 * @param {{ isAdmin?: boolean }} [opts]
 * @returns {{
 *   section: string,
 *   area: string | null,
 *   filter: string | null,
 *   profile: string | null,
 *   scopeReleaseId: string | null,
 *   areasByStage: Record<string, string>,
 *   lastProfile: string | null,
 * } | null}
 */
export function validateProjectJourneyLocation(location, opts = {}) {
  const rawSection = String(location?.section ?? "").trim();
  if (!rawSection) return null;
  if (rawSection === AGENT_ANALYTICS_SECTION.id && !opts.isAdmin) return null;
  if (rawSection === ALL_PROJECT_REPORTS_SECTION.id && !opts.isAdmin) return null;

  const section = normalizeSection(rawSection, { isAdmin: opts.isAdmin });
  if (section === AGENT_ANALYTICS_SECTION.id && !opts.isAdmin) return null;
  if (section === ALL_PROJECT_REPORTS_SECTION.id && !opts.isAdmin) return null;

  const area = location?.area == null || location.area === "" ? null : String(location.area).trim();

  const filter = (() => {
    const rawFilter = location?.filter;
    if (section !== "discovery" || area !== "capture") return null;
    return normalizeTimelineFilter(rawFilter, area);
  })();

  const profile = (() => {
    if (section !== "discovery" || area !== "profiles") return null;
    return normalizeProfile(location?.profile);
  })();

  const scopeReleaseId = (() => {
    if (section !== "releases" || area !== "active") return null;
    return normalizeScopeReleaseId(location?.scopeReleaseId);
  })();

  switch (section) {
    case "discovery": {
      const valid = DISCOVERY_AREAS.some((item) => item.id === area);
      const resolvedArea = valid ? area : "capture";
      return withJourneyMemory(
        {
          section,
          area: resolvedArea,
          filter: resolvedArea === "capture" ? filter : null,
          profile: resolvedArea === "profiles" ? profile : null,
          scopeReleaseId: null,
        },
        location,
      );
    }
    case "backlog": {
      const valid = BACKLOG_AREAS.some((item) => item.id === area);
      return withJourneyMemory(
        {
          section,
          area: valid ? area : "board",
          filter: null,
          profile: null,
          scopeReleaseId: null,
        },
        location,
      );
    }
    case "releases": {
      const valid = RELEASE_AREAS.some((item) => item.id === area);
      const resolvedArea = valid ? area : "overview";
      return withJourneyMemory(
        {
          section,
          area: resolvedArea,
          filter: null,
          profile: null,
          scopeReleaseId: resolvedArea === "active" ? scopeReleaseId : null,
        },
        location,
      );
    }
    case "web-app": {
      const valid = WEB_APP_AREAS.some((item) => item.id === area);
      return withJourneyMemory(
        {
          section,
          area: valid ? area : "preview",
          filter: null,
          profile: null,
          scopeReleaseId: null,
        },
        location,
      );
    }
    case "backend": {
      const valid = BACKEND_AREAS.some((item) => item.id === area);
      return withJourneyMemory(
        {
          section,
          area: valid ? area : "backend-code",
          filter: null,
          profile: null,
          scopeReleaseId: null,
        },
        location,
      );
    }
    case "cloud-infra": {
      const valid = CLOUD_INFRA_AREAS.some((item) => item.id === area);
      return withJourneyMemory(
        {
          section,
          area: valid ? area : "deploy",
          filter: null,
          profile: null,
          scopeReleaseId: null,
        },
        location,
      );
    }
    case "environment":
    case "feedback":
    case "collaboration":
    case AGENT_ANALYTICS_SECTION.id:
    case PROJECT_AUTOMATIONS_SECTION.id:
    case ALL_PROJECT_REPORTS_SECTION.id:
      return withJourneyMemory(
        { section, area: null, filter: null, profile: null, scopeReleaseId: null },
        location,
      );
    case "qa-reports": {
      const valid = area === "export-test-cases" || area === "qa-chat";
      return withJourneyMemory(
        {
          section,
          area: valid ? area : null,
          filter: null,
          profile: null,
          scopeReleaseId: null,
        },
        location,
      );
    }
    default:
      return null;
  }
}

/**
 * Build a resume payload from current URL search params.
 * @param {URLSearchParams} searchParams
 */
export function projectJourneyLocationFromSearchParams(searchParams) {
  if (!searchParams) return null;
  return {
    section: searchParams.get("section"),
    area: searchParams.get("area"),
    filter: searchParams.get("filter"),
    profile: searchParams.get("profile"),
    scopeReleaseId: searchParams.get("scopeReleaseId"),
  };
}

/**
 * Apply a validated resume location to URL search params.
 * @param {URLSearchParams} params
 * @param {ReturnType<typeof validateProjectJourneyLocation>} resume
 */
export function applyProjectJourneyResumeToSearchParams(params, resume) {
  if (!resume) return;
  params.set("section", resume.section);
  if (resume.area) params.set("area", resume.area);
  else params.delete("area");
  if (resume.filter) params.set("filter", resume.filter);
  else params.delete("filter");
  if (resume.profile) params.set("profile", resume.profile);
  else params.delete("profile");
  if (resume.scopeReleaseId) params.set("scopeReleaseId", resume.scopeReleaseId);
  else params.delete("scopeReleaseId");
}

/**
 * @param {string | number} projectId
 * @param {{ isAdmin?: boolean }} [opts]
 * @returns {{ section: string, area: string | null } | null}
 */
export function readProjectJourneyResume(projectId, opts = {}) {
  if (projectId == null || projectId === "") return null;
  if (typeof window === "undefined" || !window.localStorage) return null;

  const raw = window.localStorage.getItem(projectJourneyResumeStorageKey(projectId));
  const parsed = parseProjectJourneyResume(raw);
  if (!parsed) return null;
  return validateProjectJourneyLocation(parsed, opts);
}

/**
 * @param {string | number} projectId
 * @param {{
 *   section?: string | null,
 *   area?: string | null,
 *   filter?: string | null,
 *   profile?: string | null,
 *   scopeReleaseId?: string | number | null,
 *   areasByStage?: Record<string, string> | null,
 *   lastProfile?: string | null,
 * }} location
 * @param {{ isAdmin?: boolean }} [opts]
 */
export function writeProjectJourneyResume(projectId, location, opts = {}) {
  if (projectId == null || projectId === "") return;
  if (typeof window === "undefined" || !window.localStorage) return;

  const validated = validateProjectJourneyLocation(location, opts);
  if (!validated) return;

  const key = projectJourneyResumeStorageKey(projectId);
  const existing = parseProjectJourneyResume(window.localStorage.getItem(key));
  const existingAreas = existing?.areasByStage ?? {};
  const incomingAreas = validated.areasByStage;
  let areasByStage = { ...existingAreas, ...incomingAreas };

  if (!isOverlayJourneySection(validated.section)) {
    const mapped = stageAreaFromLocation(validated.section, validated.area);
    if (mapped) areasByStage[mapped.stageId] = mapped.areaId;
  }

  let lastProfile = validated.lastProfile ?? existing?.lastProfile ?? null;
  if (validated.section === "discovery" && validated.area === "profiles") {
    lastProfile = validated.profile ?? lastProfile;
  }

  window.localStorage.setItem(key, JSON.stringify({ ...validated, areasByStage, lastProfile }));
}

/**
 * @param {string | number} projectId
 * @param {{ isAdmin?: boolean }} [opts]
 * @returns {string}
 */
export function buildProjectDetailsPathWithResume(projectId, opts = {}) {
  const base = `/projects/details/${encodeURIComponent(String(projectId))}`;
  const resume = readProjectJourneyResume(projectId, opts);
  if (!resume) return base;
  return `${base}${buildProjectJourneyQuery(resume)}`;
}

/**
 * Whether the project details URL should redirect to a stored journey location.
 * @param {URLSearchParams} searchParams
 * @param {{ isAdmin?: boolean }} [opts]
 */
export function shouldResumeProjectJourney(searchParams, opts = {}) {
  if (!searchParams) return false;
  if (searchParams.get("section")) return false;
  if (searchParams.get("editProject") === "1") return false;
  if (searchParams.get("section") === AGENT_ANALYTICS_SECTION.id && !opts.isAdmin) return false;
  return true;
}
