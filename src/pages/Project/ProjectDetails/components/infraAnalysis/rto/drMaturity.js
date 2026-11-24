/** DR maturity stage identifiers (InfraPilot reference). */
export const DR_STAGE_IDS = ["backup_restore", "pilot_light", "warm_standby", "multi_site_active"];

/** Four-stage DR maturity model for left-to-right chart. */
export const drStages = [
  {
    id: "backup_restore",
    title: "Backup & Restore",
    rtoRpo: "Hours",
    bullets: [
      "Lowest priority use cases",
      "Provision all AWS resources after event",
      "Restore backups after event",
      "Lowest cost baseline",
      "Higher downtime risk",
    ],
  },
  {
    id: "pilot_light",
    title: "Pilot Light",
    rtoRpo: "10s of minutes",
    bullets: [
      "Data is live",
      "Core services remain available",
      "Provision some AWS resources and scale after event",
      "Faster recovery than backup/restore",
      "Moderate cost",
    ],
  },
  {
    id: "warm_standby",
    title: "Warm Standby",
    rtoRpo: "Minutes",
    bullets: [
      "Always running, but smaller",
      "Suitable for business-critical services",
      "Scale AWS resources after event",
      "Reduced downtime",
      "Higher cost",
    ],
  },
  {
    id: "multi_site_active",
    title: "Multi-site active/active",
    rtoRpo: "Real-time",
    bullets: [
      "Zero downtime target",
      "Near zero data loss",
      "Mission-critical services",
      "Traffic served across multiple sites/regions",
      "Highest cost and complexity",
    ],
  },
];

export function getStageIndex(stageId, stages = drStages) {
  return stages.findIndex((stage) => stage.id === stageId);
}
