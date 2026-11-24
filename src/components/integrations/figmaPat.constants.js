/** Figma account settings — Security → Personal access tokens */
export const FIGMA_ACCOUNT_SETTINGS_URL = "https://www.figma.com/settings";

export const FIGMA_PAT_HELP_URL =
  "https://help.figma.com/hc/en-us/articles/8085703776207-Manage-personal-access-tokens";

/** LaunchPad Figma plugin ZIP (same URL as project onboarding). */
export const FIGMA_PLUGIN_DOWNLOAD_URL =
  "https://yorkie-launchpad.s3.us-east-1.amazonaws.com/Launchpad.zip";

export const FIGMA_PLUGIN_GUIDE_URL =
  "https://docs.google.com/document/d/1RZtSAuOQqT2Cqu0HyguR8dc_EmL159pHsv00pzTMBgI/edit?tab=t.0";

/** Step-by-step path in the Figma web app to create a personal access token. */
export const FIGMA_PAT_CREATION_STEPS = [
  "Open figma.com and sign in.",
  "Click your name in the top-left corner.",
  "Select Settings.",
  "Open the Security tab.",
  "Scroll down to Personal access tokens.",
  'Click Generate new token, name it (for example, "LaunchPad"), and select the read scopes below.',
  "Copy the token right away — Figma shows it only once — then paste it below.",
];

/**
 * Figma PAT scopes LaunchPad needs. `required: true` = enable when creating the token.
 * Write/delete scopes are listed for clarity but should stay off unless you know you need them.
 */
export const FIGMA_PAT_SCOPE_GROUPS = [
  {
    category: "Users",
    scopes: [
      {
        label: "Read the current user's name, email, and profile image",
        required: true,
      },
    ],
  },
  {
    category: "Files",
    scopes: [
      { label: "Read comments in accessible files", required: true },
      {
        label: "Create, modify, and delete comments in accessible files",
        required: false,
      },
      {
        label: "Read the contents of and render images from files",
        required: true,
      },
      { label: "Read metadata of files", required: true },
      { label: "Read version history of files", required: true },
    ],
  },
  {
    category: "Design systems",
    scopes: [
      {
        label: "Read data about individual components and styles",
        required: true,
      },
      {
        label: "Read components and styles published from individual files",
        required: true,
      },
      {
        label: "Read components and styles published in team libraries",
        required: true,
      },
    ],
  },
  {
    category: "Development",
    scopes: [
      {
        label: "Read and list dev resources in accessible files",
        required: true,
      },
      {
        label: "Create and modify dev resources in accessible files",
        required: false,
      },
    ],
  },
  {
    category: "Projects",
    scopes: [{ label: "Read team project structure", required: true }],
  },
  {
    category: "Webhooks",
    scopes: [
      { label: "Read and list webhooks", required: false },
      { label: "Create, modify, and delete webhooks", required: false },
    ],
  },
];
