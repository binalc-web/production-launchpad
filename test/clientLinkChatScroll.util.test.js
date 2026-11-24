import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_STICK_TO_BOTTOM_THRESHOLD_PX,
  isChatNearBottom,
  scrollChatToBottom,
} from "../src/pages/ClientLink/chat/clientLinkChatScroll.util.js";

test("isChatNearBottom returns true when within threshold", () => {
  const el = {
    scrollHeight: 1000,
    clientHeight: 400,
    scrollTop: 520,
  };
  assert.equal(isChatNearBottom(el), true);
});

test("isChatNearBottom returns false when scrolled up", () => {
  const el = {
    scrollHeight: 1000,
    clientHeight: 400,
    scrollTop: 200,
  };
  assert.equal(isChatNearBottom(el), false);
});

test("isChatNearBottom treats null element as near bottom", () => {
  assert.equal(isChatNearBottom(null), true);
});

test("scrollChatToBottom sets scrollTop to scrollHeight", () => {
  let scrollTop = 0;
  const el = {
    scrollHeight: 2400,
    scrollTo: () => {},
    get scrollTop() {
      return scrollTop;
    },
    set scrollTop(value) {
      scrollTop = value;
    },
  };
  scrollChatToBottom(el);
  assert.equal(scrollTop, 2400);
});

test("CHAT_STICK_TO_BOTTOM_THRESHOLD_PX is a positive number", () => {
  assert.ok(CHAT_STICK_TO_BOTTOM_THRESHOLD_PX > 0);
});
