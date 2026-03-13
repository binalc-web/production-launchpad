import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Copy, Download, Heart, Share2, Zap, GitBranch, Box, ShoppingBag, Network, Workflow, Sparkles, CircuitBoard } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface LogoOption {
  id: string;
  name: string;
  category: "Text-based" | "Icon + Text" | "Symbol" | "Modern" | "Geometric";
  description: string;
  component: React.ComponentType<{ className?: string; isDark?: boolean }>;
}

// Logo Components
const Logo1: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="relative">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
        <Network className="w-6 h-6 text-white" />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-primary rounded-full flex items-center justify-center">
        <ShoppingBag className="w-2.5 h-2.5 text-white" />
      </div>
    </div>
    <div className="flex flex-col">
      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
        N8N
      </span>
      <span className="text-sm text-muted-foreground -mt-1">BAZAR</span>
    </div>
  </div>
);

const Logo2: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative w-12 h-8">
      <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-primary"></div>
      <div className="absolute left-4 top-0 w-3 h-3 rounded-full bg-cyan-400"></div>
      <div className="absolute left-8 top-0 w-3 h-3 rounded-full bg-blue-500"></div>
      <div className="absolute left-2 bottom-0 w-3 h-3 rounded-full bg-primary/70"></div>
      <div className="absolute left-6 bottom-0 w-3 h-3 rounded-full bg-cyan-300"></div>
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        <path d="M6 6 L10 6 L14 6 M8 6 L8 10 M12 6 L12 10" stroke="currentColor" strokeWidth="1" className="text-primary/40" fill="none" />
      </svg>
    </div>
    <span className="text-2xl font-bold">
      <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">N8N</span>
      <span className="text-foreground/80"> Bazar</span>
    </span>
  </div>
);

const Logo3: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-cyan-400 to-blue-500 p-0.5">
      <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
        <Workflow className="w-5 h-5 text-primary" />
      </div>
    </div>
    <span className="text-2xl font-bold tracking-tight">
      N8N <span className="text-primary">Bazar</span>
    </span>
  </div>
);

const Logo4: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`flex flex-col items-center ${className}`}>
    <div className="flex items-center gap-1 mb-1">
      <div className="w-2 h-2 rounded-full bg-primary"></div>
      <div className="w-6 h-0.5 bg-gradient-to-r from-primary to-cyan-400"></div>
      <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
      <div className="w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
    </div>
    <span className="text-lg font-bold tracking-widest text-foreground">N8N BAZAR</span>
  </div>
);

const Logo5: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`relative ${className}`}>
    <div className="text-3xl font-bold">
      <span className="text-foreground">N</span>
      <span className="text-primary relative">
        8
        <div className="absolute -top-2 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
      </span>
      <span className="text-foreground">N</span>
      <span className="text-sm text-muted-foreground ml-2 font-normal">bazar</span>
    </div>
  </div>
);

const Logo6: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-cyan-400 opacity-20"></div>
      <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
        <span className="text-white font-bold text-sm">8</span>
      </div>
      <div className="absolute -top-1 left-2 w-1 h-1 rounded-full bg-primary"></div>
      <div className="absolute -bottom-1 right-2 w-1 h-1 rounded-full bg-cyan-400"></div>
    </div>
    <div className="flex flex-col">
      <span className="text-xl font-bold text-foreground">N8N Bazar</span>
      <span className="text-xs text-muted-foreground">Automation Marketplace</span>
    </div>
  </div>
);

const Logo7: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`flex items-center ${className}`}>
    <div className="relative mr-3">
      <CircuitBoard className="w-8 h-8 text-primary" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
        <ShoppingBag className="w-2 h-2 text-white" />
      </div>
    </div>
    <span className="text-2xl font-bold">
      <span className="text-primary">N8N</span>
      <span className="text-muted-foreground mx-1">•</span>
      <span className="text-foreground">BAZAR</span>
    </span>
  </div>
);

const Logo8: React.FC<{ className?: string; isDark?: boolean }> = ({ className = "", isDark }) => (
  <div className={`text-center ${className}`}>
    <div className="flex items-center justify-center gap-1 mb-1">
      <Sparkles className="w-4 h-4 text-primary" />
      <span className="text-2xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-blue-500 bg-clip-text text-transparent">
        N8N BAZAR
      </span>
      <Sparkles className="w-4 h-4 text-cyan-400" />
    </div>
    <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-cyan-400 mx-auto"></div>
  </div>
);

export function LogoDesigner() {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [isDarkPreview, setIsDarkPreview] = useState(false);

  const logoOptions: LogoOption[] = [
    {
      id: "logo1",
      name: "Network Hub",
      category: "Icon + Text",
      description: "Combines network icon with marketplace indicator",
      component: Logo1
    },
    {
      id: "logo2",
      name: "Node Connection",
      category: "Icon + Text",
      description: "Visual representation of connected workflow nodes",
      component: Logo2
    },
    {
      id: "logo3",
      name: "Workflow Frame",
      category: "Modern",
      description: "Clean frame design with workflow icon",
      component: Logo3
    },
    {
      id: "logo4",
      name: "Flow Chain",
      category: "Geometric",
      description: "Minimalist connected dots representing automation flow",
      component: Logo4
    },
    {
      id: "logo5",
      name: "Simple Accent",
      category: "Text-based",
      description: "Clean text with subtle accent elements",
      component: Logo5
    },
    {
      id: "logo6",
      name: "Badge Style",
      category: "Icon + Text",
      description: "Badge-like icon with descriptive subtitle",
      component: Logo6
    },
    {
      id: "logo7",
      name: "Circuit Market",
      category: "Icon + Text",
      description: "Circuit board representing automation with market indicator",
      component: Logo7
    },
    {
      id: "logo8",
      name: "Sparkle Brand",
      category: "Modern",
      description: "Gradient text with decorative sparkle elements",
      component: Logo8
    }
  ];

  const handleCopyLogo = (logoId: string) => {
    toast.success(`${logoOptions.find(l => l.id === logoId)?.name} copied to clipboard`);
  };

  const handleDownloadLogo = (logoId: string) => {
    toast.success(`${logoOptions.find(l => l.id === logoId)?.name} download started`);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">N8N Bazar Logo Options</h1>
        <p className="text-muted-foreground">
          Explore different logo designs for your N8N automation marketplace. Each design uses your cyan/turquoise brand colors and works in both light and dark themes.
        </p>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant={isDarkPreview ? "outline" : "default"}
          onClick={() => setIsDarkPreview(false)}
          className="gap-2"
        >
          Light Theme
        </Button>
        <Button 
          variant={isDarkPreview ? "default" : "outline"}
          onClick={() => setIsDarkPreview(true)}
          className="gap-2"
        >
          Dark Theme
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {logoOptions.map((logo) => {
          const LogoComponent = logo.component;
          return (
            <Card 
              key={logo.id} 
              className={`p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-2 ${
                selectedLogo === logo.id ? 'border-primary' : 'border-border'
              } ${isDarkPreview ? 'dark bg-card' : 'bg-card'}`}
              onClick={() => setSelectedLogo(selectedLogo === logo.id ? null : logo.id)}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{logo.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {logo.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {logo.description}
                </p>
              </div>

              {/* Logo Preview */}
              <div className="flex items-center justify-center p-8 rounded-lg bg-muted/30 mb-4">
                <LogoComponent isDark={isDarkPreview} />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLogo(logo.id);
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadLogo(logo.id);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>

              {selectedLogo === logo.id && (
                <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm font-medium">Selected Design</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Share Feedback
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      Request Variations
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Design Guidelines */}
      <Card className="mt-12 p-6">
        <h2 className="text-xl font-semibold mb-4">Design Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Brand Colors</h3>
            <div className="flex gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-primary mb-2"></div>
                <span className="text-xs text-muted-foreground">#00D4AA</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-cyan-400 mb-2"></div>
                <span className="text-xs text-muted-foreground">Cyan-400</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-blue-500 mb-2"></div>
                <span className="text-xs text-muted-foreground">Blue-500</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Usage Recommendations</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use on white or dark backgrounds</li>
              <li>• Minimum size: 120px width</li>
              <li>• Maintain clear space around logo</li>
              <li>• Test in both light and dark themes</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}