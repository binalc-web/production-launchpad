import React from "react";
import {
  Folder,
  LogOut,
  Plug,
  Zap,
  Braces,
  History,
  BarChart3,
  Cpu,
  KeyRound,
  ClipboardCheck,
  LineChart,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HubProfileAvatar } from "@/components/common/HubProfileAvatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LaunchpadLogo } from "@/components/common/LaunchpadLogo";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const baseItems = [
    {
      title: "Projects",
      url: "/projects",
      icon: Folder,
    },
    {
      title: "Automations",
      url: "/jobs",
      icon: Zap,
    },
    {
      title: "Connected accounts",
      url: "/settings/integrations",
      icon: Plug,
    },
  ];
  const items = isLaunchpadAdmin(user?.role)
    ? [
        ...baseItems,
        {
          title: "Prompt Management",
          url: "/prompt-management",
          icon: Braces,
        },
        {
          title: "Deployments",
          url: "/deployments",
          icon: History,
        },
        {
          title: "Platform Analytics",
          url: "/platform-analytics",
          icon: LineChart,
        },
        {
          title: "Cost Analytics",
          url: "/cost-analytics",
          icon: BarChart3,
        },
        {
          title: "QA Analytics",
          url: "/qa-analytics",
          icon: ClipboardCheck,
        },
        {
          title: "Model Router",
          url: "/model-router",
          icon: Cpu,
        },
        {
          title: "Cursor API keys",
          url: "/cursor-api-keys",
          icon: KeyRound,
        },
      ]
    : baseItems;

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-3 py-3">
        <Link
          to="/projects"
          className="flex min-w-0 flex-1 items-center rounded-md px-1.5 py-0 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label="Go to Projects"
        >
          <LaunchpadLogo alt="Launchpad Logo" className="h-9 w-auto max-w-[9rem] object-contain" />
        </Link>
        <SidebarTrigger className="size-8 shrink-0 cursor-pointer" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      location.pathname === item.url || location.pathname.startsWith(item.url + "/")
                    }
                    className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90 data-[active=true]:hover:text-primary-foreground"
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                logout();
                navigate("/login");
              }}
              size="md"
              className="cursor-pointer w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator />
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <HubProfileAvatar
                  email={user.email}
                  alt={user.name}
                  fallbackImageUrl={user.image}
                  className="h-8 w-8 rounded-lg"
                  fallbackClassName="rounded-lg"
                  iconClassName="size-5"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
