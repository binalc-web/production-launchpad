/**
 * Bitbucket OAuth access levels shown in connect UX (mirrors backend bundles).
 */
export const BITBUCKET_ACCESS_LEVEL = Object.freeze({
  READ: "read",
  WRITE: "write",
});

export const BITBUCKET_ACCESS_LEVEL_OPTIONS = [
  {
    value: BITBUCKET_ACCESS_LEVEL.READ,
    label: "Read",
    description:
      "List and read repositories and pull requests. Push, PR create, and webhooks need Write access.",
  },
  {
    value: BITBUCKET_ACCESS_LEVEL.WRITE,
    label: "Write",
    description:
      "Full access for agents, push, pull requests, and webhooks. Requests repository:write and related scopes.",
  },
];

/**
 * @param {unknown} raw
 * @returns {'read'|'write'}
 */
export function normalizeBitbucketAccessLevel(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === BITBUCKET_ACCESS_LEVEL.READ) return BITBUCKET_ACCESS_LEVEL.READ;
  return BITBUCKET_ACCESS_LEVEL.WRITE;
}
