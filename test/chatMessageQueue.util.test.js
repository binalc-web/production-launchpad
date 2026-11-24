import test from "node:test";
import assert from "node:assert/strict";
import {
  formatQueuedSendToast,
  isChatQueueCancelAlreadyGoneError,
  isQueuedChatSendResult,
  isWaitingQueuedChatStatus,
  shouldReconnectAfterQueueChange,
  shouldRefreshTranscriptForQueueChange,
  shouldRenderChatMessageQueuePanel,
} from "../src/lib/chatMessageQueue.util.js";

test("isQueuedChatSendResult", () => {
  assert.equal(isQueuedChatSendResult({ queued: true }), true);
  assert.equal(isQueuedChatSendResult({ queued: false }), false);
  assert.equal(isQueuedChatSendResult(null), false);
});

test("formatQueuedSendToast with position and count", () => {
  assert.equal(
    formatQueuedSendToast({ queuePosition: 2, queuedCount: 3 }),
    "Message queued (#2 of 3).",
  );
});

test("formatQueuedSendToast with count only", () => {
  assert.equal(formatQueuedSendToast({ queuedCount: 1 }), "Message queued.");
  assert.equal(formatQueuedSendToast({ queuedCount: 4 }), "4 messages in queue.");
});

test("formatQueuedSendToast fallback", () => {
  assert.equal(formatQueuedSendToast({}), "Message queued.");
});

test("isDispatchingChatQueueItem detects sending state", async () => {
  const { isDispatchingChatQueueItem, formatQueuedDispatchingLabel } =
    await import("../src/lib/chatMessageQueue.util.js");
  assert.equal(isDispatchingChatQueueItem({ queueStatus: "dispatching" }), true);
  assert.equal(isDispatchingChatQueueItem({ queueStatus: "queued" }), false);
  assert.equal(formatQueuedDispatchingLabel(), "Sending queued message to the agent");
});

test("isChatQueueCancelAlreadyGoneError treats Axios/API 404 as already gone", () => {
  assert.equal(isChatQueueCancelAlreadyGoneError({ response: { status: 404 } }), true);
  assert.equal(isChatQueueCancelAlreadyGoneError({ status: 404 }), true);
  assert.equal(isChatQueueCancelAlreadyGoneError({ statusCode: 404 }), true);
  assert.equal(isChatQueueCancelAlreadyGoneError({ response: { status: 500 } }), false);
  assert.equal(isChatQueueCancelAlreadyGoneError({ message: "Network Error" }), false);
  assert.equal(isChatQueueCancelAlreadyGoneError(null), false);
});

test("isWaitingQueuedChatStatus hides only waiting rows from the transcript", () => {
  assert.equal(isWaitingQueuedChatStatus("queued"), true);
  assert.equal(isWaitingQueuedChatStatus("dispatching"), false);
  assert.equal(isWaitingQueuedChatStatus(null), false);
});

test("shouldRenderChatMessageQueuePanel hides empty queue even while loading", () => {
  assert.equal(shouldRenderChatMessageQueuePanel([]), false);
  assert.equal(shouldRenderChatMessageQueuePanel(null), false);
  assert.equal(shouldRenderChatMessageQueuePanel([{ id: 1, queueStatus: "queued" }]), true);
});

test("shouldRefreshTranscriptForQueueChange when a queued prompt starts sending or leaves", () => {
  const queued = [{ id: 1, queueStatus: "queued" }];
  const sending = [{ id: 1, queueStatus: "dispatching" }];
  assert.equal(shouldRefreshTranscriptForQueueChange(queued, sending), true);
  assert.equal(
    shouldRefreshTranscriptForQueueChange(queued, sending, { previousTurnLive: true }),
    false,
  );
  assert.equal(shouldRefreshTranscriptForQueueChange(sending, []), true);
  assert.equal(shouldRefreshTranscriptForQueueChange([], queued), false);
  assert.equal(shouldRefreshTranscriptForQueueChange(queued, queued), false);
  assert.equal(
    shouldRefreshTranscriptForQueueChange(
      [
        { id: 1, queueStatus: "queued" },
        { id: 2, queueStatus: "queued" },
      ],
      [{ id: 2, queueStatus: "queued" }],
    ),
    true,
  );
});

test("shouldReconnectAfterQueueChange only when the queue empties", () => {
  const sending = [{ id: 1, queueStatus: "dispatching" }];
  assert.equal(shouldReconnectAfterQueueChange(sending, []), true);
  assert.equal(shouldReconnectAfterQueueChange([{ id: 1, queueStatus: "queued" }], sending), false);
  assert.equal(shouldReconnectAfterQueueChange([], sending), false);
});
