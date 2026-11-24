import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProjectDetailsPathWithResume,
  buildProjectJourneyQuery,
  normalizeAreasByStage,
  parseProjectJourneyResume,
  projectJourneyResumeStorageKey,
  readProjectJourneyResume,
  rememberedAreaForStage,
  shouldResumeProjectJourney,
  validateProjectJourneyLocation,
  writeProjectJourneyResume,
} from "../src/lib/projectJourneyResume.js";

const EMPTY_MEMORY = { areasByStage: {}, lastProfile: null };

/** Minimal localStorage mock for resume tests. */
function withLocalStorage(run) {
  const store = new Map();
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
    },
  };
  try {
    run(store);
  } finally {
    if (previous === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previous;
    }
  }
}

test("projectJourneyResumeStorageKey scopes by project id", () => {
  assert.equal(projectJourneyResumeStorageKey(42), "launchpad:project-journey:last:42");
});

test("buildProjectJourneyQuery serializes section and area", () => {
  assert.equal(
    buildProjectJourneyQuery({ section: "backend", area: "backend-code" }),
    "?section=backend&area=backend-code",
  );
  assert.equal(buildProjectJourneyQuery({ section: "environment" }), "?section=environment");
});

test("buildProjectJourneyQuery serializes filter profile and scopeReleaseId", () => {
  assert.equal(
    buildProjectJourneyQuery({
      section: "discovery",
      area: "capture",
      filter: "questionnaires",
    }),
    "?section=discovery&area=capture&filter=questionnaires",
  );
  assert.equal(
    buildProjectJourneyQuery({
      section: "releases",
      area: "active",
      scopeReleaseId: 12,
    }),
    "?section=releases&area=active&scopeReleaseId=12",
  );
});

test("parseProjectJourneyResume rejects invalid JSON", () => {
  assert.equal(parseProjectJourneyResume(null), null);
  assert.equal(parseProjectJourneyResume("{bad"), null);
});

test("validateProjectJourneyLocation accepts preview and application implement areas", () => {
  assert.deepEqual(
    validateProjectJourneyLocation({ section: "web-app", area: "implement" }),
    {
      section: "web-app",
      area: "implement",
      filter: null,
      profile: null,
      scopeReleaseId: null,
      ...EMPTY_MEMORY,
    },
  );
  assert.deepEqual(
    validateProjectJourneyLocation({ section: "backend", area: "implement" }),
    {
      section: "backend",
      area: "implement",
      filter: null,
      profile: null,
      scopeReleaseId: null,
      ...EMPTY_MEMORY,
    },
  );
});

test("validateProjectJourneyLocation normalizes backend and cloud areas", () => {
  assert.deepEqual(validateProjectJourneyLocation({ section: "backend", area: "backend-code" }), {
    section: "backend",
    area: "backend-code",
    filter: null,
    profile: null,
    scopeReleaseId: null,
    ...EMPTY_MEMORY,
  });
  assert.deepEqual(validateProjectJourneyLocation({ section: "cloud-infra", area: "deploy" }), {
    section: "cloud-infra",
    area: "deploy",
    filter: null,
    profile: null,
    scopeReleaseId: null,
    ...EMPTY_MEMORY,
  });
  assert.deepEqual(validateProjectJourneyLocation({ section: "backend", area: "unknown" }), {
    section: "backend",
    area: "backend-code",
    filter: null,
    profile: null,
    scopeReleaseId: null,
    ...EMPTY_MEMORY,
  });
});

test("validateProjectJourneyLocation accepts collaboration overlay", () => {
  assert.deepEqual(validateProjectJourneyLocation({ section: "collaboration" }), {
    section: "collaboration",
    area: null,
    filter: null,
    profile: null,
    scopeReleaseId: null,
    ...EMPTY_MEMORY,
  });
});

test("validateProjectJourneyLocation blocks agent analytics for non-admin", () => {
  assert.equal(
    validateProjectJourneyLocation({ section: "agent-analytics" }, { isAdmin: false }),
    null,
  );
  assert.deepEqual(
    validateProjectJourneyLocation({ section: "agent-analytics" }, { isAdmin: true }),
    {
      section: "agent-analytics",
      area: null,
      filter: null,
      profile: null,
      scopeReleaseId: null,
      ...EMPTY_MEMORY,
    },
  );
});

test("normalizeAreasByStage drops unknown stages and areas", () => {
  assert.deepEqual(
    normalizeAreasByStage({
      releases: "active",
      backlog: "nope",
      capture: "capture",
      mystery: "overview",
      frontend: "approval",
    }),
    { releases: "active" },
  );
});

test("feedback resume maps onto QA Feedbacks", () => {
  withLocalStorage(() => {
    writeProjectJourneyResume(7, { section: "feedback" });
    const resume = readProjectJourneyResume(7);
    assert.equal(resume.section, "feedback");
    assert.equal(resume.area, null);
    assert.deepEqual(resume.areasByStage, { qa: "feedbacks" });
  });
  assert.deepEqual(normalizeAreasByStage({ qa: "feedbacks" }), { qa: "feedbacks" });
});

test("rememberedAreaForStage returns stored sub-area", () => {
  assert.equal(rememberedAreaForStage({ releases: "active" }, "releases"), "active");
  assert.equal(rememberedAreaForStage({ releases: "active" }, "backlog"), undefined);
  assert.equal(rememberedAreaForStage(null, "releases"), undefined);
});

test("write and read project journey resume round-trip", () => {
  withLocalStorage(() => {
    writeProjectJourneyResume(7, { section: "cloud-infra", area: "deploy" });
    assert.deepEqual(readProjectJourneyResume(7), {
      section: "cloud-infra",
      area: "deploy",
      filter: null,
      profile: null,
      scopeReleaseId: null,
      areasByStage: { cloud: "deploy" },
      lastProfile: null,
    });
    assert.equal(
      buildProjectDetailsPathWithResume(7),
      "/projects/details/7?section=cloud-infra&area=deploy",
    );
  });
});

test("write records areasByStage and overlay write keeps prior stage areas", () => {
  withLocalStorage(() => {
    writeProjectJourneyResume(7, { section: "releases", area: "active" });
    assert.deepEqual(readProjectJourneyResume(7).areasByStage, { releases: "active" });

    writeProjectJourneyResume(7, { section: "automations" });
    const overlay = readProjectJourneyResume(7);
    assert.equal(overlay.section, "automations");
    assert.equal(overlay.area, null);
    assert.deepEqual(overlay.areasByStage, { releases: "active" });
    assert.equal(rememberedAreaForStage(overlay.areasByStage, "releases"), "active");

    writeProjectJourneyResume(7, { section: "collaboration" });
    const team = readProjectJourneyResume(7);
    assert.equal(team.section, "collaboration");
    assert.deepEqual(team.areasByStage, { releases: "active" });
  });
});

test("write preserves lastProfile across overlay", () => {
  withLocalStorage(() => {
    writeProjectJourneyResume(7, {
      section: "discovery",
      area: "profiles",
      profile: "client",
    });
    assert.equal(readProjectJourneyResume(7).lastProfile, "client");
    writeProjectJourneyResume(7, { section: "automations" });
    assert.equal(readProjectJourneyResume(7).lastProfile, "client");
  });
});

test("shouldResumeProjectJourney only when section is absent", () => {
  assert.equal(shouldResumeProjectJourney(new URLSearchParams()), true);
  assert.equal(
    shouldResumeProjectJourney(new URLSearchParams("section=backend&area=backend-code")),
    false,
  );
  assert.equal(shouldResumeProjectJourney(new URLSearchParams("editProject=1")), false);
});
