import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { WorkflowCanvas } from "./workflow/WorkflowCanvas";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  ArrowLeft, 
  Star, 
  Download, 
  Clock, 
  User, 
  Calendar, 
  Layers, 
  Play, 
  Copy, 
  Heart,
  Share2,
  ExternalLink,
  Settings,
  Code,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  Upload,
  Key,
  TestTube,
  Rocket,
  BookOpen,
  Video,
  HelpCircle
} from "lucide-react";
import { WorkflowTemplate } from "../data/mockTemplates";
import { toast } from "sonner@2.0.3";

interface TemplateDetailViewProps {
  template: WorkflowTemplate;
  onBack: () => void;
}

export function TemplateDetailView({ template, onBack }: TemplateDetailViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorited, setIsFavorited] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Provide safe defaults for all template properties
  const safeTemplate = {
    id: template?.id || '',
    name: template?.name || 'Untitled Template',
    description: template?.description || 'No description available',
    category: template?.category || 'General',
    tags: template?.tags || [],
    tools: template?.tools || [],
    nodes: template?.nodes || 0,
    downloads: template?.downloads || 0,
    rating: template?.rating || 0,
    author: template?.author || 'Unknown',
    lastUpdated: template?.lastUpdated || new Date().toISOString(),
    thumbnail: template?.thumbnail || 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=300&h=200&fit=crop',
    complexity: template?.complexity || 'Beginner',
    useCase: template?.useCase || 'General automation use case',
    estimatedTime: template?.estimatedTime || '15 minutes'
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create mock JSON data
    const workflowJSON = {
      meta: {
        templateCredsSetupCompleted: false,
        instanceId: `workflow-template-${safeTemplate.id}`
      },
      nodes: [
        {
          parameters: {},
          id: "workflow-start",
          name: "Start",
          type: "n8n-nodes-base.start",
          typeVersion: 1,
          position: [250, 300]
        }
        // Additional nodes would be here in a real template
      ],
      connections: {},
      active: false,
      settings: {
        executionOrder: "v1"
      },
      versionId: "1.0.0",
      id: safeTemplate.id,
      name: safeTemplate.name,
      tags: safeTemplate.tags
    };

    // Create and trigger download
    const blob = new Blob([JSON.stringify(workflowJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTemplate.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsDownloading(false);
    toast.success("Template downloaded successfully!");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Results
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-medium">{safeTemplate.name}</h1>
                <p className="text-sm text-muted-foreground">by {safeTemplate.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFavorited(!isFavorited)}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                {isFavorited ? 'Favorited' : 'Favorite'}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-gradient-to-r from-primary to-cyan-400 hover:from-primary/90 hover:to-cyan-400/90 text-white gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Panel */}
        <div className="w-80 border-r border-border bg-muted/30">
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-6 space-y-6">
              {/* Template Image */}
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <img 
                  src={safeTemplate.thumbnail} 
                  alt={safeTemplate.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=300&h=200&fit=crop';
                  }}
                />
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Template Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{safeTemplate.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Downloads</span>
                    <span className="text-sm font-medium">{safeTemplate.downloads.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nodes</span>
                    <span className="text-sm font-medium">{safeTemplate.nodes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Setup Time</span>
                    <span className="text-sm font-medium">{safeTemplate.estimatedTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Complexity</span>
                    <Badge 
                      variant={safeTemplate.complexity === 'Beginner' ? 'secondary' : safeTemplate.complexity === 'Intermediate' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {safeTemplate.complexity}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge variant="outline" className="text-xs">{safeTemplate.category}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Tools Used */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Tools & Integrations ({safeTemplate.tools.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {safeTemplate.tools.map((tool, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">{tool?.icon || '🔧'}</span>
                        <span className="text-xs font-medium truncate">{tool?.name || 'Unknown Tool'}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Author Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Author
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary to-cyan-400 rounded-full flex items-center justify-center text-white font-medium">
                      {safeTemplate.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{safeTemplate.author}</p>
                      <p className="text-xs text-muted-foreground">Workflow Creator</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Updated {formatDate(safeTemplate.lastUpdated)}
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    View Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {safeTemplate.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => copyToClipboard(window.location.href, "Template URL")}
                >
                  <Copy className="h-4 w-4" />
                  Copy Template URL
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open N8N Documentation
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4" />
                  Download JSON
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-5">
                <TabsTrigger value="overview" className="gap-1">
                  <FileText className="h-3 w-3" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="how-to-use" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  How to Use
                </TabsTrigger>
                <TabsTrigger value="workflow" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="setup" className="gap-1">
                  <Settings className="h-3 w-3" />
                  Setup
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-1">
                  <Code className="h-3 w-3" />
                  Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle>About This Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {safeTemplate.description}
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Use Case</h4>
                        <p className="text-sm text-muted-foreground">{safeTemplate.useCase}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Features */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Automated Processing</p>
                            <p className="text-xs text-muted-foreground">No manual intervention needed</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Easy Configuration</p>
                            <p className="text-xs text-muted-foreground">Simple setup process</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Multi-Platform</p>
                            <p className="text-xs text-muted-foreground">Works across platforms</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Real-time Updates</p>
                            <p className="text-xs text-muted-foreground">Instant notifications</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Requirements */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Prerequisites</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• N8N instance (cloud or self-hosted)</li>
                            <li>• Valid API credentials for integrated services</li>
                            <li>• Basic understanding of workflow automation</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Supported Versions</h4>
                          <p className="text-sm text-muted-foreground">N8N v1.0+ recommended</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="how-to-use" className="mt-6">
                <div className="space-y-6">
                  {/* Quick Start Banner */}
                  <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-cyan-400/5">
                    <Rocket className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong>Ready to get started?</strong> Follow these step-by-step instructions to implement this template in your N8N instance.
                    </AlertDescription>
                  </Alert>

                  {/* Step by Step Instructions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Complete Setup Guide
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Estimated setup time: <strong>{safeTemplate.estimatedTime}</strong> • Complexity: <strong>{safeTemplate.complexity}</strong>
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        {/* Step 1: Download Template */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                              1
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-medium text-lg">Download the Template</h3>
                              <p className="text-muted-foreground">
                                Download the JSON file containing the complete workflow configuration.
                              </p>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Template File:</span>
                                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                  {safeTemplate.name.toLowerCase().replace(/\s+/g, '-')}.json
                                </span>
                              </div>
                              <Button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="w-full gap-2"
                              >
                                {isDownloading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Downloading...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4" />
                                    Download Template JSON
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Access N8N */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                              2
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-medium text-lg">Access Your N8N Instance</h3>
                              <p className="text-muted-foreground">
                                Open your N8N instance in your web browser. You can use N8N Cloud or your self-hosted instance.
                              </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <div>
                                  <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">Don't have N8N?</p>
                                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                                    You can sign up for N8N Cloud at <span className="font-mono">n8n.cloud</span> or install N8N locally.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 3: Import Template */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                              3
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-medium text-lg">Import the Workflow</h3>
                              <p className="text-muted-foreground">
                                Import the downloaded JSON template into your N8N workspace.
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Upload className="h-4 w-4" />
                                  Import Steps:
                                </h4>
                                <ol className="text-sm text-muted-foreground space-y-2 ml-6">
                                  <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">1</span>
                                    <span>Click the <strong>"+"</strong> button to create a new workflow</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">2</span>
                                    <span>Select <strong>"Import from File"</strong> or use <strong>Ctrl+I</strong></span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">3</span>
                                    <span>Choose the downloaded JSON file</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">4</span>
                                    <span>Click <strong>"Import"</strong> to load the workflow</span>
                                  </li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 4: Configure Credentials */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                              4
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-medium text-lg">Set Up Credentials</h3>
                              <p className="text-muted-foreground">
                                Configure authentication for each service used in the workflow.
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">Required Credentials:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                      {safeTemplate.tools.map((tool, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                                          <span className="text-base">{tool?.icon || '🔧'}</span>
                                          <span>{tool?.name || 'Unknown'} API Key</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-medium text-sm mb-2">Credential Setup Process:</h4>
                                <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                                  <li>1. Click on any node that shows a credential warning (red exclamation mark)</li>
                                  <li>2. Click the <strong>"Create New"</strong> credential button</li>
                                  <li>3. Enter your API keys and authentication details</li>
                                  <li>4. Test the connection to ensure it works</li>
                                  <li>5. Save the credential for future use</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 5: Test Workflow */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                              5
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-medium text-lg">Test Your Workflow</h3>
                              <p className="text-muted-foreground">
                                Run a test execution to ensure everything works correctly before going live.
                              </p>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <TestTube className="h-4 w-4" />
                                Testing Steps:
                              </div>
                              <ol className="text-sm text-muted-foreground space-y-1 ml-6">
                                <li>1. Click the <strong>"Test workflow"</strong> button (play icon)</li>
                                <li>2. Monitor the execution in real-time</li>
                                <li>3. Check each node's output for expected results</li>
                                <li>4. Fix any errors or configuration issues</li>
                                <li>5. Repeat until the workflow runs successfully</li>
                              </ol>
                            </div>
                          </div>
                        </div>

                        {/* Step 6: Deploy */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                              6
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-medium text-lg">Activate & Deploy</h3>
                              <p className="text-muted-foreground">
                                Once testing is complete, activate your workflow to start automation.
                              </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                              <div className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                <div>
                                  <p className="font-medium text-green-800 dark:text-green-200 text-sm">Final Steps:</p>
                                  <ul className="text-green-700 dark:text-green-300 text-sm space-y-1 mt-1">
                                    <li>• Toggle the workflow switch to "Active"</li>
                                    <li>• Save your workflow</li>
                                    <li>• Monitor initial executions</li>
                                    <li>• Set up error notifications if needed</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Resources */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        Need Help?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                          <Video className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Video Tutorial</div>
                            <div className="text-sm text-muted-foreground">Watch step-by-step setup</div>
                          </div>
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                          <ExternalLink className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">N8N Documentation</div>
                            <div className="text-sm text-muted-foreground">Official N8N guides</div>
                          </div>
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                          <User className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Contact Author</div>
                            <div className="text-sm text-muted-foreground">Get support from {safeTemplate.author}</div>
                          </div>
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto p-4">
                          <HelpCircle className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Community Support</div>
                            <div className="text-sm text-muted-foreground">Ask questions in forums</div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="workflow" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive Workflow Visualization</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      This workflow contains {safeTemplate.nodes} nodes and follows a {safeTemplate.complexity.toLowerCase()} complexity pattern.
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <WorkflowCanvas readonly={true} className="h-[600px]" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="setup" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Setup Details</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Advanced configuration options and technical requirements.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Prerequisites */}
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Prerequisites & Requirements
                        </h3>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">System Requirements:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                              <li>• N8N version {safeTemplate.complexity === 'Advanced' ? '1.2+' : '1.0+'} or higher</li>
                              <li>• Active internet connection for API calls</li>
                              <li>• Sufficient execution timeout settings</li>
                              <li>• Memory allocation for {safeTemplate.nodes} concurrent nodes</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-2">Required API Access:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {safeTemplate.tools.map((tool, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <span className="text-base">{tool?.icon || '🔧'}</span>
                                  <span className="text-muted-foreground">{tool?.name || 'Unknown'} API credentials</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Configuration Steps */}
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Configuration Steps
                        </h3>
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                              1
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">Environment Setup</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Ensure your N8N instance has the required node types installed and enabled.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                              2
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">Credential Configuration</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Set up authentication for each integrated service with proper permissions.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                              3
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">Testing & Validation</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Test each node individually before running the complete workflow.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Important Notes */}
                      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                          <strong>Important:</strong> Make sure to test with sample data first. Review rate limits for connected services and consider setting up error handling and monitoring.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Template Code</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      View and copy the JSON configuration for this workflow template.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">File: </span>
                          <span className="font-mono bg-muted px-2 py-1 rounded">
                            {safeTemplate.name.toLowerCase().replace(/\s+/g, '-')}.json
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => copyToClipboard(JSON.stringify({
                            meta: { templateCredsSetupCompleted: false, instanceId: `workflow-template-${safeTemplate.id}` },
                            nodes: [{ parameters: {}, id: "workflow-start", name: "Start", type: "n8n-nodes-base.start", typeVersion: 1, position: [250, 300] }],
                            connections: {}, active: false, settings: { executionOrder: "v1" }, versionId: "1.0.0", id: safeTemplate.id, name: safeTemplate.name, tags: safeTemplate.tags
                          }, null, 2), "Template code")}
                        >
                          <Copy className="h-3 w-3" />
                          Copy Code
                        </Button>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm text-muted-foreground">
{`{
  "meta": {
    "templateCredsSetupCompleted": false,
    "instanceId": "workflow-template-${safeTemplate.id}"
  },
  "nodes": [
    {
      "parameters": {},
      "id": "workflow-start",
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    }
    // ... ${safeTemplate.nodes - 1} more nodes
  ],
  "connections": {},
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1.0.0",
  "id": "${safeTemplate.id}",
  "name": "${safeTemplate.name}",
  "tags": ${JSON.stringify(safeTemplate.tags)}
}`}
                        </pre>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4" />
                        <span>This is a simplified version. The complete template contains all node configurations and connections.</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}