import assert from "node:assert/strict";
import { describe, it } from "node:test";

const SELECTED_UI_ELEMENT_PREFIX = "[Selected UI element — edit this in the codebase]";
const FOLLOWUP_ELEMENT_USER_SPLIT = "\n\nUser request:\n\n";

function splitFollowupWithElementContext(fullText) {
  if (typeof fullText !== "string") return null;
  const text = fullText.replace(/\r\n/g, "\n");
  if (!text.startsWith(SELECTED_UI_ELEMENT_PREFIX)) return null;

  let contextBlock = "";
  let userText = "";
  const canonical = text.indexOf(FOLLOWUP_ELEMENT_USER_SPLIT);
  if (canonical !== -1) {
    contextBlock = text.slice(0, canonical).trim();
    userText = text.slice(canonical + FOLLOWUP_ELEMENT_USER_SPLIT.length).trim();
  } else {
    const loose = text.match(/\n+User request:\s*\n*/);
    if (!loose || loose.index == null) return null;
    contextBlock = text.slice(0, loose.index).trim();
    userText = text.slice(loose.index + loose[0].length).trim();
  }

  return {
    contextBlock,
    userText,
    tag: "img",
    inspectorCtx: { tag: "img", reactComponentStack: ["SidebarHeader"] },
  };
}

function resolveFeedbackDescriptionDisplay(fullDescription, pickedElement) {
  const full = String(fullDescription || "").trim();
  const split = splitFollowupWithElementContext(full);
  const inspectorCtx = pickedElement || split?.inspectorCtx || null;
  const tag =
    inspectorCtx?.reactComponentStack?.[0] ||
    inspectorCtx?.componentHint ||
    inspectorCtx?.tag ||
    split?.tag ||
    "element";

  let userText = split?.userText ?? full;
  let contextBlock = split?.contextBlock || "";

  if (!split && full.startsWith(SELECTED_UI_ELEMENT_PREFIX)) {
    userText = "";
    contextBlock = full;
  } else if (userText.startsWith(SELECTED_UI_ELEMENT_PREFIX)) {
    userText = "";
  }

  return {
    userText,
    inspectorCtx,
    tag,
    contextBlock,
    hasElementContext: Boolean(inspectorCtx || contextBlock || pickedElement),
  };
}

function assembleFeedbackDescriptionWithElementContext(
  userText,
  pickedElement,
  previousFullDescription = "",
) {
  const body = String(userText || "").trim();
  if (pickedElement && typeof pickedElement === "object") {
    const block = `${SELECTED_UI_ELEMENT_PREFIX}\n- Tag: ${pickedElement.tag}\n\nUser request:`;
    return body ? `${block}\n\n${body}` : block;
  }
  const split = splitFollowupWithElementContext(previousFullDescription);
  if (split?.contextBlock) {
    return body ? `${split.contextBlock}\n\n${body}` : split.contextBlock;
  }
  return body;
}

describe("feedbackElementContextDisplay contract", () => {
  it("hides raw prompt and keeps user text", () => {
    const full = `${SELECTED_UI_ELEMENT_PREFIX}\n- Tag: img${FOLLOWUP_ELEMENT_USER_SPLIT}make this logo size smaller`;
    const display = resolveFeedbackDescriptionDisplay(full, null);
    assert.equal(display.userText, "make this logo size smaller");
    assert.equal(display.hasElementContext, true);
    assert.equal(display.tag, "SidebarHeader");
    assert.equal(display.userText.includes(SELECTED_UI_ELEMENT_PREFIX), false);
  });

  it("splits loose User request delimiters used in stored feedback", () => {
    const full = `${SELECTED_UI_ELEMENT_PREFIX}\n- Tag: img\nUser request:\nmake this logo size smaller`;
    const display = resolveFeedbackDescriptionDisplay(full, null);
    assert.equal(display.userText, "make this logo size smaller");
    assert.equal(display.hasElementContext, true);
    assert.equal(display.userText.includes("Selected UI element"), false);
  });

  it("reassembles description for API/agent from user edit", () => {
    const previous = `${SELECTED_UI_ELEMENT_PREFIX}\n- Tag: img${FOLLOWUP_ELEMENT_USER_SPLIT}old text`;
    const next = assembleFeedbackDescriptionWithElementContext(
      "make this logo size smaller",
      null,
      previous,
    );
    assert.match(next, /Selected UI element/);
    assert.match(next, /make this logo size smaller/);
    assert.doesNotMatch(next, /old text/);
  });
});
