/** Chronology category for summary report API */
export const CHRONOLOGY_CATEGORY = {
  MEDICAL: 'medical',
  BILLING: 'billing',
  MASTER: 'master',
} as const;

export type ChronologyCategory =
  (typeof CHRONOLOGY_CATEGORY)[keyof typeof CHRONOLOGY_CATEGORY];

/** Augmented chronology version status */
export const VERSION_STATUS = {
  LATEST: 'latest',
  ORIGINAL: 'original',
  OLDER: 'older',
} as const;

export type VersionStatus =
  (typeof VERSION_STATUS)[keyof typeof VERSION_STATUS];
