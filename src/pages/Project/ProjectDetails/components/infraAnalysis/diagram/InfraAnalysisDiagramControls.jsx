import {
  LayoutGrid,
  Map,
  Maximize,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FLOW_SPEED_OPTIONS } from "./motionConstants.js";

/** Diagram toolbar: flow controls, zoom, minimap, fullscreen. */
export function InfraAnalysisDiagramControls({
  showMinimap,
  setShowMinimap,
  flowPaused,
  setFlowPaused,
  highlightFlows,
  setHighlightFlows,
  flowSpeed = 1,
  setFlowSpeed,
  selectedNodeId,
  isFullscreen,
  onToggleFullscreen,
  onResetLayout,
  onZoomIn,
  onZoomOut,
  onFitView,
  onFocusSelected,
}) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-md backdrop-blur-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFlowPaused((value) => !value)}
            aria-label={flowPaused ? "Play flow animation" : "Pause flow animation"}
          >
            {flowPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{flowPaused ? "Play animation" : "Pause animation"}</TooltipContent>
      </Tooltip>

      {FLOW_SPEED_OPTIONS.map((speed) => (
        <Tooltip key={speed}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={flowSpeed === speed ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setFlowSpeed(speed)}
            >
              {speed}x
            </Button>
          </TooltipTrigger>
          <TooltipContent>Flow speed {speed}x</TooltipContent>
        </Tooltip>
      ))}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={highlightFlows ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setHighlightFlows((value) => !value)}
            aria-label="Highlight primary flows"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Highlight primary flows</TooltipContent>
      </Tooltip>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
            <Minus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView}>
            <Target className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fit to view</TooltipContent>
      </Tooltip>

      {selectedNodeId ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onFocusSelected}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Focus selected node</TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onResetLayout}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset layout</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={showMinimap ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowMinimap((value) => !value)}
          >
            <Map className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{showMinimap ? "Hide minimap" : "Show minimap"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isFullscreen && "bg-muted")}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
