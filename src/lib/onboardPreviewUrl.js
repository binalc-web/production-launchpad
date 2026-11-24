/**
 * Client Link URLs opened during project onboarding (scratch / ZIP / migrate).
 * Optional `c=false` hides chat chrome for preview-only layout.
 */

import { buildReleaseManagementDetailsPath } from "./releaseNavigation.js";

/** Query param read by ClientLink (`showControls = searchParams.get("c") !== "false"`). */
export const ONBOARD_PREVIEW_ONLY_QUERY = "c";

/**
 * @param {{ previewPort?: number|null, workflowId?: string, previewOnly?: boolean, previewUrl?: string }} [opts]
 * @returns {string} e.g. `?previewPort=5174&c=false` or ``
 */
export function buildOnboardPreviewQueryString({
  previewPort,
  workflowId,
  previewUrl,
  previewOnly = false,
} = {}) {
  const zp = previewPort != null ? Number(previewPort) : 0;
  const wf = workflowId ? String(workflowId).trim() : "";
  const pu = String(previewUrl || "").trim();
  let portFromUrl = 0;
  if (!(zp > 0) && pu) {
    try {
      const u = new URL(/^https?:\/\//i.test(pu) ? pu : `http://${pu}`);
      portFromUrl = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
    } catch {
      portFromUrl = 0;
    }
  }
  const resolvedPort = zp > 0 ? zp : portFromUrl > 0 && portFromUrl <= 65535 ? portFromUrl : 0;
  const q = new URLSearchParams();
  if (resolvedPort > 0) {
    q.set("previewPort", String(resolvedPort));
  } else if (pu) {
    q.set("previewUrl", pu);
  }
  if (wf) q.set("workflowId", wf);
  if (previewOnly) {
    q.set(ONBOARD_PREVIEW_ONLY_QUERY, "false");
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Scratch: poll agent on client link until preview is ready, then swap to previewPort params.
 * @param {number} releaseId
 * @param {{ previewOnly?: boolean }} [opts]
 */
export function buildScratchAwaitPreviewSearch(releaseId, { previewOnly = false } = {}) {
  const q = new URLSearchParams();
  q.set("awaitScratchPreview", "1");
  q.set("releaseId", String(releaseId));
  if (previewOnly) {
    q.set(ONBOARD_PREVIEW_ONLY_QUERY, "false");
  }
  return `?${q.toString()}`;
}

/**
 * Merge preview-ready params into existing client-link search (preserves `c=false`).
 * @param {string} currentSearch — e.g. `location.search`
 * @param {{ previewPort?: number|null, workflowId?: string, previewUrl?: string }} ready
 * @returns {string} `?previewPort=…&c=false`
 */
export function mergeOnboardPreviewReadySearch(currentSearch, ready) {
  const q = new URLSearchParams(String(currentSearch || "").replace(/^\?/, ""));
  q.delete("awaitScratchPreview");
  q.delete("releaseId");
  const previewOnly = q.get(ONBOARD_PREVIEW_ONLY_QUERY) === "false";
  const opening = buildOnboardPreviewQueryString({ ...ready, previewOnly });
  if (opening) {
    const add = new URLSearchParams(opening.replace(/^\?/, ""));
    for (const [key, value] of add.entries()) {
      q.set(key, value);
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Remove scratch-await params so Client Link can use normal preview boot.
 * @param {string} currentSearch — e.g. `location.search`
 * @returns {string}
 */
export function clearScratchAwaitPreviewSearch(currentSearch) {
  return mergeOnboardPreviewReadySearch(currentSearch, {});
}

/**
 * @param {string} slug
 * @param {string} search — must start with `?` or be empty
 * @param {string} [origin] — defaults to `window.location.origin` in browser
 */
/** Project Details releases overview — migrate onboarding success destination. */
export function buildMigrateOnboardingDetailsPath(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return "/projects";
  return buildReleaseManagementDetailsPath(pid) ?? "/projects";
}

/** Project Details backend code tab — live backend plan agent logs. */
export function buildProjectBackendCodePath(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return null;
  return `/projects/details/${pid}?section=backend&area=backend-code`;
}

export function buildOnboardClientLinkUrl(slug, search = "", origin) {
  const safeSlug = String(slug || "").trim();
  if (!safeSlug) return "";
  const base =
    typeof origin === "string" && origin
      ? origin.replace(/\/$/, "")
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
  const qs = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${base}/projects/${encodeURIComponent(safeSlug)}${qs}`;
}
