/**
 * Normalize Jira ticket list API responses for @-mention pickers.
 * Supports legacy array responses and paginated `{ issues }` envelopes.
 *
 * @param {unknown} res
 * @returns {unknown[]}
 */
export function extractJiraTicketsFromResponse(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.issues)) return res.issues;
  if (Array.isArray(res?.tickets)) return res.tickets;
  return [];
}
