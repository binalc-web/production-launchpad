import assert from "node:assert/strict";
import test from "node:test";
import {
  findActivePlanQuestions,
  findIncompletePlanTurn,
  isPlanTurnOutcomeReady,
} from "../src/pages/Project/ProjectDetails/chat/backendCodeChatPlanQuestions.util.js";

test("isPlanTurnOutcomeReady is false for interim narration", () => {
  assert.equal(
    isPlanTurnOutcomeReady(
      "Picking three concrete `backend/src/lib` files and checking whether they already have file headers.",
    ),
    false,
  );
});

test("findIncompletePlanTurn finds completed plan without fence", () => {
  const turn = findIncompletePlanTurn(
    [
      {
        id: "a1",
        role: "assistant",
        mode: "plan",
        status: "completed",
        reply: "Picking three concrete files…",
      },
    ],
    false,
  );
  assert.equal(turn?.messageId, "a1");
  assert.equal(findIncompletePlanTurn([], false), null);
  assert.equal(
    findIncompletePlanTurn(
      [
        {
          id: "a1",
          role: "assistant",
          mode: "plan",
          status: "completed",
          reply: "Picking files",
        },
      ],
      true,
    ),
    null,
  );
});

test("findActivePlanQuestions does not resurrect MCQs after a failed plan turn", () => {
  const questionsReply = `\`\`\`launchpad-questions
[{"id":"q1","prompt":"Pick scope?","options":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"recommended":"a"}]
\`\`\``;
  assert.equal(
    findActivePlanQuestions(
      [
        {
          id: "a1",
          role: "assistant",
          mode: "plan",
          status: "completed",
          reply: questionsReply,
        },
        {
          id: "a2",
          role: "assistant",
          mode: "plan",
          status: "failed",
          reply:
            "Planning finished without a reviewable plan. Send another message in Plan mode to try again.",
        },
      ],
      false,
    ),
    null,
  );
  assert.equal(
    findActivePlanQuestions(
      [
        {
          id: "a1",
          role: "assistant",
          mode: "plan",
          status: "completed",
          reply: questionsReply,
        },
      ],
      false,
    )?.messageId,
    "a1",
  );
});
