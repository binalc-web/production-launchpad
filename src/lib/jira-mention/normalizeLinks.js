import { MAX_JIRA_MENTIONS } from "./constants.js";

const JIRA_ISSUE_KEY_RE = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;
const JIRA_MENTION_IN_TEXT_RE = /(?:^|[\s(])@([A-Za-z][A-Za-z0-9_]*-\d+)(?=\s|$|[.,;:!?])/g;

/**
 * Extract Jira issue keys from @-mentions in free text (e.g. "@LQA-9").
 * @param {unknown} text
 * @returns {string[]}
 */
export function extractJiraIssueKeysFromMentionText(text) {
  const raw = typeof text === "string" ? text : "";
  if (!raw.trim()) return [];
  const keys = [];
  const seen = new Set();
  for (const match of raw.matchAll(JIRA_MENTION_IN_TEXT_RE)) {
    const key = String(match[1] || "")
      .trim()
      .toUpperCase();
    if (!JIRA_ISSUE_KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    if (keys.length >= MAX_JIRA_MENTIONS) break;
  }
  return keys;
}

/**
 * Merge structured ticket links with @-mention keys from prompt text.
 * @param {unknown} rawLinks
 * @param {unknown} promptText
 * @param {string} [jiraBrowseBaseUrl]
 * @returns {Array<{ url: string, key: string, icon: string | null }>}
 */
export function mergeJiraTicketMentionSources(rawLinks, promptText, jiraBrowseBaseUrl = "") {
  const base = typeof jiraBrowseBaseUrl === "string" ? jiraBrowseBaseUrl.replace(/\/$/, "") : "";
  const merged = dedupeJiraTicketMentions(Array.isArray(rawLinks) ? rawLinks : []);
  const keysFromLinks = new Set(
    merged
      .map((row) =>
        String(row.key || "")
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean),
  );
  for (const key of extractJiraIssueKeysFromMentionText(promptText)) {
    if (keysFromLinks.has(key)) continue;
    keysFromLinks.add(key);
    const url = base ? buildJiraBrowseUrl(key, base) : key;
    merged.push({ url, key, icon: null });
    if (merged.length >= MAX_JIRA_MENTIONS) break;
  }
  return merged.slice(0, MAX_JIRA_MENTIONS);
}

/**
 * @param {string} url
 * @returns {string|null}
 */
export function extractJiraIssueKeyFromBrowseUrl(url) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;
  const match = raw.match(/\/browse\/([A-Za-z][A-Za-z0-9_]*-\d+)(?:[/?#]|$)/i);
  if (!match?.[1]) return null;
  const key = match[1].toUpperCase();
  return JIRA_ISSUE_KEY_RE.test(key) ? key : null;
}

/**
 * @param {string} key
 * @param {string} [baseBrowseUrl]
 * @returns {string}
 */
export function buildJiraBrowseUrl(key, baseBrowseUrl) {
  const k = String(key || "")
    .trim()
    .toUpperCase();
  const base = typeof baseBrowseUrl === "string" ? baseBrowseUrl.replace(/\/$/, "") : "";
  if (base) return `${base}/browse/${k}`;
  return k;
}

/**
 * @param {Array<{ key?: string, url?: string, icon?: string }>} tickets
 * @returns {Array<{ url: string, key: string, icon: string | null }>}
 */
export function jiraTicketMentionsFromSelection(tickets) {
  if (!Array.isArray(tickets)) return [];
  const out = [];
  const seen = new Set();
  for (const t of tickets) {
    const url = typeof t?.url === "string" ? t.url.trim() : "";
    const key = typeof t?.key === "string" ? t.key.trim().toUpperCase() : "";
    const link = url || (key ? buildJiraBrowseUrl(key) : "");
    if (!link || seen.has(link)) continue;
    seen.add(link);
    const icon = typeof t?.icon === "string" ? t.icon.trim() : "";
    out.push({
      url: link,
      key: key || extractJiraIssueKeyFromBrowseUrl(link) || link,
      icon: icon || null,
    });
    if (out.length >= MAX_JIRA_MENTIONS) break;
  }
  return out;
}

/**
 * @param {Array<{ key?: string, url?: string }>} tickets
 * @returns {string[]}
 */
export function jiraTicketLinksFromSelection(tickets) {
  return jiraTicketMentionsFromSelection(tickets).map((row) => row.url);
}

/**
 * @param {unknown} item
 * @returns {{ url: string, key: string, icon: string | null } | null}
 */
export function parseJiraTicketLinkEntry(item) {
  if (typeof item === "string") {
    const url = item.trim();
    if (!url) return null;
    return {
      url,
      key: extractJiraIssueKeyFromBrowseUrl(url) || url,
      icon: null,
    };
  }
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!url) return null;
  const key =
    (typeof item.key === "string" ? item.key.trim().toUpperCase() : "") ||
    extractJiraIssueKeyFromBrowseUrl(url) ||
    url;
  const icon = typeof item.icon === "string" ? item.icon.trim() : "";
  return { url, key, icon: icon || null };
}

/**
 * @param {unknown[]} links
 * @returns {string[]}
 */
export function dedupeJiraTicketLinks(links) {
  return dedupeJiraTicketMentions(links).map((row) => row.url);
}

/**
 * @param {unknown[]} mentions
 * @returns {Array<{ url: string, key: string, icon: string | null }>}
 */
export function dedupeJiraTicketMentions(mentions) {
  if (!Array.isArray(mentions)) return [];
  const out = [];
  const seen = new Set();
  for (const item of mentions) {
    const row = parseJiraTicketLinkEntry(item);
    if (!row?.url || seen.has(row.url)) continue;
    seen.add(row.url);
    out.push(row);
    if (out.length >= MAX_JIRA_MENTIONS) break;
  }
  return out;
}
