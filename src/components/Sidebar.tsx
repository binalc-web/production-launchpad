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

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  userPermissions: UserPermissions;
  actionItemsCount?: number;
}

export function Sidebar({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  userPermissions,
  actionItemsCount = 5 
}: SidebarProps) {
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
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-semibold">MeetTracker</h2>
            <p className="text-xs text-muted-foreground">v2.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {availableItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-10 px-3",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="ml-auto bg-primary/20 text-primary text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="h-8 w-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}