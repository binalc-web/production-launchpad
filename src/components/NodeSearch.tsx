import { useState, useEffect } from "react";
import { Search, Filter, Star, Download, ExternalLink, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { mockNodes, nodeCategories, nodeSubcategories, N8NNode } from "../data/mockNodes";

interface NodeSearchProps {
  onNodeSelect: (node: N8NNode) => void;
}

export function NodeSearch({ onNodeSelect }: NodeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [sortBy, setSortBy] = useState<'relevance' | 'popularity' | 'rating' | 'updated'>('relevance');
  const [filteredNodes, setFilteredNodes] = useState<N8NNode[]>(mockNodes);

  useEffect(() => {
    let filtered = mockNodes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(query) ||
        node.displayName.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query) ||
        node.category.toLowerCase().includes(query) ||
        node.tags.some(tag => tag.toLowerCase().includes(query)) ||
        node.parameters.some(param => 
          param.name.toLowerCase().includes(query) || 
          param.displayName.toLowerCase().includes(query)
        )
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(node => node.category === selectedCategory);
    }

    // Filter by subcategory
    if (selectedSubcategory !== "All") {
      filtered = filtered.filter(node => node.subcategory === selectedSubcategory);
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.downloadCount - a.downloadCount;
        case 'rating':
          return b.rating - a.rating;
        case 'updated':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'relevance':
        default:
          // Simple relevance scoring based on search query
          if (!searchQuery.trim()) return a.name.localeCompare(b.name);
          const aScore = calculateRelevanceScore(a, searchQuery.toLowerCase());
          const bScore = calculateRelevanceScore(b, searchQuery.toLowerCase());
          return bScore - aScore;
      }
    });

    setFilteredNodes(filtered);
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy]);

  const calculateRelevanceScore = (node: N8NNode, query: string): number => {
    let score = 0;
    
    // Exact name match gets highest score
    if (node.name.toLowerCase() === query) score += 100;
    else if (node.name.toLowerCase().includes(query)) score += 50;
    
    // Display name match
    if (node.displayName.toLowerCase().includes(query)) score += 40;
    
    // Description match
    if (node.description.toLowerCase().includes(query)) score += 20;
    
    // Tag matches
    node.tags.forEach(tag => {
      if (tag.toLowerCase().includes(query)) score += 15;
    });
    
    // Parameter matches
    node.parameters.forEach(param => {
      if (param.name.toLowerCase().includes(query)) score += 10;
      if (param.displayName.toLowerCase().includes(query)) score += 8;
    });
    
    return score;
  };

  const getAvailableSubcategories = () => {
    if (selectedCategory === "All") return ["All"];
    return ["All", ...(nodeSubcategories[selectedCategory] || [])];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              🔌
            </div>
            <div>
              <h1 className="text-xl font-medium">N8N Nodes</h1>
              <p className="text-sm text-muted-foreground">
                Discover and learn about N8N nodes, their parameters, and credentials
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes, parameters, or credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {nodeCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubcategories().map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>
                      {subcategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="popularity">Downloads</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''} found
            </p>
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {filteredNodes.length > 0 ? (
              <div className="grid gap-4">
                {filteredNodes.map((node) => (
                  <Card key={node.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNodeSelect(node)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: node.color + '20', color: node.color }}>
                            {node.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{node.displayName}</CardTitle>
                              {node.verified && (
                                <Badge variant="secondary" className="text-xs">
                                  ✓ Verified
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                v{node.version}
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">
                              {node.description}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {formatNumber(node.downloadCount)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {node.rating}
                          </div>
                          <span>{node.category}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {node.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No nodes found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search query or filters
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedSubcategory("All");
                }}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}