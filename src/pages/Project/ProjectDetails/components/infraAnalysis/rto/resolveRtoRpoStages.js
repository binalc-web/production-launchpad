import { DR_STAGE_IDS } from "./drMaturity.js";

const KEBAB_TO_STAGE = {
  "backup-and-restore": "backup_restore",
  "pilot-light": "pilot_light",
  "warm-standby": "warm_standby",
  "active-active": "multi_site_active",
};

const LABEL_TO_STAGE = {
  "backup and restore": "backup_restore",
  "backup & restore": "backup_restore",
  "pilot light": "pilot_light",
  "warm standby": "warm_standby",
  "active-active": "multi_site_active",
  "active/active": "multi_site_active",
  "multi-site active/active": "multi_site_active",
  "multi site active/active": "multi_site_active",
};

/** Pattern label, RTO, and RPO per DR stage. */
export const STAGE_META = {
  backup_restore: { pattern: "Backup & Restore", rto: "Hours", rpo: "Hours" },
  pilot_light: { pattern: "Pilot Light", rto: "10s of minutes", rpo: "30+ minutes" },
  warm_standby: { pattern: "Warm Standby", rto: "Minutes", rpo: "<15 minutes" },
  multi_site_active: { pattern: "Multi-site active/active", rto: "Real-time", rpo: "Near-zero" },
};

function nextStageId(currentStageId) {
  const index = DR_STAGE_IDS.indexOf(currentStageId);
  return index >= 0 && index < DR_STAGE_IDS.length - 1 ? DR_STAGE_IDS[index + 1] : currentStageId;
}

/**
 * Map agent pattern label to DR stage id (fuzzy match).
 * @param {string | undefined} label
 * @returns {string | null}
 */
export function labelToStageId(label) {
  if (!label?.trim()) return null;
  const key = label.trim().toLowerCase();
  if (KEBAB_TO_STAGE[key]) return KEBAB_TO_STAGE[key];
  if (LABEL_TO_STAGE[key]) return LABEL_TO_STAGE[key];
  for (const [pattern, stageId] of Object.entries(LABEL_TO_STAGE)) {
    if (key.includes(pattern) || pattern.includes(key)) return stageId;
  }
  return null;
}

/**
 * Resolve LaunchPad rtoRpo payload into chart-ready view model.
 * @param {object | null | undefined} rtoRpo
 */
export function resolveRtoRpoView(rtoRpo) {
  const currentPattern = String(rtoRpo?.currentPattern ?? "").trim();
  const targetPattern = String(rtoRpo?.targetPattern ?? "").trim();
  const summary = String(rtoRpo?.whyItMatters ?? rtoRpo?.reason ?? "").trim();

  const currentStage = labelToStageId(currentPattern) ?? "backup_restore";
  const targetStage = labelToStageId(targetPattern) ?? nextStageId(currentStage);

  const currentMeta = STAGE_META[currentStage] ?? STAGE_META.backup_restore;
  const targetMeta = STAGE_META[targetStage] ?? STAGE_META.warm_standby;

  return {
    currentStage,
    targetStage,
    summary,
    currentProfile: {
      pattern: currentPattern || currentMeta.pattern,
      rto: currentMeta.rto,
      rpo: currentMeta.rpo,
    },
    targetProfile: {
      pattern: targetPattern || targetMeta.pattern,
      rto: targetMeta.rto,
      rpo: targetMeta.rpo,
    },
  };
}
