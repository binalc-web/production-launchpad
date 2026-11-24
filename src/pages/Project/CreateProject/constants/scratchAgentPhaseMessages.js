/** Delay between each of the four lines when a phase begins (ms). */
export const SCRATCH_AGENT_PHASE_MESSAGE_STEP_MS = 2200;

/** Hold after preview is ready so all four `preview_ready` lines can rotate before leaving onboarding. */
export const SCRATCH_PREVIEW_READY_UI_HOLD_MS =
  4 * SCRATCH_AGENT_PHASE_MESSAGE_STEP_MS;

/** Lucide icon export names — map in CreateProject to components. */
export const SCRATCH_AGENT_PHASE_LUCIDE_ICON = {
  preparing: "Settings",
  agent_starting: "Cpu",
  creating: "Hammer",
  running: "Loader2",
  finished: "CheckCircle2",
  merging_building_preview: "GitMerge",
  finalizing_preview: "Sparkles",
  preview_ready: "Eye",
};

export const SCRATCH_AGENT_PHASE_MESSAGES = {
  preparing: [
    "Setting things up just for you…",
    "Getting the workspace ready before we dive in.",
    "Laying the groundwork — almost there!",
    "Preparing everything agent is starting...",
  ],
  agent_starting: [
    "Your agent is waking up and ready to work!",
    "Firing up the engine — your request is next.",
    "The agent is coming online and loading your task.",
    "Initializing — agent will be with you in a moment.",
  ],
  creating: [
    "Building your project from scratch — magic in progress!",
    "Your agent is crafting the structure piece by piece.",
    "Creating files, folders, and everything in between.",
    "Putting all the pieces together — this won't take long!",
  ],
  running: [
    "Your agent is hard at work — progress is being made!",
    "Executing your task step by step right now.",
    "Running at full speed — sit back and relax!",
    "Agent is running — your results are on the way.",
  ],
  finished: [
    "All done! Your agent has completed the task successfully.",
    "That's a wrap — everything went smoothly!",
    "Task complete! Your results are ready to explore.",
    "Mission accomplished — your agent delivered the goods!",
  ],
  merging_building_preview: [
    "Generation complete — installing dependencies and starting the dev server.",
    "Running npm install and npm run dev for your live preview.",
    "Spinning up the preview runtime — almost there!",
    "Your workspace is ready; bringing the preview online now.",
  ],
  finalizing_preview: [
    "Putting the finishing touches on your preview.",
    "Almost ready — polishing everything up for you.",
    "Final checks in progress — just a few more seconds!",
    "Making sure your preview looks perfect before we reveal it.",
  ],
  preview_ready: [
    "Your preview is live — go ahead and take a look!",
    "It's ready! Your preview is waiting for you.",
    "Fresh out of the oven — your preview is all set!",
    "Boom! Preview is ready. See what agent has built for you.",
  ],
};
