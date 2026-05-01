import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Search,
  Clock,
  Star,
  Download,
  ExternalLink,
  Filter,
  SortDesc,
  Grid3X3,
  List,
  Bookmark,
  TrendingUp,
  Zap,
  Hash,
  Calendar,
  User,
  ArrowRight,
  X
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface TemplateData {
  idx: number;
  id: string;
  name: string;
  summary: string;
  s3_key: string;
  status: string;
  metadata: any;
  created_by: string | null;
  tags: string[];
  download_count: number;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  results: TemplateData[];
  resultCount: number;
}

interface User {
  name: string;
  email: string;
  picture?: string;
}

interface TemplateExplorerProps {
  user?: User;
  onTemplateSelect?: (template: TemplateData) => void;
}

// Mock template data based on the provided structure
const mockTemplateData: TemplateData[] = [
  {
    idx: 0,
    id: "000066e2-a33a-47dd-9ec2-f6e8955a3e20",
    name: "Shopify Zendesk Integration",
    summary: "This n8n template creates a workflow that triggers when a customer is updated in Shopify. It retrieves specific user data (UserId, email, and phone) and checks if the user already exists in Zendesk. If the user exists and their contact details have changed, the workflow updates their information in Zendesk.",
    s3_key: "bulkuploads/1808_workflow_1808.json",
    status: "completed",
    metadata: null,
    created_by: "john_doe",
    tags: ["Automation", "Shopify", "Zendesk", "CRM", "Integration"],
    download_count: 245,
    rating: 4.8,
    created_at: "2025-08-05 14:18:08.141+00",
    updated_at: "2025-08-05 14:18:08.141+00"
  },
  {
    idx: 1,
    id: "111177f3-b44b-58ee-af3f-77f0166f4f31",
    name: "Slack Notification Bot",
    summary: "Automated Slack bot that sends notifications based on various triggers including webhooks, scheduled events, and API responses. Includes message formatting and channel routing.",
    s3_key: "bulkuploads/slack_bot_workflow.json",
    status: "completed",
    metadata: null,
    created_by: "sarah_wilson",
    tags: ["Slack", "Notifications", "Bot", "Automation", "Webhooks"],
    download_count: 389,
    rating: 4.6,
    created_at: "2025-08-04 10:22:15.330+00",
    updated_at: "2025-08-04 10:22:15.330+00"
  },
  {
    idx: 2,
    id: "222288g4-c55c-69ff-bf4f-88f1177f5f42",
    name: "Email Campaign Optimizer",
    summary: "Advanced email marketing workflow that segments users, personalizes content, tracks engagement metrics, and automatically optimizes send times based on recipient behavior patterns.",
    s3_key: "bulkuploads/email_campaign_optimizer.json",
    status: "completed",
    metadata: null,
    created_by: "mike_chen",
    tags: ["Email", "Marketing", "Automation", "Analytics", "Personalization"],
    download_count: 156,
    rating: 4.9,
    created_at: "2025-08-03 16:45:22.880+00",
    updated_at: "2025-08-03 16:45:22.880+00"
  },
  {
    idx: 3,
    id: "333399h5-d66d-70gg-cg5g-99g2288g6g53",
    name: "Database Sync Scheduler",
    summary: "Scheduled workflow that synchronizes data between multiple databases, handles conflict resolution, performs data validation, and sends status reports via email and Slack.",
    s3_key: "bulkuploads/db_sync_scheduler.json",
    status: "completed",
    metadata: null,
    created_by: "alex_thompson",
    tags: ["Database", "Sync", "Scheduler", "Data", "Validation"],
    download_count: 97,
    rating: 4.4,
    created_at: "2025-08-02 09:12:33.445+00",
    updated_at: "2025-08-02 09:12:33.445+00"
  }
];

export function TemplateExplorer({ user, onTemplateSelect }: TemplateExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<TemplateData[]>(mockTemplateData);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateData[]>(mockTemplateData);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');
  const [activeTab, setActiveTab] = useState('search');

  // Load search history on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('templateSearchHistory');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setSearchHistory(historyWithDates);
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  const saveSearchHistory = (history: SearchHistoryItem[]) => {
    localStorage.setItem('templateSearchHistory', JSON.stringify(history));
  };

  const handleSearch = async (query: string, skipHistory = false) => {
    if (!query.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Filter templates based on search query
    const filtered = templates.filter(template => 
      template.name.toLowerCase().includes(query.toLowerCase()) ||
      template.summary.toLowerCase().includes(query.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
      (template.created_by && template.created_by.toLowerCase().includes(query.toLowerCase()))
    );

    setFilteredTemplates(filtered);
    setIsSearching(false);

    // Add to search history if not skipping
    if (!skipHistory && query.trim()) {
      const newHistoryItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: new Date(),
        results: filtered.slice(0, 3), // Store top 3 results for preview
        resultCount: filtered.length
      };

      const updatedHistory = [newHistoryItem, ...searchHistory.filter(item => 
        item.query.toLowerCase() !== query.toLowerCase()
      )].slice(0, 10); // Keep only last 10 searches

      setSearchHistory(updatedHistory);
      saveSearchHistory(updatedHistory);
    }

    toast.success(`Found ${filtered.length} templates`);
  };

  const handleHistorySearch = (historyItem: SearchHistoryItem) => {
    setSearchQuery(historyItem.query);
    setActiveTab('search');
    handleSearch(historyItem.query, true);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('templateSearchHistory');
    toast.success('Search history cleared');
  };

  const handleTemplateClick = (template: TemplateData) => {
    onTemplateSelect?.(template);
    toast.success(`Opening ${template.name}`);
  };

  const handleDownload = (template: TemplateData, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`Downloaded ${template.name}`);
  };

  const handleBookmark = (template: TemplateData, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`Bookmarked ${template.name}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getAllTags = () => {
    const allTags = templates.flatMap(template => template.tags);
    return Array.from(new Set(allTags)).sort();
  };

  const renderTemplateCard = (template: TemplateData) => (
    <Card key={template.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-border/50 hover:border-primary/50">
      <CardContent className="p-4" onClick={() => handleTemplateClick(template)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
              {template.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              {template.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">{template.rating}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{template.download_count}</span>
              </div>
              {template.created_by && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{template.created_by}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={(e) => handleBookmark(template, e)}
            >
              <Bookmark className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={(e) => handleDownload(template, e)}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {template.summary}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 h-5">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 h-5">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDate(template.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const renderListView = (template: TemplateData) => (
    <Card key={template.id} className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 hover:border-primary/50">
      <CardContent className="p-3" onClick={() => handleTemplateClick(template)}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => handleBookmark(template, e)}>
                  <Bookmark className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => handleDownload(template, e)}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              {template.summary}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {template.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{template.rating}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{template.download_count}</span>
                </div>
                <span>{formatDate(template.created_at)}</span>
              </div>
              <div className="flex gap-1">
                {template.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5 h-4">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-4">
                    +{template.tags.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-primary/20">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl text-foreground">Template Explorer</h1>
                <p className="text-sm text-muted-foreground">
                  Discover and search through thousands of N8N workflow templates
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, tags, or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  handleSearch(e.target.value);
                } else {
                  setFilteredTemplates(templates);
                }
              }}
              className="pl-10 pr-4 h-10 border-2 border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilteredTemplates(templates);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Search History & Filters */}
        <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="search" className="text-xs">Search History</TabsTrigger>
                <TabsTrigger value="filters" className="text-xs">Filters</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="search" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  {searchHistory.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">Recent Searches</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSearchHistory}
                          className="text-xs h-6 px-2"
                        >
                          Clear
                        </Button>
                      </div>
                      
                      {searchHistory.map((historyItem, index) => (
                        <Card 
                          key={index} 
                          className="group hover:shadow-sm transition-all duration-200 cursor-pointer border-border/50 hover:border-primary/30"
                          onClick={() => handleHistorySearch(historyItem)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {historyItem.query}
                                </span>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span>{historyItem.resultCount} results</span>
                              <span>{historyItem.timestamp.toLocaleDateString()}</span>
                            </div>
                            
                            {historyItem.results.length > 0 && (
                              <div className="space-y-1">
                                {historyItem.results.slice(0, 2).map(result => (
                                  <div key={result.id} className="text-xs text-muted-foreground truncate">
                                    • {result.name}
                                  </div>
                                ))}
                                {historyItem.results.length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{historyItem.results.length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No search history yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Your searches will appear here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="filters" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-4">
                  {/* Sort Options */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">Sort By</h3>
                    <div className="space-y-1">
                      {[
                        { value: 'popular', label: 'Most Popular', icon: TrendingUp },
                        { value: 'recent', label: 'Recently Added', icon: Calendar },
                        { value: 'rating', label: 'Highest Rated', icon: Star }
                      ].map(option => (
                        <Button
                          key={option.value}
                          variant={sortBy === option.value ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setSortBy(option.value as any)}
                          className="w-full justify-start h-8 text-xs"
                        >
                          <option.icon className="h-3 w-3 mr-2" />
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tags Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">Popular Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {getAllTags().slice(0, 12).map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "secondary"}
                          className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              setSelectedTags(prev => prev.filter(t => t !== tag));
                            } else {
                              setSelectedTags(prev => [...prev, tag]);
                            }
                          }}
                        >
                          <Hash className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="pt-2 border-t border-border/50">
                    <h3 className="text-sm font-medium text-foreground mb-2">Stats</h3>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Total Templates</span>
                        <span className="font-medium">{templates.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Results</span>
                        <span className="font-medium">{filteredTemplates.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search History</span>
                        <span className="font-medium">{searchHistory.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-border bg-background/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {isSearching ? 'Searching...' : `${filteredTemplates.length} templates found`}
                  {searchQuery && ` for "${searchQuery}"`}
                </span>
                {selectedTags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Filtered by:</span>
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs h-5">
                        {tag}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                          className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-2 w-2 mr-1" />
                  Live Search
                </Badge>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6">
              {filteredTemplates.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map(renderListView)}
                  </div>
                )
              ) : (
                <div className="text-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? `No templates match "${searchQuery}"`
                      : "No templates available"
                    }
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery("");
                        setFilteredTemplates(templates);
                      }}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}