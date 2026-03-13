import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  History, 
  Copy, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Filter,
  Search,
  Download,
  MoreHorizontal,
  Trash2,
  Share2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { Input } from "./ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { toast } from "sonner@2.0.3";

interface WorkflowHistoryItem {
  id: string;
  status: 'completed' | 'failed' | 'pending' | 'processing';
  timestamp: Date;
  problemStatement: string;
  description?: string;
  thumbnail?: string;
  workflowData?: any;
  executionTime?: string;
  nodeCount?: number;
  errorMessage?: string;
}

interface User {
  name: string;
  email: string;
  picture?: string;
}

interface WorkflowHistoryProps {
  user?: User;
}

// Mock data for demonstration
const mockWorkflowHistory: WorkflowHistoryItem[] = [
  {
    id: '1',
    status: 'completed',
    timestamp: new Date('2025-01-11T07:14:00'),
    problemStatement: 'just add a webhook node, single node',
    description: 'Simple webhook configuration setup',
    thumbnail: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '2m 30s',
    nodeCount: 1
  },
  {
    id: '2',
    status: 'completed',
    timestamp: new Date('2025-01-11T03:32:00'),
    problemStatement: 'just add a webhook node, single node',
    description: 'Basic webhook integration workflow',
    thumbnail: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '1m 45s',
    nodeCount: 1
  },
  {
    id: '3',
    status: 'completed',
    timestamp: new Date('2025-01-11T03:30:00'),
    problemStatement: 'just add a webhook node, single node',
    description: 'Simple webhook node setup workflow',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '3m 15s',
    nodeCount: 1
  },
  {
    id: '4',
    status: 'failed',
    timestamp: new Date('2025-01-11T02:33:00'),
    problemStatement: 'receive webhook, enhance description, return back, make very short workflow',
    description: 'Complex webhook processing with enhancement',
    errorMessage: 'Model output doesn\'t fit required format',
    executionTime: '5m 20s',
    nodeCount: 4
  },
  {
    id: '5',
    status: 'completed',
    timestamp: new Date('2025-01-10T04:18:00'),
    problemStatement: 'build php template to pass url and get the snapshot of the webpage',
    description: 'Web scraping workflow with PHP integration',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'php', config: {} }, { type: 'http', config: {} }] },
    executionTime: '4m 10s',
    nodeCount: 3
  },
  {
    id: '6',
    status: 'completed',
    timestamp: new Date('2025-01-09T06:18:00'),
    problemStatement: 'create a workflow that reads the Supabase database, loops through each row, each row has an S3 key, generates a presigned URL, passes ...',
    description: 'Database processing with S3 integration',
    thumbnail: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'supabase', config: {} }, { type: 's3', config: {} }] },
    executionTime: '8m 45s',
    nodeCount: 8
  },
  {
    id: '7',
    status: 'completed',
    timestamp: new Date('2025-01-09T06:11:00'),
    problemStatement: 'create a workflow message is triggered via slack, and it auto sent to gmail',
    description: 'Slack to Gmail automation workflow',
    thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'slack', config: {} }, { type: 'gmail', config: {} }] },
    executionTime: '3m 30s',
    nodeCount: 3
  },
  {
    id: '8',
    status: 'completed',
    timestamp: new Date('2025-01-08T12:03:00'),
    problemStatement: 'I want to add a google database, which has 3000 rows, and each day it should trigger 4 times, and write a blog for each row and insert...',
    description: 'Automated blog generation from database',
    thumbnail: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&h=200&fit=crop',
    workflowData: { nodes: [{ type: 'google-sheets', config: {} }, { type: 'openai', config: {} }] },
    executionTime: '12m 30s',
    nodeCount: 12
  },
  {
    id: '9',
    status: 'processing',
    timestamp: new Date('2025-01-11T08:45:00'),
    problemStatement: 'create advanced data pipeline with multiple API integrations',
    description: 'Building complex data transformation workflow',
    nodeCount: 6
  },
  {
    id: '10',
    status: 'pending',
    timestamp: new Date('2025-01-11T08:50:00'),
    problemStatement: 'setup automated email marketing campaign with triggers',
    description: 'Email automation workflow setup',
    nodeCount: 5
  }
];

export function WorkflowHistory({ user }: WorkflowHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'pending' | 'processing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryItem[]>([]);

  // Load workflow history from localStorage and merge with mock data
  useEffect(() => {
    const loadWorkflowHistory = () => {
      try {
        const storedHistory = localStorage.getItem('workflowHistory');
        const userCreatedWorkflows = storedHistory ? JSON.parse(storedHistory) : [];
        
        // Convert timestamp strings back to Date objects for user-created workflows
        const userWorkflows = userCreatedWorkflows.map((workflow: any) => ({
          ...workflow,
          timestamp: new Date(workflow.timestamp)
        }));

        // Combine user-created workflows with mock data
        const combinedHistory = [...userWorkflows, ...mockWorkflowHistory]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first

        setWorkflowHistory(combinedHistory);
      } catch (error) {
        console.error('Error loading workflow history:', error);
        // Fallback to just mock data if there's an error
        setWorkflowHistory(mockWorkflowHistory);
      }
    };

    loadWorkflowHistory();

    // Listen for storage changes to update when new workflows are added
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workflowHistory') {
        loadWorkflowHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter and search workflows
  const filteredWorkflows = workflowHistory.filter(workflow => {
    const matchesFilter = filter === 'all' || workflow.status === filter;
    const matchesSearch = workflow.problemStatement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Get status counts
  const statusCounts = {
    all: workflowHistory.length,
    completed: workflowHistory.filter(w => w.status === 'completed').length,
    failed: workflowHistory.filter(w => w.status === 'failed').length,
    pending: workflowHistory.filter(w => w.status === 'pending').length,
    processing: workflowHistory.filter(w => w.status === 'processing').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'processing':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const handleCopyWorkflow = (workflow: WorkflowHistoryItem) => {
    const workflowData = {
      problemStatement: workflow.problemStatement,
      description: workflow.description,
      status: workflow.status,
      nodeCount: workflow.nodeCount,
      workflowData: workflow.workflowData,
      timestamp: workflow.timestamp.toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(workflowData, null, 2));
    toast.success("Workflow data copied to clipboard!");
  };

  const handlePreviewWorkflow = (workflow: WorkflowHistoryItem) => {
    toast.info("Workflow preview will open here");
    // TODO: Implement preview modal
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    try {
      // Check if this is a user-created workflow (has numeric ID from timestamp)
      const isUserCreated = !isNaN(Number(workflowId));
      
      if (!isUserCreated) {
        toast.error("Cannot delete system workflow examples");
        return;
      }

      // Get existing workflow history from localStorage
      const storedHistory = localStorage.getItem('workflowHistory');
      if (storedHistory) {
        const userCreatedWorkflows = JSON.parse(storedHistory);
        const updatedWorkflows = userCreatedWorkflows.filter((w: any) => w.id !== workflowId);
        localStorage.setItem('workflowHistory', JSON.stringify(updatedWorkflows));
        
        // Update local state
        setWorkflowHistory(prev => prev.filter(w => w.id !== workflowId));
        toast.success("Workflow deleted from history");
      } else {
        toast.error("Cannot delete this workflow");
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error("Failed to delete workflow");
    }
  };

  const handleClearAllHistory = () => {
    try {
      localStorage.removeItem('workflowHistory');
      
      // Reset to just mock data
      setWorkflowHistory(mockWorkflowHistory);
      toast.success("All user-created workflows cleared from history");
    } catch (error) {
      console.error('Error clearing workflow history:', error);
      toast.error("Failed to clear workflow history");
    }
  };

  const getUserCreatedWorkflowsCount = () => {
    try {
      const storedHistory = localStorage.getItem('workflowHistory');
      return storedHistory ? JSON.parse(storedHistory).length : 0;
    } catch {
      return 0;
    }
  };

  const isUserCreatedWorkflow = (workflowId: string) => {
    return !isNaN(Number(workflowId));
  };

  const handleExportWorkflow = (workflow: WorkflowHistoryItem) => {
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${workflow.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow exported successfully!");
  };

  const handleRefreshHistory = () => {
    try {
      const storedHistory = localStorage.getItem('workflowHistory');
      const userCreatedWorkflows = storedHistory ? JSON.parse(storedHistory) : [];
      
      const userWorkflows = userCreatedWorkflows.map((workflow: any) => ({
        ...workflow,
        timestamp: new Date(workflow.timestamp)
      }));

      const combinedHistory = [...userWorkflows, ...mockWorkflowHistory]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setWorkflowHistory(combinedHistory);
      toast.success("Workflow history refreshed!");
    } catch (error) {
      console.error('Error refreshing workflow history:', error);
      toast.error("Failed to refresh workflow history");
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-primary/20">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl">Your Workflow History</h1>
            <p className="text-muted-foreground">
              Previously generated workflows and requests. Click on any workflow to preview or copy it.
            </p>
          </div>
          {user && (
            <Avatar className="ml-auto">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Status Filter Badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge
                key={status}
                variant={filter === status ? "default" : "secondary"}
                className={`cursor-pointer transition-all duration-200 ${
                  filter === status 
                    ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600" 
                    : "hover:bg-muted"
                } ${status === 'completed' ? 'hover:bg-green-100 dark:hover:bg-green-900/30' : ''}
                  ${status === 'failed' ? 'hover:bg-red-100 dark:hover:bg-red-900/30' : ''}
                  ${status === 'pending' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : ''}
                  ${status === 'processing' ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''}`}
                onClick={() => setFilter(status as any)}
              >
                {getStatusIcon(status)}
                <span className="ml-1 capitalize">{status}</span>
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-white/20">{count}</span>
              </Badge>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshHistory}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            
            {getUserCreatedWorkflowsCount() > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Clear Workflow History
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {getUserCreatedWorkflowsCount()} user-created workflows from your history. 
                      System examples will remain. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllHistory}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Clear All History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Workflow History Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="group hover:shadow-xl transition-all duration-300 border-border hover:border-primary/30 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(workflow.status)} border-0`}>
                      {getStatusIcon(workflow.status)}
                      <span className="ml-1 capitalize">{workflow.status}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp(workflow.timestamp)}
                    </span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportWorkflow(workflow)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Share functionality coming soon")}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      {isUserCreatedWorkflow(workflow.id) ? (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteWorkflow(workflow.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete (System Example)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium leading-tight line-clamp-2">
                    Problem Statement:
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {workflow.problemStatement}
                  </p>
                  {workflow.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {workflow.description}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Workflow Preview */}
                {workflow.status === 'completed' && workflow.thumbnail && (
                  <div className="aspect-video relative overflow-hidden rounded-lg bg-muted/50 group-hover:bg-muted/70 transition-colors">
                    <img 
                      src={workflow.thumbnail} 
                      alt="Workflow preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      {workflow.nodeCount && (
                        <Badge variant="secondary" className="bg-black/50 text-white">
                          {workflow.nodeCount} nodes
                        </Badge>
                      )}
                      {workflow.executionTime && (
                        <Badge variant="secondary" className="bg-black/50 text-white">
                          {workflow.executionTime}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message for Failed Workflows */}
                {workflow.status === 'failed' && workflow.errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      <strong>Error:</strong> {workflow.errorMessage}
                    </p>
                  </div>
                )}

                {/* Processing/Pending Status */}
                {(workflow.status === 'processing' || workflow.status === 'pending') && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {workflow.status === 'processing' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating workflow...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          Queued for processing
                        </>
                      )}
                      {workflow.nodeCount && <span>• {workflow.nodeCount} nodes planned</span>}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handlePreviewWorkflow(workflow)}
                    disabled={workflow.status !== 'completed'}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCopyWorkflow(workflow)}
                    className="flex-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredWorkflows.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No workflows found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? searchQuery 
                  ? "Try adjusting your search terms"
                  : "Start creating workflows to see them here"
                : `No ${filter} workflows found`
              }
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* Load More */}
        {filteredWorkflows.length > 0 && filteredWorkflows.length >= 10 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="px-8">
              Load More History
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}