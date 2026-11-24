/** Pure planning for the voice-mode click-through demo (no DOM access). */
import { screenElementKey } from "./previewScreenContext.util.js";

export const DEMO_LIMITS = Object.freeze({
  CANDIDATES: 12,
  MAX_STEPS: 6,
  FALLBACK_STEPS: 4,
});

export const DEMO_CLICK_DENYLIST =
  /\b(delete|remove|destroy|erase|log ?out|sign ?out|pay|purchase|buy|checkout|order|submit|send|subscribe|unsubscribe|cancel|reset|drop|archive|deactivate|confirm)\b/i;

const CLICKABLE_ROLES = new Set(["tab", "button", "link", "menuitem", "switch"]);

/** True when a snapshot element is safe to click in a demo (heuristic; Jev also votes). */
export function isDemoClickAllowed(el) {
  if (!el || el.kind !== "interactive") return false;
  if (["input", "select", "textarea"].includes(el.tag)) return false;
  if (String(el.type || "").toLowerCase() === "submit") return false;
  if (DEMO_CLICK_DENYLIST.test(el.label || "")) return false;
  if (el.tag === "a") return Boolean(el.href);
  return el.tag === "button" || el.tag === "summary" || CLICKABLE_ROLES.has(el.role);
}

/** Elements present after the run that were not there before (new or changed label/text). */
export function diffScreenSnapshots(before, after) {
  const prev = new Set((before?.elements || []).map(screenElementKey));
  return (after?.elements || []).filter((e) => !prev.has(screenElementKey(e)));
}

/** Words / routes the run report points at: quoted strings, routes, component file names. */
export function extractReportHints(report) {
  const text = String(report || "");
  const phrases = new Set();
  const routes = new Set();
  for (const m of text.matchAll(/["“']([^"”'\n]{3,60})["”']/g))
    phrases.add(m[1].trim().toLowerCase());
  for (const m of text.matchAll(/(?:^|\s)(\/[a-z0-9][a-z0-9/_-]{0,60})(?=[\s.,;)]|$)/gi)) {
    if (!/\.[a-z]{2,4}$/i.test(m[1])) routes.add(m[1].replace(/\/$/, "") || "/");
  }
  for (const m of text.matchAll(/([A-Z][A-Za-z0-9]{2,40})\.(?:jsx|tsx|vue|svelte)\b/g)) {
    const words = m[1].replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
    if (words.length >= 4) phrases.add(words);
  }
  return { phrases: [...phrases], routes: [...routes] };
}

const VIEW_CHANGING_ROLES = new Set(["tab", "link", "menuitem"]);

/**
 * Clicks that swap what's on screen (tabs, links). Candidates come from the post-run view, so these
 * run after in-place steps or they would hide the elements later steps target.
 */
export function isViewChangingStep(step) {
  return step?.action === "click" && (step.tag === "a" || VIEW_CHANGING_ROLES.has(step.role));
}

function toCandidate(el, reason) {
  return {
    id: el.id,
    label: el.label,
    route: el.route || "/",
    selector: el.selector || null,
    tag: el.tag,
    role: el.role || "",
    action: isDemoClickAllowed(el) ? "click" : "show",
    reason,
  };
}

const KIND_PRIORITY = { interactive: 0, text: 1, media: 2 };

/**
 * Candidate demo steps from before/after snapshots and the run report.
 * @returns {{ id: string, label: string, route: string, selector: string | null, action: "show" | "click", reason: string }[]}
 */
export function buildDemoCandidates({ before, after, report }, max = DEMO_LIMITS.CANDIDATES) {
  if (!after) return [];
  const out = [];
  const ids = new Set();
  const push = (c) => {
    if (!c?.id || ids.has(c.id) || out.length >= max) return;
    ids.add(c.id);
    out.push(c);
  };

  const hints = extractReportHints(report);
  const elements = after.elements || [];

  for (const el of elements) {
    const label = (el.label || "").toLowerCase();
    if (hints.phrases.some((p) => label.includes(p) || (label.length >= 4 && p.includes(label)))) {
      push(toCandidate(el, "mentioned in the run report"));
    }
  }

  const added = before ? diffScreenSnapshots(before, after) : [];
  const sameRoute = before && before.route === after.route;
  if (sameRoute) {
    added
      .slice()
      .sort((a, b) => (KIND_PRIORITY[a.kind] ?? 3) - (KIND_PRIORITY[b.kind] ?? 3))
      .forEach((el) => push(toCandidate(el, "new or changed on screen")));
  }

  for (const route of hints.routes) {
    if (route === after.route) continue;
    const link = elements.find((e) => e.href === route);
    push({
      id: `route:${route}`,
      label: link?.label || `the ${route} page`,
      route,
      selector: null,
      tag: "page",
      action: "show",
      reason: "page mentioned in the run report",
    });
  }

  if (!out.length) {
    const hero = elements.find((e) => e.tag === "h1") || elements.find((e) => e.kind === "text");
    if (hero) push(toCandidate({ ...hero, kind: "text" }, "main content of the page"));
  }
  return out;
}

/**
 * Map Jev's ranked ids back to candidates, grouping by route in first-appearance order;
 * within a route, view-changing clicks go last.
 */
export function orderDemoSteps(candidates, decisionSteps, max = DEMO_LIMITS.MAX_STEPS) {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const picked = (decisionSteps || [])
    .map((s) => {
      const c = byId.get(s.id);
      if (!c) return null;
      const action = s.action === "click" && c.action === "click" ? "click" : "show";
      return { ...c, action };
    })
    .filter(Boolean)
    .slice(0, max);
  const routeOrder = [];
  for (const s of picked) if (!routeOrder.includes(s.route)) routeOrder.push(s.route);
  return routeOrder.flatMap((r) => {
    const group = picked.filter((s) => s.route === r);
    return [
      ...group.filter((s) => !isViewChangingStep(s)),
      ...group.filter((s) => isViewChangingStep(s)),
    ];
  });
}

/** Used when Jev is unavailable: first few candidates, clicks kept only when heuristically safe. */
export function fallbackDemoSteps(candidates, max = DEMO_LIMITS.FALLBACK_STEPS) {
  return orderDemoSteps(
    candidates,
    candidates.map((c) => ({ id: c.id, action: c.action })),
    max,
  );
}
