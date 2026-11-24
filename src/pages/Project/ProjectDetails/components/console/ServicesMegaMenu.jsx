import { useState } from "react";
import { ChevronDown, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CONSOLE_SERVICE_GROUPS,
  CONSOLE_SERVICES,
  getService,
} from "../../constants/projectServices";

/** Flat launch tiles: catalog services in group order. */
function buildServiceTiles() {
  const tiles = [];
  for (const group of CONSOLE_SERVICE_GROUPS) {
    for (const id of group.serviceIds) {
      const service = CONSOLE_SERVICES.find((s) => s.id === id);
      if (service) tiles.push(service);
    }
  }
  return tiles;
}

const SERVICE_TILES = buildServiceTiles();

/**
 * AWS-style 9-dot Services launcher with icon grid.
 */
export function ServicesMegaMenu({ serviceId, onNavigateService, className }) {
  const [open, setOpen] = useState(false);
  const current = serviceId ? getService(serviceId) : null;
  const CurrentIcon = current?.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-tour="console-services"
          className={cn(
            "h-8 gap-1.5 text-sidebar-foreground",
            "bg-sidebar-accent/50 border border-sidebar-border",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
          aria-label="Services"
        >
          <Grid3x3 className="size-4 shrink-0" aria-hidden />
          <span className="hidden h-4 w-px shrink-0 bg-sidebar-border sm:block" aria-hidden />
          {CurrentIcon ? (
            <CurrentIcon className="hidden size-3.5 shrink-0 opacity-80 sm:block" aria-hidden />
          ) : null}
          <span className="hidden max-w-[9rem] truncate text-xs font-medium sm:inline">
            {current?.label || "Services"}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[22rem] border-border p-4 shadow-lg"
        sideOffset={6}
      >
        <p className="mb-3 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
          Services
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_TILES.map((service) => {
            const Icon = service.icon;
            const active = serviceId === service.id;
            return (
              <button
                key={service.id}
                type="button"
                title={service.description || service.label}
                onClick={() => {
                  onNavigateService?.(service.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-colors duration-200",
                  "hover:bg-muted/80",
                  active && "bg-muted ring-1 ring-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl border border-border bg-background",
                    active && "border-primary/40 bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground/85">
                  {service.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
