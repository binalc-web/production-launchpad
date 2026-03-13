import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  Search,
  Filter,
  Star,
  Download,
  Clock,
  Users,
  TrendingUp,
  Zap,
  Bookmark,
  BookmarkCheck,
  Eye,
  Copy,
  Share2,
  ThumbsUp,
  MessageCircle,
  Play,
  Code2,
  Layers,
  Target,
  Award,
  ChevronDown,
  SortAsc
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { toast } from "sonner@2.0.3";

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templateCount: number;
  trending: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar?: string;
    verified: boolean;
    reputation: number;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
    likes: number;
    forks: number;
  };
  meta: {
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    estimatedTime: string;
    nodeCount: number;
    version: string;
    lastUpdated: Date;
    featured: boolean;
    premium: boolean;
  };
  thumbnail: string;
  previewImages: string[];
  demoUrl?: string;
  isBookmarked: boolean;
}

interface User {
  name: string;
  email: string;
  picture?: string;
}

interface TemplateLibraryProps {
  user?: User;
}

const templateCategories: TemplateCategory[] = [
  {
    id: 'all',
    name: 'All Templates',
    description: 'Browse all available templates',
    icon: '🎯',
    color: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    templateCount: 1250,
    trending: false
  },
  {
    id: 'business-automation',
    name: 'Business Automation',
    description: 'Automate business processes and workflows',
    icon: '⚙️',
    color: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    templateCount: 320,
    trending: true
  },
  {
    id: 'data-processing',
    name: 'Data Processing',
    description: 'ETL, data transformation, and analytics',
    icon: '📊',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    templateCount: 280,
    trending: true
  },
  {
    id: 'api-integration',
    name: 'API Integration',
    description: 'Connect services and APIs seamlessly',
    icon: '🔗',
    color: 'bg-gradient-to-r from-green-500 to-emerald-500',
    templateCount: 195,
    trending: false
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    description: 'AI-powered workflows and ML pipelines',
    icon: '🤖',
    color: 'bg-gradient-to-r from-orange-500 to-red-500',
    templateCount: 145,
    trending: true
  },
  {
    id: 'e-commerce',
    name: 'E-commerce',
    description: 'Online store automation and management',
    icon: '🛒',
    color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    templateCount: 98,
    trending: false
  },
  {
    id: 'marketing',
    name: 'Marketing & CRM',
    description: 'Customer engagement and marketing automation',
    icon: '📧',
    color: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    templateCount: 156,
    trending: false
  },
  {
    id: 'monitoring',
    name: 'Monitoring & Alerts',
    description: 'System monitoring and notification workflows',
    icon: '🔔',
    color: 'bg-gradient-to-r from-red-500 to-pink-500',
    templateCount: 89,
    trending: false
  }
];

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Advanced Email Campaign Automation',
    description: 'Complete email marketing automation with A/B testing, segmentation, and analytics tracking.',
    category: 'marketing',
    tags: ['email', 'automation', 'analytics', 'a/b-testing'],
    author: {
      name: 'Sarah Mitchell',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b2d33b3a?w=40&h=40&fit=crop&crop=face',
      verified: true,
      reputation: 4850
    },
    stats: {
      downloads: 12450,
      rating: 4.8,
      reviews: 324,
      likes: 1250,
      forks: 89
    },
    meta: {
      difficulty: 'Intermediate',
      estimatedTime: '2-3 hours',
      nodeCount: 15,
      version: '2.1.0',
      lastUpdated: new Date('2025-01-10'),
      featured: true,
      premium: false
    },
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=250&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=500&fit=crop'
    ],
    demoUrl: 'https://demo.example.com/email-automation',
    isBookmarked: false
  },
  {
    id: '2',
    name: 'Real-time Data Pipeline with ML',
    description: 'Stream processing pipeline with machine learning predictions and real-time analytics.',
    category: 'ai-ml',
    tags: ['machine-learning', 'streaming', 'analytics', 'real-time'],
    author: {
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      verified: true,
      reputation: 5200
    },
    stats: {
      downloads: 8920,
      rating: 4.9,
      reviews: 156,
      likes: 892,
      forks: 124
    },
    meta: {
      difficulty: 'Advanced',
      estimatedTime: '4-6 hours',
      nodeCount: 28,
      version: '1.5.2',
      lastUpdated: new Date('2025-01-09'),
      featured: true,
      premium: true
    },
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop',
      'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=500&fit=crop'
    ],
    demoUrl: 'https://demo.example.com/ml-pipeline',
    isBookmarked: true
  },
  {
    id: '3',
    name: 'E-commerce Order Processing',
    description: 'Complete order fulfillment workflow with inventory management and customer notifications.',
    category: 'e-commerce',
    tags: ['e-commerce', 'inventory', 'orders', 'notifications'],
    author: {
      name: 'Marcus Johnson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      verified: false,
      reputation: 3200
    },
    stats: {
      downloads: 15600,
      rating: 4.6,
      reviews: 423,
      likes: 1560,
      forks: 234
    },
    meta: {
      difficulty: 'Beginner',
      estimatedTime: '1-2 hours',
      nodeCount: 12,
      version: '3.0.1',
      lastUpdated: new Date('2025-01-08'),
      featured: false,
      premium: false
    },
    thumbnail: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=250&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=500&fit=crop'
    ],
    isBookmarked: false
  }
];

export function TemplateLibrary({ user }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'downloads'>('popular');
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(mockTemplates);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort templates
  useEffect(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        template.author.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.meta.lastUpdated.getTime() - a.meta.lastUpdated.getTime();
        case 'rating':
          return b.stats.rating - a.stats.rating;
        case 'downloads':
          return b.stats.downloads - a.stats.downloads;
        case 'popular':
        default:
          return (b.stats.likes + b.stats.downloads * 0.1) - (a.stats.likes + a.stats.downloads * 0.1);
      }
    });

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchQuery, sortBy]);

  const handleBookmarkToggle = (templateId: string) => {
    setTemplates(prev => prev.map(template =>
      template.id === templateId
        ? { ...template, isBookmarked: !template.isBookmarked }
        : template
    ));
    toast.success("Bookmark updated!");
  };

  const handleTemplateAction = (action: string, template: Template) => {
    switch (action) {
      case 'view':
        toast.info(`Opening ${template.name}...`);
        break;
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(template, null, 2));
        toast.success("Template data copied to clipboard!");
        break;
      case 'fork':
        toast.info(`Forking ${template.name}...`);
        break;
      case 'share':
        navigator.clipboard.writeText(`${window.location.origin}/templates/${template.id}`);
        toast.success("Template link copied to clipboard!");
        break;
      case 'like':
        setTemplates(prev => prev.map(t =>
          t.id === template.id
            ? { ...t, stats: { ...t.stats, likes: t.stats.likes + 1 } }
            : t
        ));
        toast.success("Template liked!");
        break;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-primary/20">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl text-foreground">Template Library</h1>
              <p className="text-sm text-muted-foreground">
                Discover and use pre-built workflows created by the community
              </p>
            </div>
          </div>
          
          {user && (
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates, authors, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SortAsc className="h-4 w-4" />
                Sort by {sortBy}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('popular')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Most Popular
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                <Clock className="h-4 w-4 mr-2" />
                Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('rating')}>
                <Star className="h-4 w-4 mr-2" />
                Highest Rated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('downloads')}>
                <Download className="h-4 w-4 mr-2" />
                Most Downloaded
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
            {templateCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-xs font-medium hidden lg:block">{category.name.split(' ')[0]}</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(category.templateCount)}
                </span>
                {category.trending && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    Hot
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} templates found
              {selectedCategory !== 'all' && ` in ${templateCategories.find(c => c.id === selectedCategory)?.name}`}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="relative">
                {/* Template Thumbnail */}
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img 
                    src={template.thumbnail} 
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {template.meta.featured && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                        <Award className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {template.meta.premium && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <Star className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                      onClick={() => handleBookmarkToggle(template.id)}
                    >
                      {template.isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <Bookmark className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(template.meta.difficulty)}>
                        {template.meta.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="bg-black/40 text-white">
                        <Layers className="h-3 w-3 mr-1" />
                        {template.meta.nodeCount} nodes
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {template.meta.estimatedTime}
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Template Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">{template.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {template.description}
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={template.author.avatar} alt={template.author.name} />
                      <AvatarFallback className="text-xs">
                        {template.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{template.author.name}</span>
                    {template.author.verified && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {template.stats.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {formatNumber(template.stats.downloads)}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {formatNumber(template.stats.likes)}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs px-2 py-0 h-5">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 h-8 text-xs bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
                      onClick={() => handleTemplateAction('view', template)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Use Template
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTemplateAction('copy', template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTemplateAction('fork', template)}>
                          <Code2 className="h-4 w-4 mr-2" />
                          Fork Template
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleTemplateAction('like', template)}>
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Like
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTemplateAction('share', template)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "Try adjusting your search terms or browse different categories"
                : "No templates available in this category"
              }
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}