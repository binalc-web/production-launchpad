/** Escape a value for use inside a single-quoted JavaScript string literal. */
export function escapeJsString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

/** Trim trailing slashes from a base URL. */
export function trimFrontendBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

/**
 * Resolve the public embed project ref (UUID preferred, numeric id fallback).
 * @param {{ projectId?: string | null, id?: number | string | null }} project
 * @returns {string}
 */
export function resolveEmbedProjectRef(project) {
  const hubId = String(project?.projectId ?? "").trim();
  if (hubId) return hubId;
  if (project?.id != null) return String(project.id);
  return "";
}

/**
 * Build the Launchpad feedback embed HTML snippet for copy-paste or agent install.
 * @param {{ projectRef: string, shimBaseUrl: string }} params
 * @returns {string}
 */
export function buildFeedbackEmbedSnippetHtml({ projectRef, shimBaseUrl }) {
  const ref = String(projectRef ?? "").trim();
  const base = trimFrontendBaseUrl(shimBaseUrl);
  if (!ref || !base) return "";
  const shimSrc = `${base}/launchpad-feedback-shim.js`;
  const projectLiteral = escapeJsString(ref);
  return `<script>
  window.launchpadFeedbackConfig = {
    project: '${projectLiteral}',
    source: 'snippet'
  };

  !function(e,r){if(e.__LaunchpadFeedback)return;e.__LaunchpadFeedback=1;var s=r.createElement("script");s.async=1;s.src="${shimSrc}";var i=r.getElementsByTagName("script")[0];i&&i.parentNode?i.parentNode.insertBefore(s,i):(r.head||r.documentElement).appendChild(s)}(window,document);
</script>`;
}
