import { useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { 
  Search,
  Wand2,
  Library,
  FileText,
  Heart,
  Clock,
  Settings,
  CreditCard,
  Wrench,
  Flag,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  Mail,
  Download
} from "lucide-react";

interface LeftSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

export function LeftSidebar({ 
  isCollapsed, 
  onToggle, 
  activeSection, 
  onSectionChange,
  className = ""
}: LeftSidebarProps) {
  const menuItems = [
    {
      id: 'search',
      label: 'Search Templates',
      icon: Search,
      active: activeSection === 'search',
      tourId: 'main-search'
    },
    {
      id: 'ai-generation',
      label: 'AI Workflow Generation',
      icon: Wand2,
      active: activeSection === 'ai-generation',
      tourId: 'ai-generation'
    },
    {
      id: 'node-library',
      label: 'Node Library',
      icon: Library,
      active: activeSection === 'node-library',
      tourId: 'node-library'
    },
    {
      id: 'my-templates',
      label: 'My Templates',
      icon: FileText,
      active: activeSection === 'my-templates',
      tourId: 'my-templates'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      active: activeSection === 'favorites'
    },
    {
      id: 'recent',
      label: 'Recent',
      icon: Clock,
      active: activeSection === 'recent'
    }
  ];

  const bottomItems = [
    {
      id: 'logo-options',
      label: 'Logo Options',
      icon: Sparkles,
      active: activeSection === 'logo-options',
      highlight: false
    },
    {
      id: 'logo-exporter',
      label: 'Download Logos',
      icon: Download,
      active: activeSection === 'logo-exporter',
      highlight: false
    },
    {
      id: 'email-templates',
      label: 'Email Templates',
      icon: Mail,
      active: activeSection === 'email-templates',
      highlight: false
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      active: activeSection === 'settings'
    },
    {
      id: 'buy-tokens',
      label: 'Buy Tokens',
      icon: CreditCard,
      active: activeSection === 'buy-tokens',
      highlight: true,
      tourId: 'buy-tokens'
    },
    {
      id: 'request-custom',
      label: 'Request Custom Build',
      icon: Wrench,
      active: activeSection === 'request-custom'
    },
    {
      id: 'report-issue',
      label: 'Report an Issue',
      icon: Flag,
      active: activeSection === 'report-issue'
    }
  ];

  return (
    <div className={`relative bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } ${className}`}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-background border border-border shadow-sm hover:bg-muted"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      <ScrollArea className="h-full">
        <div className="flex flex-col h-full p-4">
          {/* Main Navigation */}
          <div className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={item.active ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 ${
                    isCollapsed ? 'px-2' : 'px-3'
                  } ${item.active ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                  onClick={() => onSectionChange(item.id)}
                  data-tour={item.tourId}
                >
                  <IconComponent className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Button>
              );
            })}
          </div>

          {/* Separator */}
          {!isCollapsed && (
            <Separator className="my-4" />
          )}

          {/* Bottom Items */}
          <div className="space-y-2">
            {bottomItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={item.active ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 ${
                    isCollapsed ? 'px-2' : 'px-3'
                  } ${
                    item.highlight 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : item.active 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  onClick={() => onSectionChange(item.id)}
                  data-tour={item.tourId}
                >
                  <IconComponent className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} flex-shrink-0`} />
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>{item.label}</span>
                      {item.highlight && (
                        <Badge variant="secondary" className="bg-primary-foreground text-primary text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                      )}
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}