import { Button } from "@/components/ui/button";
import { Compass, Maximize2, Minimize2, Minus, Moon, Plus, Sun, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Zoom, expand, fit, theme, and tour controls for the architecture graph canvas.
 */
export function ArchitectureGraphToolbar({
  isExpanded,
  onToggleExpanded,
  onFit,
  onZoomIn,
  onZoomOut,
  graphTheme,
  onToggleTheme,
  onOpenTour,
  hasTour = false,
  className,
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {hasTour ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onOpenTour}
          title="Open project tour"
        >
          <Compass className="size-3.5" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("size-8", isExpanded && "bg-muted")}
        onClick={onToggleExpanded}
        title={isExpanded ? "Exit expanded view" : "Expand diagram"}
      >
        {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onZoomIn}
        title="Zoom in"
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onZoomOut}
        title="Zoom out"
      >
        <Minus className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onFit}
        title="Fit to view"
      >
        <Target className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={onToggleTheme}
        title={graphTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {graphTheme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      </Button>
    </div>
  );
}
