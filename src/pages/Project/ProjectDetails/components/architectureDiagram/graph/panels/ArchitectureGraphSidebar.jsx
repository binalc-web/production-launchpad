import { forwardRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ArchitectureFileExplorer } from "./ArchitectureFileExplorer.jsx";
import { ArchitectureNodeInfo } from "./ArchitectureNodeInfo.jsx";
import { ArchitectureProjectTour } from "./ArchitectureProjectTour.jsx";

/**
 * INFO / FILES panel — each tab scrolls independently; tabs stay visible at top.
 * @param {"stacked" | "expanded"} layout — below graph vs right column in expanded mode
 */
export const ArchitectureGraphSidebar = forwardRef(function ArchitectureGraphSidebar(
  {
    layout = "stacked",
    sidebarTab,
    onSidebarTabChange,
    selectedNode,
    graph,
    onNavigateToNode,
    onOpenFile,
    tourActive,
    currentTourStep,
    onStartTour,
    onStopTour,
    onNextTourStep,
    onPrevTourStep,
    onGoToTourStep,
  },
  ref,
) {
  const isStackedTour = layout === "stacked" && (tourActive || sidebarTab === "tour");

  return (
    <div
      ref={ref}
      className={cn(
        "arch-graph-sidebar flex min-h-0 shrink-0 flex-col overflow-hidden bg-card",
        layout === "expanded"
          ? "h-full w-[min(100%,360px)] border-l border-border"
          : cn(
              "w-full border-t border-border",
              isStackedTour
                ? "min-h-[300px] max-h-[min(52vh,480px)]"
                : "min-h-[260px] max-h-[min(40vh,360px)]",
            ),
      )}
    >
      <Tabs
        value={sidebarTab}
        onValueChange={onSidebarTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 grid w-auto shrink-0 grid-cols-3 bg-muted/50">
          <TabsTrigger value="info" className="text-xs uppercase tracking-wide">
            Info
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs uppercase tracking-wide">
            Files
          </TabsTrigger>
          <TabsTrigger value="tour" className="text-xs uppercase tracking-wide">
            Tour
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="info"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-0 p-0 shadow-none"
        >
          <ArchitectureNodeInfo
            node={selectedNode}
            graph={graph}
            onNavigateToNode={onNavigateToNode}
          />
        </TabsContent>
        <TabsContent
          value="files"
          className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-0 p-0 shadow-none"
        >
          <ArchitectureFileExplorer graph={graph} onOpenFile={onOpenFile} />
        </TabsContent>
        <TabsContent
          value="tour"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 p-0 shadow-none data-[state=inactive]:hidden"
        >
          <ArchitectureProjectTour
            graph={graph}
            tourActive={tourActive}
            currentTourStep={currentTourStep}
            onStartTour={onStartTour}
            onStopTour={onStopTour}
            onNextStep={onNextTourStep}
            onPrevStep={onPrevTourStep}
            onGoToStep={onGoToTourStep}
            onNavigateToNode={onNavigateToNode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});
