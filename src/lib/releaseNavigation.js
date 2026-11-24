/**
 * Absolute Project Details URL for Plan → Releases (overview).
 * Use for external/client-link CTAs labeled "Open Release Management" so
 * journey-resume does not restore Build or another last-visited section.
 * @param {string|number|null|undefined} projectId
 * @returns {string|null}
 */
export function buildReleaseManagementDetailsPath(projectId) {
  if (projectId == null || projectId === "") return null;
  const pid = String(projectId).trim();
  if (!pid) return null;
  return `/projects/details/${encodeURIComponent(pid)}?section=releases&area=overview`;
}

/**
 * @param {string|number|null|undefined} projectId
 * @returns {string|null}
 */
export function buildPreviewImplementPath(projectId) {
  if (projectId == null || projectId === "") return null;
  const pid = String(projectId).trim();
  if (!pid) return null;
  return `/projects/details/${encodeURIComponent(pid)}?section=web-app&area=implement`;
}

/**
 * @param {string|number|null|undefined} projectId
 * @returns {string|null}
 */
export function buildApplicationImplementPath(projectId) {
  if (projectId == null || projectId === "") return null;
  const pid = String(projectId).trim();
  if (!pid) return null;
  return `/projects/details/${encodeURIComponent(pid)}?section=backend&area=implement`;
}

/**
 * Navigate within project shell to Releases workspace areas.
 * @param {import('react-router-dom').SetURLSearchParams} setSearchParams
 * @param {"overview"|"roadmap"|"active"} area
 */
export function navigateToReleases(setSearchParams, area = "overview") {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", "releases");
      next.set("area", area);
      if (area !== "active") {
        next.delete("scopeReleaseId");
      }
      return next;
    },
    { replace: true },
  );
}

/**
 * Open Release scope for a specific release (Active tab + scope panel).
 * @param {import('react-router-dom').SetURLSearchParams} setSearchParams
 * @param {number|string} releaseId
 */
export function navigateToReleaseScope(setSearchParams, releaseId) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", "releases");
      next.set("area", "active");
      next.set("scopeReleaseId", String(releaseId));
      return next;
    },
    { replace: true },
  );
}

/**
 * @param {import('react-router-dom').SetURLSearchParams} setSearchParams
 */
export function navigateToPreviewImplement(setSearchParams) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", "web-app");
      next.set("area", "implement");
      return next;
    },
    { replace: true },
  );
}

/**
 * @param {import('react-router-dom').SetURLSearchParams} setSearchParams
 */
export function navigateToApplicationImplement(setSearchParams) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", "backend");
      next.set("area", "implement");
      return next;
    },
    { replace: true },
  );
}

/**
 * Navigate within project shell to App repositories workspace areas.
 * @param {import('react-router-dom').SetURLSearchParams} setSearchParams
 * @param {"backend-code"|"implement"|"architecture"|"agent-config"} area
 */
export function navigateToBackendArea(setSearchParams, area) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", "backend");
      next.set("area", area);
      return next;
    },
    { replace: true },
  );
}

/**
 * @param {import('react-router-dom').SetURLSearchParams} setSearchParams
 * @param {{ jiraReady?: boolean }} [opts]
 */
export function navigateToBacklog(setSearchParams, { jiraReady = false } = {}) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", "backlog");
      next.set("area", jiraReady ? "suggestions" : "board");
      return next;
    },
    { replace: true },
  );
}
