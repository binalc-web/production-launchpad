import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { usePaginatedJiraTickets } from "@/hooks/usePaginatedJiraTickets";
import { mapJiraTicketToSuggestionPayload } from "@/utils/releaseSuggestionJira";
import {
  getCaptureEntryPreview,
  getCaptureEntryTitle,
  getCaptureTypeLabel,
} from "@/lib/captureEntryPreview";
import { buildOrderedCaptureContextText } from "@/lib/captureContextText";

const MAX_CAPTURE_ENTRIES = 10;
const JIRA_SUMMARY_SEARCH_ID = "backlog-jira-summary-search";

/**
 * Capture timeline + Jira backlog state for backlog suggestions.
 */
export function useBacklogSuggestionContext({
  platformProjectId,
  isActive,
  resetScopeKey,
  contextResetSessionKey = 0,
  jiraBacklogEnabled = true,
  consumeBootstrap,
}) {
  const { clientDetails, loading: clientDetailsLoading } = useClientInfoContext();

  const timelineEntries = useMemo(() => {
    const list = Array.isArray(clientDetails?.timeline) ? clientDetails.timeline : [];
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [clientDetails?.timeline]);

  const [manualContextText, setManualContextText] = useState("");
  const [orderedCaptureIds, setOrderedCaptureIds] = useState([]);
  /** When set, suggestions were opened from a document text selection. */
  const [documentSelectionSource, setDocumentSelectionSource] = useState(null);

  const [includeEpic, setIncludeEpic] = useState(true);
  const [includeStory, setIncludeStory] = useState(true);
  const [includeTask, setIncludeTask] = useState(true);
  const [summarySearch, setSummarySearch] = useState("");
  const [selectedJiraKeys, setSelectedJiraKeys] = useState([]);
  const selectedJiraByKeyRef = useRef(new Map());

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
    setManualContextText("");
    setOrderedCaptureIds([]);
    setDocumentSelectionSource(null);
    setSelectedJiraKeys([]);
    selectedJiraByKeyRef.current = new Map();
  }, [resetScopeKey, contextResetSessionKey]);

  useEffect(() => {
    if (!isActive || typeof consumeBootstrap !== "function") return;
    const bootstrap = consumeBootstrap();
    if (!bootstrap) return;

    if (bootstrap.manualContextText) {
      setManualContextText(String(bootstrap.manualContextText));
    }
    if (Array.isArray(bootstrap.selectedCaptureEntryIds)) {
      setOrderedCaptureIds(bootstrap.selectedCaptureEntryIds.map(String).filter(Boolean));
    }
    if (bootstrap.sourceDocId || bootstrap.sourceDocName) {
      setDocumentSelectionSource({
        docId: bootstrap.sourceDocId ?? null,
        docName: bootstrap.sourceDocName?.trim() || "Document",
      });
    }
  }, [isActive, consumeBootstrap, contextResetSessionKey]);

  const mergedCaptureText = useMemo(() => {
    if (orderedCaptureIds.length === 0) return manualContextText;
    const fromEntries = buildOrderedCaptureContextText(orderedCaptureIds, timelineEntries);
    const manual = manualContextText.trim();
    if (!manual) return fromEntries;
    if (!fromEntries) return manual;
    return `${fromEntries}\n\n---\n\n${manual}`;
  }, [orderedCaptureIds, timelineEntries, manualContextText]);

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

  const captureMulti = useMemo(() => {
    const items = timelineEntries.map((entry) => {
      const id = String(entry.id ?? entry.createdAt ?? Math.random());
      const orderIdx = orderedCaptureIds.indexOf(id);
      return {
        id,
        entry,
        label: getCaptureEntryTitle(entry),
        typeLabel: getCaptureTypeLabel(entry),
        preview: getCaptureEntryPreview(entry),
        createdAt: entry.createdAt ?? null,
        selectionOrder: orderIdx >= 0 ? orderIdx + 1 : null,
      };
    });

    const selectedItems = orderedCaptureIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean);

    const toggle = (id) => {
      setOrderedCaptureIds((prev) => {
        const sid = String(id);
        if (prev.includes(sid)) return prev.filter((x) => x !== sid);
        if (prev.length >= MAX_CAPTURE_ENTRIES) {
          toast.message(`Up to ${MAX_CAPTURE_ENTRIES} capture entries`);
          return prev;
        }
        return [...prev, sid];
      });
    };

    const clear = () => setOrderedCaptureIds([]);

    const selectInListOrder = () => {
      setOrderedCaptureIds(items.slice(0, MAX_CAPTURE_ENTRIES).map((i) => i.id));
    };

    const addSelection = (ids) => {
      const incoming = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
      if (!incoming.length) return;
      setOrderedCaptureIds((prev) => {
        const next = [...prev];
        let capped = false;
        for (const sid of incoming) {
          if (next.includes(sid)) continue;
          if (next.length >= MAX_CAPTURE_ENTRIES) {
            capped = true;
            break;
          }
          next.push(sid);
        }
        if (capped) toast.message(`Up to ${MAX_CAPTURE_ENTRIES} capture entries`);
        return next;
      });
    };

    const removeSelection = (ids) => {
      const drop = new Set((Array.isArray(ids) ? ids : []).map(String));
      if (!drop.size) return;
      setOrderedCaptureIds((prev) => prev.filter((id) => !drop.has(id)));
    };

    return {
      items,
      selectedItems,
      selectedIds: orderedCaptureIds,
      selectedKeys: orderedCaptureIds,
      toggle,
      clear,
      selectInListOrder,
      addSelection,
      removeSelection,
    };
  }, [timelineEntries, orderedCaptureIds]);

  const buildSuggestionRequestBody = useCallback(() => {
    const selectedCaptureEntries = orderedCaptureIds
      .map((id) => timelineEntries.find((e) => String(e.id) === String(id)))
      .filter(Boolean)
      .map((entry) => ({
        id: String(entry.id ?? ""),
        type: entry.type,
        title: entry.title ?? "",
        body: entry.body ?? "",
        extractedData: entry.extractedData ?? null,
      }));

    const selectedJiraIssues = selectedJiraKeys
      .map((key) => selectedJiraByKeyRef.current.get(key) ?? jiraTickets.find((t) => t.key === key))
      .filter(Boolean)
      .map(mapJiraTicketToSuggestionPayload);

    const hasStrictCaptureFocus = orderedCaptureIds.length > 0 || Boolean(documentSelectionSource);

    return {
      captureContextText: mergedCaptureText.trim() || undefined,
      selectedCaptureEntries,
      selectedJiraIssues,
      ...(hasStrictCaptureFocus ? { strictCaptureContext: true } : {}),
    };
  }, [
    mergedCaptureText,
    orderedCaptureIds,
    timelineEntries,
    selectedJiraKeys,
    jiraTickets,
    documentSelectionSource,
  ]);

  /** True when suggestions should stay within selected capture or document selection. */
  const hasStrictCaptureFocus = orderedCaptureIds.length > 0 || Boolean(documentSelectionSource);

  const sourcesLoading = jiraBacklogEnabled
    ? jiraLoading && !jiraTickets.length
    : clientDetailsLoading;

  const appendManualContextText = useCallback((block) => {
    const next = typeof block === "string" ? block.trim() : "";
    if (!next) return;
    setManualContextText((prev) => {
      const p = prev.trim();
      return p ? `${p}\n\n---\n\n${next}` : next;
    });
  }, []);

  return {
    sourcesLoading,
    buildSuggestionRequestBody,
    appendManualContextText,
    hasStrictCaptureFocus,
    captureContext: {
      labelProps: { htmlFor: "backlog-suggestions-capture-context" },
      textareaProps: {
        id: "backlog-suggestions-capture-context",
        value: manualContextText,
        onChange: (e) => setManualContextText(e.target.value),
        placeholder: "Optional notes to combine with selected Capture entries…",
        rows: 4,
        className: "min-h-[96px] resize-y text-sm",
      },
      characterCount: mergedCaptureText.length,
      hasSelectedCapture: orderedCaptureIds.length > 0,
      documentSelectionSource,
      focusDocumentSelection: Boolean(documentSelectionSource) && orderedCaptureIds.length === 0,
      multiSelect: captureMulti,
      maxEntries: MAX_CAPTURE_ENTRIES,
      entriesLoaded: timelineEntries.length,
      loading: clientDetailsLoading,
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
      allTickets: jiraTickets,
      selectedKeys: selectedJiraKeys,
      toggleKey: toggleJiraKey,
      toggleSelectAll: toggleSelectAllJira,
    },
  };
}
