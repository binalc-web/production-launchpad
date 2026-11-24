import { buildProjectDetailsPathWithResume } from "./projectJourneyResume.js";

/** localStorage key for the last worked project id (Open last workspace). */
export const LAST_PROJECT_ID_KEY = "launchpad:last-project-id";

/** localStorage key for most-recently-opened project ids (newest first). */
export const RECENT_PROJECT_IDS_KEY = "launchpad:recent-project-ids";

/** Cap for the project-switcher Recent section. */
export const MAX_RECENT_PROJECTS = 3;

/** @param {unknown} value */
function normalizeProjectId(value) {
  if (value == null) return null;
  const id = String(value).trim();
  return id || null;
}

/**
 * @returns {string | null}
 */
export function readLastProjectId() {
  if (typeof window === "undefined") return null;
  try {
    return normalizeProjectId(window.localStorage.getItem(LAST_PROJECT_ID_KEY));
  } catch {
    return null;
  }
}

/**
 * Resolve the current project id from route param → path → last stored project.
 *
 * @param {string} pathname
 * @param {{ projectId?: string }} [params]
 * @returns {string | null}
 */
export function resolveCurrentProjectId(pathname, params = {}) {
  if (params?.projectId) return normalizeProjectId(params.projectId);
  const match = String(pathname || "").match(/^\/projects\/details\/([^/]+)/);
  if (match?.[1]) return normalizeProjectId(decodeURIComponent(match[1]));
  return readLastProjectId();
}

/**
 * @param {string | number | null | undefined} projectId
 */
export function writeLastProjectId(projectId) {
  if (typeof window === "undefined") return;
  const id = normalizeProjectId(projectId);
  if (!id) return;
  try {
    const recents = [id, ...readRecentProjectIds().filter((existing) => existing !== id)].slice(
      0,
      MAX_RECENT_PROJECTS,
    );
    window.localStorage.setItem(LAST_PROJECT_ID_KEY, id);
    window.localStorage.setItem(RECENT_PROJECT_IDS_KEY, JSON.stringify(recents));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Most recently opened project ids (newest first). Falls back to last-project id
 * so existing sessions still populate Recent before a second visit.
 *
 * @returns {string[]}
 */
export function readRecentProjectIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PROJECT_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      const ids = [];
      for (const value of parsed) {
        const id = normalizeProjectId(value);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= MAX_RECENT_PROJECTS) break;
      }
      return ids;
    }
    const last = normalizeProjectId(window.localStorage.getItem(LAST_PROJECT_ID_KEY));
    return last ? [last] : [];
  } catch {
    return [];
  }
}

/** Remove a project from last-id and recents (e.g. after delete). */
export function forgetProjectId(projectId) {
  if (typeof window === "undefined") return;
  const id = normalizeProjectId(projectId);
  if (!id) return;
  try {
    if (normalizeProjectId(window.localStorage.getItem(LAST_PROJECT_ID_KEY)) === id) {
      window.localStorage.removeItem(LAST_PROJECT_ID_KEY);
    }
    const recents = readRecentProjectIds().filter((existing) => existing !== id);
    if (recents.length === 0) {
      window.localStorage.removeItem(RECENT_PROJECT_IDS_KEY);
    } else {
      window.localStorage.setItem(RECENT_PROJECT_IDS_KEY, JSON.stringify(recents));
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Remove the stored last-worked project id. */
export function clearLastProjectId() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LAST_PROJECT_ID_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Split a project list into Recent (MRU), Favorites (not already in Recent), then the rest.
 *
 * @param {Array<{ id?: string | number, name?: string, isFavorite?: boolean }>} list
 * @param {string[]} [recentIds]
 * @returns {{ recent: object[], favorites: object[], others: object[] }}
 */
export function partitionSwitcherProjects(list, recentIds = readRecentProjectIds()) {
  const projects = Array.isArray(list) ? list : [];
  const byId = new Map();
  for (const project of projects) {
    const id = normalizeProjectId(project?.id);
    if (id && !byId.has(id)) byId.set(id, project);
  }

  const seen = new Set();
  const recent = [];
  for (const rawId of Array.isArray(recentIds) ? recentIds : []) {
    const id = normalizeProjectId(rawId);
    const project = id ? byId.get(id) : null;
    if (!project || seen.has(id)) continue;
    seen.add(id);
    recent.push(project);
  }

  const favorites = [];
  const others = [];
  for (const project of projects) {
    const id = normalizeProjectId(project?.id);
    if (!id || seen.has(id)) continue;
    if (Boolean(project?.isFavorite)) {
      seen.add(id);
      favorites.push(project);
    } else {
      others.push(project);
    }
  }

  return { recent, favorites, others };
}

/**
 * Pick the best project id to open as console home.
 * Prefers stored last id when it still exists in `projects`; else first in the list.
 *
 * @param {Array<{ id?: string | number, updatedAt?: string, createdAt?: string }>} projects
 * @param {{ lastProjectId?: string | null }} [opts]
 * @returns {string | null}
 */
export function resolveHomeProjectId(projects, opts = {}) {
  const list = Array.isArray(projects) ? projects : [];
  const ids = new Set(
    list.map((p) => normalizeProjectId(p?.id)).filter(Boolean),
  );
  const preferred =
    opts.lastProjectId !== undefined
      ? normalizeProjectId(opts.lastProjectId)
      : readLastProjectId();
  if (preferred && ids.has(preferred)) return preferred;

  if (list.length === 0) {
    // Search can be empty/failed while localStorage still has a last project.
    return preferred;
  }
  return normalizeProjectId(list[0]?.id);
}

/**
 * Path for /projects home redirect: last/resume project, or onboarding when empty.
 *
 * @param {Array<{ id?: string | number, updatedAt?: string, createdAt?: string }>} projects
 * @param {{ isAdmin?: boolean, lastProjectId?: string | null }} [opts]
 * @returns {string}
 */
export function resolveProjectsHomePath(projects, opts = {}) {
  const id = resolveHomeProjectId(projects, opts);
  if (!id) return "/projects/onboarding";
  return buildProjectDetailsPathWithResume(id, { isAdmin: opts.isAdmin });
}
