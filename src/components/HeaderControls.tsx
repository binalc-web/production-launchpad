import React from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { User, Integrations } from '../types';

interface HeaderControlsProps {
  currentUser: User;
  integrations: Integrations;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onUpdateIntegration: (service: string, data: any) => void;
  onLogout: () => void;
}

export function HeaderControls({
  currentUser,
  integrations,
  isDarkMode,
  onToggleTheme,
  onUpdateIntegration,
  onLogout
}: HeaderControlsProps) {
  return (
    <header className="border-b border-border bg-card/50">
      <div className="px-6 h-14 flex items-center justify-between">
        {/* Left side placeholder */}
        <div></div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Google Calendar Integration Status */}


          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
            >
              3
            </Badge>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="h-9 w-9"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.name}
                  className="h-8 w-8 rounded-full"
                />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {currentUser?.role}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Notification Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}