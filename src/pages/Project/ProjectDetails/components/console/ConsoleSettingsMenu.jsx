import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Braces,
  ClipboardCheck,
  Cpu,
  History,
  KeyRound,
  LineChart,
  LogOut,
  Moon,
  Plug,
  Sun,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDocumentTheme } from "@/hooks/useDocumentTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HubProfileAvatar } from "@/components/common/HubProfileAvatar";
import { cn } from "@/lib/utils";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { ADMIN_CONSOLE_LINKS, PLATFORM_CONSOLE_LINKS } from "../../constants/projectServices";

const LINK_ICONS = {
  "/settings/integrations": Plug,
  "/settings/notifications": Bell,
  "/jobs": Zap,
  "/prompt-management": Braces,
  "/deployments": History,
  "/platform-analytics": LineChart,
  "/cost-analytics": BarChart3,
  "/qa-analytics": ClipboardCheck,
  "/model-router": Cpu,
  "/cursor-api-keys": KeyRound,
};

/**
 * User-level account menu (avatar): platform / admin links + log out.
 */
export function ConsoleSettingsMenu({ isAdmin = false, className }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useDocumentTheme();
  const admin = isAdmin || isLaunchpadAdmin(user?.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "size-8 shrink-0 p-0 text-sidebar-foreground",
            "bg-sidebar-accent/50 border border-sidebar-border",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
          aria-label="Account and settings"
        >
          <HubProfileAvatar
            email={user?.email}
            name={user?.name}
            alt={user?.name || user?.email || "Account"}
            fallbackImageUrl={user?.image}
            className="size-7 shrink-0 rounded-full"
            fallbackClassName="rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
            iconClassName="size-4"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        {user ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5 px-1 py-1">
                <span className="truncate text-sm font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[12px] font-semibold text-foreground/80 transition-colors hover:bg-muted"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="size-3 text-primary" aria-hidden />
            ) : (
              <Moon className="size-3 text-primary" aria-hidden />
            )}
            {isDark ? "Light" : "Dark"}
          </button>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
          Account
        </DropdownMenuLabel>
        {PLATFORM_CONSOLE_LINKS.map((link) => {
          const Icon = LINK_ICONS[link.href];
          return (
            <DropdownMenuItem key={link.href} asChild className="gap-2.5">
              <Link to={link.href}>
                {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
                {link.label}
              </Link>
            </DropdownMenuItem>
          );
        })}

        {admin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
              Admin
            </DropdownMenuLabel>
            {ADMIN_CONSOLE_LINKS.map((link) => {
              const Icon = LINK_ICONS[link.href];
              return (
                <DropdownMenuItem key={link.href} asChild className="gap-2.5">
                  <Link to={link.href}>
                    {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="gap-2.5"
          onSelect={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
