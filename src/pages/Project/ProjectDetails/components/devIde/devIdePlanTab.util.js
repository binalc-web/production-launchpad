/**
 * Virtual plan tab helpers for Backend Code IDE (in-memory plan.md — not a repo file).
 */

export const PLAN_TAB_KEY = "plan:pending";
export const PLAN_TAB_PATH = "plan.md";

/**
 * @param {Array<{ key: string, kind: string, path?: string }>} tabs
 * @returns {Array<{ key: string, kind: string, path?: string }>}
 */
export function upsertPlanTabInList(tabs) {
  const list = Array.isArray(tabs) ? tabs : [];
  const existing = list.find((t) => t.key === PLAN_TAB_KEY);
  if (existing) return list;
  return [...list, { key: PLAN_TAB_KEY, kind: "plan", path: PLAN_TAB_PATH }];
}

/**
 * @param {string|null|undefined} markdown
 * @returns {{ markdown: string }|null}
 */
export function planCacheFromMarkdown(markdown) {
  const md = typeof markdown === "string" ? markdown : "";
  if (!md.trim()) return null;
  return { markdown: md };
}

/** First markdown heading of a plan, used as the collapsed plan.md summary. */
export function extractPlanHeading(markdown) {
  const match = String(markdown || "").match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m);
  return match ? match[1].trim() : "";
}
