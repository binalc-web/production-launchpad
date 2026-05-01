import { useState } from "react";
import { ArrowLeft, Star, Download, ExternalLink, Copy, CheckCircle, AlertCircle, Key, Settings, BookOpen, Lightbulb, Code, Bookmark } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription } from "./ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { N8NNode, NodeParameter, NodeCredential } from "../data/mockNodes";
import { toast } from "sonner@2.0.3";

interface NodeDetailProps {
  node: N8NNode;
  onBack: () => void;
}

export function NodeDetail({ node, onBack }: NodeDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${description} copied to clipboard`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getParameterTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'string': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'number': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'boolean': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'options': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'collection': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'json': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'fixedCollection': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    };
    return colors[type] || colors['string'];
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Search
              </Button>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: node.color + '20', color: node.color }}>
                  {node.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-medium">{node.displayName}</h1>
                    {node.verified && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        ✓ Verified
                      </Badge>
                    )}
                    <Badge variant="outline">v{node.version}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">
                    {node.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      {formatNumber(node.downloadCount)} downloads
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {node.rating} rating
                    </div>
                    <span>{node.category} • {node.subcategory}</span>
                    <span>By {node.author}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>
                <Button size="sm">
                  Add to Workflow
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {node.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="parameters" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Parameters
                </TabsTrigger>
                <TabsTrigger value="credentials" className="gap-2">
                  <Key className="h-4 w-4" />
                  Credentials
                </TabsTrigger>
                <TabsTrigger value="examples" className="gap-2">
                  <Code className="h-4 w-4" />
                  Examples
                </TabsTrigger>
                <TabsTrigger value="guide" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Usage Guide
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Node Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-1">Version</h4>
                          <p className="text-muted-foreground">{node.version}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Author</h4>
                          <p className="text-muted-foreground">{node.author}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Category</h4>
                          <p className="text-muted-foreground">{node.category}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Last Updated</h4>
                          <p className="text-muted-foreground">
                            {node.lastUpdated.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Quick Stats</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="font-medium">{formatNumber(node.downloadCount)}</div>
                            <div className="text-muted-foreground">Downloads</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="font-medium">{node.rating}/5</div>
                            <div className="text-muted-foreground">Rating</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="font-medium">{node.parameters.length}</div>
                            <div className="text-muted-foreground">Parameters</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {node.description}
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        <Button variant="outline" size="sm" asChild>
                          <a href={node.documentation} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Documentation
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="parameters" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Node Parameters</CardTitle>
                    <CardDescription>
                      Configure these parameters to customize the node behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {node.parameters.map((param, index) => (
                        <div key={param.name} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{param.displayName}</h4>
                              <Badge className={getParameterTypeColor(param.type)}>
                                {param.type}
                              </Badge>
                              {param.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(param.name, 'Parameter name')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {param.description}
                          </p>
                          {param.placeholder && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Placeholder: {param.placeholder}
                            </p>
                          )}
                          {param.default !== undefined && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Default: {JSON.stringify(param.default)}
                            </p>
                          )}
                          {param.options && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium mb-2">Available Options:</h5>
                              <div className="flex flex-wrap gap-2">
                                {param.options.map((option) => (
                                  <Badge key={option.value} variant="outline" className="text-xs">
                                    {option.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="credentials" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Authentication & Credentials</CardTitle>
                    <CardDescription>
                      Set up authentication to connect this node to external services
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {node.credentials && node.credentials.length > 0 ? (
                      <div className="space-y-4">
                        {node.credentials.map((credential) => (
                          <div key={credential.name} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{credential.displayName}</h4>
                                {credential.required && (
                                  <Badge variant="destructive" className="text-xs mt-1">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(credential.name, 'Credential name')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {credential.description}
                            </p>
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium">Required Fields:</h5>
                              {credential.properties.map((property) => (
                                <div key={property.name} className="bg-muted rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{property.displayName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {property.type}
                                    </Badge>
                                    {property.required && (
                                      <Badge variant="destructive" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {property.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This node does not require authentication credentials.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="examples" className="mt-6">
                <div className="space-y-4">
                  {node.examples.map((example, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base">{example.title}</CardTitle>
                        <CardDescription>{example.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium">Configuration</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(example.configuration, null, 2), 'Configuration')}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-sm overflow-x-auto">
                            <code>{JSON.stringify(example.configuration, null, 2)}</code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {node.usageGuide.overview}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Setup Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {node.usageGuide.steps.map((step, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <p className="text-sm">{step}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tips & Best Practices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {node.usageGuide.tips.map((tip, index) => (
                          <div key={index} className="flex gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Common Use Cases</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {node.usageGuide.commonUses.map((useCase, index) => (
                          <div key={index} className="flex gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{useCase}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}