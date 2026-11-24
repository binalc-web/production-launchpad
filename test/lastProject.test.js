import test from "node:test";
import assert from "node:assert/strict";
import {
  LAST_PROJECT_ID_KEY,
  MAX_RECENT_PROJECTS,
  RECENT_PROJECT_IDS_KEY,
  clearLastProjectId,
  forgetProjectId,
  partitionSwitcherProjects,
  readLastProjectId,
  readRecentProjectIds,
  resolveCurrentProjectId,
  resolveHomeProjectId,
  resolveProjectsHomePath,
  writeLastProjectId,
} from "../src/lib/lastProject.js";

/** Minimal localStorage mock. */
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

test("writeLastProjectId / readLastProjectId round-trip", () => {
  withLocalStorage((store) => {
    writeLastProjectId("abc-123");
    assert.equal(readLastProjectId(), "abc-123");
    assert.equal(store.get(LAST_PROJECT_ID_KEY), "abc-123");
    assert.deepEqual(readRecentProjectIds(), ["abc-123"]);
    assert.equal(store.get(RECENT_PROJECT_IDS_KEY), JSON.stringify(["abc-123"]));
  });
});

test("writeLastProjectId keeps recents newest-first and unique", () => {
  withLocalStorage(() => {
    writeLastProjectId("p1");
    writeLastProjectId("p2");
    writeLastProjectId("p3");
    writeLastProjectId("p1");
    assert.deepEqual(readRecentProjectIds(), ["p1", "p3", "p2"]);
  });
});

test("writeLastProjectId caps recents at MAX_RECENT_PROJECTS", () => {
  withLocalStorage(() => {
    for (let i = 1; i <= MAX_RECENT_PROJECTS + 3; i += 1) {
      writeLastProjectId(`p${i}`);
    }
    const recents = readRecentProjectIds();
    assert.equal(recents.length, MAX_RECENT_PROJECTS);
    assert.equal(recents[0], `p${MAX_RECENT_PROJECTS + 3}`);
  });
});

test("readRecentProjectIds falls back to last project when recents key is missing", () => {
  withLocalStorage((store) => {
    store.set(LAST_PROJECT_ID_KEY, "legacy-9");
    assert.deepEqual(readRecentProjectIds(), ["legacy-9"]);
  });
});

test("forgetProjectId removes last id and recents entry", () => {
  withLocalStorage((store) => {
    writeLastProjectId("p1");
    writeLastProjectId("p2");
    forgetProjectId("p2");
    assert.equal(readLastProjectId(), null);
    assert.deepEqual(readRecentProjectIds(), ["p1"]);
    assert.equal(store.has(LAST_PROJECT_ID_KEY), false);
  });
});

test("partitionSwitcherProjects puts recent first then favorites", () => {
  const { recent, favorites, others } = partitionSwitcherProjects(
    [
      { id: "fav-only", name: "Alpha", isFavorite: true },
      { id: "both", name: "Beta", isFavorite: true },
      { id: "plain", name: "Gamma", isFavorite: false },
      { id: "recent-only", name: "Delta", isFavorite: false },
    ],
    ["recent-only", "both"],
  );
  assert.deepEqual(
    recent.map((p) => p.id),
    ["recent-only", "both"],
  );
  assert.deepEqual(
    favorites.map((p) => p.id),
    ["fav-only"],
  );
  assert.deepEqual(
    others.map((p) => p.id),
    ["plain"],
  );
});

test("clearLastProjectId removes stored last project", () => {
  withLocalStorage((store) => {
    writeLastProjectId("abc-123");
    clearLastProjectId();
    assert.equal(readLastProjectId(), null);
    assert.equal(store.has(LAST_PROJECT_ID_KEY), false);
  });
});

test("resolveHomeProjectId prefers stored last id when present", () => {
  withLocalStorage(() => {
    writeLastProjectId("p2");
    const id = resolveHomeProjectId([
      { id: "p1", updatedAt: "2026-08-01" },
      { id: "p2", updatedAt: "2026-07-01" },
    ]);
    assert.equal(id, "p2");
  });
});

test("resolveHomeProjectId falls back to stored last id when the list is empty", () => {
  withLocalStorage(() => {
    writeLastProjectId("stored-9");
    assert.equal(resolveHomeProjectId([]), "stored-9");
  });
});

test("resolveHomeProjectId falls back to first in list when no last id", () => {
  withLocalStorage(() => {
    const id = resolveHomeProjectId([
      { id: "first", updatedAt: "2026-01-01" },
      { id: "second", updatedAt: "2026-08-01" },
    ]);
    assert.equal(id, "first");
  });
});

test("resolveProjectsHomePath uses stored last id when search list is empty", () => {
  withLocalStorage(() => {
    writeLastProjectId("proj-9");
    const path = resolveProjectsHomePath([]);
    assert.match(path, /^\/projects\/details\/proj-9/);
  });
});

test("resolveProjectsHomePath returns onboarding when empty", () => {
  withLocalStorage(() => {
    assert.equal(resolveProjectsHomePath([]), "/projects/onboarding");
  });
});

test("resolveProjectsHomePath builds resume path for last project", () => {
  withLocalStorage(() => {
    writeLastProjectId("proj-9");
    const path = resolveProjectsHomePath([{ id: "proj-9", updatedAt: "2026-08-01" }]);
    assert.match(path, /^\/projects\/details\/proj-9/);
  });
});

test("resolveCurrentProjectId prefers route param over path and storage", () => {
  withLocalStorage(() => {
    writeLastProjectId("stored-9");
    assert.equal(resolveCurrentProjectId("/projects/details/path-7", { projectId: "param-3" }), "param-3");
  });
});

test("resolveCurrentProjectId falls back to path match then stored project", () => {
  withLocalStorage(() => {
    writeLastProjectId("stored-9");
    assert.equal(resolveCurrentProjectId("/projects/details/path-7"), "path-7");
    assert.equal(resolveCurrentProjectId("/deployments"), "stored-9");
  });
});

/*
 * Manual smoke checklist (AWS console chrome):
 * 1. /projects opens last worked project (or newest / onboarding)
 * 2. Top bar: Logo → Services → project line → Switcher → Settings
 * 3. Project switcher lists projects + Create project
 * 4. Settings gear has platform links; no AppSidebar on any route
 * 5. Tour / Review / Preview / overlays reachable from Settings
 */
