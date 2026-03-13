import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { 
  Layers, 
  User, 
  Calendar, 
  Zap, 
  Settings,
  ArrowRight,
  X
} from "lucide-react";

interface WorkflowNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position?: [number, number];
  parameters?: any;
}

interface WorkflowPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    author?: string;
    version?: string;
    fileName: string;
    fileSize: string;
    rawData: any;
  } | null;
  onImport?: () => void;
}

export function WorkflowPreviewDialog({ 
  isOpen, 
  onClose, 
  workflow, 
  onImport 
}: WorkflowPreviewDialogProps) {
  if (!workflow) return null;

  const getNodeTypeIcon = (nodeType: string) => {
    if (nodeType.includes('trigger') || nodeType.includes('start')) return '🚀';
    if (nodeType.includes('http') || nodeType.includes('webhook')) return '🌐';
    if (nodeType.includes('email') || nodeType.includes('gmail')) return '📧';
    if (nodeType.includes('slack')) return '💬';
    if (nodeType.includes('database') || nodeType.includes('mysql') || nodeType.includes('postgres')) return '🗄️';
    if (nodeType.includes('spreadsheet') || nodeType.includes('sheets')) return '📊';
    if (nodeType.includes('schedule')) return '⏰';
    if (nodeType.includes('code') || nodeType.includes('javascript')) return '💻';
    if (nodeType.includes('if') || nodeType.includes('switch')) return '🔀';
    if (nodeType.includes('set') || nodeType.includes('edit')) return '✏️';
    return '⚡';
  };

  const getNodeCategory = (nodeType: string) => {
    if (nodeType.includes('trigger') || nodeType.includes('start')) return 'Trigger';
    if (nodeType.includes('schedule')) return 'Schedule';
    if (nodeType.includes('http') || nodeType.includes('webhook')) return 'HTTP';
    if (nodeType.includes('if') || nodeType.includes('switch')) return 'Logic';
    if (nodeType.includes('set') || nodeType.includes('edit')) return 'Data';
    return 'Action';
  };

  const groupedNodes = workflow.nodes.reduce((acc, node) => {
    const category = getNodeCategory(node.type);
    if (!acc[category]) acc[category] = [];
    acc[category].push(node);
    return acc;
  }, {} as Record<string, WorkflowNode[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{workflow.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Preview workflow details before importing
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-6">
              {/* Workflow Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Layers className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{workflow.nodes.length} Nodes</p>
                    <p className="text-xs text-muted-foreground">Workflow complexity</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{workflow.author || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">Author</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{workflow.version || '1.0.0'}</p>
                    <p className="text-xs text-muted-foreground">Version</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {workflow.description && (
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    {workflow.description}
                  </p>
                </div>
              )}

              {/* Nodes by Category */}
              <div>
                <h3 className="font-medium mb-4">Workflow Nodes ({workflow.nodes.length})</h3>
                <div className="space-y-4">
                  {Object.entries(groupedNodes).map(([category, nodes]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-sm">{category}</h4>
                        <Badge variant="outline" className="text-xs">
                          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {nodes.map((node, index) => (
                          <div
                            key={`${node.id || node.name}-${index}`}
                            className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-lg">{getNodeTypeIcon(node.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{node.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{node.type}</p>
                            </div>
                            {node.typeVersion && (
                              <Badge variant="outline" className="text-xs">
                                v{node.typeVersion}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Information */}
              <div>
                <h3 className="font-medium mb-2">File Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Filename:</span>
                    <p className="font-medium">{workflow.fileName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <p className="font-medium">{workflow.fileSize}</p>
                  </div>
                </div>
              </div>

              {/* Raw JSON Preview */}
              <div>
                <h3 className="font-medium mb-2">JSON Structure</h3>
                <div className="bg-muted/50 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-muted-foreground">
{`{
  "name": "${workflow.name}",
  "nodes": [${workflow.nodes.length} nodes],
  "connections": {...},
  "active": ${workflow.rawData.active || false},
  "settings": {...},
  "versionId": "${workflow.version || '1.0.0'}"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Ready to import this workflow?
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                onImport?.();
                onClose();
              }}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Import Workflow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}