import test from "node:test";
import assert from "node:assert/strict";
import { isChatNearBottom } from "../src/pages/ClientLink/chat/clientLinkChatScroll.util.js";

const ORCHESTRATION_STICK_THRESHOLD_PX = 48;

test("isChatNearBottom respects orchestration stick threshold", () => {
  const el = {
    scrollHeight: 500,
    clientHeight: 200,
    scrollTop: 252,
  };
  assert.equal(
    isChatNearBottom(el, ORCHESTRATION_STICK_THRESHOLD_PX),
    true,
    "within 48px of bottom",
  );
  el.scrollTop = 200;
  assert.equal(
    isChatNearBottom(el, ORCHESTRATION_STICK_THRESHOLD_PX),
    false,
    "scrolled up — should not auto-pin",
  );
});
