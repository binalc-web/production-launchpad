import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArchitectureBreadcrumb, ArchitectureLayerLegend } from "./ArchitectureBreadcrumb.jsx";
import { ArchitectureGraphToolbar } from "./ArchitectureGraphToolbar.jsx";
import { ArchitectureTourFitView } from "./ArchitectureTourFitView.jsx";
import { useArchitectureGraphStore } from "./architectureGraph.store.js";
import { buildContainerLayerGraph } from "./layout/buildContainerLayerGraph.js";
import { buildLayerEdges, buildOverviewGraph } from "./layout/buildOverviewGraph.js";
import {
  buildGraphIndexes,
  ensureLayers,
  layerNodeIds,
  normalizeEdges,
} from "./layout/graphIndexes.js";
import { deriveContainers } from "./layout/deriveContainers.js";
import { expandLayerNodeIds, filterLayerStructuralNodes } from "./layout/applyGraphFilters.js";
import { getSortedTourSteps, resolveTourNodeIds } from "./layout/resolveTourNodeIds.js";
import { LayerClusterNode } from "./nodes/LayerClusterNode.jsx";
import { ArchitectureFileNode } from "./nodes/ArchitectureFileNode.jsx";
import { ContainerNode } from "./nodes/ContainerNode.jsx";
import { PortalNode } from "./nodes/PortalNode.jsx";
import { ArchitectureGraphSidebar } from "./panels/ArchitectureGraphSidebar.jsx";
import { ArchitectureTourNavBar } from "./ArchitectureTourNavBar.jsx";
import { graphEdgeRouting, isGraphUiNode } from "./constants.js";
import "./architectureGraphThemes.css";

const nodeTypes = {
  "layer-cluster": LayerClusterNode,
  "architecture-file": ArchitectureFileNode,
  container: ContainerNode,
  portal: PortalNode,
};

function GraphFlowInner({
  graph,
  changedNodeIds,
  affectedNodeIds,
  store,
  isExpanded,
  onToggleExpanded,
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layouting, setLayouting] = useState(false);
  const sidebarRef = useRef(null);
  const containerLayoutCacheRef = useRef(new Map());
  const containerSizeMemoryRef = useRef(new Map());

  const layers = useMemo(() => ensureLayers(graph), [graph]);
  const { nodesById, nodeIdToLayerId, nodeIdToLayerIds } = useMemo(
    () => buildGraphIndexes({ ...graph, layers }),
    [graph, layers],
  );

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === store.activeLayerId) ?? null,
    [layers, store.activeLayerId],
  );

  const selectedNode = useMemo(() => {
    if (!store.selectedNodeId) return null;
    const node = nodesById.get(store.selectedNodeId);
    return node && isGraphUiNode(node) ? node : null;
  }, [store.selectedNodeId, nodesById]);

  const handleDrillIn = useCallback(
    (layerId) => {
      store.drillIntoLayer(layerId);
    },
    [store],
  );

  const handleNodeClick = useCallback(
    (nodeId) => {
      store.selectNode(nodeId);
    },
    [store],
  );

  const handleContainerToggle = useCallback(
    (containerId) => {
      store.toggleContainer(containerId);
    },
    [store],
  );

  const handlePortalNavigate = useCallback(
    (layerId) => {
      store.drillIntoLayer(layerId);
    },
    [store],
  );

  const expandedContainerKey = useMemo(
    () => [...store.expandedContainers].sort().join("|"),
    [store.expandedContainers],
  );

  useEffect(() => {
    containerLayoutCacheRef.current = new Map();
    containerSizeMemoryRef.current = new Map();
  }, [store.activeLayerId, graph]);

  const handleNavigateToNode = useCallback(
    (nodeId) => {
      const resolvedIds = resolveTourNodeIds([nodeId], graph, nodesById);
      const targetId = resolvedIds[0] ?? nodeId;
      const node = nodesById.get(targetId);
      if (node && !isGraphUiNode(node)) return;

      const layerId = nodeIdToLayerId.get(targetId);
      if (layerId) {
        store.navigateToNodeInLayer(layerId, targetId);
        if (store.tourActive) {
          setTimeout(() => {
            fitView({
              nodes: [{ id: targetId }],
              padding: 0.3,
              duration: 500,
              maxZoom: 1.2,
            });
          }, 120);
        }
      } else if (!store.tourActive) {
        store.selectNode(targetId);
      }
    },
    [graph, nodeIdToLayerId, nodesById, store, fitView],
  );

  const handleStartTour = useCallback(() => {
    store.startTour(graph, nodeIdToLayerId, nodesById);
    requestAnimationFrame(() => {
      sidebarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [graph, nodeIdToLayerId, nodesById, store]);

  const handleOpenTour = useCallback(() => {
    if (store.tourActive) {
      store.openTourTab();
      return;
    }
    const steps = getSortedTourSteps(graph);
    if (steps.length > 0) {
      handleStartTour();
      return;
    }
    store.openTourTab();
  }, [graph, handleStartTour, store]);

  const handleStopTour = useCallback(() => {
    store.stopTour();
  }, [store]);

  const handleNextTourStep = useCallback(() => {
    store.nextTourStep(graph, nodeIdToLayerId, nodesById);
  }, [graph, nodeIdToLayerId, nodesById, store]);

  const handlePrevTourStep = useCallback(() => {
    store.prevTourStep(graph, nodeIdToLayerId, nodesById);
  }, [graph, nodeIdToLayerId, nodesById, store]);

  const handleGoToTourStep = useCallback(
    (stepIndex) => {
      store.setTourStep(stepIndex, graph, nodeIdToLayerId, nodesById);
    },
    [graph, nodeIdToLayerId, nodesById, store],
  );

  const handleOpenFileFromExplorer = useCallback(
    (nodeId) => {
      handleNavigateToNode(nodeId);
    },
    [handleNavigateToNode],
  );

  useEffect(() => {
    if (!graph) return undefined;

    let cancelled = false;
    setLayouting(true);

    const run = async () => {
      try {
        if (store.navigationLevel === "overview") {
          const layerEdgeList = buildLayerEdges(graph, layers);
          const result = await buildOverviewGraph({
            graph,
            layers,
            nodesById,
            layerEdges: layerEdgeList,
            onDrillIn: handleDrillIn,
          });
          if (!cancelled) {
            setNodes(result.nodes);
            setEdges(result.edges);
          }
        } else if (activeLayer) {
          const result = await buildContainerLayerGraph({
            graph,
            layer: activeLayer,
            layers,
            nodesById,
            nodeIdToLayerIds,
            selectedNodeId: store.selectedNodeId,
            changedNodeIds,
            affectedNodeIds,
            onNodeClick: handleNodeClick,
            onContainerToggle: handleContainerToggle,
            onPortalNavigate: handlePortalNavigate,
            tourActive: store.tourActive,
            tourResolvedNodeIds: store.tourResolvedNodeIds,
            expandedContainers: store.expandedContainers,
            containerLayoutCache: containerLayoutCacheRef.current,
            containerSizeMemory: containerSizeMemoryRef.current,
          });
          if (!cancelled) {
            containerLayoutCacheRef.current = result.cacheUpdates;
            containerSizeMemoryRef.current = result.sizeUpdates;
            setNodes(result.nodes);
            setEdges(result.edges);
          }
        }
      } finally {
        if (!cancelled) setLayouting(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    graph,
    layers,
    nodesById,
    store.navigationLevel,
    store.activeLayerId,
    store.selectedNodeId,
    store.tourActive,
    store.tourResolvedNodeIds,
    expandedContainerKey,
    activeLayer,
    nodeIdToLayerIds,
    layers,
    changedNodeIds,
    affectedNodeIds,
    handleDrillIn,
    handleNodeClick,
    handleContainerToggle,
    handlePortalNavigate,
    setNodes,
    setEdges,
  ]);

  useEffect(() => {
    if (
      !graph ||
      !activeLayer ||
      store.navigationLevel !== "layer-detail" ||
      !store.tourActive ||
      store.tourResolvedNodeIds.length === 0
    ) {
      return;
    }

    const layerNodeIdSet = new Set(layerNodeIds(activeLayer));
    const expandedLayerNodeIds = expandLayerNodeIds(
      graph,
      layerNodeIdSet,
      nodesById,
      "file",
      false,
    );
    const filteredGraphNodes = filterLayerStructuralNodes(graph?.nodes ?? [], {
      expandedLayerNodeIds,
      detailLevel: "file",
      persona: "technical",
    }).filter((node) => isGraphUiNode(node));
    const filteredNodeIds = new Set(filteredGraphNodes.map((node) => node.id));
    const filteredGraphEdges = normalizeEdges(graph?.edges).filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target),
    );
    const { containers } = deriveContainers(filteredGraphNodes, filteredGraphEdges);
    const tourNodeSet = new Set(store.tourResolvedNodeIds);

    for (const container of containers) {
      const containsTourNode = container.nodeIds.some((nodeId) => tourNodeSet.has(nodeId));
      if (containsTourNode && !store.expandedContainers.has(container.id)) {
        store.expandContainer(container.id);
      }
    }
  }, [
    graph,
    activeLayer,
    nodesById,
    store.navigationLevel,
    store.tourActive,
    store.tourResolvedNodeIds,
    store.expandedContainers,
    store.expandContainer,
  ]);

  useEffect(() => {
    if (store.tourActive && store.tourResolvedNodeIds.length > 0) return undefined;
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 80);
    return () => clearTimeout(timer);
  }, [
    store.navigationLevel,
    store.activeLayerId,
    store.tourActive,
    store.tourResolvedNodeIds,
    nodes.length,
    expandedContainerKey,
    isExpanded,
    fitView,
  ]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (store.tourActive) {
        store.stopTour();
        return;
      }
      if (isExpanded) {
        onToggleExpanded();
        return;
      }
      if (store.selectedNodeId) {
        store.clearSelection();
        return;
      }
      if (store.navigationLevel === "layer-detail") {
        store.navigateToOverview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store, isExpanded, onToggleExpanded]);

  const onFlowNodeClick = useCallback(
    (_, node) => {
      if (node.type === "layer-cluster") {
        handleDrillIn(node.data.layerId);
        return;
      }
      if (node.type === "architecture-file") {
        handleNodeClick(node.id);
      }
    },
    [handleDrillIn, handleNodeClick],
  );

  const onPaneClick = useCallback(() => {
    store.clearSelection();
  }, [store]);

  const nodeCount = graph?.nodes?.length ?? 0;
  const edgeCount = graph?.edges?.length ?? 0;
  const tourSteps = useMemo(() => getSortedTourSteps(graph), [graph]);
  const activeTourStep = tourSteps[store.currentTourStep] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="space-y-1">
          <ArchitectureBreadcrumb
            navigationLevel={store.navigationLevel}
            activeLayerName={activeLayer?.name}
            onBack={store.navigateToOverview}
          />
          <p className="text-xs text-muted-foreground">
            {nodeCount} nodes · {edgeCount} edges
            {graph?.project?.name ? ` · ${graph.project.name}` : ""}
          </p>
        </div>
        <ArchitectureGraphToolbar
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded}
          onFit={() => fitView({ padding: 0.2, duration: 300 })}
          onZoomIn={() => zoomIn({ duration: 200 })}
          onZoomOut={() => zoomOut({ duration: 200 })}
          graphTheme={store.graphTheme}
          onToggleTheme={() => store.setGraphTheme(store.graphTheme === "dark" ? "light" : "dark")}
          onOpenTour={handleOpenTour}
          hasTour={tourSteps.length > 0}
        />
      </div>

      <div className="border-b border-border px-3 py-2">
        <ArchitectureLayerLegend
          layers={layers}
          navigationLevel={store.navigationLevel}
          activeLayerId={store.activeLayerId}
        />
      </div>

      <div className={cn("flex min-h-0 flex-1", isExpanded ? "flex-row" : "flex-col")}>
        <div className="arch-graph-canvas relative min-h-[380px] min-w-0 flex-1">
          {layouting ? (
            <div
              className="absolute inset-0 z-10 grid grid-cols-3 content-center gap-6 bg-background/60 p-10 backdrop-blur-[1px]"
              role="status"
              aria-busy="true"
              aria-label="Laying out architecture graph"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onFlowNodeClick}
            onPaneClick={onPaneClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            defaultEdgeOptions={{
              ...graphEdgeRouting(),
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            }}
            fitView
            minZoom={0.2}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color={store.graphTheme === "dark" ? "rgba(163, 151, 135, 0.25)" : undefined}
            />
            <MiniMap
              className="!bottom-3 !right-3 !rounded-md !border !border-border !bg-card/90"
              zoomable
              pannable
            />
            {store.tourActive ? (
              <ArchitectureTourFitView tourResolvedNodeIds={store.tourResolvedNodeIds} />
            ) : null}
          </ReactFlow>

          {store.tourActive && activeTourStep ? (
            <ArchitectureTourNavBar
              stepTitle={activeTourStep.title}
              currentStep={store.currentTourStep}
              totalSteps={tourSteps.length}
              onPrev={handlePrevTourStep}
              onNext={handleNextTourStep}
              onStop={handleStopTour}
              isFirst={store.currentTourStep === 0}
              isLast={store.currentTourStep === tourSteps.length - 1}
            />
          ) : null}
        </div>

        <ArchitectureGraphSidebar
          ref={sidebarRef}
          layout={isExpanded ? "expanded" : "stacked"}
          sidebarTab={store.sidebarTab}
          onSidebarTabChange={store.setSidebarTab}
          selectedNode={selectedNode}
          graph={graph}
          onNavigateToNode={handleNavigateToNode}
          onOpenFile={handleOpenFileFromExplorer}
          tourActive={store.tourActive}
          currentTourStep={store.currentTourStep}
          onStartTour={handleStartTour}
          onStopTour={handleStopTour}
          onNextTourStep={handleNextTourStep}
          onPrevTourStep={handlePrevTourStep}
          onGoToTourStep={handleGoToTourStep}
        />
      </div>
    </div>
  );
}

/**
 * Native layered architecture graph explorer.
 */
export function ArchitectureGraphView({
  graph,
  projectId,
  changedNodeIds,
  affectedNodeIds,
  className,
}) {
  const store = useArchitectureGraphStore(projectId);
  const graphKeyRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    const key = graph?.project?.name
      ? `${graph.project.name}-${graph.nodes?.length}`
      : String(graph?.nodes?.length ?? 0);
    if (graphKeyRef.current !== key) {
      graphKeyRef.current = key;
      store.reset();
      setIsExpanded(false);
    }
  }, [graph, store]);

  if (!graph) return null;

  return (
    <div
      className={cn(
        "architecture-graph-root relative flex flex-col overflow-hidden bg-card",
        isExpanded
          ? "fixed inset-0 z-50 h-dvh max-h-dvh w-screen rounded-none border-0 shadow-none"
          : "h-[min(92vh,1100px)] min-h-[640px] rounded-lg border border-border shadow-sm",
        store.graphTheme === "dark" && "arch-theme-dark",
        className,
      )}
    >
      <ReactFlowProvider>
        <GraphFlowInner
          graph={graph}
          changedNodeIds={changedNodeIds}
          affectedNodeIds={affectedNodeIds}
          store={store}
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
        />
      </ReactFlowProvider>
    </div>
  );
}
