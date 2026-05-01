import { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { WorkflowPreviewDialog } from "./WorkflowPreviewDialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  AlertTriangle, 
  Download, 
  Trash2,
  Eye,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  Layers,
  Clock,
  User
} from "lucide-react";
import { cn } from "./ui/utils";

interface ImportedWorkflow {
  id: string;
  fileName: string;
  name: string;
  description?: string;
  nodes: number;
  author?: string;
  version?: string;
  lastModified?: string;
  isValid: boolean;
  errorMessage?: string;
  rawData: any;
  fileSize: string;
  uploadedAt: Date;
}

interface ImportStats {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalNodes: number;
}

export function ImportJSON() {
  const [importedWorkflows, setImportedWorkflows] = useState<ImportedWorkflow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());
  const [previewWorkflow, setPreviewWorkflow] = useState<ImportedWorkflow | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndParseWorkflow = (fileContent: string, fileName: string): ImportedWorkflow => {
    try {
      const workflow = JSON.parse(fileContent);
      
      // Basic N8N workflow validation
      const isValidWorkflow = workflow && 
        (Array.isArray(workflow.nodes) || workflow.nodes) &&
        typeof workflow.name === 'string';

      if (!isValidWorkflow) {
        throw new Error('Invalid N8N workflow format');
      }

      const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
      
      return {
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName,
        name: workflow.name || fileName.replace('.json', ''),
        description: workflow.meta?.description || 'Imported workflow',
        nodes: nodes.length,
        author: workflow.meta?.author || 'Unknown',
        version: workflow.versionId || '1.0.0',
        lastModified: workflow.updatedAt || new Date().toISOString(),
        isValid: true,
        rawData: workflow,
        fileSize: formatFileSize(new Blob([fileContent]).size),
        uploadedAt: new Date()
      };
    } catch (error) {
      return {
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName,
        name: fileName.replace('.json', ''),
        nodes: 0,
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to parse JSON',
        rawData: null,
        fileSize: formatFileSize(new Blob([fileContent]).size),
        uploadedAt: new Date()
      };
    }
  };

  const handleFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setImportProgress(0);

    const jsonFiles = Array.from(files).filter(file => 
      file.type === 'application/json' || file.name.endsWith('.json')
    );

    if (jsonFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    const newWorkflows: ImportedWorkflow[] = [];

    for (let i = 0; i < jsonFiles.length; i++) {
      const file = jsonFiles[i];
      setImportProgress((i / jsonFiles.length) * 100);

      try {
        const content = await file.text();
        const workflow = validateAndParseWorkflow(content, file.name);
        newWorkflows.push(workflow);
      } catch (error) {
        newWorkflows.push({
          id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          name: file.name.replace('.json', ''),
          nodes: 0,
          isValid: false,
          errorMessage: 'Failed to read file',
          rawData: null,
          fileSize: formatFileSize(file.size),
          uploadedAt: new Date()
        });
      }
    }

    setImportedWorkflows(prev => [...prev, ...newWorkflows]);
    setImportProgress(100);
    
    setTimeout(() => {
      setIsProcessing(false);
      setImportProgress(0);
    }, 500);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const toggleWorkflowSelection = (workflowId: string) => {
    const newSelection = new Set(selectedWorkflows);
    if (newSelection.has(workflowId)) {
      newSelection.delete(workflowId);
    } else {
      newSelection.add(workflowId);
    }
    setSelectedWorkflows(newSelection);
  };

  const selectAllValid = () => {
    const validWorkflowIds = importedWorkflows
      .filter(w => w.isValid)
      .map(w => w.id);
    setSelectedWorkflows(new Set(validWorkflowIds));
  };

  const clearSelection = () => {
    setSelectedWorkflows(new Set());
  };

  const removeWorkflow = (workflowId: string) => {
    setImportedWorkflows(prev => prev.filter(w => w.id !== workflowId));
    setSelectedWorkflows(prev => {
      const newSet = new Set(prev);
      newSet.delete(workflowId);
      return newSet;
    });
  };

  const importSelectedWorkflows = () => {
    const selectedWorkflowData = importedWorkflows.filter(w => 
      selectedWorkflows.has(w.id) && w.isValid
    );
    
    // Here you would integrate with your workflow management system
    console.log('Importing workflows:', selectedWorkflowData);
    
    // For demo purposes, we'll just show a success message
    // In a real app, you'd save these to your backend/database
  };

  const getImportStats = (): ImportStats => {
    return {
      totalFiles: importedWorkflows.length,
      validFiles: importedWorkflows.filter(w => w.isValid).length,
      invalidFiles: importedWorkflows.filter(w => !w.isValid).length,
      totalNodes: importedWorkflows.reduce((sum, w) => sum + (w.nodes || 0), 0)
    };
  };

  const stats = getImportStats();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium">Import JSON Workflows</h1>
            <p className="text-sm text-muted-foreground">Upload multiple N8N workflow JSON files</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Upload Area */}
            <Card>
              <CardContent className="p-6">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
                    dragActive 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Drop JSON files here</h3>
                      <p className="text-sm text-muted-foreground">
                        or click to browse and select multiple files
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <input
                        type="file"
                        multiple
                        accept=".json,application/json"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button asChild className="gap-2">
                          <span>
                            <Plus className="h-4 w-4" />
                            Select Files
                          </span>
                        </Button>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports: N8N workflow JSON files
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processing Progress */}
            {isProcessing && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Processing files...</p>
                      <Progress value={importProgress} className="mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Stats */}
            {importedWorkflows.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stats.totalFiles}</p>
                        <p className="text-xs text-muted-foreground">Total Files</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stats.validFiles}</p>
                        <p className="text-xs text-muted-foreground">Valid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stats.invalidFiles}</p>
                        <p className="text-xs text-muted-foreground">Invalid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stats.totalNodes}</p>
                        <p className="text-xs text-muted-foreground">Total Nodes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Workflow List */}
            {importedWorkflows.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Imported Workflows ({importedWorkflows.length})
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllValid}
                        disabled={stats.validFiles === 0}
                      >
                        Select All Valid
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearSelection}
                        disabled={selectedWorkflows.size === 0}
                      >
                        Clear Selection
                      </Button>
                      <Button 
                        size="sm"
                        onClick={importSelectedWorkflows}
                        disabled={selectedWorkflows.size === 0}
                        className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Import Selected ({selectedWorkflows.size})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {importedWorkflows.map((workflow, index) => (
                      <div key={workflow.id}>
                        <div className={cn(
                          "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                          selectedWorkflows.has(workflow.id) && workflow.isValid && "bg-primary/5"
                        )}>
                          {/* Selection Checkbox */}
                          <div className="flex-shrink-0">
                            {workflow.isValid ? (
                              <button
                                onClick={() => toggleWorkflowSelection(workflow.id)}
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                  selectedWorkflows.has(workflow.id)
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-border hover:border-primary"
                                )}
                              >
                                {selectedWorkflows.has(workflow.id) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-destructive bg-destructive/10 flex items-center justify-center">
                                <X className="h-3 w-3 text-destructive" />
                              </div>
                            )}
                          </div>

                          {/* Status Icon */}
                          <div className="flex-shrink-0">
                            {workflow.isValid ? (
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </div>
                            )}
                          </div>

                          {/* Workflow Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <h3 className="font-medium truncate">{workflow.name}</h3>
                                <p className="text-xs text-muted-foreground">{workflow.fileName}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <Badge variant={workflow.isValid ? "secondary" : "destructive"} className="text-xs">
                                  {workflow.isValid ? 'Valid' : 'Invalid'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{workflow.fileSize}</span>
                              </div>
                            </div>

                            {workflow.isValid ? (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Layers className="h-3 w-3" />
                                  <span>{workflow.nodes} nodes</span>
                                </div>
                                {workflow.author && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{workflow.author}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{workflow.uploadedAt.toLocaleTimeString()}</span>
                                </div>
                              </div>
                            ) : (
                              <Alert className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  {workflow.errorMessage}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {workflow.isValid && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-1"
                                onClick={() => setPreviewWorkflow(workflow)}
                              >
                                <Eye className="h-3 w-3" />
                                Preview
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeWorkflow(workflow.id)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        {index < importedWorkflows.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-xs">💡</span>
                  </div>
                  <div>
                    <p className="font-medium">JSON Format</p>
                    <p className="text-muted-foreground">Make sure your files are valid N8N workflow JSON exports with nodes and metadata.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                  </div>
                  <div>
                    <p className="font-medium">Batch Import</p>
                    <p className="text-muted-foreground">You can upload multiple files at once for faster workflow import.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-5 h-5 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-600 dark:text-orange-400 text-xs">⚠️</span>
                  </div>
                  <div>
                    <p className="font-medium">Validation</p>
                    <p className="text-muted-foreground">Invalid files will be flagged and won't be imported. Check the error messages for details.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Preview Dialog */}
      <WorkflowPreviewDialog
        isOpen={!!previewWorkflow}
        onClose={() => setPreviewWorkflow(null)}
        workflow={previewWorkflow ? {
          name: previewWorkflow.name,
          description: previewWorkflow.description,
          nodes: previewWorkflow.rawData?.nodes || [],
          author: previewWorkflow.author,
          version: previewWorkflow.version,
          fileName: previewWorkflow.fileName,
          fileSize: previewWorkflow.fileSize,
          rawData: previewWorkflow.rawData
        } : null}
        onImport={() => {
          if (previewWorkflow) {
            setSelectedWorkflows(new Set([previewWorkflow.id]));
            importSelectedWorkflows();
          }
        }}
      />
    </div>
  );
}