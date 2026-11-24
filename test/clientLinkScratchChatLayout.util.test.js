import test from "node:test";
import assert from "node:assert/strict";
import {
  computeScratchBuildInProgress,
  computeScratchChatLayoutActive,
  computeScratchChatPanelDefaultSizes,
  computeShowAiChatToolbarButton,
} from "../src/lib/clientLinkScratchChatLayout.util.js";

test("computeScratchChatLayoutActive requires scratch onboarding and chatOpen", () => {
  assert.equal(computeScratchChatLayoutActive(true, true), true);
  assert.equal(computeScratchChatLayoutActive(true, false), false);
  assert.equal(computeScratchChatLayoutActive(false, true), false);
});

test("computeScratchChatPanelDefaultSizes uses 30/70 split during scratch layout", () => {
  assert.deepEqual(computeScratchChatPanelDefaultSizes(true), {
    chatPanelDefaultSize: "30%",
    previewPanelDefaultSize: "70%",
  });
  assert.deepEqual(computeScratchChatPanelDefaultSizes(false), {
    chatPanelDefaultSize: "0%",
    previewPanelDefaultSize: "100%",
  });
});

test("computeShowAiChatToolbarButton shows during scratch even when chatOpen", () => {
  assert.equal(computeShowAiChatToolbarButton(true, true, true), true);
  assert.equal(computeShowAiChatToolbarButton(true, false, false), true);
  assert.equal(computeShowAiChatToolbarButton(true, true, false), false);
  assert.equal(computeShowAiChatToolbarButton(false, false, true), false);
});

test("computeScratchBuildInProgress stays true while agent runs after preview ready", () => {
  const live = { previewReady: true, agentRunning: true };
  assert.equal(computeScratchBuildInProgress(true, true, live), true);
  assert.equal(
    computeScratchBuildInProgress(true, true, {
      previewReady: true,
      agentRunning: false,
    }),
    false,
  );
  assert.equal(
    computeScratchBuildInProgress(true, false, { agentRunning: true }),
    true,
  );
});
