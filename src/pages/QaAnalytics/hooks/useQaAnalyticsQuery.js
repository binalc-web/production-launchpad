import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @template T
 * @param {() => Promise<T>} fetcher
 * @param {unknown[]} deps
 */
export function useQaAnalyticsQuery(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSuccessAt, setLastSuccessAt] = useState(null);
  const fetcherRef = useRef(fetcher);
  const abortRef = useRef(null);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setRefreshing(!!data);
    setLoading((current) => (data ? current : true));

    try {
      const result = await fetcherRef.current({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setData(result);
      setLastSuccessAt(result?.meta?.generatedAt ?? new Date().toISOString());
    } catch (err) {
      if (controller.signal.aborted || err?.name === "AbortError") return;
      setError(err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [data]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setRefreshing(!!data);
    setLoading((current) => (data ? current : true));

    fetcherRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLastSuccessAt(result?.meta?.generatedAt ?? new Date().toISOString());
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, refreshing, error, reload, lastSuccessAt };
}
