const RELEASE_DOT_VERSION_RE = /^\d+(?:\.\d+)+$/;

export function parseReleaseNameToTuple(name) {
  const n = name?.trim();
  if (!n || !RELEASE_DOT_VERSION_RE.test(n)) return null;
  return n.split(".").map((p) => parseInt(p, 10));
}

function compareReleaseTuples(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * Match backend resolveLatestPriorReleaseBaseline / selectLatestPriorReleaseCandidate.
 * @param {Array<{ id: number, name: string, status?: string, versions?: Array<{ id: number, version: string, gitTag?: string|null, isActive?: boolean }> }>} releases
 * @param {{ excludeReleaseId?: number|null }} [opts]
 */
export function getLatestPriorBaseline(releases, opts = {}) {
  const excludeRid =
    opts.excludeReleaseId != null && Number(opts.excludeReleaseId) > 0
      ? Number(opts.excludeReleaseId)
      : null;

  const eligible = (releases || []).filter((r) => {
    const st = String(r?.status ?? "").toLowerCase();
    if (st === "skip") return false;
    if (excludeRid != null && Number(r.id) === excludeRid) return false;
    return true;
  });

  const withTagged = eligible
    .map((r) => {
      const versions = Array.isArray(r.versions) ? r.versions : [];
      const sorted = [...versions].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      const head =
        sorted.find((v) => String(v?.gitTag || "").trim() !== "") ?? null;
      if (!head) return null;
      return { release: r, version: head };
    })
    .filter(Boolean);

  if (withTagged.length === 0) return null;

  let best = null;
  let bestTuple = null;
  for (const row of withTagged) {
    const t = parseReleaseNameToTuple(row.release.name);
    if (!t) continue;
    if (!bestTuple || compareReleaseTuples(t, bestTuple) > 0) {
      bestTuple = t;
      best = row;
    }
  }
  if (!best?.release?.id || !best?.version?.id) return null;

  return {
    priorReleaseId: best.release.id,
    priorReleaseName: best.release.name,
    baselineProjectVersionId: best.version.id,
    baselineVersionLabel: best.version.version,
    baselineGitTag: String(best.version.gitTag || "").trim(),
  };
}

export function normalizeReleaseStatus(release) {
  const s = String(release?.status ?? "draft").toLowerCase();
  return ["draft", "active", "locked", "skip"].includes(s) ? s : "draft";
}
