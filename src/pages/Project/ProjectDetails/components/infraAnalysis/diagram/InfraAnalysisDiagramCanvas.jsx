import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildInfraAnalysisFlow } from "./buildInfraAnalysisFlow.js";
import { InfraAnalysisDiagramControls } from "./InfraAnalysisDiagramControls.jsx";
import { InfraAnalysisDiagramLegend } from "./InfraAnalysisDiagramLegend.jsx";
import { InfraAnalysisEdge } from "./InfraAnalysisEdge.jsx";
import { InfraAnalysisFlowEdge } from "./InfraAnalysisFlowEdge.jsx";
import { InfraAnalysisGroupNode } from "./InfraAnalysisGroupNode.jsx";
import { InfraAnalysisServiceNode } from "./InfraAnalysisServiceNode.jsx";
import { LAYOUT_MORPH_MS, LAYOUT_MORPH_NODE_CAP } from "./motionConstants.js";

const nodeTypes = {
  serviceNode: InfraAnalysisServiceNode,
  groupLayer: InfraAnalysisGroupNode,
};

const edgeTypes = {
  workbenchFlowEdge: InfraAnalysisFlowEdge,
  architectureEdge: InfraAnalysisEdge,
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function DiagramFlow({
  architectureGraph,
  selectedNodeId,
  focusNodeId = null,
  onSelectedNodeChange,
  flowPaused,
  setFlowPaused,
  flowSpeed,
  setFlowSpeed,
  highlightFlows,
  setHighlightFlows,
  showMinimap,
  setShowMinimap,
  isFullscreen,
  onToggleFullscreen,
  layoutKey,
  onResetLayout,
}) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const [layoutMorphing, setLayoutMorphing] = useState(false);
  const morphTimerRef = useRef(null);

  const built = useMemo(
    () =>
      buildInfraAnalysisFlow(architectureGraph, {
        flowPaused,
        flowSpeed,
        highlightFlows,
        selectedNodeId,
      }),
    [architectureGraph, flowPaused, flowSpeed, highlightFlows, selectedNodeId, layoutKey],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);

    if (built.nodes.length <= LAYOUT_MORPH_NODE_CAP && !prefersReducedMotion()) {
      setLayoutMorphing(true);
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
      morphTimerRef.current = setTimeout(() => setLayoutMorphing(false), LAYOUT_MORPH_MS);
    }
  }, [built, setEdges, setNodes]);

  useEffect(
    () => () => {
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.18, duration: prefersReducedMotion() ? 0 : 300 });
    }, 80);
    return () => clearTimeout(timer);
  }, [fitView, layoutKey, architectureGraph]);

  const onNodeClick = useCallback(
    (_event, node) => {
      if (node.type !== "serviceNode") return;
      onSelectedNodeChange?.(node.id === selectedNodeId ? null : node.id);
    },
    [onSelectedNodeChange, selectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    onSelectedNodeChange?.(null);
  }, [onSelectedNodeChange]);

  const nodesWithSelection = useMemo(
    () =>
      nodes.map((node) =>
        node.type === "serviceNode" ? { ...node, selected: node.id === selectedNodeId } : node,
      ),
    [nodes, selectedNodeId],
  );

  useEffect(() => {
    if (!focusNodeId) return;
    const node = nodes.find((item) => item.id === focusNodeId);
    if (!node) return;
    setCenter(node.position.x + 112, node.position.y + 44, {
      zoom: 1,
      duration: prefersReducedMotion() ? 0 : 300,
    });
  }, [focusNodeId, nodes, setCenter]);

  return (
    <ReactFlow
      nodes={nodesWithSelection}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "hsl(var(--muted-foreground))",
        },
      }}
      minZoom={0.4}
      maxZoom={1.25}
      nodesDraggable
      nodesConnectable={false}
      panOnDrag
      panOnScroll
      zoomOnScroll
      zoomOnPinch
      proOptions={{ hideAttribution: true }}
      className={`infra-analysis-diagram h-full ${layoutMorphing ? "layout-morphing" : ""}`}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#D1D5DB" />
      {showMinimap ? (
        <MiniMap
          className="!bottom-14 !right-3 rounded-lg border border-border/80 bg-card/90 shadow-md backdrop-blur-sm"
          pannable
          zoomable
        />
      ) : null}
      <InfraAnalysisDiagramControls
        showMinimap={showMinimap}
        setShowMinimap={setShowMinimap}
        flowPaused={flowPaused}
        setFlowPaused={setFlowPaused}
        highlightFlows={highlightFlows}
        setHighlightFlows={setHighlightFlows}
        flowSpeed={flowSpeed}
        setFlowSpeed={setFlowSpeed}
        selectedNodeId={selectedNodeId}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onResetLayout={onResetLayout}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFitView={() => fitView({ padding: 0.18, duration: 300 })}
        onFocusSelected={() => {
          const node = nodes.find((item) => item.id === selectedNodeId);
          if (!node) return;
          setCenter(node.position.x + 112, node.position.y + 44, { zoom: 1, duration: 300 });
        }}
      />
      <InfraAnalysisDiagramLegend />
    </ReactFlow>
  );
}

/** Animated architecture diagram with InfraPilot-style flow polish. */
export function InfraAnalysisDiagramCanvas({
  architectureGraph,
  selectedNodeId = null,
  focusNodeId = null,
  onSelectedNodeChange,
}) {
  const [flowPaused, setFlowPaused] = useState(false);
  const [flowSpeed, setFlowSpeed] = useState(1);
  const [highlightFlows, setHighlightFlows] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);
  const containerRef = useRef(null);

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    if (!document.fullscreenElement) {
      element
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (!architectureGraph?.nodes?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Architecture diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No architecture nodes yet. Run analysis to generate a diagram.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Architecture diagram</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          data-infra-analysis-diagram
          className={`relative w-full border-t border-border ${isFullscreen ? "h-screen bg-background" : "h-[520px]"}`}
        >
          <ReactFlowProvider>
            <DiagramFlow
              architectureGraph={architectureGraph}
              selectedNodeId={selectedNodeId}
              focusNodeId={focusNodeId}
              onSelectedNodeChange={onSelectedNodeChange}
              flowPaused={flowPaused}
              setFlowPaused={setFlowPaused}
              flowSpeed={flowSpeed}
              setFlowSpeed={setFlowSpeed}
              highlightFlows={highlightFlows}
              setHighlightFlows={setHighlightFlows}
              showMinimap={showMinimap}
              setShowMinimap={setShowMinimap}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              layoutKey={layoutKey}
              onResetLayout={() => setLayoutKey((value) => value + 1)}
            />
          </ReactFlowProvider>
        </div>
      </CardContent>
    </Card>
  );
}
