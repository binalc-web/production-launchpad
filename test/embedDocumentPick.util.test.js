import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  FEEDBACK_WIDGET_CHROME_SELECTOR,
  isEmbedFeedbackHostElement,
  isFeedbackWidgetChrome,
  pickHostElementAtClientPoint,
  resolvePickableHostElementFromStack,
} from "../src/embed/embedDocumentPick.util.js";
import { EMBED_WIDGET_ROOT_ID } from "../src/embed/embedConstants.js";

const identity = (el) => el;

function makeElement({ tag = "div", id = "", attrs = {}, closestMatches = [] } = {}) {
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    id,
    className: "",
    innerText: "",
    getAttribute(name) {
      return attrs[name] || "";
    },
    closest(selector) {
      if (closestMatches.includes(selector)) return this;
      return null;
    },
    getRootNode() {
      return this;
    },
    parentElement: null,
  };
}

describe("embedDocumentPick.util", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  beforeEach(() => {
    globalThis.window = { scrollX: 0, scrollY: 0, innerWidth: 1280, innerHeight: 800 };
  });

  afterEach(() => {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  });

  it("skips embed shadow host and widget chrome", () => {
    const host = makeElement({ id: EMBED_WIDGET_ROOT_ID });
    assert.equal(isEmbedFeedbackHostElement(host), true);

    const widgetBtn = makeElement({
      closestMatches: [FEEDBACK_WIDGET_CHROME_SELECTOR, "[data-feedback-widget-button]"],
    });
    assert.equal(isFeedbackWidgetChrome(widgetBtn), true);
  });

  it("resolvePickableHostElementFromStack returns the first host-page element", () => {
    const target = makeElement({ tag: "button", id: "target" });
    const host = makeElement({ id: EMBED_WIDGET_ROOT_ID });
    const widgetBtn = makeElement({
      closestMatches: [FEEDBACK_WIDGET_CHROME_SELECTOR, "[data-feedback-widget-button]"],
    });

    const el = resolvePickableHostElementFromStack([host, widgetBtn, target], {
      refinePickTarget: identity,
      resolveReplacementElement: identity,
    });
    assert.equal(el?.id, "target");
  });

  it("pickHostElementAtClientPoint returns null when only widget layers are hit", () => {
    const host = makeElement({ id: EMBED_WIDGET_ROOT_ID });
    const widgetBtn = makeElement({
      closestMatches: [FEEDBACK_WIDGET_CHROME_SELECTOR, "[data-feedback-widget-button]"],
    });

    globalThis.document = {
      elementsFromPoint: () => [host, widgetBtn],
      elementFromPoint: () => widgetBtn,
    };

    assert.equal(
      pickHostElementAtClientPoint(40, 36, {
        refinePickTarget: identity,
        resolveReplacementElement: identity,
      }),
      null,
    );
  });
});
