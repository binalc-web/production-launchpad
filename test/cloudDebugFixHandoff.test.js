import test from "node:test";
import assert from "node:assert/strict";
import { buildCloudDebugFixNowAgentPrompt } from "../src/utils/cloudDebugFixHandoff.util.js";

test("buildCloudDebugFixNowAgentPrompt includes diagnosis, symptom, and additional instructions", () => {
  const prompt = buildCloudDebugFixNowAgentPrompt({
    diagnosis: "Lambda timeout on cold start.",
    userSymptom: "API returns 502 after deploy.",
    additionalPrompt: "Focus on the auth middleware only.",
  });
  assert.match(prompt, /Lambda timeout on cold start/);
  assert.match(prompt, /API returns 502 after deploy/);
  assert.match(prompt, /Additional instructions:/);
  assert.match(prompt, /Focus on the auth middleware only/);
});

test("buildCloudDebugFixNowAgentPrompt omits additional instructions when empty", () => {
  const prompt = buildCloudDebugFixNowAgentPrompt({
    diagnosis: "Stack UPDATE_FAILED.",
    userSymptom: "Deploy failed.",
    additionalPrompt: "   ",
  });
  assert.match(prompt, /Stack UPDATE_FAILED/);
  assert.doesNotMatch(prompt, /Additional instructions:/);
});
