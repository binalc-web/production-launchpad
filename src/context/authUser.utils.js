/** @param {unknown} idRaw */
function coerceId(idRaw) {
  if (typeof idRaw === "number" && Number.isFinite(idRaw) && idRaw > 0) {
    return Math.trunc(idRaw);
  }
  if (idRaw == null || idRaw === "") return null;
  const n = Number(idRaw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/**
 * Normalized shape for Launchpad RBAC UI. Mirrors what we persist via {@link sanitizeUserForStorage}.
 * Allows id to be temporarily null until GET /api/auth/me sync runs after Hub OAuth.
 *
 * @param {unknown} raw
 * @returns {{ id: number | null; role: string | null; email: string; name: string; image?: string } | null}
 */
export function normalizeStoredUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = coerceId(raw.id);
  const email = typeof raw.email === "string" ? raw.email : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  const image = typeof raw.image === "string" ? raw.image.trim() : "";

  if (id === null && !email.trim()) return null;

  const role =
    typeof raw.role === "string" && raw.role.trim()
      ? raw.role.trim().toLowerCase()
      : null;

  return { id, role, email, name, ...(image ? { image } : {}) };
}
