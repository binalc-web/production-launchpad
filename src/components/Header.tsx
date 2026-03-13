import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Moon, Sun, LogIn, LogOut, User, Settings, HelpCircle, Play } from "lucide-react";
import { Logo } from "./Logo";
import { TourTrigger } from "./ProductTour";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
}

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onStartTour?: () => void;
}

export function Header({ 
  isDarkMode, 
  onToggleTheme, 
  user, 
  onLogin, 
  onLogout,
  onStartTour 
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Logo size="sm" />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Tour Trigger - Show for authenticated users */}
          {user && onStartTour && (
            <TourTrigger onStartTour={onStartTour} />
          )}

          {/* Help Button - Show for non-authenticated users */}
          {!user && onStartTour && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStartTour}
              className="gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Help</span>
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleTheme}
            className="gap-2"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isDarkMode ? 'Light' : 'Dark'}
            </span>
          </Button>

          {/* User Authentication */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>
                      {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    {user.plan && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="capitalize font-medium text-primary">{user.plan} Plan</span>
                        {user.tokens !== undefined && (
                          <span className="text-muted-foreground">
                            • {user.tokens} tokens
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {onStartTour && (
                  <DropdownMenuItem onClick={onStartTour}>
                    <Play className="mr-2 h-4 w-4" />
                    <span>Take Tour</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={onLogin} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}