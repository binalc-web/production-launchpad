import test from "node:test";
import assert from "node:assert/strict";
import {
  findEmbedScriptElement,
  resolveEmbedStylesheetHref,
} from "../src/embed/embedShadowHost.util.js";

test("resolveEmbedStylesheetHref uses widgetBaseUrl from launchpadFeedbackConfig", () => {
  const windowRef = {
    launchpadFeedbackConfig: { widgetBaseUrl: "https://cdn.example.com" },
  };
  assert.equal(
    resolveEmbedStylesheetHref(undefined, windowRef),
    "https://cdn.example.com/embed/feedback-embed.css",
  );
});

test("resolveEmbedStylesheetHref resolves CSS next to feedback-embed.js", () => {
  const script = { src: "https://cdn.example.com/embed/feedback-embed.js" };
  assert.equal(
    resolveEmbedStylesheetHref(script, {}),
    "https://cdn.example.com/embed/feedback-embed.css",
  );
});

test("findEmbedScriptElement returns null without document", () => {
  assert.equal(findEmbedScriptElement(null), null);
});
