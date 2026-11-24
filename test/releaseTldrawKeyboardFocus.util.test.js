import test from "node:test";
import assert from "node:assert/strict";
import {
  releaseTldrawKeyboardFocus,
  stopFormKeyboardPropagation,
} from "../src/features/feedback-widget/lib/releaseTldrawKeyboardFocus.js";

test("releaseTldrawKeyboardFocus blurs editor without stealing form focus", () => {
  const calls = [];
  const editor = {
    setEditingShape: (shape) => calls.push(["setEditingShape", shape]),
    blur: (opts) => calls.push(["blur", opts]),
    focus: () => calls.push(["focus"]),
    updateInstanceState: (state) => calls.push(["updateInstanceState", state]),
    getContainer: () => ({
      blur: () => calls.push(["container.blur"]),
    }),
  };

  releaseTldrawKeyboardFocus(editor);

  assert.deepEqual(calls, [
    ["setEditingShape", null],
    ["blur", { blurContainer: false }],
  ]);
});

test("releaseTldrawKeyboardFocus falls back to isFocused false without blur()", () => {
  const calls = [];
  const editor = {
    setEditingShape: (shape) => calls.push(["setEditingShape", shape]),
    updateInstanceState: (state) => calls.push(["updateInstanceState", state]),
  };

  releaseTldrawKeyboardFocus(editor);

  assert.deepEqual(calls, [
    ["setEditingShape", null],
    ["updateInstanceState", { isFocused: false }],
  ]);
});

test("releaseTldrawKeyboardFocus is safe with null editor", () => {
  assert.doesNotThrow(() => releaseTldrawKeyboardFocus(null));
});

test("stopFormKeyboardPropagation stops event propagation", () => {
  let stopped = false;
  stopFormKeyboardPropagation({
    stopPropagation: () => {
      stopped = true;
    },
  });
  assert.equal(stopped, true);
});
