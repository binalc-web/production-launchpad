/** Motion tokens for Infra Analysis diagram flow animation. */

export const FLOW_COLOR_PRIMARY = "#00B38A";
export const FLOW_COLOR_GLOW = "rgba(0, 179, 138, 0.35)";

export const BASE_HOP_DURATION_SEC = 2.0;
export const MIN_HOP_DURATION_SEC = 1.2;
export const MAX_HOP_DURATION_SEC = 4.0;

export const REFERENCE_PATH_LENGTH_PX = 200;
export const SPEED_PX_PER_SEC = REFERENCE_PATH_LENGTH_PX / BASE_HOP_DURATION_SEC;

export const MAX_ANIMATED_PRIMARY_EDGES = 12;
export const MOTION_NODE_CAP = 40;
export const LAYOUT_MORPH_NODE_CAP = 40;
export const LAYOUT_MORPH_MS = 450;

export const SERVICE_NODE_WIDTH = 224;
export const SERVICE_NODE_MIN_HEIGHT = 88;
export const COLUMN_SPACING = 280;
export const ROW_SPACING = 120;
export const GROUP_PADDING_X = 20;
export const GROUP_PADDING_Y = 48;

export const COMET_TRAIL_OFFSETS = [
  { trailIndex: 0, radius: 4, opacity: 1, beginOffsetRatio: 0 },
  { trailIndex: 1, radius: 3, opacity: 0.5, beginOffsetRatio: -0.08 },
  { trailIndex: 2, radius: 2, opacity: 0.25, beginOffsetRatio: -0.16 },
];

export const COLUMN_ENTER_DELAY_MS = {
  users: 0,
  ingress: 80,
  auth: 120,
  compute: 160,
  data: 200,
  observability: 240,
  cicd: 280,
  other: 320,
};

/** @typedef {0.5 | 1 | 2} FlowSpeedMultiplier */
export const FLOW_SPEED_OPTIONS = [0.5, 1, 2];
