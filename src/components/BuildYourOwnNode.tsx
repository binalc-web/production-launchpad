import { useState } from "react";
import { toast } from "sonner@2.0.3";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Search, 
  Lightbulb, 
  Code, 
  Zap, 
  Star, 
  Download, 
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Target,
  Wrench,
  CheckCircle,
  AlertCircle,
  BookOpen
} from "lucide-react";

interface OpenSourceNode {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  icon: string;
  tags: string[];
  npmPackage?: string;
  githubUrl?: string;
  documentation?: string;
  compatibility: number; // Percentage match to user's problem
}

interface TemplateSuggestion {
  id: string;
  name: string;
  description: string;
  useCase: string;
  rating: number;
  downloads: number;
  thumbnail: string;
  tools: Array<{ name: string; icon: string }>;
  compatibility: number;
  customizationSuggestions: string[];
}

const mockOpenSourceNodes: OpenSourceNode[] = [
  {
    id: 'email-validator',
    name: 'Email Validator Node',
    description: 'Validates email addresses using various validation methods including syntax, domain, and SMTP checks.',
    category: 'Validation',
    difficulty: 'Easy',
    icon: '📧',
    tags: ['email', 'validation', 'verification'],
    npmPackage: '@n8n/email-validator',
    githubUrl: 'https://github.com/n8n-io/n8n-nodes-email-validator',
    compatibility: 95
  },
  {
    id: 'data-transformer',
    name: 'Advanced Data Transformer',
    description: 'Transform, filter, and manipulate JSON data with custom JavaScript functions and built-in helpers.',
    category: 'Data Processing',
    difficulty: 'Medium',
    icon: '🔄',
    tags: ['data', 'transform', 'json', 'javascript'],
    npmPackage: '@n8n/data-transformer',
    githubUrl: 'https://github.com/n8n-io/n8n-nodes-data-transformer',
    compatibility: 78
  },
  {
    id: 'webhook-parser',
    name: 'Smart Webhook Parser',
    description: 'Parse and validate incoming webhook data with schema validation and automatic field mapping.',
    category: 'Integration',
    difficulty: 'Medium',
    icon: '🔗',
    tags: ['webhook', 'parser', 'integration', 'validation'],
    npmPackage: '@n8n/webhook-parser',
    githubUrl: 'https://github.com/n8n-io/n8n-nodes-webhook-parser',
    compatibility: 65
  }
];

const mockTemplateSuggestions: TemplateSuggestion[] = [
  {
    id: 'email-workflow',
    name: 'Email Validation & Cleanup Workflow',
    description: 'Complete email list cleaning and validation with bounce detection and deliverability scoring.',
    useCase: 'Perfect for cleaning marketing email lists and improving deliverability rates.',
    rating: 4.8,
    downloads: 15420,
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=200&fit=crop',
    tools: [
      { name: 'Email Validator', icon: '📧' },
      { name: 'CSV Parser', icon: '📊' },
      { name: 'Slack', icon: '💬' }
    ],
    compatibility: 92,
    customizationSuggestions: [
      'Add custom validation rules for your domain requirements',
      'Integrate with your CRM for automatic list updates',
      'Add email scoring based on engagement history'
    ]
  },
  {
    id: 'form-processor',
    name: 'Contact Form Processor with Validation',
    description: 'Process contact form submissions with email validation, spam detection, and automated responses.',
    useCase: 'Ideal for websites that need reliable contact form processing with built-in validation.',
    rating: 4.6,
    downloads: 8932,
    thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop',
    tools: [
      { name: 'Form Parser', icon: '📝' },
      { name: 'Email Validator', icon: '📧' },
      { name: 'Gmail', icon: '✉️' },
      { name: 'Slack', icon: '💬' }
    ],
    compatibility: 85,
    customizationSuggestions: [
      'Add custom fields validation for your specific form',
      'Integrate with your preferred email service provider',
      'Add automated follow-up sequences'
    ]
  }
];

export function BuildYourOwnNode() {
  const [problemStatement, setProblemStatement] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [activeTab, setActiveTab] = useState("nodes");

  const addToWorkflowHistory = (status: 'completed' | 'failed' | 'processing', errorMessage?: string) => {
    const workflowItem = {
      id: Date.now().toString(),
      status,
      timestamp: new Date(),
      problemStatement: problemStatement.trim(),
      description: status === 'completed' ? 'Custom workflow analysis and solution recommendations' : undefined,
      thumbnail: status === 'completed' ? 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=200&fit=crop' : undefined,
      workflowData: status === 'completed' ? { 
        nodes: mockOpenSourceNodes.slice(0, 3),
        templates: mockTemplateSuggestions.slice(0, 2)
      } : undefined,
      executionTime: status === 'completed' ? '2m 30s' : undefined,
      nodeCount: status === 'completed' ? 3 : undefined,
      errorMessage
    };

    // Get existing workflow history
    const existingHistory = JSON.parse(localStorage.getItem('workflowHistory') || '[]');
    
    // Add new item to the beginning
    const updatedHistory = [workflowItem, ...existingHistory].slice(0, 50); // Keep last 50 items
    
    // Save to localStorage
    localStorage.setItem('workflowHistory', JSON.stringify(updatedHistory));
  };

  const handleAnalyze = async () => {
    if (!problemStatement.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      // Add processing entry to history
      addToWorkflowHistory('processing');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        setIsAnalyzing(false);
        setHasAnalyzed(true);
        
        // Add completed entry to history
        addToWorkflowHistory('completed');
        
        toast.success("Problem analyzed successfully! Solutions found.");
      } else {
        // Simulate failure
        setIsAnalyzing(false);
        addToWorkflowHistory('failed', 'Unable to find suitable solutions for the given problem statement');
        toast.error("Analysis failed. Please try rephrasing your problem statement.");
      }
    } catch (error) {
      setIsAnalyzing(false);
      addToWorkflowHistory('failed', 'Network error during analysis');
      toast.error("An error occurred during analysis. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAnalyze();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium">Build Your Own Node</h1>
            <p className="text-sm text-muted-foreground">Describe your problem and we'll find the perfect solution</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Problem Statement Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Describe Your Problem
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tell us what you're trying to accomplish. Be as specific as possible about your requirements.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Example: I need to validate email addresses from contact form submissions, check if they're deliverable, and send different responses based on the validation results..."
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-24 resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Press Ctrl+Enter to analyze or use the button below
                  </p>
                  <Button 
                    onClick={handleAnalyze}
                    disabled={!problemStatement.trim() || isAnalyzing}
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze Problem
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {hasAnalyzed && (
              <div className="space-y-6">
                {/* Analysis Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Problem Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">Solvable</p>
                          <p className="text-xs text-muted-foreground">We found solutions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Code className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">3 Open Source Nodes</p>
                          <p className="text-xs text-muted-foreground">Ready to use</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-sm">2 Templates</p>
                          <p className="text-xs text-muted-foreground">Close matches</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Solutions Tabs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      Recommended Solutions
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      We found several solutions that can be customized for your needs
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <div className="px-6 pb-4">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                          <TabsTrigger value="nodes" className="gap-2">
                            <Code className="h-3 w-3" />
                            Open Source Nodes
                          </TabsTrigger>
                          <TabsTrigger value="templates" className="gap-2">
                            <BookOpen className="h-3 w-3" />
                            Template Matches
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="nodes" className="px-6 pb-6 mt-0">
                        <div className="space-y-4">
                          {mockOpenSourceNodes.map((node) => (
                            <Card key={node.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">
                                    {node.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h3 className="font-medium">{node.name}</h3>
                                        <p className="text-sm text-muted-foreground">{node.category}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant={node.difficulty === 'Easy' ? 'secondary' : node.difficulty === 'Medium' ? 'default' : 'destructive'}
                                          className="text-xs"
                                        >
                                          {node.difficulty}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          {node.compatibility}% match
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{node.description}</p>
                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-wrap gap-1">
                                        {node.tags.map((tag) => (
                                          <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="gap-1">
                                          <Code className="h-3 w-3" />
                                          View Code
                                        </Button>
                                        <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-1">
                                          <Download className="h-3 w-3" />
                                          Use Node
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="templates" className="px-6 pb-6 mt-0">
                        <div className="space-y-4">
                          {mockTemplateSuggestions.map((template) => (
                            <Card key={template.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex gap-4">
                                  <img 
                                    src={template.thumbnail} 
                                    alt={template.name}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h3 className="font-medium">{template.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            <span>{template.rating}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Download className="h-3 w-3" />
                                            <span>{template.downloads.toLocaleString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        {template.compatibility}% match
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                                    
                                    <div className="mb-3">
                                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Perfect for:</p>
                                      <p className="text-xs text-muted-foreground">{template.useCase}</p>
                                    </div>

                                    <div className="mb-3">
                                      <p className="text-xs font-medium mb-1">Customization Suggestions:</p>
                                      <ul className="text-xs text-muted-foreground space-y-0.5">
                                        {template.customizationSuggestions.slice(0, 2).map((suggestion, index) => (
                                          <li key={index} className="flex items-start gap-1">
                                            <span className="text-primary">•</span>
                                            <span>{suggestion}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        {template.tools.slice(0, 4).map((tool, index) => (
                                          <div key={index} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                                            <span>{tool.icon}</span>
                                            <span>{tool.name}</span>
                                          </div>
                                        ))}
                                        {template.tools.length > 4 && (
                                          <span className="text-xs text-muted-foreground">+{template.tools.length - 4} more</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="gap-1">
                                          <BookOpen className="h-3 w-3" />
                                          Preview
                                        </Button>
                                        <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-1">
                                          <ArrowRight className="h-3 w-3" />
                                          Customize
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Next Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRight className="h-5 w-5 text-green-600" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-border rounded-lg">
                        <h4 className="font-medium mb-2">Use Open Source Node</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Install and configure the node that best matches your requirements.
                        </p>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Code className="h-3 w-3" />
                          Installation Guide
                        </Button>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <h4 className="font-medium mb-2">Customize Template</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Fork an existing template and modify it to fit your specific needs.
                        </p>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Wrench className="h-3 w-3" />
                          Start Customizing
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}