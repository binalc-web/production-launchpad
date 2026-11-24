/**
 * GitHub OAuth access levels shown in connect UX (mirrors backend bundles).
 */
export const GITHUB_ACCESS_LEVEL = Object.freeze({
  READ: "read",
  WRITE: "write",
});

export const GITHUB_ACCESS_LEVEL_OPTIONS = [
  {
    value: GITHUB_ACCESS_LEVEL.READ,
    label: "Read",
    description:
      "Profile and public metadata only. Private repos and write features need Write access.",
  },
  {
    value: GITHUB_ACCESS_LEVEL.WRITE,
    label: "Write",
    description:
      "Full access for agents, push, repo setup, and webhooks. Requests repo and read:user.",
  },
];

/**
 * @param {unknown} raw
 * @returns {'read'|'write'}
 */
export function normalizeGithubAccessLevel(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === GITHUB_ACCESS_LEVEL.READ) return GITHUB_ACCESS_LEVEL.READ;
  return GITHUB_ACCESS_LEVEL.WRITE;
}
