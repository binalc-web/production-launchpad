/** Static post-transfer guidance for admin creator transfer (informational only). */

export const PROJECT_CREATOR_TRANSFER_CONFIRM = {
  title: "Change project creator?",
  description:
    "This updates project ownership. GitHub, Jira, and Bitbucket links and the developer repository URL on the project will be cleared. Running agents and existing credentials are not modified.",
  bullets: [
    "The new creator gains delete and creator-only permissions.",
    "The previous creator is added to Assigned users.",
    "Project integration links (GitHub, Jira, Bitbucket) and the developer repository URL will be cleared and must be re-linked.",
    "In-flight agents and cursor-cloud-agent credentials for other users are not changed.",
  ],
};

export const PROJECT_CREATOR_TRANSFER_NEXT_STEPS = {
  title: "What to do next",
  description:
    "These steps help the new creator take over. They are informational only and do not block anyone from using the project.",
  steps: [
    "If the project has a Launchpad frontend repo, the new creator receives a GitHub collaborator invitation email (they need GitHub connected under Connected accounts first).",
    "Re-link GitHub, Jira, and Bitbucket, and set the developer repository URL again in Project Settings → Integrations.",
    "Ask the new creator to connect GitHub and Figma in their LaunchPad account if agents or Figma flows are used.",
    "The previous creator was added to Assigned users — they keep access but lose creator-only actions.",
    "The project will appear in the new creator's dashboard.",
    "After integrations are re-linked, run a test agent or deploy to confirm git and OAuth access.",
  ],
};
