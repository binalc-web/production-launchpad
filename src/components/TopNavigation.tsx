import React from 'react';
import { 
  Calendar, 
  Plus, 
  Users, 
  FileText, 
  CheckSquare, 
  Settings,
  Eye,
  LayoutDashboard
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

interface UserPermissions {
  canCreateMeetings: boolean;
  canAccessAllMeetings: boolean;
  canCreateJiraTickets: boolean;
  canCreateConfluenceDocs: boolean;
  canManageIntegrations: boolean;
  canManageUsers: boolean;
  directJiraAccess: boolean;
}

interface TopNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  userPermissions: UserPermissions;
  actionItemsCount?: number;
}

export function TopNavigation({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  userPermissions,
  actionItemsCount = 5 
}: TopNavigationProps) {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      available: true
    },
    {
      id: 'create',
      label: 'Create Meeting',
      icon: Plus,
      available: userPermissions.canCreateMeetings
    },
    {
      id: 'availability',
      label: 'Availability',
      icon: Eye,
      available: true
    },
    {
      id: 'mom',
      label: 'Meeting Notes',
      icon: FileText,
      available: true
    },
    {
      id: 'action-items',
      label: 'Action Items',
      icon: CheckSquare,
      available: true,
      badge: actionItemsCount > 0 ? actionItemsCount : undefined
    },
    {
      id: 'integrations',
      label: 'Settings',
      icon: Settings,
      available: userPermissions.canManageIntegrations
    }
  ];

  const availableItems = navigationItems.filter(item => item.available);

  return (
    <div className="border-b border-border bg-card shadow-sm">
      <div className="px-6 h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">MeetTracker</h2>
              <p className="text-xs text-muted-foreground">v2.0</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center space-x-2">
            {availableItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "h-10 px-4 relative transition-all duration-200 group",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 border border-primary/20" 
                      : "hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border hover:shadow-sm"
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className={cn(
                    "h-4 w-4 mr-2 transition-transform duration-200",
                    "group-hover:scale-110"
                  )} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-2 text-xs h-5 px-1.5 transition-colors duration-200",
                        isActive 
                          ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30" 
                          : "bg-primary/20 text-primary border-primary/30"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="md:hidden">
          <Button 
            variant="outline" 
            size="icon"
            className="border-border hover:bg-accent hover:border-border/80"
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="md:hidden border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {availableItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "h-16 flex flex-col items-center justify-center space-y-1 relative group transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md border border-primary/20" 
                      : "hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border hover:shadow-sm"
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    "group-hover:scale-110"
                  )} />
                  <span className="text-xs font-medium leading-tight text-center">
                    {item.label.split(' ')[0]}
                  </span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center transition-colors duration-200",
                        isActive 
                          ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30" 
                          : "bg-primary/20 text-primary border-primary/30"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}