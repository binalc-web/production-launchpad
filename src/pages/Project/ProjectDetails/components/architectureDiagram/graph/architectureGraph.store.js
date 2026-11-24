import { useCallback, useEffect, useMemo, useReducer } from "react";
import { getSortedTourSteps, resolveTourNodeIds } from "./layout/resolveTourNodeIds.js";
import {
  buildUiPreferenceScope,
  readUiPreferences,
  writeUiPreferences,
} from "../../../../../../lib/uiPreferences.js";

const ARCH_GRAPH_UI_SCHEMA = {
  navigationLevel: { defaultValue: "overview", allowed: ["overview", "layer-detail"] },
  activeLayerId: { defaultValue: "", type: "string" },
  sidebarTab: { defaultValue: "info", allowed: ["info", "files", "tour"] },
  graphTheme: { defaultValue: "light", allowed: ["light", "dark"] },
};

/** Read persisted architecture graph layout prefs for a project. */
function readArchitectureGraphUiPrefs(projectId) {
  if (projectId == null || projectId === "") return {};
  const scope = buildUiPreferenceScope({ projectId });
  const prefs = readUiPreferences(scope, ARCH_GRAPH_UI_SCHEMA);
  return {
    navigationLevel: prefs.navigationLevel,
    activeLayerId: prefs.activeLayerId ? String(prefs.activeLayerId) : null,
    sidebarTab: prefs.sidebarTab,
    graphTheme: prefs.graphTheme,
  };
}

function buildArchitectureGraphInitialState(projectId) {
  const persisted = readArchitectureGraphUiPrefs(projectId);
  return {
    ...initialState,
    ...persisted,
    expandedContainers: new Set(),
    tourActive: false,
    currentTourStep: 0,
    tourHighlightedNodeIds: [],
    tourResolvedNodeIds: [],
    selectedNodeId: null,
  };
}

const initialState = {
  navigationLevel: "overview",
  activeLayerId: null,
  selectedNodeId: null,
  expandedContainers: new Set(),
  sidebarTab: "info",
  graphTheme: "light",
  tourActive: false,
  currentTourStep: 0,
  tourHighlightedNodeIds: [],
  tourResolvedNodeIds: [],
};

/**
 * Pick layer navigation for the first resolvable tour node.
 * @param {Map<string, string>} nodeIdToLayerId
 * @param {string[]} resolvedNodeIds
 */
function navigateTourToLayer(nodeIdToLayerId, resolvedNodeIds) {
  if (!resolvedNodeIds.length) return {};
  const layerId = nodeIdToLayerId.get(resolvedNodeIds[0]);
  if (!layerId) return {};
  return {
    navigationLevel: "layer-detail",
    activeLayerId: layerId,
  };
}

/**
 * Build tour highlight state for a step index.
 * @param {object} graph
 * @param {Map<string, string>} nodeIdToLayerId
 * @param {Map<string, object>} nodesById
 * @param {number} stepIndex
 */
function buildTourStepState(graph, nodeIdToLayerId, nodesById, stepIndex) {
  const sorted = getSortedTourSteps(graph);
  const step = sorted[stepIndex];
  if (!step) {
    return {
      tourHighlightedNodeIds: [],
      tourResolvedNodeIds: [],
    };
  }

  const rawIds = Array.isArray(step.nodeIds) ? step.nodeIds : [];
  const resolvedNodeIds = resolveTourNodeIds(rawIds, graph, nodesById);

  return {
    tourHighlightedNodeIds: rawIds,
    tourResolvedNodeIds: resolvedNodeIds,
    ...navigateTourToLayer(nodeIdToLayerId, resolvedNodeIds),
    selectedNodeId: null,
  };
}

/** Pure reducer — exported for unit tests. */
export function architectureGraphReducer(state, action) {
  switch (action.type) {
    case "drillIntoLayer":
      return {
        ...state,
        navigationLevel: "layer-detail",
        activeLayerId: action.layerId,
        selectedNodeId: null,
        expandedContainers: new Set(),
      };
    case "navigateToOverview":
      return {
        ...state,
        navigationLevel: "overview",
        activeLayerId: null,
        selectedNodeId: null,
        expandedContainers: new Set(),
      };
    case "selectNode":
      return {
        ...state,
        selectedNodeId: action.nodeId,
        sidebarTab: state.tourActive ? state.sidebarTab : "info",
      };
    case "clearSelection":
      return { ...state, selectedNodeId: null };
    case "setSidebarTab":
      return { ...state, sidebarTab: action.tab };
    case "navigateToNodeInLayer":
      return {
        ...state,
        navigationLevel: "layer-detail",
        activeLayerId: action.layerId,
        selectedNodeId: action.nodeId,
        expandedContainers:
          action.layerId === state.activeLayerId ? state.expandedContainers : new Set(),
        sidebarTab: state.tourActive ? state.sidebarTab : "info",
      };
    case "toggleContainer": {
      const next = new Set(state.expandedContainers);
      if (next.has(action.containerId)) {
        next.delete(action.containerId);
      } else {
        next.add(action.containerId);
      }
      return { ...state, expandedContainers: next };
    }
    case "expandContainer": {
      if (state.expandedContainers.has(action.containerId)) return state;
      const next = new Set(state.expandedContainers);
      next.add(action.containerId);
      return { ...state, expandedContainers: next };
    }
    case "collapseAllContainers":
      return { ...state, expandedContainers: new Set() };
    case "setGraphTheme":
      return { ...state, graphTheme: action.theme };
    case "startTour":
      return {
        ...state,
        tourActive: true,
        currentTourStep: 0,
        sidebarTab: "tour",
        ...action.stepState,
      };
    case "stopTour":
      return {
        ...state,
        tourActive: false,
        currentTourStep: 0,
        tourHighlightedNodeIds: [],
        tourResolvedNodeIds: [],
      };
    case "setTourStep":
      return {
        ...state,
        currentTourStep: action.stepIndex,
        ...action.stepState,
      };
    case "reset":
      return {
        ...initialState,
        graphTheme: state.graphTheme,
      };
    default:
      return state;
  }
}

/**
 * Navigation and selection state for the architecture graph.
 * @param {string | number | null | undefined} [projectId]
 */
export function useArchitectureGraphStore(projectId) {
  const [state, dispatch] = useReducer(
    architectureGraphReducer,
    projectId,
    buildArchitectureGraphInitialState,
  );

  useEffect(() => {
    if (projectId == null || projectId === "") return;
    const scope = buildUiPreferenceScope({ projectId });
    writeUiPreferences(scope, {
      navigationLevel: state.navigationLevel,
      activeLayerId: state.activeLayerId ?? "",
      sidebarTab: state.sidebarTab,
      graphTheme: state.graphTheme,
    });
  }, [projectId, state.navigationLevel, state.activeLayerId, state.sidebarTab, state.graphTheme]);

  const drillIntoLayer = useCallback((layerId) => {
    dispatch({ type: "drillIntoLayer", layerId });
  }, []);

  const navigateToOverview = useCallback(() => {
    dispatch({ type: "navigateToOverview" });
  }, []);

  const selectNode = useCallback((nodeId) => {
    dispatch({ type: "selectNode", nodeId });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: "clearSelection" });
  }, []);

  const setSidebarTab = useCallback((tab) => {
    dispatch({ type: "setSidebarTab", tab });
  }, []);

  const navigateToNodeInLayer = useCallback((layerId, nodeId) => {
    dispatch({ type: "navigateToNodeInLayer", layerId, nodeId });
  }, []);

  const setGraphTheme = useCallback((theme) => {
    dispatch({ type: "setGraphTheme", theme });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const stopTour = useCallback(() => {
    dispatch({ type: "stopTour" });
  }, []);

  const startTour = useCallback((graph, nodeIdToLayerId, nodesById) => {
    const sorted = getSortedTourSteps(graph);
    if (!sorted.length) return;
    dispatch({
      type: "startTour",
      stepState: buildTourStepState(graph, nodeIdToLayerId, nodesById, 0),
    });
  }, []);

  const setTourStep = useCallback((stepIndex, graph, nodeIdToLayerId, nodesById) => {
    const sorted = getSortedTourSteps(graph);
    if (stepIndex < 0 || stepIndex >= sorted.length) return;
    dispatch({
      type: "setTourStep",
      stepIndex,
      stepState: buildTourStepState(graph, nodeIdToLayerId, nodesById, stepIndex),
    });
  }, []);

  const nextTourStep = useCallback(
    (graph, nodeIdToLayerId, nodesById) => {
      const sorted = getSortedTourSteps(graph);
      if (state.currentTourStep >= sorted.length - 1) return;
      dispatch({
        type: "setTourStep",
        stepIndex: state.currentTourStep + 1,
        stepState: buildTourStepState(graph, nodeIdToLayerId, nodesById, state.currentTourStep + 1),
      });
    },
    [state.currentTourStep],
  );

  const prevTourStep = useCallback(
    (graph, nodeIdToLayerId, nodesById) => {
      if (state.currentTourStep <= 0) return;
      dispatch({
        type: "setTourStep",
        stepIndex: state.currentTourStep - 1,
        stepState: buildTourStepState(graph, nodeIdToLayerId, nodesById, state.currentTourStep - 1),
      });
    },
    [state.currentTourStep],
  );

  const openTourTab = useCallback(() => {
    dispatch({ type: "setSidebarTab", tab: "tour" });
  }, []);

  const toggleContainer = useCallback((containerId) => {
    dispatch({ type: "toggleContainer", containerId });
  }, []);

  const expandContainer = useCallback((containerId) => {
    dispatch({ type: "expandContainer", containerId });
  }, []);

  const collapseAllContainers = useCallback(() => {
    dispatch({ type: "collapseAllContainers" });
  }, []);

  return useMemo(
    () => ({
      ...state,
      drillIntoLayer,
      navigateToOverview,
      selectNode,
      clearSelection,
      setSidebarTab,
      navigateToNodeInLayer,
      setGraphTheme,
      reset,
      startTour,
      stopTour,
      setTourStep,
      nextTourStep,
      prevTourStep,
      openTourTab,
      toggleContainer,
      expandContainer,
      collapseAllContainers,
    }),
    [
      state,
      drillIntoLayer,
      navigateToOverview,
      selectNode,
      clearSelection,
      setSidebarTab,
      navigateToNodeInLayer,
      setGraphTheme,
      reset,
      startTour,
      stopTour,
      setTourStep,
      nextTourStep,
      prevTourStep,
      openTourTab,
      toggleContainer,
      expandContainer,
      collapseAllContainers,
    ],
  );
}
