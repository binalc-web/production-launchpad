import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import { Skeleton } from "@/components/ui/skeleton";
import { LayerClusterNode } from "./nodes/LayerClusterNode.jsx";
import { ArchitectureFileNode } from "./nodes/ArchitectureFileNode.jsx";
import { graphEdgeRouting } from "./constants.js";
import { applyElkLayout } from "./layout/applyElkLayout.js";
import { normalizeEdges } from "./layout/graphIndexes.js";

const nodeTypes = {
  "domain-cluster": LayerClusterNode,
  "flow-node": ArchitectureFileNode,
  "step-node": ArchitectureFileNode,
};

function DomainFlowInner({ domainGraph, onSelectNode }) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layouting, setLayouting] = useState(false);

  const built = useMemo(() => {
    if (!domainGraph) return { nodes: [], edges: [] };

    const domainNodes = (domainGraph.nodes ?? []).filter((node) => node.type === "domain");
    const flowNodes = (domainGraph.nodes ?? []).filter((node) => node.type === "flow");
    const stepNodes = (domainGraph.nodes ?? []).filter((node) => node.type === "step");

    const rfNodes = [
      ...domainNodes.map((node) => ({
        id: node.id,
        type: "domain-cluster",
        position: { x: 0, y: 0 },
        data: {
          layerId: node.id,
          layerName: node.name,
          layerDescription: node.summary || "",
          fileCount: flowNodes.filter((flow) =>
            (domainGraph.edges ?? []).some(
              (edge) =>
                edge.type === "contains_flow" && edge.source === node.id && edge.target === flow.id,
            ),
          ).length,
          aggregateComplexity: "simple",
          layerColorIndex: 0,
          onDrillIn: () => {},
        },
      })),
      ...flowNodes.map((node) => ({
        id: node.id,
        type: "flow-node",
        position: { x: 0, y: 0 },
        data: {
          label: node.name,
          nodeType: "flow",
          summary: node.summary || "",
          complexity: "simple",
          onNodeClick: onSelectNode,
        },
      })),
      ...stepNodes.map((node) => ({
        id: node.id,
        type: "step-node",
        position: { x: 0, y: 0 },
        data: {
          label: node.name,
          nodeType: "step",
          summary: node.summary || "",
          complexity: "simple",
          onNodeClick: onSelectNode,
        },
      })),
    ];

    const rfEdges = normalizeEdges(domainGraph.edges).map((edge, index) => ({
      id: `domain-edge-${index}`,
      source: edge.source,
      target: edge.target,
      ...graphEdgeRouting(),
      label: edge.type,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [domainGraph, onSelectNode]);

  useEffect(() => {
    let cancelled = false;
    setLayouting(true);
    void applyElkLayout(built.nodes, built.edges).then((result) => {
      if (cancelled) return;
      setNodes(result.nodes);
      setEdges(result.edges);
      setLayouting(false);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 80);
    });
    return () => {
      cancelled = true;
    };
  }, [built, setNodes, setEdges, fitView]);

  return (
    <div className="relative min-h-[380px] flex-1">
      {layouting ? (
        <div
          className="absolute inset-0 z-10 grid grid-cols-3 content-center gap-6 bg-background/60 p-10"
          role="status"
          aria-busy="true"
          aria-label="Laying out domain graph"
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
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      </ReactFlow>
    </div>
  );
}

/** Domain graph canvas (domain → flow → step). */
export function ArchitectureDomainGraphView({ domainGraph, onSelectNode }) {
  if (!domainGraph) {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
        No domain graph available for this project.
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <DomainFlowInner domainGraph={domainGraph} onSelectNode={onSelectNode} />
    </ReactFlowProvider>
  );
}
