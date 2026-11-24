import { listLaunchpadGithubHostPaths } from "../utils/projectMultiRepoForm.js";

/**
 * True when an error string is too technical to show alone (e.g. GitHub 404 body).
 * @param {unknown} message
 * @returns {boolean}
 */
export function isGenericGithubAccessError(message) {
  const t = String(message || "")
    .trim()
    .toLowerCase();
  if (!t) return true;
  if (t === "not found" || t === "forbidden" || t === "unauthorized") return true;
  if (t.length < 24) return true;
  return false;
}

/**
 * Primary launchpad repo label + HTTPS URL from project gitRepoPath.
 * @param {unknown} gitRepoPath
 * @returns {{ label: string, url: string } | null}
 */
export function launchpadAccessFromGitRepoPath(gitRepoPath) {
  const paths = listLaunchpadGithubHostPaths(gitRepoPath);
  const primary = paths[0];
  if (!primary) return null;
  const label = primary.replace(/^github\.com\//i, "").trim();
  if (!label.includes("/")) return null;
  return {
    label,
    url: `https://github.com/${label}`,
  };
}

/**
 * Invitation copy for launchpad access failures.
 * @param {string} [label]
 * @param {string} [url]
 * @returns {string}
 */
export function buildLaunchpadInvitationMessage(label, url) {
  const link = String(url || "").trim();
  if (link) {
    return `Please accept the GitHub project invitation at ${link} or check your mail for the invitation.`;
  }
  const ownerRepo = String(label || "").trim();
  if (ownerRepo) {
    return `Please accept the GitHub project invitation for ${ownerRepo} or check your mail for the invitation.`;
  }
  return "Please accept the GitHub project invitation for your launchpad repository or check your mail for the invitation.";
}

/**
 * Dev-repo access failure copy (mirrors backend githubPushAccess.service).
 * @param {string} [label]
 * @param {string} [url]
 * @returns {string}
 */
export function buildDevelopmentRepoAccessMessage(label, url) {
  const link = String(url || "").trim();
  if (link) {
    return `We could not reach your development repository ${link}. Connect the project GitHub account under Connected accounts and confirm you can access that repo.`;
  }
  const ownerRepo = String(label || "").trim();
  if (ownerRepo) {
    return `We could not reach your development repository (${ownerRepo}). Connect the project GitHub account under Connected accounts and confirm you can access that repo.`;
  }
  return "We could not reach your development repository. Connect the project GitHub account under Connected accounts and confirm you can access that repo.";
}

/**
 * @param {object} payload
 * @returns {Array<{ role?: string, label?: string, url?: string|null, issue?: string }>}
 */
function repoAccessRows(payload) {
  return Array.isArray(payload?.repoAccess) ? payload.repoAccess : [];
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function errorMentionsDevelopmentRepository(error) {
  return /(?:development|developer) repository/i.test(String(error || ""));
}

/**
 * Fill launchpad fields and replace generic errors with role-aware copy.
 * @param {object|null|undefined} payload
 * @param {{ gitRepoPath?: unknown }} [options]
 * @returns {object|null}
 */
export function enrichMigrateGithubAccessPayload(payload, options = {}) {
  if (!payload || typeof payload !== "object") return null;
  const out = { ...payload };
  const fallback = launchpadAccessFromGitRepoPath(options.gitRepoPath);

  const devInaccessible = repoAccessRows(out).filter(
    (row) => row?.role === "development" && row?.issue === "inaccessible",
  );
  const launchpadInaccessible = repoAccessRows(out).filter(
    (row) => row?.role === "launchpad" && row?.issue === "inaccessible",
  );
  const mentionsDevRepo = errorMentionsDevelopmentRepository(out.error);
  const hasDevFailure = devInaccessible.length > 0 || mentionsDevRepo;

  if (!out.launchpadRepoUrl && fallback?.url && !hasDevFailure) {
    out.launchpadRepoUrl = fallback.url;
    out.launchpadRepoLabel = fallback.label;
  }

  if (devInaccessible.length > 0) {
    const first = devInaccessible[0];
    if (isGenericGithubAccessError(out.error) || mentionsDevRepo) {
      out.error = buildDevelopmentRepoAccessMessage(first.label, first.url);
    }
    return out;
  }

  if (mentionsDevRepo && launchpadInaccessible.length === 0) {
    if (isGenericGithubAccessError(out.error)) {
      out.error = buildDevelopmentRepoAccessMessage();
    }
    return out;
  }

  if (
    (launchpadInaccessible.length > 0 || !hasDevFailure) &&
    isGenericGithubAccessError(out.error) &&
    (out.launchpadRepoUrl || out.launchpadRepoLabel)
  ) {
    out.error = buildLaunchpadInvitationMessage(out.launchpadRepoLabel, out.launchpadRepoUrl);
  }

  return out;
}
