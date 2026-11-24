/** Max age for onboarding migrate SSE handoff written before Project Details mounts. */
const MIGRATE_ONBOARDING_STREAM_MAX_AGE_MS = 10 * 60 * 1000;

/** Stable dedupe key for migrate SSE resume (release + agent). */
export function migrateFrontendStreamDedupeKey(releaseId, agentId) {
  const rid = Number(releaseId);
  const aid = agentId != null ? String(agentId).trim() : "";
  return `${rid}:${aid}`;
}

const TERMINAL_PIPELINE_PHASES = new Set(["completed", "agent_failed", "platform_failed"]);

/** Pipeline payload on `connected` / `pipeline_update` SSE events. */
export function migrateFrontendPipelineFromEvent(evt) {
  if (!evt || typeof evt !== "object") return null;
  return evt.migrateFrontendPipeline ?? evt.pipeline ?? null;
}

/** True when a pipeline UI phase is terminal (success or hard fail). */
export function isMigrateFrontendTerminalPipelinePhase(phase) {
  return TERMINAL_PIPELINE_PHASES.has(String(phase ?? ""));
}

/**
 * SSE frames that should stop the migrate fetch loop.
 * `connected` is handled by the hook even when its snapshot is already terminal.
 */
export function isMigrateFrontendStreamStopEvent(evt) {
  if (!evt || typeof evt !== "object") return false;
  if (evt.type === "phase" && (evt.phase === "DONE" || evt.phase === "FAILED")) return true;
  if (evt.type === "pipeline_update") {
    return isMigrateFrontendTerminalPipelinePhase(evt.migrateFrontendPipeline?.phase);
  }
  return false;
}

/** Map a terminal SSE event to live-panel runStatus. */
export function migrateFrontendTerminalStatusFromEvent(evt) {
  if (evt?.type === "phase" && evt.phase === "FAILED") return "FAILED";
  const pipe = migrateFrontendPipelineFromEvent(evt);
  if (pipe?.phase === "agent_failed" || pipe?.phase === "platform_failed") return "FAILED";
  return "SUCCEEDED";
}

/** True while the releases API still reports an in-flight Build Frontend App run. */
export function isReleaseMigrateFrontendOngoing(release) {
  return Boolean(String(release?.ongoingMigrateFrontend?.agentId ?? "").trim());
}

/**
 * Close the live panel when this release is no longer migrating (same as refresh).
 * Empty lists are ignored so a failed/unloaded fetch does not dismiss a live run.
 */
export function shouldCloseMigrateLiveFromReleases(releases, liveReleaseId) {
  if (liveReleaseId == null) return false;
  if (!Array.isArray(releases) || releases.length === 0) return false;
  const rel = releases.find((row) => Number(row?.id) === Number(liveReleaseId));
  if (!rel) return true;
  return !isReleaseMigrateFrontendOngoing(rel);
}

/** sessionStorage key for migrate stream handoff after onboarding redirect. */
function migrateOnboardingStreamStorageKey(projectId) {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid < 1) return null;
  return `mf_onboarding_stream_${pid}`;
}

/**
 * Parse stored handoff payload; returns null when invalid or expired.
 * @param {string} raw
 * @returns {{ releaseId: number, agentId: string } | null}
 */
function parseMigrateOnboardingStreamHandoff(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const releaseId = Number(parsed?.releaseId);
    const agentId = parsed?.agentId != null ? String(parsed.agentId).trim() : "";
    const ts = Number(parsed?.ts);
    if (!Number.isInteger(releaseId) || releaseId < 1 || !agentId) return null;
    if (Number.isFinite(ts) && Date.now() - ts > MIGRATE_ONBOARDING_STREAM_MAX_AGE_MS) {
      return null;
    }
    return { releaseId, agentId };
  } catch {
    return null;
  }
}

/**
 * Persist migrate SSE handoff after migrate-start returns (survives CreateProject unmount).
 * @param {number|string} projectId
 * @param {{ releaseId: number|string, agentId: string }} payload
 */
export function persistMigrateOnboardingStreamHandoff(projectId, { releaseId, agentId }) {
  if (typeof window === "undefined") return;
  const key = migrateOnboardingStreamStorageKey(projectId);
  const rid = Number(releaseId);
  const aid = agentId != null ? String(agentId).trim() : "";
  if (!key || !Number.isInteger(rid) || rid < 1 || !aid) return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ releaseId: rid, agentId: aid, ts: Date.now() }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Read handoff without clearing (for poll ticks while migrate-start may still be in flight).
 * @param {number|string} projectId
 * @returns {{ releaseId: number, agentId: string } | null}
 */
export function readMigrateOnboardingStreamHandoff(projectId) {
  if (typeof window === "undefined") return null;
  const key = migrateOnboardingStreamStorageKey(projectId);
  if (!key) return null;
  try {
    return parseMigrateOnboardingStreamHandoff(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * Read and clear handoff once SSE resume succeeds.
 * @param {number|string} projectId
 * @returns {{ releaseId: number, agentId: string } | null}
 */
export function consumeMigrateOnboardingStreamHandoff(projectId) {
  if (typeof window === "undefined") return null;
  const key = migrateOnboardingStreamStorageKey(projectId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return parseMigrateOnboardingStreamHandoff(raw);
  } catch {
    return null;
  }
}

/**
 * Clear stored handoff after stream connects (idempotent).
 * @param {number|string} projectId
 */
export function clearMigrateOnboardingStreamHandoff(projectId) {
  if (typeof window === "undefined") return;
  const key = migrateOnboardingStreamStorageKey(projectId);
  if (!key) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Start SSE for each release with ongoing migrate (skips dedupe keys already connected).
 * @param {Array<{ id?: number, ongoingMigrateFrontend?: { agentId?: string } | null }>|null|undefined} releases
 * @param {(releaseId: number, agentId: string) => Promise<boolean>} streamMigrateFrontend
 * @param {{ current: Set<string> }} migrateResumeStreamRef
 * @returns {Promise<boolean>} true when at least one stream connected
 */
export async function resumeOngoingMigrateFromReleases(
  releases,
  streamMigrateFrontend,
  migrateResumeStreamRef,
) {
  if (!Array.isArray(releases)) return false;
  let started = false;
  for (const rel of releases) {
    const o = rel?.ongoingMigrateFrontend;
    if (!o?.agentId) continue;
    const ok = await startMigrateStreamFromHandoff(
      { releaseId: rel.id, agentId: o.agentId },
      streamMigrateFrontend,
      migrateResumeStreamRef,
    );
    if (ok) started = true;
  }
  return started;
}

/**
 * Start SSE from a handoff payload when releaseId + agentId are known.
 * @param {{ releaseId?: number, agentId?: string } | null} handoff
 * @param {(releaseId: number, agentId: string) => Promise<boolean>} streamMigrateFrontend
 * @param {{ current: Set<string> }} migrateResumeStreamRef
 * @returns {Promise<boolean>} true when SSE connected
 */
export async function startMigrateStreamFromHandoff(
  handoff,
  streamMigrateFrontend,
  migrateResumeStreamRef,
) {
  const releaseId = Number(handoff?.releaseId);
  const agentId = handoff?.agentId != null ? String(handoff.agentId).trim() : "";
  if (!Number.isInteger(releaseId) || releaseId < 1 || !agentId) return false;
  const dedupeKey = migrateFrontendStreamDedupeKey(releaseId, agentId);
  if (migrateResumeStreamRef.current.has(dedupeKey)) return true;

  const connected = await streamMigrateFrontend(releaseId, agentId);
  if (connected) {
    migrateResumeStreamRef.current.add(dedupeKey);
    return true;
  }
  migrateResumeStreamRef.current.delete(dedupeKey);
  return false;
}
