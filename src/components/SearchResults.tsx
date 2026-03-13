import { useState } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Star, Download, Clock, User, Layers, ArrowRight, Copy, History, Play, ArrowLeft, HelpCircle, Lock, CreditCard, Zap } from "lucide-react";
import { WorkflowTemplate } from "../data/mockTemplates";
import { toast } from "sonner@2.0.3";
import { N8NInstructions } from "./N8NInstructions";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
  searchUsage?: {
    aiSearches: number;
    simpleSearches: number;
    maxAiSearches: number;
    maxSimpleSearches: number;
  };
}

interface RecentSearch {
  query: string;
  timestamp: Date;
  results: WorkflowTemplate[];
  mode: "ai" | "simple";
}

interface SearchResultsProps {
  results: WorkflowTemplate[];
  searchQuery: string;
  searchMode: "ai" | "simple";
  user: User;
  canSearch: (mode: "ai" | "simple") => boolean;
  onTemplateSelect: (template: WorkflowTemplate) => void;
  onBackToSearch: () => void;
  onUpgrade: () => void;
  recentSearches?: RecentSearch[];
  onRecentSearchSelect?: (query: string, mode?: "ai" | "simple") => void;
}

// Mini workflow visualization component
function MiniWorkflowPreview({ templates }: { templates: WorkflowTemplate[] }) {
  if (!templates.length) return null;
  
  const template = templates[0];
  const displayTools = template.tools.slice(0, 4);
  
  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex items-center gap-1">
        {displayTools.map((tool, index) => (
          <div key={index} className="flex items-center">
            <div 
              className="w-6 h-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-xs shadow-sm"
              style={{ backgroundColor: `${tool.color}20` }}
              title={tool.name}
            >
              {tool.icon}
            </div>
            {index < displayTools.length - 1 && (
              <div className="w-3 h-px bg-border mx-1" />
            )}
          </div>
        ))}
        {template.tools.length > 4 && (
          <div className="flex items-center">
            <div className="w-3 h-px bg-border mx-1" />
            <div className="w-6 h-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-xs text-muted-foreground">
              +{template.tools.length - 4}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function copyToClipboard(template: WorkflowTemplate) {
  const workflowJSON = {
    name: template.name,
    description: template.description,
    category: template.category,
    tools: template.tools,
    nodes: template.nodes,
    metadata: {
      author: template.author,
      complexity: template.complexity,
      estimatedTime: template.estimatedTime,
      tags: template.tags
    }
  };
  
  navigator.clipboard.writeText(JSON.stringify(workflowJSON, null, 2));
  toast.success("Workflow JSON copied to clipboard!");
}

export function SearchResults({ 
  results, 
  searchQuery, 
  searchMode,
  user,
  canSearch,
  onTemplateSelect, 
  onBackToSearch,
  onUpgrade,
  recentSearches = [], 
  onRecentSearchSelect 
}: SearchResultsProps) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  const showInstructions = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setInstructionsOpen(true);
  };

  // Check if user has exceeded free search limits
  const isPaidPlan = user.plan && user.plan !== 'free';
  const hasExceededLimit = !isPaidPlan && !canSearch(searchMode);

  // Free result limits
  const freeAIResults = 5;
  const freeSimpleResults = 3;
  const freeResultLimit = searchMode === "ai" ? freeAIResults : freeSimpleResults;

  // Determine which results to blur
  const visibleResults = hasExceededLimit ? [] : results.slice(0, freeResultLimit);
  const blurredResults = hasExceededLimit ? results : results.slice(freeResultLimit);

  if (results.length === 0) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onBackToSearch}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
          
          <div className="text-center mt-20">
            <div className="mb-8">
              <h2 className="text-3xl mb-4">No workflows found</h2>
              <p className="text-muted-foreground text-lg">
                Try searching with different keywords or browse our popular categories.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {['Slack Integration', 'Email Automation', 'Data Sync', 'AI Workflows'].map((term) => (
                <Badge key={term} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={onBackToSearch}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Button>
            <div>
              <h2 className="text-3xl mb-2">
                {searchQuery ? `Results for "${searchQuery}"` : 'All Workflows'}
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-muted-foreground">
                  Found {results.length} workflow{results.length !== 1 ? 's' : ''}
                </p>
                <Badge variant="outline" className="capitalize">
                  {searchMode} Search
                </Badge>
              </div>
            </div>
          </div>

          {/* Search Limit Warning */}
          {hasExceededLimit && (
            <Alert className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
              <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Free {searchMode === "ai" ? "AI Summary" : "Simple"} Search Limit Reached</h4>
                    <p className="text-sm mb-3">
                      You've used all your free {searchMode} searches. Upgrade to see all {results.length} results or try the other search mode.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={onUpgrade} className="bg-primary hover:bg-primary/90">
                      <CreditCard className="w-3 h-3 mr-2" />
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Partial Results Warning for Free Users */}
          {!isPaidPlan && !hasExceededLimit && results.length > freeResultLimit && (
            <Alert className="mb-8 border-primary/20 bg-primary/5">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-primary mb-2">Showing {freeResultLimit} of {results.length} Results</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      You're on the free plan. Upgrade to see all search results and unlock unlimited searches.
                    </p>
                  </div>
                  <Button size="sm" onClick={onUpgrade} className="bg-primary hover:bg-primary/90 flex-shrink-0">
                    <CreditCard className="w-3 h-3 mr-2" />
                    View All Results
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Searches Section */}
          {recentSearches.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-xl">Recent Searches</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {recentSearches.map((search, index) => (
                  <Card key={index} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate flex-1">{search.query}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {search.mode}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {search.results.length} result{search.results.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      {/* Mini workflow preview */}
                      <div className="mb-3 bg-muted/50 rounded-md">
                        <MiniWorkflowPreview templates={search.results} />
                      </div>
                      
                      {/* Template preview cards */}
                      <div className="space-y-2 mb-3">
                        {search.results.slice(0, 2).map((template) => (
                          <div 
                            key={template.id} 
                            className="flex items-center gap-2 p-2 rounded bg-background/50 hover:bg-background transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTemplateSelect(template);
                            }}
                          >
                            <img 
                              src={template.thumbnail} 
                              alt={template.name}
                              className="w-8 h-6 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{template.name}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                                {template.rating}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(template);
                              }}
                              title="Copy JSON"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {search.results.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            +{search.results.length - 2} more
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => onRecentSearchSelect?.(search.query, search.mode)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Repeat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (search.results.length > 0) {
                              copyToClipboard(search.results[0]);
                            }
                          }}
                          title="Copy First Result JSON"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Visible Results */}
            {visibleResults.map((template) => (
              <Card key={template.id} className="group hover:shadow-xl transition-all duration-300 border-border hover:border-primary/30 overflow-hidden cursor-pointer">
                <div className="aspect-video relative overflow-hidden" onClick={() => onTemplateSelect(template)}>
                  <img 
                    src={template.thumbnail} 
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant={template.complexity === 'Beginner' ? 'secondary' : template.complexity === 'Intermediate' ? 'default' : 'destructive'}
                      className="bg-background/90 backdrop-blur-sm"
                    >
                      {template.complexity}
                    </Badge>
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                      {template.category}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3" onClick={() => onTemplateSelect(template)}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium leading-tight group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {template.rating}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Tools Used */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      Tools Used ({template.tools.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.tools.slice(0, 4).map((tool, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                          title={tool.name}
                        >
                          <span>{tool.icon}</span>
                          <span className="hidden sm:inline">{tool.name}</span>
                        </div>
                      ))}
                      {template.tools.length > 4 && (
                        <div className="flex items-center justify-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                          +{template.tools.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Use Case */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Use Case</p>
                    <p className="text-sm">{template.useCase}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {template.downloads.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {template.estimatedTime}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {template.author}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-primary to-cyan-400 hover:from-primary/90 hover:to-cyan-400/90 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        showInstructions(template);
                      }}
                    >
                      Use in N8N
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTemplateSelect(template);
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(template);
                      }}
                      title="Copy JSON"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        showInstructions(template);
                      }}
                      title="How to use in N8N"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Blurred Results */}
            {blurredResults.map((template) => (
              <Card key={`blurred-${template.id}`} className="relative overflow-hidden cursor-pointer opacity-60">
                {/* Blur Overlay */}
                <div className="absolute inset-0 backdrop-blur-sm bg-background/30 z-10 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-2">Premium Content</p>
                    <p className="text-xs text-muted-foreground mb-4">Upgrade to view this template</p>
                    <Button size="sm" onClick={onUpgrade} className="bg-primary hover:bg-primary/90">
                      <CreditCard className="w-3 h-3 mr-2" />
                      Upgrade
                    </Button>
                  </div>
                </div>

                {/* Blurred Template Content */}
                <div className="filter blur-[2px]">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={template.thumbnail} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge 
                        variant={template.complexity === 'Beginner' ? 'secondary' : template.complexity === 'Intermediate' ? 'default' : 'destructive'}
                        className="bg-background/90 backdrop-blur-sm"
                      >
                        {template.complexity}
                      </Badge>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                        {template.category}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium leading-tight">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {template.rating}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More for Paid Plans */}
          {isPaidPlan && results.length > 0 && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg" className="px-8">
                Load More Templates
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions Modal */}
      {selectedTemplate && (
        <N8NInstructions
          isOpen={instructionsOpen}
          onClose={() => setInstructionsOpen(false)}
          type="template"
          title={selectedTemplate.name}
          jsonData={{
            name: selectedTemplate.name,
            description: selectedTemplate.description,
            category: selectedTemplate.category,
            tools: selectedTemplate.tools,
            nodes: selectedTemplate.nodes,
            metadata: {
              author: selectedTemplate.author,
              complexity: selectedTemplate.complexity,
              estimatedTime: selectedTemplate.estimatedTime,
              tags: selectedTemplate.tags
            }
          }}
        />
      )}
    </div>
  );
}