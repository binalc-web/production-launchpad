import { useCallback, useEffect, useState } from "react";
import {
  fetchUnderstandDiffOverlay,
  fetchUnderstandDomainGraph,
  fetchUnderstandGraph,
} from "@/api";

/**
 * Load knowledge graph, optional domain graph, and diff overlay when architecture diagram is ready.
 * @param {number|string|null|undefined} projectId
 * @param {boolean} enabled
 */
export function useArchitectureGraph(projectId, enabled) {
  const [graph, setGraph] = useState(null);
  const [domainGraph, setDomainGraph] = useState(null);
  const [overlay, setOverlay] = useState({ changedNodeIds: [], affectedNodeIds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pid = projectId != null ? Number(projectId) : NaN;
  const validProjectId = Number.isInteger(pid) && pid > 0 ? pid : null;

  const reload = useCallback(async () => {
    if (!validProjectId || !enabled) {
      setGraph(null);
      setDomainGraph(null);
      return null;
    }
    setLoading(true);
    setError("");
    try {
      const [graphData, overlayData, domainData] = await Promise.all([
        fetchUnderstandGraph(validProjectId),
        fetchUnderstandDiffOverlay(validProjectId).catch(() => ({
          changedNodeIds: [],
          affectedNodeIds: [],
        })),
        fetchUnderstandDomainGraph(validProjectId).catch(() => null),
      ]);
      setGraph(graphData);
      setOverlay(overlayData);
      setDomainGraph(domainData?.nodes?.length ? domainData : null);
      return graphData;
    } catch (err) {
      const message =
        typeof err?.error === "string"
          ? err.error
          : err?.message || "Could not load architecture graph.";
      setError(message);
      setGraph(null);
      setDomainGraph(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [validProjectId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    graph,
    domainGraph,
    overlay,
    loading,
    error,
    reload,
    changedNodeIds: new Set(overlay?.changedNodeIds ?? []),
    affectedNodeIds: new Set(overlay?.affectedNodeIds ?? []),
  };
}
