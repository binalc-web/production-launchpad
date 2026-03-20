import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Search, 
  Sparkles, 
  Star, 
  Download, 
  Clock,
  User,
  AlertCircle,
  Zap,
  CreditCard
} from "lucide-react";
import { WorkflowTemplate, mockTemplates } from "../data/mockTemplates";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Logo } from "./Logo";

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

interface MainDashboardProps {
  user: User;
  onTemplateSelect: (template: WorkflowTemplate) => void;
  onSearch?: (query: string, mode: "ai" | "simple") => void;
  searchMode: "ai" | "simple";
  onSearchModeChange: (mode: "ai" | "simple") => void;
}

export function MainDashboard({ 
  user, 
  onTemplateSelect, 
  onSearch, 
  searchMode, 
  onSearchModeChange 
}: MainDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredTemplates, setFeaturedTemplates] = useState<WorkflowTemplate[]>([]);

  useEffect(() => {
    // Show featured templates
    setFeaturedTemplates(mockTemplates.slice(0, 3));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim(), searchMode);
    }
  };

  const quickSearchIdeas = [
    "Automate customer onboarding with CRM integration",
    "Sync data between Google Sheets and Airtable"
  ];

  // Check if user can perform current search type
  const isPaidPlan = user.plan && user.plan !== 'free';
  const canSearchAI = isPaidPlan || (user.searchUsage?.aiSearches || 0) < (user.searchUsage?.maxAiSearches || 5);
  const canSearchSimple = isPaidPlan || (user.searchUsage?.simpleSearches || 0) < (user.searchUsage?.maxSimpleSearches || 3);
  const canCurrentSearch = searchMode === "ai" ? canSearchAI : canSearchSimple;

  const aiSearchesRemaining = isPaidPlan ? "∞" : Math.max(0, (user.searchUsage?.maxAiSearches || 5) - (user.searchUsage?.aiSearches || 0));
  const simpleSearchesRemaining = isPaidPlan ? "∞" : Math.max(0, (user.searchUsage?.maxSimpleSearches || 3) - (user.searchUsage?.simpleSearches || 0));

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12" data-tour="main-search">
              {/* Logo */}
              <div className="flex items-center justify-center mb-8">
                <Logo size="lg" />
              </div>
              
              <h1 className="text-4xl font-bold mb-4">
                Discover Amazing
              </h1>
              <h2 className="text-3xl mb-6">
                <span className="inline-flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">∞</span>
                  </span>
                  <span className="font-normal text-foreground">n8n</span>
                  <span className="text-primary font-bold">Workflows</span>
                </span>
              </h2>
              
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                Find, share, and customize powerful automation workflows. Discover templates for your favorite apps and services.
              </p>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                This is testing line
              </p>

              {/* Search Mode Toggle */}
              <div className="flex justify-center mb-6">
                <Tabs value={searchMode} onValueChange={(value) => onSearchModeChange(value as "ai" | "simple")}>
                  <TabsList className="grid w-fit grid-cols-3 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger 
                      value="ai" 
                      className="gap-2 bg-primary text-white data-[state=active]:bg-primary data-[state=active]:text-white" 
                      disabled={!canSearchAI}
                    >
                      <Sparkles className="h-4 w-4" />
                      By Prompt
                    </TabsTrigger>
                    <TabsTrigger value="simple" className="gap-2" disabled={!canSearchSimple}>
                      By Category
                    </TabsTrigger>
                    <TabsTrigger value="keywords" className="gap-2">
                      By Keywords
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Search Usage Warning */}
              {!isPaidPlan && !canCurrentSearch && (
                <Alert className="max-w-2xl mx-auto mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <div className="space-y-2">
                      <p className="font-medium">
                        You've reached your free {searchMode === "ai" ? "AI summary" : "simple"} search limit
                      </p>
                      <p className="text-sm">
                        {searchMode === "ai" 
                          ? `You've used all ${user.searchUsage?.maxAiSearches || 5} free AI summary searches.`
                          : `You've used all ${user.searchUsage?.maxSimpleSearches || 3} free simple searches.`
                        }
                        {" "}Upgrade to continue searching or try the other search mode.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          <CreditCard className="w-3 h-3 mr-2" />
                          Upgrade Plan
                        </Button>
                        {searchMode === "ai" && canSearchSimple && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onSearchModeChange("simple")}
                            className="border-primary/30 text-primary hover:bg-primary/10"
                          >
                            Try Simple Search ({simpleSearchesRemaining} left)
                          </Button>
                        )}
                        {searchMode === "simple" && canSearchAI && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onSearchModeChange("ai")}
                            className="border-primary/30 text-primary hover:bg-primary/10"
                          >
                            Try AI Search ({aiSearchesRemaining} left)
                          </Button>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mb-8">
                <div className="relative max-w-2xl mx-auto">
                  <div className="relative flex items-center">
                    <Sparkles className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Tell me what workflow you're looking for..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-36 py-6 text-lg bg-background border-2 border-border focus:border-primary shadow-sm rounded-xl"
                      disabled={!canCurrentSearch}
                    />
                    <Button 
                      type="submit" 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/90 px-6 py-3 rounded-lg text-white font-medium"
                      disabled={!searchQuery.trim() || !canCurrentSearch}
                    >
                      Find Workflows
                    </Button>
                  </div>
                </div>
              </form>

              {/* Welcome Tour Hint */}
              <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-2xl mx-auto">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-primary font-medium">Welcome to N8N Bazar!</p>
                    <p className="text-muted-foreground">
                      New here? Take our guided tour to discover all the magical features and get started quickly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Search Ideas */}
              <div className="mb-12">
                <p className="text-sm text-muted-foreground mb-4">Quick search ideas:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {quickSearchIdeas.map((idea, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery(idea)}
                      className="text-sm hover:bg-primary/10 hover:border-primary/30 rounded-full px-6"
                      disabled={!canCurrentSearch}
                    >
                      {idea}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Usage Stats */}
            {!isPaidPlan && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">AI Searches</span>
                    </div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      {aiSearchesRemaining}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {user.searchUsage?.maxAiSearches || 5} remaining
                    </div>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Simple Searches</span>
                    </div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      {simpleSearchesRemaining}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {user.searchUsage?.maxSimpleSearches || 3} remaining
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Templates Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg text-muted-foreground">All available templates - 4397 templates available</h2>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="text-primary">* This type of search uses tokens</span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">164294</span>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      History
                    </Button>
                  </div>
                </div>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-border hover:border-primary/30"
                    onClick={() => onTemplateSelect(template)}
                  >
                    <CardContent className="p-6">
                      {/* Template Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-base mb-2 line-clamp-2">{template.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                            {template.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Template Image */}
                      <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                        <ImageWithFallback 
                          src={template.thumbnail} 
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Template Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{template.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{template.downloads.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{template.author}</span>
                          </div>
                        </div>
                      </div>

                      {/* Complexity Badge */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={template.complexity === 'Beginner' ? 'secondary' : template.complexity === 'Intermediate' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {template.complexity}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{template.estimatedTime}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-4">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}