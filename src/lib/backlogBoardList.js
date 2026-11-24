import { format } from "date-fns";

export const BACKLOG_STATUS_OPTIONS = [
  { id: "backlog", label: "Backlog" },
  { id: "ready", label: "Ready" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

export const BACKLOG_EPIC_SORT_OPTIONS = [
  { id: "board", label: "Board order" },
  { id: "newest", label: "Newest created" },
  { id: "oldest", label: "Oldest created" },
  { id: "updated", label: "Recently updated" },
  { id: "title_asc", label: "Title A–Z" },
  { id: "title_desc", label: "Title Z–A" },
  { id: "status", label: "Status" },
  { id: "most_stories", label: "Most items" },
];

export const BACKLOG_STORY_SORT_OPTIONS = [
  { id: "board", label: "Board order" },
  { id: "newest", label: "Newest created" },
  { id: "oldest", label: "Oldest created" },
  { id: "updated", label: "Recently updated" },
  { id: "title_asc", label: "Title A–Z" },
  { id: "title_desc", label: "Title Z–A" },
  { id: "status", label: "Status" },
  { id: "type", label: "Type" },
];

export const BACKLOG_KIND_FILTERS = [
  { id: "any", label: "Any items" },
  { id: "story", label: "Has stories" },
  { id: "task", label: "Has tasks" },
  { id: "empty", label: "No stories" },
];

export const BACKLOG_CONTENT_FILTERS = [
  { id: "any", label: "Any content" },
  { id: "described", label: "Has description" },
  { id: "no_description", label: "No description" },
  { id: "story_notes", label: "Stories have notes" },
  { id: "no_story_notes", label: "Stories lack notes" },
];

const STATUS_ORDER = BACKLOG_STATUS_OPTIONS.map((option) => option.id);

export function formatBacklogTimestamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy, h:mm a");
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function timeOf(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
}

function storiesOf(epic) {
  return Array.isArray(epic?.stories) ? epic.stories : [];
}

function statusRank(status) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? 99 : index;
}

export function backlogEpicStats(epic) {
  const stories = storiesOf(epic);
  const taskCount = stories.filter((story) => story?.type === "task").length;
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
  for (const story of stories) {
    const status = STATUS_ORDER.includes(story?.status) ? story.status : "backlog";
    byStatus[status] += 1;
  }
  const description = text(epic?.description);
  const notedStories = stories.filter((story) => text(story?.body)).length;
  return {
    storyCount: stories.length - taskCount,
    taskCount,
    total: stories.length,
    byStatus,
    descriptionLength: description.length,
    notedStories,
  };
}

function searchBlob(epic) {
  const parts = [epic?.title, epic?.description, epic?.createdByName, epic?.status];
  for (const story of storiesOf(epic)) {
    parts.push(story?.title, story?.body, story?.type, story?.status);
  }
  return parts.filter(Boolean).join("\n").toLowerCase();
}

function sortStories(stories, sort) {
  const list = [...stories];
  list.sort((a, b) => {
    let diff = 0;
    if (sort === "newest") diff = timeOf(b.createdAt) - timeOf(a.createdAt);
    else if (sort === "oldest") diff = timeOf(a.createdAt) - timeOf(b.createdAt);
    else if (sort === "updated") diff = timeOf(b.updatedAt) - timeOf(a.updatedAt);
    else if (sort === "title_asc") diff = compareText(a.title, b.title);
    else if (sort === "title_desc") diff = compareText(b.title, a.title);
    else if (sort === "status") diff = statusRank(a.status) - statusRank(b.status);
    else if (sort === "type") diff = compareText(a.type, b.type);
    else diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (diff !== 0) return diff;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  return list;
}

/**
 * Filter and sort native backlog epics. Story order is display-only.
 * @param {Array<object>} epics
 * @param {{
 *   query?: string,
 *   status?: string,
 *   storyStatus?: string,
 *   kind?: string,
 *   content?: string,
 *   epicSort?: string,
 *   storySort?: string,
 * }} controls
 */
export function filterAndSortBacklogEpics(epics, controls = {}) {
  const query = text(controls.query).toLowerCase();
  const status = controls.status || "all";
  const storyStatus = controls.storyStatus || "all";
  const kind = controls.kind || "any";
  const content = controls.content || "any";
  const epicSort = controls.epicSort || "board";
  const storySort = controls.storySort || "board";
  const list = Array.isArray(epics) ? epics : [];

  const filtered = list.filter((epic) => {
    const stats = backlogEpicStats(epic);
    const stories = storiesOf(epic);
    if (status !== "all" && epic?.status !== status) return false;
    if (storyStatus !== "all" && !stories.some((story) => story?.status === storyStatus)) {
      return false;
    }
    if (kind === "story" && stats.storyCount === 0) return false;
    if (kind === "task" && stats.taskCount === 0) return false;
    if (kind === "empty" && stats.total > 0) return false;
    if (content === "described" && stats.descriptionLength === 0) return false;
    if (content === "no_description" && stats.descriptionLength > 0) return false;
    if (content === "story_notes" && stats.notedStories === 0) return false;
    if (content === "no_story_notes" && (stats.total === 0 || stats.notedStories > 0)) {
      return false;
    }
    if (query && !searchBlob(epic).includes(query)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let diff = 0;
    if (epicSort === "newest") diff = timeOf(b.createdAt) - timeOf(a.createdAt);
    else if (epicSort === "oldest") diff = timeOf(a.createdAt) - timeOf(b.createdAt);
    else if (epicSort === "updated") diff = timeOf(b.updatedAt) - timeOf(a.updatedAt);
    else if (epicSort === "title_asc") diff = compareText(a.title, b.title);
    else if (epicSort === "title_desc") diff = compareText(b.title, a.title);
    else if (epicSort === "status") diff = statusRank(a.status) - statusRank(b.status);
    else if (epicSort === "most_stories") {
      diff = backlogEpicStats(b).total - backlogEpicStats(a).total;
    } else diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (diff !== 0) return diff;
    return (a.id ?? 0) - (b.id ?? 0);
  });

  return filtered.map((epic) => ({
    ...epic,
    stories: sortStories(storiesOf(epic), storySort),
  }));
}

export function backlogFiltersActive(controls = {}) {
  return Boolean(
    text(controls.query) ||
    (controls.status && controls.status !== "all") ||
    (controls.storyStatus && controls.storyStatus !== "all") ||
    (controls.kind && controls.kind !== "any") ||
    (controls.content && controls.content !== "any") ||
    (controls.epicSort && controls.epicSort !== "board") ||
    (controls.storySort && controls.storySort !== "board"),
  );
}

export function backlogStatusCounts(epics) {
  const counts = { all: Array.isArray(epics) ? epics.length : 0 };
  for (const status of STATUS_ORDER) counts[status] = 0;
  for (const epic of epics || []) {
    if (counts[epic?.status] != null) counts[epic.status] += 1;
  }
  return counts;
}
