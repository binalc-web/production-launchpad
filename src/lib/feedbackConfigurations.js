export function emptyFeedbackConfigurations() {
  return { allowedDomains: [], autoCreateJiraTicket: false };
}

export function getEmbedAutoCreateJiraTicket(config) {
  const normalized = normalizeFeedbackConfigurations(config);
  return normalized.autoCreateJiraTicket === true;
}

export function getEmbedAllowedDomains(config) {
  if (!config || typeof config !== "object") return [];
  return Array.isArray(config.allowedDomains) ? config.allowedDomains : [];
}

export function normalizeFeedbackConfigurations(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyFeedbackConfigurations();
  }
  return {
    ...raw,
    allowedDomains: getEmbedAllowedDomains(raw),
    autoCreateJiraTicket: raw.autoCreateJiraTicket === true,
  };
}

export function isEmbedActiveForProject(config) {
  return getEmbedAllowedDomains(config).some((d) => d?.enabled !== false);
}
