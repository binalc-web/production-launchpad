import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import favicon from "@/assets/fevicon.png";
import { HubProfileAvatar } from "@/components/common/HubProfileAvatar";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import {
  CONSOLE_SETTINGS_SERVICE,
  DEFAULT_PAGE_BY_SERVICE,
  SIDEBAR_CONSOLE_SERVICES,
} from "../../constants/projectServices";

function RailTooltip({ label, children }) {
  if (!label) return children;

  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={8}>
        {label}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}

function RailIcon({ children, onClick, active = false, title }) {
  return (
    <RailTooltip label={title}>
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        className={cn(
          "flex size-9 cursor-pointer items-center justify-center rounded-lg transition-colors duration-100",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
        )}
      >
        {children}
      </button>
    </RailTooltip>
  );
}

/**
 * Collapsed icon rail for the project console sidebar.
 */
export function ProjectConsoleCollapsedRail({
  project,
  projectName,
  serviceId,
  overlayKey = null,
  onExpand,
  onServiceClick,
  onSettingsClick,
  className,
}) {
  const { user } = useAuth();
  const name = projectName || project?.name || "P";
  const initial = (name[0] || "P").toUpperCase();
  const settingsOverlay = overlayKey && overlayKey !== "all-reports" ? overlayKey : null;
  const profileLabel = user?.name || user?.email || "Profile";

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-tour="project-console-rail"
        className={cn(
          "flex h-full min-h-0 w-[60px] shrink-0 flex-col items-center self-stretch overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          className,
        )}
      >
        <div className="flex h-12 w-full shrink-0 items-center justify-center">
          <img src={favicon} alt="Launchpad" className="size-7 object-contain" />
        </div>

        <div className="sidebar-scroll flex w-full flex-1 flex-col items-center gap-0.5 overflow-x-hidden overflow-y-auto py-2">
          <div className="py-1">
            <RailTooltip label={name}>
              <button
                type="button"
                onClick={onExpand}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #f4a04a, #e07b2a)" }}
                aria-label={name}
              >
                {initial}
              </button>
            </RailTooltip>
          </div>

          <div className="my-1 h-px w-6 bg-sidebar-border" aria-hidden />

          {SIDEBAR_CONSOLE_SERVICES.map((service) => {
            const Icon = service.icon;
            const isSettings = service.id === CONSOLE_SETTINGS_SERVICE.id;
            const active = isSettings
              ? Boolean(settingsOverlay)
              : !overlayKey && serviceId === service.id;
            return (
              <RailIcon
                key={service.id}
                active={active}
                title={service.label}
                onClick={() => {
                  if (isSettings) {
                    onSettingsClick?.();
                    return;
                  }
                  onServiceClick?.(
                    service.id,
                    DEFAULT_PAGE_BY_SERVICE[service.id] ?? service.pages[0]?.id,
                  );
                }}
              >
                <Icon className={cn("size-4", active && "text-primary")} aria-hidden />
              </RailIcon>
            );
          })}
        </div>

        <div className="flex w-full flex-col items-center gap-1 border-t border-sidebar-border py-2">
          <RailTooltip label={profileLabel}>
            <button
              type="button"
              onClick={onExpand}
              className="cursor-pointer rounded-full"
              aria-label="Open profile"
            >
              <HubProfileAvatar
                email={user?.email}
                name={user?.name}
                alt={profileLabel}
                fallbackImageUrl={user?.image}
                className="size-8 shrink-0 rounded-full"
                fallbackClassName="rounded-full bg-primary/15 text-primary"
                iconClassName="size-3.5"
              />
            </button>
          </RailTooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
