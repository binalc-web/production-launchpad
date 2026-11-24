/** Copy for post-lock / empty-release guided flows (Release Management + Client Link). */

export const RELEASE_LIFECYCLE = {
  emptyState: {
    title: "No revisions yet",
    activateFirst:
      "Set this release to Active before you can add the first revision or use AI chat on the client link.",
    addRevision: "Add the first revision using one of the options below.",
    openClientLink: "Open the client link to preview and chat once a revision is live.",
    recommendedFromPrior: (priorName, revisionLabel) =>
      `Recommended: continue from Release ${priorName} · ${revisionLabel} (copies the locked head as your new starting point).`,
  },
  addRevision: {
    dialogTitle: "Add revision",
    upload: "Upload ZIP",
    uploadOptionHint: "Upload your built frontend as a ZIP file to create this revision.",
    dropzone: "Drag and drop your ZIP here, or click to browse",
    dropzoneHint:
      "ZIP files only. The build output (e.g. index.html at the root) should be inside.",
    baselineCopy: "Continue from last release",
    baselineCopyOptionHint: "Copy the latest prior revision onto this release (no AI).",
    baselineCopyHint: "Copy the latest prior release revision onto this active release (no AI).",
    agent: "Continue from last release + AI changes",
    agentOptionHint: "Start from the prior revision and run a Cursor agent with your instructions.",
    agentHint: "Start from the prior revision and run a Cursor agent with your instructions.",
    draftBlocker: "Set this release to Active before seeding a revision from a prior release.",
    lockedBlocker: "Locked releases cannot receive new revisions.",
    noPrior:
      "This is the first revision for this release, so there's nothing to build on yet. Upload a ZIP to get started.",
    firstRevisionHeading: "Don't have a ZIP yet?",
    firstRevisionBody:
      "Start from a short prompt, or create a plain empty React app as this revision.",
    startWithPrompt: "Start with a prompt",
    startWithPromptLabel: "What should this revision include?",
    startWithPromptPlaceholder: "Describe the app you want…",
    startWithPromptAction: "Start agent",
    startWithPromptSubmitting: "Starting agent…",
    startWithPromptRequired: "Enter a prompt for the agent.",
    emptyReact: "Empty React project",
    emptyReactHint: "Creates a minimal Vite React app and publishes it as this revision.",
    emptyReactAction: "Create empty React project",
    emptyReactSubmitting: "Creating project…",
    priorLabel: (priorName, revisionLabel) => `Source: Release ${priorName} · ${revisionLabel}`,
    agentPromptPlaceholder: "Describe what to change (features, fixes, copy, layout)…",
    agentPromptRequired: "Enter instructions for the AI agent.",
    baselineSubmitting: "Copying baseline…",
    baselineInProgress: (priorName, versionLabel, releaseName) =>
      `Copying Release ${priorName} · ${versionLabel} onto Release ${releaseName}… This can take a few minutes — you can keep working.`,
    baselineAlreadyRunning: "A baseline copy is already running for this release.",
    agentSubmitting: "Starting agent…",
  },
  ongoingSeed: {
    headline: "Building revision",
    detail: "Cursor agent is running. Preview will update when the revision is published.",
  },
};

export const CLIENT_LINK_LIFECYCLE = {
  noActiveOverlay: {
    title: "No active release",
    hasVersions:
      "All releases are locked or none is active, so there is no live revision. Use the Version dropdown above to preview a locked revision (read-only).",
    noVersions:
      "This project has no revisions yet. Add one from Release Management, then return here.",
    stepsTitle: "To enable preview and AI chat",
    steps: [
      "In Release Management, create the next release (e.g. 2.0.0).",
      "Set that release to Active.",
      "Add the first revision (upload ZIP, or continue from the last locked release).",
      "Return to this client link.",
    ],
    stakeholderSteps: [
      "Ask your project owner to create and activate the next release.",
      "They can seed the first revision from the last locked release in Release Management.",
    ],
  },
  activeReleaseAwaitingRevision: {
    title: (releaseName) =>
      releaseName ? `Release ${releaseName} is active` : "Active release has no live revision yet",
    body: "This release is active but has no published revision yet. Add the first revision in Release Management, or use the Version dropdown to preview a locked revision (read-only).",
    stepsTitle: "Add the first revision",
    steps: [
      "Open Release Management.",
      "On the active release, add a revision (upload ZIP or continue from the last locked release).",
      "Return here once the revision is published.",
    ],
  },
  chatBlocked: {
    title: "AI chat is paused",
    why: "There is no active release with a live revision. Locked work is read-only until you start the next release cycle.",
    awaitingFirstRevisionWhy:
      "The active release has no live revision yet. Add the first revision in Release Management to enable preview and chat.",
    readOnlyHint: "Use the Version dropdown to open a locked revision for read-only preview.",
    stepsTitle: "Continue development",
    openDashboard: "Open Release Management",
  },
};
