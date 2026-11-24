import assert from "node:assert/strict";
import test from "node:test";
import {
  backlogEpicStats,
  backlogFiltersActive,
  filterAndSortBacklogEpics,
  formatBacklogTimestamp,
} from "../src/lib/backlogBoardList.js";

const billing = {
  id: 1,
  title: "Billing",
  description: "Charge customers",
  status: "ready",
  sortOrder: 2,
  createdByName: "Ada",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  stories: [
    {
      id: 11,
      title: "Invoices",
      body: "PDF invoices",
      type: "story",
      status: "done",
      sortOrder: 1,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: 12,
      title: "Tax task",
      body: "",
      type: "task",
      status: "backlog",
      sortOrder: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z",
    },
  ],
};

const empty = {
  id: 2,
  title: "Empty epic",
  description: "",
  status: "backlog",
  sortOrder: 0,
  createdByName: "",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  stories: [],
};

test("stats count stories, tasks, notes, and description length", () => {
  const stats = backlogEpicStats(billing);
  assert.equal(stats.storyCount, 1);
  assert.equal(stats.taskCount, 1);
  assert.equal(stats.notedStories, 1);
  assert.equal(stats.byStatus.done, 1);
  assert.equal(stats.byStatus.backlog, 1);
  assert.ok(stats.descriptionLength > 0);
  assert.ok(formatBacklogTimestamp(billing.createdAt));
  assert.equal(formatBacklogTimestamp(""), "");
});

test("filters by status, story status, kind, content, and search", () => {
  const epics = [billing, empty];
  assert.deepEqual(
    filterAndSortBacklogEpics(epics, { status: "backlog" }).map((epic) => epic.id),
    [2],
  );
  assert.deepEqual(
    filterAndSortBacklogEpics(epics, { storyStatus: "done" }).map((epic) => epic.id),
    [1],
  );
  assert.deepEqual(
    filterAndSortBacklogEpics(epics, { kind: "task" }).map((epic) => epic.id),
    [1],
  );
  assert.deepEqual(
    filterAndSortBacklogEpics(epics, { kind: "empty" }).map((epic) => epic.id),
    [2],
  );
  assert.deepEqual(
    filterAndSortBacklogEpics(epics, { content: "no_description" }).map((epic) => epic.id),
    [2],
  );
  assert.deepEqual(
    filterAndSortBacklogEpics(epics, { query: "ada" }).map((epic) => epic.id),
    [1],
  );
  assert.equal(backlogFiltersActive({ query: "ada" }), true);
  assert.equal(backlogFiltersActive({}), false);
});

test("sorts epics by created date and stories by board order or title", () => {
  const newest = filterAndSortBacklogEpics([billing, empty], { epicSort: "newest" });
  assert.deepEqual(
    newest.map((epic) => epic.id),
    [2, 1],
  );

  const boardStories = filterAndSortBacklogEpics([billing], { storySort: "board" })[0].stories;
  assert.deepEqual(
    boardStories.map((story) => story.id),
    [12, 11],
  );

  const titled = filterAndSortBacklogEpics([billing], { storySort: "title_asc" })[0].stories;
  assert.deepEqual(
    titled.map((story) => story.title),
    ["Invoices", "Tax task"],
  );
});
