import { isPathRestricted } from "./embedPathRules.js";

export function normalizeEmbedDomain(raw) {
  let s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "");
  s = s.split("/")[0].split(":")[0].trim();
  if (s.startsWith("www.")) {
    s = s.slice(4);
  }
  return s;
}

export function resolveDomainRule(hostname, allowedDomains) {
  const host = normalizeEmbedDomain(hostname);
  if (!host) return null;
  const list = Array.isArray(allowedDomains) ? allowedDomains : [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const entryHost = normalizeEmbedDomain(entry.domain);
    if (entryHost && entryHost === host) return entry;
  }
  return null;
}

export function isPathRestrictedForHost(hostname, pathname, allowedDomains) {
  const rule = resolveDomainRule(hostname, allowedDomains);
  if (!rule || rule.enabled === false) return false;
  return isPathRestricted(pathname, rule.restrictPaths ?? []);
}

export function isEmbedVisibleOnPage(hostname, pathname, allowedDomains) {
  const list = Array.isArray(allowedDomains) ? allowedDomains : [];
  if (!list.length) return false;
  const rule = resolveDomainRule(hostname, list);
  if (!rule || rule.enabled === false) return false;
  return !isPathRestricted(pathname, rule.restrictPaths ?? []);
}
