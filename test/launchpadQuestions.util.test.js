import assert from "node:assert/strict";
import test from "node:test";
import {
  extractLaunchpadQuestionsFence,
  findActiveLaunchpadQuestions,
  formatLaunchpadQuestionsAnswerPrompt,
  synthesizePlainLaunchpadQuestions,
  LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID,
} from "../src/lib/launchpadQuestions.util.js";

test("formatLaunchpadQuestionsAnswerPrompt includes Other free text", () => {
  const questions = [
    {
      id: "scope",
      prompt: "Which scope?",
      options: [
        { id: "mvp", label: "MVP only" },
        { id: "full", label: "Full scope" },
      ],
    },
  ];
  const prompt = formatLaunchpadQuestionsAnswerPrompt(
    questions,
    { scope: LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID },
    { customAnswersByQuestionId: { scope: "Auth module only" } },
  );
  assert.match(prompt, /A: Other: Auth module only/);
});

test("formatLaunchpadQuestionsAnswerPrompt joins multi-select with Other", () => {
  const questions = [
    {
      id: "mods",
      prompt: "Which modules?",
      options: [
        { id: "login", label: "Login" },
        { id: "billing", label: "Billing" },
      ],
      allowMultiple: true,
    },
  ];
  const prompt = formatLaunchpadQuestionsAnswerPrompt(
    questions,
    { mods: ["login", LAUNCHPAD_QUESTIONS_OTHER_OPTION_ID] },
    { customAnswersByQuestionId: { mods: "Notifications" } },
  );
  assert.match(prompt, /A: Login; Other: Notifications/);
});

test("extractLaunchpadQuestionsFence keeps empty options as a typed answer", () => {
  const sample = `\`\`\`launchpad-questions
[{"id":"q1","prompt":"What project display name should appear in the tests?","options":[]}]
\`\`\``;
  const qs = extractLaunchpadQuestionsFence(sample);
  assert.equal(qs?.length, 1);
  assert.deepEqual(qs[0].options, []);
});

test("findActiveLaunchpadQuestions shows a plain question", () => {
  const found = findActiveLaunchpadQuestions([
    {
      id: "a1",
      role: "assistant",
      status: "completed",
      reply: "What project display name should appear in the tests?",
    },
  ]);
  assert.equal(found?.messageId, "a1");
  assert.equal(synthesizePlainLaunchpadQuestions("Fixed the button."), null);
});
