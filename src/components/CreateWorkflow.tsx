import { useState, useEffect, useRef } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { 
  Send,
  Bot,
  User,
  Copy,
  Eye,
  CheckCircle,
  XCircle,
  Workflow,
  MessageSquare,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Clock,
  ArrowUpRight,
  Zap,
  Plus,
  Grid3X3,
  List
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface WorkflowHistoryItem {
  id: string;
  status: 'Completed' | 'Failed';
  timestamp: Date;
  problemStatement: string;
  description?: string;
  snapshotImage?: string;
  workflowData?: any;
  executionTime?: string;
  nodeCount?: number;
  errorMessage?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workflowId?: string;
}

interface User {
  name: string;
  email: string;
  picture?: string;
}

interface CreateWorkflowProps {
  user?: User;
}

// Mock data matching the previous design
const mockWorkflowHistory: WorkflowHistoryItem[] = [
  {
    id: '1',
    status: 'Completed',
    timestamp: new Date('2025-01-11T07:14:00'),
    problemStatement: 'Create a webhook node that listens for incoming requests and forwards them to Slack',
    snapshotImage: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '2m 30s',
    nodeCount: 1
  },
  {
    id: '2',
    status: 'Completed',
    timestamp: new Date('2025-01-11T03:32:00'),
    problemStatement: 'Build an automated email notification system for new user registrations',
    snapshotImage: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600&h=400&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '1m 45s',
    nodeCount: 3
  },
  {
    id: '3',
    status: 'Completed',
    timestamp: new Date('2025-01-11T03:30:00'),
    problemStatement: 'Setup a workflow to sync Google Sheets data with database every hour',
    snapshotImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '3m 15s',
    nodeCount: 5
  },
  {
    id: '4',
    status: 'Failed',
    timestamp: new Date('2025-01-11T02:33:00'),
    problemStatement: 'Create a complex multi-step workflow with API validation and error handling',
    errorMessage: "Model output doesn't fit required format",
    executionTime: '5m 20s',
    nodeCount: 4
  },
  {
    id: '5',
    status: 'Completed',
    timestamp: new Date('2025-01-10T16:20:00'),
    problemStatement: 'Automated social media posting workflow with content moderation',
    snapshotImage: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&h=400&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '4m 15s',
    nodeCount: 8
  },
  {
    id: '6',
    status: 'Completed',
    timestamp: new Date('2025-01-10T14:45:00'),
    problemStatement: 'Customer support ticket routing and auto-response system',
    snapshotImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop',
    workflowData: { nodes: [{ type: 'webhook', config: {} }] },
    executionTime: '6m 30s',
    nodeCount: 12
  }
];

// Sample conversation starters
const conversationStarters = [
  // Template modification suggestions
  "Modify the 'Slack to Email Notification' template to also send messages to Microsoft Teams",
  "Take the 'Discord Bot with AI Responses' template and add sentiment analysis before responding",
  "Enhance the 'Automated Email Marketing Campaign' template to include SMS notifications",
  
  // New workflow ideas
  "Create a workflow that monitors website uptime and sends alerts to multiple channels",
  "Build an automation that processes invoices from email attachments and updates accounting software",
  "Set up a workflow to automatically generate and post social media content from RSS feeds",
  "Create a system that backs up database records to cloud storage on schedule",
  "Build a workflow that converts new Airtable records into formatted PDF reports",
  
  // Integration-focused suggestions
  "Connect Stripe payments to automatically create customer profiles in CRM",
  "Monitor GitHub repositories and send deployment notifications to team channels",
  "Sync calendar events between Google Calendar, Outlook, and project management tools",
  "Create a workflow that processes support tickets and routes them based on priority",
  
  // AI-powered suggestions
  "Build an AI assistant that summarizes meeting recordings and creates action items",
  "Create a content moderation system that scans uploads and flags inappropriate content",
  "Set up automated translation for customer messages across multiple languages"
];

export function CreateWorkflow({ user }: CreateWorkflowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isTemplateModOpen, setIsTemplateModOpen] = useState(false);
  const [isNewWorkflowOpen, setIsNewWorkflowOpen] = useState(false);
  const [isAiAdvancedOpen, setIsAiAdvancedOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load workflow history from localStorage and merge with mock data
  useEffect(() => {
    const loadWorkflowHistory = () => {
      try {
        const storedHistory = localStorage.getItem('workflowHistory');
        const userCreatedWorkflows = storedHistory ? JSON.parse(storedHistory) : [];
        
        // Convert timestamp strings back to Date objects for user-created workflows
        const userWorkflows = userCreatedWorkflows.map((workflow: any) => ({
          ...workflow,
          timestamp: new Date(workflow.timestamp),
          status: workflow.status === 'completed' ? 'Completed' : 'Failed'
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
  }, []);

  // Load chat history from localStorage
  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save chat messages to localStorage
  const saveMessages = (newMessages: ChatMessage[]) => {
    localStorage.setItem('chatMessages', JSON.stringify(newMessages));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInputValue('');
    setIsGenerating(true);

    // Simulate AI response
    setTimeout(() => {
      // Check if the message is asking to modify an existing template
      const isTemplateModification = userMessage.content.toLowerCase().includes('modify') || 
                                    userMessage.content.toLowerCase().includes('enhance') || 
                                    userMessage.content.toLowerCase().includes('take the');
      
      let responseContent = '';
      
      if (isTemplateModification) {
        responseContent = `Great! I'll help you modify an existing template: "${userMessage.content}"\n\n🔄 **Modification Process:**\n\n• Loading the base template from our database\n• Analyzing your requested changes\n• Adding/modifying the necessary nodes\n• Updating connections and data flow\n• Testing the enhanced workflow\n\n✨ This approach saves time by building on proven workflows!\n\nGenerating your customized template now...`;
      } else {
        responseContent = `I'll help you create a workflow for: "${userMessage.content}"\n\n🛠️ **Building Process:**\n\n• Analyzing your requirements\n• Selecting optimal nodes and integrations\n• Designing the data flow architecture\n• Adding error handling and validation\n• Optimizing for performance\n\n🎯 Creating your custom N8N workflow now...`;
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
      
      // Simulate workflow creation in history
      const newWorkflow: WorkflowHistoryItem = {
        id: Date.now().toString(),
        status: Math.random() > 0.2 ? 'Completed' : 'Failed',
        timestamp: new Date(),
        problemStatement: userMessage.content,
        snapshotImage: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
        executionTime: `${Math.floor(Math.random() * 10) + 1}m ${Math.floor(Math.random() * 59)}s`,
        nodeCount: Math.floor(Math.random() * 15) + 1,
        errorMessage: Math.random() > 0.2 ? undefined : "Failed to generate workflow - please try again"
      };

      // Add to workflow history
      const updatedHistory = [newWorkflow, ...workflowHistory];
      setWorkflowHistory(updatedHistory);

      // Save to localStorage
      try {
        const storedHistory = localStorage.getItem('workflowHistory');
        const existingWorkflows = storedHistory ? JSON.parse(storedHistory) : [];
        const newStoredWorkflow = {
          ...newWorkflow,
          status: newWorkflow.status.toLowerCase()
        };
        const updatedStoredHistory = [newStoredWorkflow, ...existingWorkflows];
        localStorage.setItem('workflowHistory', JSON.stringify(updatedStoredHistory));
      } catch (error) {
        console.error('Error saving workflow:', error);
      }

      setIsGenerating(false);
      toast.success(newWorkflow.status === 'Completed' ? 'Workflow created successfully!' : 'Workflow generation failed');
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStarterClick = (starter: string) => {
    setInputValue(starter);
    textareaRef.current?.focus();
  };

  const handleViewWorkflowInNewTab = (workflow: WorkflowHistoryItem) => {
    // In a real application, this would open the workflow in the N8N editor
    const workflowUrl = `${window.location.origin}/workflow/${workflow.id}`;
    window.open(workflowUrl, '_blank', 'noopener,noreferrer');
    toast.success("Opening workflow in new tab");
  };

  const handleCopyWorkflow = (workflow: WorkflowHistoryItem) => {
    const workflowData = {
      problemStatement: workflow.problemStatement,
      status: workflow.status,
      nodeCount: workflow.nodeCount,
      workflowData: workflow.workflowData,
      timestamp: workflow.timestamp.toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(workflowData, null, 2));
    toast.success("Workflow data copied to clipboard!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-white bg-green-600 hover:bg-green-700';
      case 'Failed':
        return 'text-white bg-red-600 hover:bg-red-700';
      default:
        return 'text-white bg-green-600 hover:bg-green-700';
    }
  };

  const formatCreatedDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }).format(date);
    }
  };

  const renderWorkflowCard = (workflow: WorkflowHistoryItem) => (
    <HoverCard key={workflow.id} openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="group hover:shadow-xl transition-all duration-300 cursor-pointer">
          <Card className="border-border/50 hover:border-primary/40 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              {workflow.status === 'Completed' && workflow.snapshotImage ? (
                <div className="aspect-[4/3] relative overflow-hidden rounded-xl bg-muted/50 mb-6">
                  <img 
                    src={workflow.snapshotImage} 
                    alt="Workflow preview"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="text-sm bg-black/70 text-white border-0 h-7 px-3 backdrop-blur-sm">
                      <Workflow className="h-3 w-3 mr-1" />
                      {workflow.nodeCount} nodes
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewWorkflowInNewTab(workflow);
                        }}
                        className="h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white border-0 backdrop-blur-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyWorkflow(workflow);
                        }}
                        className="h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white border-0 backdrop-blur-sm"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/3] bg-muted/30 rounded-xl flex items-center justify-center mb-6 border-2 border-dashed border-muted-foreground/20">
                  <div className="text-center">
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generation Failed</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground line-clamp-2 leading-tight mb-2">
                    {workflow.problemStatement}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatCreatedDate(workflow.timestamp)}</span>
                    </div>
                    {workflow.executionTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{workflow.executionTime}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Badge className={`${getStatusColor(workflow.status)} border-0 px-4 py-2 text-sm h-8`}>
                    {getStatusIcon(workflow.status)}
                    <span className="ml-2">{workflow.status}</span>
                  </Badge>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewWorkflowInNewTab(workflow);
                      }}
                      disabled={workflow.status !== 'Completed'}
                      className="h-8 px-3 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyWorkflow(workflow);
                      }}
                      className="h-8 px-3 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-4" side="top">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(workflow.status)} border-0 px-3 py-1 text-sm h-7`}>
              {getStatusIcon(workflow.status)}
              <span className="ml-1">{workflow.status}</span>
            </Badge>
            {workflow.status === 'Completed' && (
              <Badge variant="outline" className="text-sm h-7">
                <Workflow className="h-3 w-3 mr-1" />
                {workflow.nodeCount} nodes
              </Badge>
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Full Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {workflow.problemStatement}
            </p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{workflow.timestamp.toLocaleDateString()}</span>
            </div>
            {workflow.executionTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{workflow.executionTime}</span>
              </div>
            )}
          </div>
          
          {workflow.errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                <span className="font-medium">Error:</span> {workflow.errorMessage}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-primary/20">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">AI Workflow Builder</h1>
                <p className="text-base text-muted-foreground">
                  Describe your automation needs and get a custom N8N workflow instantly
                </p>
              </div>
            </div>
            
            {/* Enhanced Stats and View Toggle */}
            <div className="flex items-center gap-6">
              {workflowHistory.length > 0 && (
                <div className="flex items-center gap-4 text-base text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    <span>{workflowHistory.length} workflows</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{workflowHistory.filter(w => w.status === 'Completed').length} successful</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Chat Input */}
          <div className="relative mb-4">
            <Textarea
              ref={textareaRef}
              placeholder="Example: Create a workflow that monitors my website and sends Slack notifications when it goes down..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[4rem] max-h-28 pr-16 resize-none border-2 border-primary/20 bg-background/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all text-base rounded-xl shadow-sm"
              disabled={isGenerating}
            />
            <Button
              size="lg"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isGenerating}
              className="absolute right-3 bottom-3 h-10 w-10 p-0 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg rounded-lg"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-2 py-1 text-xs bg-muted rounded-md border">Enter</kbd> to send, <kbd className="px-2 py-1 text-xs bg-muted rounded-md border">Shift + Enter</kbd> for new line
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>AI Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Expanded Main Content */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-8">
                {/* Recent Workflows Section */}
                {workflowHistory.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-semibold text-foreground">Recent Workflows</h2>
                        <Badge variant="secondary" className="text-sm h-6 px-3">
                          {workflowHistory.length} total
                        </Badge>
                      </div>
                    </div>
                    
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {workflowHistory.map(renderWorkflowCard)}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {workflowHistory.map(workflow => (
                          <Card key={workflow.id} className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 hover:border-primary/40">
                            <CardContent className="p-6" onClick={() => handleViewWorkflowInNewTab(workflow)}>
                              <div className="flex items-center gap-6">
                                {workflow.status === 'Completed' && workflow.snapshotImage ? (
                                  <div className="w-24 h-18 relative overflow-hidden rounded-lg bg-muted/50 flex-shrink-0">
                                    <img 
                                      src={workflow.snapshotImage} 
                                      alt="Workflow preview"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-24 h-18 bg-muted/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <XCircle className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                                    {workflow.problemStatement}
                                  </h3>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <Badge className={`${getStatusColor(workflow.status)} border-0 px-3 py-1 text-xs h-6`}>
                                        {getStatusIcon(workflow.status)}
                                        <span className="ml-1">{workflow.status}</span>
                                      </Badge>
                                      {workflow.status === 'Completed' && (
                                        <div className="flex items-center gap-1">
                                          <Workflow className="h-3 w-3" />
                                          <span>{workflow.nodeCount} nodes</span>
                                        </div>
                                      )}
                                      <span>{formatCreatedDate(workflow.timestamp)}</span>
                                      {workflow.executionTime && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{workflow.executionTime}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewWorkflowInNewTab(workflow);
                                        }}
                                        disabled={workflow.status !== 'Completed'}
                                        className="h-7 px-3 text-xs"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Open
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyWorkflow(workflow);
                                        }}
                                        className="h-7 px-3 text-xs"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation History */}
                {messages.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <MessageSquare className="h-6 w-6 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">Conversation History</h2>
                      <Badge variant="secondary" className="text-sm h-6 px-3">
                        {messages.length} messages
                      </Badge>
                    </div>
                    
                    <div className="space-y-6 max-w-4xl">
                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-4">
                          <Avatar className="h-10 w-10 mt-1 flex-shrink-0">
                            {message.type === 'user' ? (
                              <>
                                <AvatarImage src={user?.picture} alt={user?.name || 'User'} />
                                <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </>
                            ) : (
                              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-foreground">
                                {message.type === 'user' ? (user?.name || 'You') : 'N8N Assistant'}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-xl p-4 border border-border/50">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isGenerating && (
                        <div className="flex gap-4">
                          <Avatar className="h-10 w-10 mt-1 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-foreground">N8N Assistant</span>
                              <span className="text-sm text-muted-foreground">now</span>
                            </div>
                            <div className="flex items-center gap-3 text-base text-muted-foreground bg-muted/30 rounded-xl p-4 border border-border/50">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span>Generating your workflow...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conversation Starters - Only show when no messages */}
                {messages.length === 0 && (
                  <div className="max-w-4xl">
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="h-6 w-6 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">Get Started</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Template Modification */}
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 hover:border-blue-200 dark:hover:border-blue-800">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                            <h3 className="text-base font-medium text-foreground">Modify Templates</h3>
                          </div>
                          <div className="space-y-3">
                            {conversationStarters.slice(0, 2).map((starter, index) => (
                              <Button
                                key={`template-${index}`}
                                variant="ghost"
                                className="text-left h-auto min-h-[3rem] p-3 whitespace-normal text-sm leading-relaxed hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 transition-all justify-start w-full border border-transparent hover:border-blue-200"
                                onClick={() => handleStarterClick(starter)}
                              >
                                <span className="text-foreground/80 block w-full text-left">
                                  {starter}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* New Workflows */}
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 hover:border-green-200 dark:hover:border-green-800">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-teal-500"></div>
                            <h3 className="text-base font-medium text-foreground">Create New</h3>
                          </div>
                          <div className="space-y-3">
                            {conversationStarters.slice(3, 5).map((starter, index) => (
                              <Button
                                key={`new-${index}`}
                                variant="ghost"
                                className="text-left h-auto min-h-[3rem] p-3 whitespace-normal text-sm leading-relaxed hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20 transition-all justify-start w-full border border-transparent hover:border-green-200"
                                onClick={() => handleStarterClick(starter)}
                              >
                                <span className="text-foreground/80 block w-full text-left">
                                  {starter}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* AI & Advanced */}
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 hover:border-purple-200 dark:hover:border-purple-800">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                            <h3 className="text-base font-medium text-foreground">AI & Advanced</h3>
                          </div>
                          <div className="space-y-3">
                            {conversationStarters.slice(13, 15).map((starter, index) => (
                              <Button
                                key={`ai-${index}`}
                                variant="ghost"
                                className="text-left h-auto min-h-[3rem] p-3 whitespace-normal text-sm leading-relaxed hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 transition-all justify-start w-full border border-transparent hover:border-purple-200"
                                onClick={() => handleStarterClick(starter)}
                              >
                                <span className="text-foreground/80 block w-full text-left">
                                  {starter}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}