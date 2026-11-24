import test from "node:test";
import assert from "node:assert/strict";
import {
  SCREEN_SNAPSHOT_LIMITS,
  collectNavigateTargets,
  screenElementKey,
  summarizeScreenSnapshot,
  withScreenElementId,
} from "../src/lib/previewScreenContext.util.js";

const el = (over) =>
  withScreenElementId({
    kind: "interactive",
    tag: "button",
    role: "",
    label: "Go",
    route: "/",
    inViewport: true,
    ...over,
  });

test("withScreenElementId is stable for the same element identity", () => {
  const a = el({ label: "Sign up" });
  const b = el({ label: "Sign up", selector: "different" });
  assert.equal(a.id, b.id);
  assert.notEqual(a.id, el({ label: "Log in" }).id);
  assert.equal(screenElementKey(a), "/|button|interactive|Sign up");
});

test("summarizeScreenSnapshot lists route, headings, visible controls and clips text", () => {
  const summary = summarizeScreenSnapshot({
    route: "/pricing",
    title: "Acme",
    text: "y".repeat(SCREEN_SNAPSHOT_LIMITS.TEXT_CHARS + 500),
    pickedElement: "button Buy",
    elements: [
      el({ kind: "text", tag: "h1", label: "Plans" }),
      el({ tag: "a", label: "About", href: "/about" }),
      el({ label: "Hidden", inViewport: false }),
    ],
  });
  assert.match(summary, /Route: \/pricing/);
  assert.match(summary, /Headings: "Plans"/);
  assert.match(summary, /a "About" -> \/about/);
  assert.doesNotMatch(summary, /Hidden/);
  assert.match(summary, /User picked element: button Buy/);
  const textLine = summary.split("\n").find((l) => l.startsWith("Visible text: "));
  assert.ok(textLine.length <= "Visible text: ".length + SCREEN_SNAPSHOT_LIMITS.TEXT_CHARS);
  assert.equal(summarizeScreenSnapshot(null), "Preview not available.");
});

test("collectNavigateTargets keeps current route first, dedupes and skips protocol-relative", () => {
  const targets = collectNavigateTargets({
    route: "/",
    elements: [
      el({ tag: "a", href: "/about" }),
      el({ tag: "a", href: "/about" }),
      el({ tag: "a", href: "//cdn.example.com" }),
      el({ tag: "a", href: "/contact" }),
    ],
  });
  assert.deepEqual(targets, ["/", "/about", "/contact"]);
});
