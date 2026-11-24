import test from "node:test";
import assert from "node:assert/strict";
import { withScreenElementId } from "../src/lib/previewScreenContext.util.js";
import {
  buildDemoCandidates,
  diffScreenSnapshots,
  extractReportHints,
  fallbackDemoSteps,
  isDemoClickAllowed,
  isViewChangingStep,
  orderDemoSteps,
} from "../src/lib/voiceDemoRunner.util.js";
import {
  buildTurnDirective,
  fallbackResultOutcome,
  isLikelyNoiseTranscript,
} from "../src/lib/clientLinkVoiceDirectives.util.js";

const el = (over) =>
  withScreenElementId({
    kind: "interactive",
    tag: "button",
    role: "",
    label: "Go",
    route: "/",
    selector: "button",
    inViewport: true,
    ...over,
  });

test("isDemoClickAllowed denies destructive, form and external targets", () => {
  assert.equal(isDemoClickAllowed(el({ label: "Show pricing" })), true);
  assert.equal(isDemoClickAllowed(el({ label: "Delete account" })), false);
  assert.equal(isDemoClickAllowed(el({ label: "Log out" })), false);
  assert.equal(isDemoClickAllowed(el({ label: "Next", type: "submit" })), false);
  assert.equal(isDemoClickAllowed(el({ tag: "input", label: "Email" })), false);
  assert.equal(isDemoClickAllowed(el({ tag: "a", label: "Docs", href: null })), false);
  assert.equal(isDemoClickAllowed(el({ tag: "a", label: "About", href: "/about" })), true);
  assert.equal(isDemoClickAllowed(el({ tag: "div", role: "tab", label: "Monthly" })), true);
  assert.equal(isDemoClickAllowed(el({ kind: "text", tag: "p", label: "Hello" })), false);
});

test("diffScreenSnapshots returns elements that are new or changed", () => {
  const before = { route: "/", elements: [el({ label: "Old title", kind: "text", tag: "h1" })] };
  const after = {
    route: "/",
    elements: [
      el({ label: "New title", kind: "text", tag: "h1" }),
      el({ label: "Old title", kind: "text", tag: "h1" }),
    ],
  };
  assert.deepEqual(
    diffScreenSnapshots(before, after).map((e) => e.label),
    ["New title"],
  );
});

test("extractReportHints finds quoted phrases, routes and component names", () => {
  const hints = extractReportHints(
    'Changed the hero to "Ship faster" and added /pricing page. Files touched: src/components/PricingCard.jsx, src/main.css',
  );
  assert.ok(hints.phrases.includes("ship faster"));
  assert.ok(hints.phrases.includes("pricing card"));
  assert.ok(hints.routes.includes("/pricing"));
  assert.ok(!hints.routes.some((r) => r.endsWith(".css")));
});

test("buildDemoCandidates prioritizes report mentions, then on-screen changes, then pages", () => {
  const before = { route: "/", elements: [el({ label: "Welcome", kind: "text", tag: "h1" })] };
  const after = {
    route: "/",
    elements: [
      el({ label: "Ship faster", kind: "text", tag: "h1" }),
      el({ label: "Start trial" }),
      el({ tag: "a", label: "Pricing", href: "/pricing" }),
    ],
  };
  const candidates = buildDemoCandidates({
    before,
    after,
    report: 'Updated headline to "Ship faster". New route /pricing.',
  });
  assert.equal(candidates[0].label, "Ship faster");
  assert.equal(candidates[0].action, "show");
  assert.ok(candidates.some((c) => c.label === "Start trial" && c.action === "click"));
  const page = candidates.find((c) => c.id === "route:/pricing");
  assert.equal(page.label, "Pricing");
  assert.equal(page.route, "/pricing");
});

test("buildDemoCandidates falls back to the main heading when nothing changed", () => {
  const snap = { route: "/", elements: [el({ label: "Home", kind: "text", tag: "h1" })] };
  const candidates = buildDemoCandidates({ before: snap, after: snap, report: "" });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].label, "Home");
});

test("orderDemoSteps follows Jev ranking, groups by route and never upgrades to click", () => {
  const c = [
    { id: "a", label: "A", route: "/", action: "show" },
    { id: "b", label: "B", route: "/pricing", action: "click" },
    { id: "c", label: "C", route: "/", action: "click" },
  ];
  const steps = orderDemoSteps(c, [
    { id: "b", action: "click" },
    { id: "a", action: "click" },
    { id: "c", action: "show" },
    { id: "zzz", action: "show" },
  ]);
  assert.deepEqual(
    steps.map((s) => [s.id, s.action]),
    [
      ["b", "click"],
      ["a", "show"],
      ["c", "show"],
    ],
  );
  assert.equal(fallbackDemoSteps(c, 2).length, 2);
});

test("orderDemoSteps runs view-changing clicks after in-place steps on the same route", () => {
  const c = [
    { id: "todo", label: "To do", route: "/", tag: "button", role: "tab", action: "click" },
    { id: "done", label: "Done", route: "/", tag: "button", role: "tab", action: "click" },
    { id: "t1", label: "Renew passport", route: "/", tag: "button", role: "", action: "click" },
    { id: "t2", label: "Pick up oat milk", route: "/", tag: "button", role: "", action: "click" },
  ];
  const steps = orderDemoSteps(
    c,
    c.map((s) => ({ id: s.id, action: "click" })),
  );
  assert.deepEqual(
    steps.map((s) => s.id),
    ["t1", "t2", "todo", "done"],
  );
  assert.equal(isViewChangingStep(steps[0]), false);
  assert.equal(isViewChangingStep({ tag: "a", action: "click" }), true);
  assert.equal(isViewChangingStep({ tag: "a", action: "show" }), false);
});

test("isLikelyNoiseTranscript drops background chatter but keeps real answers", () => {
  assert.equal(isLikelyNoiseTranscript(""), true);
  assert.equal(isLikelyNoiseTranscript("you"), true);
  assert.equal(isLikelyNoiseTranscript("Thank you."), true);
  assert.equal(isLikelyNoiseTranscript("مرحبا كيف حالك"), true);
  assert.equal(isLikelyNoiseTranscript("Привет"), true);
  assert.equal(isLikelyNoiseTranscript("Yes"), false);
  assert.equal(isLikelyNoiseTranscript("okay"), false);
  assert.equal(isLikelyNoiseTranscript("Make the header blue"), false);
  assert.equal(isLikelyNoiseTranscript("Change it to 'Café Menu'"), false);
});

test("voice directives map Jev decisions to speech and fallbacks", () => {
  assert.equal(buildTurnDirective({ action: "start_work" }).forceStartWork, true);
  assert.match(
    buildTurnDirective({ action: "clarify", missingDetail: "copy_text" }).directive,
    /exact wording/,
  );
  assert.match(buildTurnDirective(null).directive, /unavailable/);
  assert.equal(fallbackResultOutcome("Run outcome: failed."), "report_failure");
  assert.equal(fallbackResultOutcome("No new code changes were found."), "report_no_changes");
  assert.equal(fallbackResultOutcome("Run outcome: completed."), "demo");
});

test("only answer turns unlock read-only project tools", () => {
  assert.equal(buildTurnDirective({ action: "answer" }).allowReadTools, true);
  for (const action of ["clarify", "confirm_plan", "start_work", "idle_chat", "confirm_stop"]) {
    assert.ok(!buildTurnDirective({ action }).allowReadTools, action);
  }
  assert.ok(!buildTurnDirective(null).allowReadTools);
});
