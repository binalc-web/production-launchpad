import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Workflow, 
  Zap, 
  Network, 
  Boxes, 
  GitBranch, 
  Share2, 
  CircuitBoard, 
  Layers3,
  ShoppingBag,
  Store,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Shuffle,
  Code2,
  Bot
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface LogoVariant {
  id: string;
  name: string;
  description: string;
  category: 'geometric' | 'iconic' | 'modern' | 'marketplace' | 'tech';
  component: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; showText?: boolean; className?: string }>;
}

// Logo Variant Components
const GeometricFlowLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-500 p-1 shadow-lg`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <div className="relative">
            {/* Hexagonal nodes connected */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary transform rotate-45"></div>
              <div className="w-3 h-0.5 bg-gradient-to-r from-primary to-cyan-400"></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              <div className="w-3 h-0.5 bg-gradient-to-r from-cyan-400 to-primary"></div>
              <div className="w-2 h-2 bg-primary transform rotate-45"></div>
            </div>
          </div>
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const CircuitLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary via-cyan-400 to-blue-500 p-0.5`}>
        <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
          <CircuitBoard className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const NetworkLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Network className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const MarketplaceLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center relative">
          <Store className="w-4 h-4 text-primary" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full"></div>
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const LayeredLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Layers3 className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const ZapLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary via-yellow-400 to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const GitBranchLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const CustomFlowLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center relative">
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            <ArrowRight className="w-3 h-3 text-primary mx-0.5" />
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
            <ArrowRight className="w-3 h-3 text-cyan-400 mx-0.5" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
          </div>
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const ShuffleLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const BotLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary via-cyan-400 to-blue-500 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const SparklesLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary via-yellow-300 to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

const CodeFlowLogo = ({ size = 'md', showText = true, className = '' }: any) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Code2 className="w-5 h-5 text-primary" />
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
};

export function LogoOptions() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const logoVariants: LogoVariant[] = [
    {
      id: 'geometric-flow',
      name: 'Geometric Flow',
      description: 'Connected geometric shapes representing data flow',
      category: 'geometric',
      component: GeometricFlowLogo
    },
    {
      id: 'circuit',
      name: 'Circuit Board',
      description: 'Tech-focused circuit board icon',
      category: 'tech',
      component: CircuitLogo
    },
    {
      id: 'network',
      name: 'Network Hub',
      description: 'Network connectivity and workflow integration',
      category: 'tech',
      component: NetworkLogo
    },
    {
      id: 'marketplace',
      name: 'Marketplace Store',
      description: 'Emphasizes the bazar/marketplace concept',
      category: 'marketplace',
      component: MarketplaceLogo
    },
    {
      id: 'layered',
      name: 'Layered Stack',
      description: 'Stacked layers representing workflow complexity',
      category: 'modern',
      component: LayeredLogo
    },
    {
      id: 'zap',
      name: 'Lightning Zap',
      description: 'Energy and speed of automation',
      category: 'iconic',
      component: ZapLogo
    },
    {
      id: 'git-branch',
      name: 'Git Branch',
      description: 'Developer-focused branching workflows',
      category: 'tech',
      component: GitBranchLogo
    },
    {
      id: 'custom-flow',
      name: 'Custom Flow',
      description: 'Step-by-step workflow visualization',
      category: 'geometric',
      component: CustomFlowLogo
    },
    {
      id: 'shuffle',
      name: 'Shuffle Mix',
      description: 'Dynamic data transformation and mixing',
      category: 'modern',
      component: ShuffleLogo
    },
    {
      id: 'bot',
      name: 'Automation Bot',
      description: 'AI and automation focused design',
      category: 'iconic',
      component: BotLogo
    },
    {
      id: 'sparkles',
      name: 'Magic Sparkles',
      description: 'AI magic and workflow enhancement',
      category: 'iconic',
      component: SparklesLogo
    },
    {
      id: 'code-flow',
      name: 'Code Flow',
      description: 'Developer-centric code and workflow',
      category: 'tech',
      component: CodeFlowLogo
    }
  ];

  const categories = [
    { id: 'all', name: 'All Logos', count: logoVariants.length },
    { id: 'geometric', name: 'Geometric', count: logoVariants.filter(l => l.category === 'geometric').length },
    { id: 'iconic', name: 'Iconic', count: logoVariants.filter(l => l.category === 'iconic').length },
    { id: 'modern', name: 'Modern', count: logoVariants.filter(l => l.category === 'modern').length },
    { id: 'marketplace', name: 'Marketplace', count: logoVariants.filter(l => l.category === 'marketplace').length },
    { id: 'tech', name: 'Tech', count: logoVariants.filter(l => l.category === 'tech').length }
  ];

  const filteredLogos = selectedCategory === 'all' 
    ? logoVariants 
    : logoVariants.filter(logo => logo.category === selectedCategory);

  const copyLogoCode = (logoId: string) => {
    const logo = logoVariants.find(l => l.id === logoId);
    if (logo) {
      const codeSnippet = `<${logo.name.replace(/\s+/g, '')}Logo size="md" showText={true} />`;
      navigator.clipboard.writeText(codeSnippet);
      setCopiedId(logoId);
      toast.success(`${logo.name} code copied!`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-medium mb-2">N8N Bazar Logo Options</h1>
                <p className="text-muted-foreground">
                  Explore different logo variations for your N8N workflow marketplace
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2"
                >
                  {category.name}
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Logo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLogos.map((logo) => {
              const LogoComponent = logo.component;
              return (
                <Card key={logo.id} className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{logo.name}</CardTitle>
                      <Badge variant="outline" className="text-xs capitalize">
                        {logo.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {logo.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Large Logo Preview */}
                    <div className="flex justify-center p-6 bg-muted/30 rounded-lg">
                      <LogoComponent size="lg" showText={true} />
                    </div>

                    {/* Size Variations */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Size Variations</h4>
                      <div className="flex items-center justify-between bg-background border rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <LogoComponent size="sm" showText={false} />
                            <p className="text-xs text-muted-foreground mt-1">Small</p>
                          </div>
                          <div className="text-center">
                            <LogoComponent size="md" showText={false} />
                            <p className="text-xs text-muted-foreground mt-1">Medium</p>
                          </div>
                          <div className="text-center">
                            <LogoComponent size="lg" showText={false} />
                            <p className="text-xs text-muted-foreground mt-1">Large</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text Variations */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Text Options</h4>
                      <div className="space-y-2">
                        <div className="flex justify-center p-3 bg-muted/20 rounded">
                          <LogoComponent size="md" showText={true} />
                        </div>
                        <div className="flex justify-center p-3 bg-muted/20 rounded">
                          <LogoComponent size="md" showText={false} />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLogoCode(logo.id)}
                        className="flex-1 gap-2"
                      >
                        {copiedId === logo.id ? (
                          <>
                            <Check className="w-3 h-3 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Usage Instructions */}
          <div className="mt-12 p-6 bg-muted/30 rounded-lg">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              How to Use These Logos
            </h3>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Each logo component can be customized with the following props:
              </p>
              <div className="bg-background border rounded p-3 font-mono text-xs">
                <div className="space-y-1">
                  <div><span className="text-blue-600">size</span>: <span className="text-green-600">"sm" | "md" | "lg"</span> <span className="text-muted-foreground">// Controls logo size</span></div>
                  <div><span className="text-blue-600">showText</span>: <span className="text-green-600">boolean</span> <span className="text-muted-foreground">// Shows/hides "N8N Bazar" text</span></div>
                  <div><span className="text-blue-600">className</span>: <span className="text-green-600">string</span> <span className="text-muted-foreground">// Additional CSS classes</span></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: <code className="bg-muted px-1 rounded">&lt;GeometricFlowLogo size="lg" showText={true} className="my-custom-class" /&gt;</code>
              </p>
            </div>
          </div>

          {/* Design Guidelines */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Brand Colors
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-[#00D4AA]"></div>
                  <div>
                    <p className="text-sm font-medium">Primary</p>
                    <p className="text-xs text-muted-foreground">#00D4AA</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-cyan-400"></div>
                  <div>
                    <p className="text-sm font-medium">Cyan Accent</p>
                    <p className="text-xs text-muted-foreground">#22D3EE</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-blue-500"></div>
                  <div>
                    <p className="text-sm font-medium">Blue Accent</p>
                    <p className="text-xs text-muted-foreground">#3B82F6</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Workflow className="w-4 h-4 text-primary" />
                Logo Categories
              </h4>
              <div className="space-y-2 text-sm">
                <div><strong>Geometric:</strong> Clean, mathematical shapes representing data flow</div>
                <div><strong>Iconic:</strong> Recognizable symbols that convey automation</div>
                <div><strong>Modern:</strong> Contemporary design elements</div>
                <div><strong>Marketplace:</strong> Commerce and trading focused</div>
                <div><strong>Tech:</strong> Developer and technology oriented</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}