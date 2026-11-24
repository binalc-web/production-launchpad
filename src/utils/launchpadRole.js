/** @param {unknown} role */
export function isLaunchpadAdmin(role) {
  return String(role ?? "").trim().toLowerCase() === "admin";
}
