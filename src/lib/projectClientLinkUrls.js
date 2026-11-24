import config from "@/config";
import { ONBOARD_PREVIEW_ONLY_QUERY } from "@/lib/onboardPreviewUrl";

const NO_SLUG_HINT = "Set a project slug (Project settings) to enable links.";

/**
 * @param {{ slug?: string|null }} project
 * @param {string} [origin]
 * @returns {{ clientUrl: string|null, previewOnlyUrl: string|null, linksDisabledHint: string }}
 */
export function buildProjectClientUrls(project, origin) {
  const slug = project?.slug != null ? String(project.slug).trim() : "";
  const resolvedOrigin =
    typeof origin === "string" && origin
      ? origin
      : typeof window !== "undefined"
        ? window.location.origin
        : config.FRONTEND_URL;

  if (!slug) {
    return {
      clientUrl: null,
      previewOnlyUrl: null,
      linksDisabledHint: NO_SLUG_HINT,
    };
  }

  const clientUrl = `${resolvedOrigin}/projects/${encodeURIComponent(slug)}`;
  const previewOnlyUrl = `${clientUrl}?${ONBOARD_PREVIEW_ONLY_QUERY}=false`;

  return {
    clientUrl,
    previewOnlyUrl,
    linksDisabledHint: NO_SLUG_HINT,
  };
}

export { NO_SLUG_HINT as PROJECT_CLIENT_LINKS_DISABLED_HINT };
