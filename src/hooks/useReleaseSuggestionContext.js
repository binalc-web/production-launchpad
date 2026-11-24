import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchHubMeetingNotesAggregated,
  fetchReleaseSuggestionRepoScan,
} from "@/api";
import { usePaginatedJiraTickets } from "@/hooks/usePaginatedJiraTickets";
import {
  formatSingleHubMeetingToPlainText,
  getHubMeetingRowLabel,
  getHubMeetingRowStableKey,
} from "@/utils/hubMeetingNotes";
import { mapJiraTicketToSuggestionPayload } from "@/utils/releaseSuggestionJira";

const MAX_HUB_MEETINGS_IN_NOTES = 5;

const MEETING_NOTES_TEXTAREA_ID = "release-suggestions-meeting-notes";
const JIRA_SUMMARY_SEARCH_ID = "jira-summary-search";

/**
 * @param {string[]} orderedKeys
 * @param {unknown[]} hubMeetingRows
 * @returns {string}
 */
function buildOrderedHubMeetingNotesText(orderedKeys, hubMeetingRows) {
  const keyToIndex = new Map(
    hubMeetingRows.map((row, index) => [
      getHubMeetingRowStableKey(row, index),
      index,
    ]),
  );
  const blocks = [];
  for (const key of orderedKeys) {
    const index = keyToIndex.get(key);
    if (index === undefined) continue;
    const block = formatSingleHubMeetingToPlainText(
      hubMeetingRows[index],
    ).trim();
    if (block) blocks.push(block);
  }
  return blocks.join("\n\n---\n\n");
}

/**
 * Meeting notes (textarea + Hub) and Jira backlog state for “release / feature suggestions” flows.
 */
export function useReleaseSuggestionContext({
  platformProjectId,
  hubProjectId,
  isActive,
  resetScopeKey,
  contextResetSessionKey = 0,
  jiraBacklogEnabled = true,
  repoScanEnabled = false,
}) {
  const [manualMeetingNotes, setManualMeetingNotes] = useState("");
  const [hubNotesLoading, setHubNotesLoading] = useState(false);
  const [repoScanLoading, setRepoScanLoading] = useState(false);
  const repoScanAbortRef = useRef(null);
  const [hubMeetingRows, setHubMeetingRows] = useState([]);
  const [orderedHubMeetingKeys, setOrderedHubMeetingKeys] = useState([]);

  const [contextSourcesLoading, setContextSourcesLoading] = useState(false);
  const [includeEpic, setIncludeEpic] = useState(true);
  const [includeStory, setIncludeStory] = useState(true);
  const [includeTask, setIncludeTask] = useState(true);
  const [summarySearch, setSummarySearch] = useState("");
  const [selectedJiraKeys, setSelectedJiraKeys] = useState([]);
  const selectedJiraByKeyRef = useRef(new Map());

  const canUseHub = Boolean(hubProjectId);
  const lastParallelFetchKeyRef = useRef(null);
  const jiraResetKey = `${resetScopeKey}:${contextResetSessionKey}`;

  const {
    tickets: jiraTickets,
    loading: jiraLoading,
    loadingMore: jiraLoadingMore,
    error: jiraError,
    hasMore: jiraHasMore,
    projectKey: jiraProjectKey,
    refresh: refreshJiraTickets,
    sentinelRef: jiraSentinelRef,
  } = usePaginatedJiraTickets({
    projectId: platformProjectId,
    enabled: jiraBacklogEnabled,
    isActive,
    resetKey: jiraResetKey,
    includeEpic,
    includeStory,
    includeTask,
    search: summarySearch,
  });

  useEffect(() => {
    if (!isActive) {
      repoScanAbortRef.current?.abort();
      repoScanAbortRef.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    if (resetScopeKey == null) return;
    repoScanAbortRef.current?.abort();
    repoScanAbortRef.current = null;
    setRepoScanLoading(false);
    setManualMeetingNotes("");
    setHubMeetingRows([]);
    setOrderedHubMeetingKeys([]);
    setSelectedJiraKeys([]);
    selectedJiraByKeyRef.current = new Map();
    setSummarySearch("");
    setIncludeEpic(true);
    setIncludeStory(true);
    setIncludeTask(true);
  }, [resetScopeKey, contextResetSessionKey]);

  const loadHubMeetings = useCallback(
    async (opts) => {
      const quiet = opts?.quiet === true;
      if (!hubProjectId) {
        if (!quiet) {
          toast.error(
            "Link this project to a Hub project to load meeting notes.",
          );
        }
        return;
      }
      setHubNotesLoading(true);
      try {
        const rows = await fetchHubMeetingNotesAggregated(hubProjectId);
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
          if (!quiet) {
            toast.message("No meeting notes returned from Hub yet.");
          }
          setHubMeetingRows([]);
        } else {
          setHubMeetingRows(list);
          setOrderedHubMeetingKeys([]);
          if (!quiet) {
            toast.success(
              `${list.length} Hub meeting${list.length === 1 ? "" : "s"} loaded`,
            );
          }
        }
      } catch (err) {
        const msg =
          typeof err?.message === "string"
            ? err.message
            : "Could not load meeting notes";
        toast.error(msg);
      } finally {
        setHubNotesLoading(false);
      }
    },
    [hubProjectId],
  );

  useEffect(() => {
    const valid = new Set(
      hubMeetingRows.map((row, index) => getHubMeetingRowStableKey(row, index)),
    );
    setOrderedHubMeetingKeys((prev) => prev.filter((k) => valid.has(k)));
  }, [hubMeetingRows]);

  const hubMeetingNotesText = useMemo(
    () =>
      buildOrderedHubMeetingNotesText(orderedHubMeetingKeys, hubMeetingRows),
    [orderedHubMeetingKeys, hubMeetingRows],
  );

  useEffect(() => {
    if (orderedHubMeetingKeys.length === 0) return;
    setManualMeetingNotes(hubMeetingNotesText);
  }, [hubMeetingNotesText, orderedHubMeetingKeys]);

  const allHubMeetingsForMultiSelect = useMemo(
    () =>
      hubMeetingRows.map((row, index) => ({
        index,
        key: getHubMeetingRowStableKey(row, index),
        label: getHubMeetingRowLabel(row, index),
      })),
    [hubMeetingRows],
  );

  const toggleHubMeetingKey = useCallback((stableKey) => {
    setOrderedHubMeetingKeys((prev) => {
      if (prev.includes(stableKey)) {
        return prev.filter((k) => k !== stableKey);
      }
      if (prev.length >= MAX_HUB_MEETINGS_IN_NOTES) {
        toast.message(
          `You can include at most ${MAX_HUB_MEETINGS_IN_NOTES} Hub meetings.`,
        );
        return prev;
      }
      return [...prev, stableKey];
    });
  }, []);

  const selectHubMeetingsInListOrderUpToCap = useCallback(() => {
    const picked = [];
    for (
      let i = 0;
      i < hubMeetingRows.length && picked.length < MAX_HUB_MEETINGS_IN_NOTES;
      i += 1
    ) {
      const row = hubMeetingRows[i];
      const block = formatSingleHubMeetingToPlainText(row).trim();
      if (!block) continue;
      picked.push(getHubMeetingRowStableKey(row, i));
    }
    if (!picked.length) {
      toast.message("No meetings with note text to select.");
      return;
    }
    setOrderedHubMeetingKeys(picked);
  }, [hubMeetingRows]);

  const clearMeetingNotes = useCallback(() => {
    setManualMeetingNotes("");
    setOrderedHubMeetingKeys([]);
  }, []);

  const fetchProjectDetailsFromRepo = useCallback(async () => {
    if (!repoScanEnabled || !platformProjectId) {
      toast.error(
        "Set the launchpad repository (gitRepoPath) on this project to fetch project details.",
      );
      return;
    }
    repoScanAbortRef.current?.abort();
    const controller = new AbortController();
    repoScanAbortRef.current = controller;
    setRepoScanLoading(true);
    try {
      const { text } = await fetchReleaseSuggestionRepoScan(platformProjectId, {
        signal: controller.signal,
      });
      const next = typeof text === "string" ? text : "";
      setManualMeetingNotes(next);
      setOrderedHubMeetingKeys([]);
      toast.success("Project details loaded from the repository.");
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "AbortError") {
        return;
      }
      const msg =
        typeof err?.error === "string"
          ? err.error
          : typeof err?.message === "string"
            ? err.message
            : "Could not fetch project details from the repository";
      toast.error(msg);
    } finally {
      if (repoScanAbortRef.current === controller) {
        repoScanAbortRef.current = null;
      }
      setRepoScanLoading(false);
    }
  }, [repoScanEnabled, platformProjectId]);

  const slotsLeftForHubMeetings =
    MAX_HUB_MEETINGS_IN_NOTES - orderedHubMeetingKeys.length;

  const runHubSourceFetch = useCallback(async ({ quiet }) => {
    if (!hubProjectId) return;

    setContextSourcesLoading(true);
    try {
      const rows = await fetchHubMeetingNotesAggregated(hubProjectId);
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        if (!quiet) {
          toast.message("No meeting notes returned from Hub yet.");
        }
        setHubMeetingRows([]);
      } else {
        setHubMeetingRows(list);
        setOrderedHubMeetingKeys([]);
        if (!quiet) {
          toast.success(
            `${list.length} Hub meeting${list.length === 1 ? "" : "s"} loaded`,
          );
        }
      }
    } catch (err) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Could not load meeting notes";
      toast.error(msg);
      setHubMeetingRows([]);
    } finally {
      setContextSourcesLoading(false);
    }
  }, [hubProjectId]);

  useEffect(() => {
    if (!isActive || resetScopeKey == null) return;
    if (!hubProjectId) return;

    const fetchKey = `${resetScopeKey}:${contextResetSessionKey}:hub`;
    if (lastParallelFetchKeyRef.current === fetchKey) return;
    lastParallelFetchKeyRef.current = fetchKey;

    void runHubSourceFetch({ quiet: true });
  }, [
    isActive,
    resetScopeKey,
    contextResetSessionKey,
    hubProjectId,
    runHubSourceFetch,
  ]);

  const toggleJiraKey = useCallback(
    (key) => {
      setSelectedJiraKeys((prev) => {
        if (prev.includes(key)) {
          selectedJiraByKeyRef.current.delete(key);
          return prev.filter((k) => k !== key);
        }
        const ticket = jiraTickets.find((t) => t.key === key);
        if (ticket) selectedJiraByKeyRef.current.set(key, ticket);
        return [...prev, key];
      });
    },
    [jiraTickets],
  );

  const toggleSelectAllJira = useCallback(() => {
    setSelectedJiraKeys((prev) => {
      if (prev.length === jiraTickets.length) {
        selectedJiraByKeyRef.current.clear();
        return [];
      }
      for (const t of jiraTickets) {
        if (t?.key) selectedJiraByKeyRef.current.set(t.key, t);
      }
      return jiraTickets.map((t) => t.key);
    });
  }, [jiraTickets]);

  const buildSuggestionRequestBody = useCallback(() => {
    const body = {};
    if (manualMeetingNotes.trim())
      body.meetingNotes = manualMeetingNotes.trim();
    const selectedIssues = selectedJiraKeys
      .map((key) => selectedJiraByKeyRef.current.get(key) ?? jiraTickets.find((t) => t.key === key))
      .filter(Boolean);
    if (selectedIssues.length) {
      body.selectedJiraIssues = selectedIssues.map(
        mapJiraTicketToSuggestionPayload,
      );
    }
    return body;
  }, [manualMeetingNotes, jiraTickets, selectedJiraKeys]);

  const hasSelectedHubMeetings = orderedHubMeetingKeys.length > 0;
  const hubSourcesReady = !contextSourcesLoading && !hubNotesLoading;
  const showRepoScanOption =
    repoScanEnabled && hubSourcesReady && hubMeetingRows.length === 0;

  const sourcesLoading =
    contextSourcesLoading ||
    (jiraBacklogEnabled && jiraLoading && jiraTickets.length === 0);

  const meetingNotesTextareaProps = {
    id: MEETING_NOTES_TEXTAREA_ID,
    value: manualMeetingNotes,
    onChange: (e) => {
      setManualMeetingNotes(e.target.value);
    },
    placeholder:
      "Paste notes here, or open Hub meetings to build notes from Hub (up to 5). Passed to the model with your Jira selection and project context.",
    className: "min-h-[120px] text-sm transition-all duration-200",
  };

  return {
    buildSuggestionRequestBody,
    sourcesLoading,
    meetingNotes: {
      labelProps: { htmlFor: MEETING_NOTES_TEXTAREA_ID },
      textareaProps: meetingNotesTextareaProps,
      characterCount: {
        current: manualMeetingNotes.length,
      },
      hasSelectedHubMeetings,
      repoScan: {
        available: repoScanEnabled,
        showOption: showRepoScanOption,
        loading: repoScanLoading,
        fetch: fetchProjectDetailsFromRepo,
      },
      hub: {
        canUseHub,
        load: loadHubMeetings,
        loading: hubNotesLoading,
        rowsLoaded: hubMeetingRows.length,
        meetingsSelectedCount: orderedHubMeetingKeys.length,
        maxMeetings: MAX_HUB_MEETINGS_IN_NOTES,
        slotsLeft: slotsLeftForHubMeetings,
        multiSelect: {
          items: allHubMeetingsForMultiSelect,
          selectedKeys: orderedHubMeetingKeys,
          toggle: toggleHubMeetingKey,
          selectInListOrder: selectHubMeetingsInListOrderUpToCap,
        },
        clear: clearMeetingNotes,
      },
    },
    jiraBacklog: {
      backlogDisabled: !jiraBacklogEnabled,
      refresh: refreshJiraTickets,
      loading: jiraLoading,
      loadingMore: jiraLoadingMore,
      hasMore: jiraHasMore,
      projectKey: jiraProjectKey,
      sentinelRef: jiraSentinelRef,
      refreshDisabled: !platformProjectId || !jiraBacklogEnabled,
      typeFilters: {
        includeEpic,
        setIncludeEpic,
        includeStory,
        setIncludeStory,
        includeTask,
        setIncludeTask,
      },
      summarySearch: {
        id: JIRA_SUMMARY_SEARCH_ID,
        value: summarySearch,
        onChange: setSummarySearch,
      },
      error: jiraError,
      tickets: jiraTickets,
      selectedKeys: selectedJiraKeys,
      toggleKey: toggleJiraKey,
      toggleSelectAll: toggleSelectAllJira,
    },
  };
}
