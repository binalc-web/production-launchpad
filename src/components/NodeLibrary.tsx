import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Search, 
  Filter, 
  Star,
  Download,
  Settings,
  Database,
  Mail,
  MessageSquare,
  Cloud,
  Sparkles,
  Code,
  Calendar,
  FileText,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { N8NNode, mockNodes } from "../data/mockNodes";
import { N8NInstructions } from "./N8NInstructions";

export function NodeLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filteredNodes, setFilteredNodes] = useState<N8NNode[]>(mockNodes);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<N8NNode | null>(null);

  const categories = [
    { id: "all", name: "All Nodes", icon: Sparkles },
    { id: "Communication", name: "Communication", icon: MessageSquare },
    { id: "Productivity", name: "Productivity", icon: FileText },
    { id: "Development", name: "Development", icon: Code },
    { id: "Core", name: "Core", icon: Settings },
    { id: "Data Storage", name: "Data Storage", icon: Database },
    { id: "Cloud Services", name: "Cloud", icon: Cloud },
  ];

  const showInstructions = (node: N8NNode) => {
    setSelectedNode(node);
    setInstructionsOpen(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterNodes(query, selectedCategory);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    filterNodes(searchQuery, category);
  };

  const filterNodes = (query: string, category: string) => {
    let filtered = mockNodes;

    // Filter by category
    if (category !== "all") {
      filtered = filtered.filter(node => node.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by search query
    if (query.trim() !== "") {
      filtered = filtered.filter(node =>
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.description.toLowerCase().includes(query.toLowerCase()) ||
        node.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }

    setFilteredNodes(filtered);
  };

  const getNodeIcon = (iconEmoji: string) => {
    // Since the icon is an emoji in the mock data, we'll return a simple text span
    // For a real implementation, you'd map these to actual icon components
    return () => <span className="text-lg">{iconEmoji}</span>;
  };

  // Generate common use cases from tags and description
  const getUseCases = (node: N8NNode): string[] => {
    const useCases = node.usageGuide?.commonUses || [];
    if (useCases.length > 0) return useCases;
    
    // Fallback: generate use cases from tags
    return node.tags.slice(0, 3).map(tag => 
      tag.charAt(0).toUpperCase() + tag.slice(1)
    );
  };

  // Determine complexity based on node characteristics
  const getComplexity = (node: N8NNode): string => {
    const paramCount = node.parameters?.length || 0;
    const hasCredentials = node.credentials && node.credentials.length > 0;
    
    if (paramCount <= 3 && !hasCredentials) return 'Beginner';
    if (paramCount <= 6) return 'Intermediate';
    return 'Advanced';
  };

  // Check if authentication is required
  const requiresAuth = (node: N8NNode): boolean => {
    return node.credentials && node.credentials.length > 0;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-yellow-300 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-medium mb-2">Node Library</h1>
                <p className="text-muted-foreground">
                  Discover and learn how to use N8N nodes in your magical workflows
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 space-y-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <TabsTrigger key={category.id} value={category.id} className="gap-2">
                      <IconComponent className="w-3 h-3" />
                      <span className="hidden sm:inline">{category.name}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              Showing {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''}
              {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
            </p>
          </div>

          {/* Nodes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNodes.map((node) => {
              const IconComponent = getNodeIcon(node.icon);
              const useCases = getUseCases(node);
              const complexity = getComplexity(node);
              const needsAuth = requiresAuth(node);
              
              return (
                <Card key={node.id} className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <IconComponent />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{node.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            v{node.version}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {node.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Node Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {node.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {node.downloadCount.toLocaleString()}
                        </span>
                      </div>
                      <Badge 
                        variant={node.category === 'Core' ? 'default' : 'outline'}
                        className="text-xs capitalize"
                      >
                        {node.category}
                      </Badge>
                    </div>

                    {/* Use Cases */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Common Use Cases</p>
                      <div className="flex flex-wrap gap-1">
                        {useCases.slice(0, 2).map((useCase, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {useCase}
                          </Badge>
                        ))}
                        {useCases.length > 2 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{useCases.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Configuration Requirements */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Requirements</p>
                      <div className="space-y-1">
                        {needsAuth && (
                          <div className="flex items-center gap-2 text-xs">
                            <Settings className="w-3 h-3 text-orange-500" />
                            <span>Authentication required</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <Badge 
                            variant={complexity === 'Beginner' ? 'secondary' : complexity === 'Intermediate' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {complexity}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {node.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {node.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          +{node.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-to-r from-primary via-yellow-300 to-cyan-400 hover:from-primary/90 hover:via-yellow-300/90 hover:to-cyan-400/90 text-white"
                        onClick={() => showInstructions(node)}
                      >
                        <HelpCircle className="w-3 h-3 mr-2" />
                        How to Use
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="px-3"
                        asChild
                      >
                        <a 
                          href={node.documentation} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Docs
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* No Results */}
          {filteredNodes.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No nodes found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse different categories
              </p>
            </div>
          )}

          {/* Load More */}
          {filteredNodes.length > 0 && filteredNodes.length >= 12 && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg" className="px-8">
                Load More Nodes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions Modal */}
      {selectedNode && (
        <N8NInstructions
          isOpen={instructionsOpen}
          onClose={() => setInstructionsOpen(false)}
          type="node"
          title={selectedNode.name}
          jsonData={{
            name: selectedNode.name,
            description: selectedNode.description,
            version: selectedNode.version,
            category: selectedNode.category,
            useCases: getUseCases(selectedNode),
            tags: selectedNode.tags,
            requiresAuth: requiresAuth(selectedNode),
            complexity: getComplexity(selectedNode),
            documentationUrl: selectedNode.documentation
          }}
        />
      )}
    </div>
  );
}