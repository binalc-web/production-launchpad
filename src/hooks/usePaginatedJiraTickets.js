import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProjectJiraTickets } from "@/api";
import {
  buildJiraRequestParams,
  filterJiraTicketsByAllowedTypes,
  mergeJiraTicketPages,
  normalizeJiraTicketsPage,
} from "@/utils/releaseSuggestionJira";

const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

function readJiraFetchError(err) {
  if (err && typeof err === "object" && typeof err.error === "string") {
    return err.error;
  }
  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message.trim();
  }
  return "Could not load Jira tickets";
}

/**
 * Paginated Jira ticket list with debounced server search and infinite scroll.
 */
export function usePaginatedJiraTickets({
  projectId,
  enabled = true,
  isActive = true,
  resetKey = "",
  includeEpic = true,
  includeStory = true,
  includeTask = true,
  typesOverride,
  search = "",
  pageSize = DEFAULT_PAGE_SIZE,
  debounceMs = SEARCH_DEBOUNCE_MS,
}) {
  const [tickets, setTickets] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [projectKey, setProjectKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const fetchSeqRef = useRef(0);
  const observerRef = useRef(null);
  const sentinelNodeRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  const typeToggles = { includeEpic, includeStory, includeTask };

  const fetchPage = useCallback(
    async ({ cursor = null, append = false, quiet = false } = {}) => {
      if (!enabled || !projectId) return;
      if (!typesOverride && !includeEpic && !includeStory && !includeTask) {
        setTickets([]);
        setNextCursor(null);
        setHasMore(false);
        return;
      }

      const seq = ++fetchSeqRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      if (!append) setError(null);

      try {
        const params = buildJiraRequestParams({
          includeEpic,
          includeStory,
          includeTask,
          summarySearch: debouncedSearch,
          limit: pageSize,
          cursor: cursor ?? undefined,
          typesOverride,
        });
        const res = await fetchProjectJiraTickets(projectId, params);
        if (seq !== fetchSeqRef.current) return;

        const page = normalizeJiraTicketsPage(res);
        const filtered = typesOverride
          ? page.issues
          : filterJiraTicketsByAllowedTypes(page.issues, typeToggles);

        setProjectKey(page.projectKey);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setTickets((prev) => (append ? mergeJiraTicketPages(prev, filtered) : filtered));
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        const msg = readJiraFetchError(err);
        setError(msg);
        if (!append) {
          setTickets([]);
          setNextCursor(null);
          setHasMore(false);
        }
        if (!quiet) {
          setError(msg);
        }
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [
      enabled,
      projectId,
      includeEpic,
      includeStory,
      includeTask,
      typesOverride,
      debouncedSearch,
      pageSize,
    ],
  );

  useEffect(() => {
    if (!isActive || !enabled || !projectId) {
      setTickets([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }
    fetchPage({ append: false, quiet: true });
  }, [
    isActive,
    enabled,
    projectId,
    resetKey,
    includeEpic,
    includeStory,
    includeTask,
    typesOverride,
    debouncedSearch,
    fetchPage,
  ]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || !nextCursor) return;
    fetchPage({ cursor: nextCursor, append: true, quiet: true });
  }, [loading, loadingMore, hasMore, nextCursor, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage({ append: false, quiet: false });
  }, [fetchPage]);

  const sentinelRef = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      sentinelNodeRef.current = node;
      if (!node || !enabled || !isActive) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const hit = entries.some((e) => e.isIntersecting);
          if (hit) loadMore();
        },
        { root: node.parentElement, rootMargin: "120px", threshold: 0.01 },
      );
      observerRef.current.observe(node);
    },
    [enabled, isActive, loadMore],
  );

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return {
    tickets,
    loading,
    loadingMore,
    error,
    hasMore,
    projectKey,
    loadMore,
    refresh,
    sentinelRef,
  };
}
