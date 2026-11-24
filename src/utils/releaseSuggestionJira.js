/**
 * Shared Jira query + filtering helpers for release / feature suggestion flows.
 */

function normalizeJiraIssueType(type) {
  return String(type ?? "")
    .trim()
    .toLowerCase();
}

/** @param {string} type */
export function isJiraEpicIssueType(type) {
  const t = normalizeJiraIssueType(type);
  return t === "epic";
}

/** @param {string} type */
export function isJiraStoryIssueType(type) {
  const t = normalizeJiraIssueType(type);
  return t === "story" || t.includes("story");
}

/** @param {string} type */
export function isJiraTaskIssueType(type) {
  return normalizeJiraIssueType(type) === "task";
}

/**
 * @param {unknown} res — API array or paginated `{ issues, tickets }` wrapper
 * @returns {unknown[]}
 */
export function extractJiraTicketsFromResponse(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.issues)) return res.issues;
  if (Array.isArray(res?.tickets)) return res.tickets;
  return [];
}

/**
 * @param {unknown} res
 * @returns {{ issues: unknown[], nextCursor: string|null, hasMore: boolean, projectKey: string|null }}
 */
export function normalizeJiraTicketsPage(res) {
  const issues = extractJiraTicketsFromResponse(res);
  const nextCursor =
    typeof res?.nextCursor === "string" && res.nextCursor.trim() ? res.nextCursor.trim() : null;
  const hasMore = Boolean(res?.hasMore ?? nextCursor);
  const projectKey =
    typeof res?.projectKey === "string" && res.projectKey.trim() ? res.projectKey.trim() : null;
  return { issues, nextCursor, hasMore, projectKey };
}

/**
 * Merge ticket pages deduped by issue key.
 * @param {unknown[]} prev
 * @param {unknown[]} next
 */
export function mergeJiraTicketPages(prev, next) {
  const map = new Map();
  for (const row of [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(next) ? next : [])]) {
    const key = typeof row?.key === "string" ? row.key.trim() : "";
    if (!key) continue;
    map.set(key, row);
  }
  return [...map.values()];
}

/**
 * @param {object} opts
 * @param {boolean} opts.includeEpic
 * @param {boolean} opts.includeStory
 * @param {boolean} opts.includeTask
 * @param {string} opts.summarySearch
 * @param {number} [opts.limit]
 * @param {string} [opts.cursor]
 * @param {string} [opts.typesOverride] — e.g. `"all"` for release scope browse
 * @returns {Record<string, string|number>}
 */
export function buildJiraRequestParams({
  includeEpic,
  includeStory,
  includeTask,
  summarySearch,
  limit,
  cursor,
  typesOverride,
}) {
  const params = {};
  if (typesOverride === "all") {
    params.types = "all";
  } else {
    const types = [];
    if (includeEpic) types.push("Epic");
    if (includeStory) types.push("Story");
    if (includeTask) types.push("Task");
    params.types = types.join(",");
  }
  const q = summarySearch.trim();
  if (q) params.search = q;
  if (Number.isFinite(limit) && limit > 0) params.limit = Math.floor(limit);
  if (typeof cursor === "string" && cursor.trim()) params.cursor = cursor.trim();
  return params;
}

/**
 * @param {string} type
 * @param {{ includeEpic: boolean, includeStory: boolean, includeTask: boolean }} typeToggles
 */
export function jiraIssueTypeMatchesToggles(type, { includeEpic, includeStory, includeTask }) {
  if (includeEpic && isJiraEpicIssueType(type)) return true;
  if (includeStory && isJiraStoryIssueType(type)) return true;
  if (includeTask && isJiraTaskIssueType(type)) return true;
  return false;
}

/**
 * Keep only Epic / Story / Task rows (case-insensitive), matching UI toggles.
 * @param {unknown} list
 * @param {{ includeEpic: boolean, includeStory: boolean, includeTask: boolean }} typeToggles
 * @returns {unknown[]}
 */
export function filterJiraTicketsByAllowedTypes(list, { includeEpic, includeStory, includeTask }) {
  if (!includeEpic && !includeStory && !includeTask) return [];
  const rows = extractJiraTicketsFromResponse(list);
  return rows.filter((t) =>
    jiraIssueTypeMatchesToggles(t?.type, {
      includeEpic,
      includeStory,
      includeTask,
    }),
  );
}

/**
 * Group Jira issues into epic → stories/tasks for release scope picker.
 * @param {unknown} tickets
 * @param {{ includeEpic: boolean, includeStory: boolean, includeTask: boolean }} [typeToggles]
 */
export function buildJiraScopePickerGroups(
  tickets,
  typeToggles = {
    includeEpic: true,
    includeStory: true,
    includeTask: true,
  },
) {
  const filtered = filterJiraTicketsByAllowedTypes(tickets, typeToggles);
  const epics = filtered.filter((t) => isJiraEpicIssueType(t?.type));
  const epicKeys = new Set(epics.map((e) => e.key));
  const workItems = filtered.filter((t) => !epicKeys.has(t.key) && !isJiraEpicIssueType(t?.type));

  const epicMap = new Map(
    epics.map((e) => [
      e.key,
      {
        epicKey: `jira-epic-${e.key}`,
        epicTitle: e.summary || e.key,
        stories: [],
      },
    ]),
  );

  const orphans = [];

  for (const item of workItems) {
    const storyDto = {
      key: `j:${item.key}`,
      jiraIssueKey: item.key,
      title: item.summary ?? item.key,
      type: item.type,
      status: item.status,
      url: item.url,
    };
    const parentKey = item.parentKey ?? item.parent?.key ?? null;
    if (parentKey) {
      if (!epicMap.has(parentKey)) {
        epicMap.set(parentKey, {
          epicKey: `jira-epic-${parentKey}`,
          epicTitle: item.parentSummary || parentKey,
          stories: [],
        });
      }
      epicMap.get(parentKey).stories.push(storyDto);
    } else {
      orphans.push(storyDto);
    }
  }

  const groups = [...epicMap.values()]
    .filter((g) => g.stories.length > 0)
    .sort((a, b) => a.epicTitle.localeCompare(b.epicTitle));

  if (orphans.length > 0) {
    groups.push({
      epicKey: "jira-unassigned",
      epicTitle: "Other Jira issues",
      stories: orphans,
    });
  }

  return groups;
}

/**
 * Resolve exactly one selected Jira epic from checkbox selection.
 * @param {string[]} selectedKeys
 * @param {unknown[]} tickets
 * @returns {{ status: "none" | "multiple" | "no_epic" | "ready", epic?: { jiraKey: string, title: string, url?: string }, stories?: { key: string, title: string, status: string, url?: string }[] }}
 */
export function resolveSelectedJiraEpicContext(selectedKeys, tickets) {
  const keys = Array.isArray(selectedKeys) ? selectedKeys : [];
  if (keys.length === 0) {
    return { status: "none" };
  }

  const byKey = new Map(
    (Array.isArray(tickets) ? tickets : []).filter((t) => t?.key).map((t) => [t.key, t]),
  );

  const selectedEpics = keys
    .map((key) => byKey.get(key))
    .filter((t) => t && isJiraEpicIssueType(t.type));

  if (selectedEpics.length === 0) {
    return { status: "no_epic" };
  }
  if (selectedEpics.length > 1) {
    return { status: "multiple" };
  }

  const epic = selectedEpics[0];
  const jiraKey = epic.key;
  const stories = (Array.isArray(tickets) ? tickets : [])
    .filter((t) => {
      if (!t?.key || t.key === jiraKey) return false;
      if (!isJiraStoryIssueType(t.type)) return false;
      const parentKey = t.parentKey ?? t.parent?.key ?? null;
      return parentKey === jiraKey;
    })
    .sort((a, b) => String(a.summary ?? a.key).localeCompare(String(b.summary ?? b.key)))
    .map((t) => ({
      key: t.key,
      title: t.summary ?? t.key,
      status: t.status ?? "",
      url: t.url,
    }));

  return {
    status: "ready",
    epic: {
      jiraKey,
      title: epic.summary || jiraKey,
      url: epic.url,
    },
    stories,
  };
}

/**
 * Shape stored in `meetingNotes` / `selectedJiraIssues` API body fields.
 * @param {object} ticket
 * @returns {{ key: string, summary: string, type: string, status: string, url: string }}
 */
export function mapJiraTicketToSuggestionPayload(ticket) {
  return {
    key: ticket.key,
    summary: ticket.summary ?? "",
    type: ticket.type ?? "",
    status: ticket.status ?? "",
    url: ticket.url ?? "",
  };
}
