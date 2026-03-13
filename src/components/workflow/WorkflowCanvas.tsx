import { useState, useRef } from "react";
import { Node, NodeVariant } from "./Node";
import { Play, Zap, Database, Filter, Mail, Webhook, Code, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface WorkflowNode {
  id: string;
  title: string;
  description: string;
  icon: any;
  variant: NodeVariant;
  position: { x: number; y: number };
  inputs?: Array<{ id: string; label?: string }>;
  outputs?: Array<{ id: string; label?: string }>;
}

interface WorkflowCanvasProps {
  readonly?: boolean;
  nodes?: WorkflowNode[];
  className?: string;
}

const defaultNodes: WorkflowNode[] = [
  {
    id: 'trigger-1',
    title: 'Schedule Trigger',
    description: 'Runs every 5 minutes',
    icon: Play,
    variant: 'trigger',
    position: { x: 50, y: 100 },
    outputs: [{ id: 'out-1', label: 'Main Output' }]
  },
  {
    id: 'action-1',
    title: 'HTTP Request',
    description: 'Fetch data from API',
    icon: Zap,
    variant: 'action',
    position: { x: 400, y: 100 },
    inputs: [{ id: 'in-1', label: 'Trigger Data' }],
    outputs: [{ id: 'out-2', label: 'Response Data' }]
  },
  {
    id: 'transform-1',
    title: 'Data Transformation',
    description: 'Filter and format response',
    icon: Filter,
    variant: 'transformation',
    position: { x: 750, y: 100 },
    inputs: [{ id: 'in-2', label: 'Raw Data' }],
    outputs: [{ id: 'out-3', label: 'Filtered Data' }]
  },
  {
    id: 'action-2',
    title: 'Send Email',
    description: 'Notify team members',
    icon: Mail,
    variant: 'action',
    position: { x: 400, y: 280 },
    inputs: [{ id: 'in-3', label: 'Notification Data' }]
  },
  {
    id: 'action-3',
    title: 'Save to Database',
    description: 'Store processed data',
    icon: Database,
    variant: 'action',
    position: { x: 750, y: 280 },
    inputs: [{ id: 'in-4', label: 'Processed Data' }]
  }
];

export function WorkflowCanvas({ readonly = false, nodes = defaultNodes, className }: WorkflowCanvasProps) {
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>(nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleNodeDrag = (nodeId: string, newPosition: { x: number; y: number }) => {
    if (readonly) return;
    
    setWorkflowNodes(prev => 
      prev.map(node => 
        node.id === nodeId 
          ? { ...node, position: newPosition }
          : node
      )
    );
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
  };

  const handleConnectionClick = (nodeId: string, connectionId: string, type: 'input' | 'output') => {
    console.log(`Connection clicked: ${type} ${connectionId} on node ${nodeId}`);
    // Here you would implement connection logic
  };

  return (
    <div className={cn("relative w-full h-full min-h-96 bg-muted/20 rounded-lg border border-border overflow-hidden", className)}>
      {/* Canvas Background Grid */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(90deg, var(--color-border) 1px, transparent 1px),
            linear-gradient(var(--color-border) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Canvas Content */}
      <div 
        ref={canvasRef}
        className="relative w-full h-full"
        onClick={() => setSelectedNodeId(null)}
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {/* Example connections - in a real implementation, these would be dynamic */}
          <path
            d="M 314 124 Q 350 124 350 124 Q 386 124 386 124"
            stroke="var(--color-primary)"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 664 124 Q 700 124 700 124 Q 736 124 736 124"
            stroke="var(--color-primary)"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 664 124 Q 700 200 700 200 Q 736 304 386 304"
            stroke="var(--color-primary)"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 1014 124 Q 1050 200 1050 200 Q 1086 304 736 304"
            stroke="var(--color-primary)"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        </svg>

        {/* Workflow Nodes */}
        {workflowNodes.map((node) => (
          <Node
            key={node.id}
            id={node.id}
            title={node.title}
            description={node.description}
            icon={node.icon}
            variant={node.variant}
            position={node.position}
            inputs={node.inputs}
            outputs={node.outputs}
            state={selectedNodeId === node.id ? 'selected' : 'default'}
            disabled={readonly}
            onDrag={(newPosition) => handleNodeDrag(node.id, newPosition)}
            onSelect={() => handleNodeSelect(node.id)}
            onConnectionClick={(connectionId, type) => handleConnectionClick(node.id, connectionId, type)}
          />
        ))}
      </div>

      {/* Canvas Controls */}
      {!readonly && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Settings className="h-3 w-3" />
            Settings
          </Button>
          <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white">
            <Play className="h-3 w-3" />
            Test Run
          </Button>
        </div>
      )}

      {/* Node Panel */}
      {!readonly && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
            <p className="text-sm text-muted-foreground mb-2">Add Nodes:</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-2">
                <Play className="h-3 w-3 text-green-600" />
                Trigger
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Zap className="h-3 w-3 text-blue-600" />
                Action
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Filter className="h-3 w-3 text-orange-600" />
                Transform
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Webhook className="h-3 w-3" />
                Webhook
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Code className="h-3 w-3" />
                Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}