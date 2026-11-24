/** Mirrors backend `INTEGRATION_RECONNECT_REQUIRED`. */
export const INTEGRATION_RECONNECT_REQUIRED = "INTEGRATION_RECONNECT_REQUIRED";

const PROVIDER_LABEL = {
  github: "GitHub",
  bitbucket: "Bitbucket",
  jira_atlassian: "Jira",
  figma: "Figma",
};

/**
 * User-facing toast/body copy for integration API failures (prefers server-safe `error` when code matches).
 * @param {unknown} e — axios error
 * @param {string} fallback
 */
export function integrationToastFromAxios(e, fallback) {
  const data = e?.response?.data;
  if (
    data?.code === INTEGRATION_RECONNECT_REQUIRED &&
    typeof data.error === "string" &&
    data.error.trim()
  ) {
    const prov = typeof data.provider === "string" ? data.provider.trim() : "";
    const label = PROVIDER_LABEL[prov];
    if (label) {
      return `${label}: ${data.error.trim()}`;
    }
    return data.error.trim();
  }
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof e?.message === "string" && e.message.trim()) return e.message.trim();
  return fallback;
}
