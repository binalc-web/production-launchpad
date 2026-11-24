import { isLikelyEmail } from "./emailList";

/**
 * @param {unknown} val - form `reportRecipientEmail`: string, string[], or comma-separated string
 * @returns {string[]}
 */
export function recipientHasValue(val) {
  return recipientTagsFromFormValue(val).length > 0;
}

export function recipientTagsFromFormValue(val) {
  if (Array.isArray(val)) {
    return val.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  const s = String(val ?? "").trim();
  if (!s) return [];
  return s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
}

/**
 * API body: one string if a single address, array if several (backend accepts both).
 * @param {unknown} val
 * @returns {string|string[]|null}
 */
export function reportRecipientEmailForApi(val) {
  const tags = recipientTagsFromFormValue(val);
  if (tags.length === 0) return null;
  if (tags.length === 1) return tags[0];
  return tags;
}

/**
 * @param {unknown} val
 * @returns {boolean}
 */
export function reportRecipientFormIsValid(val) {
  const tags = recipientTagsFromFormValue(val);
  return tags.length > 0 && tags.every((t) => isLikelyEmail(t));
}
