import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, GitBranch, Route } from "lucide-react";
import { ArchitectureDetailLevelToggle } from "./ArchitectureDetailLevelToggle.jsx";
import { ArchitectureDiffToggle } from "./ArchitectureDiffToggle.jsx";
import { ArchitectureFilterPanel } from "./ArchitectureFilterPanel.jsx";
import { ArchitectureNodeTypePills } from "./ArchitectureNodeTypePills.jsx";
import { ArchitectureSearchBar } from "./ArchitectureSearchBar.jsx";

/**
 * UA-style dashboard header for the architecture graph explorer.
 */
export function ArchitectureGraphHeader({
  graph,
  layers,
  store,
  hasDomainGraph,
  onExportGraph,
  onOpenPathFinder,
  onNavigateSearchResult,
  searchInputRef,
}) {
  return (
    <div className="space-y-2 border-b border-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 shrink-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {graph?.project?.name || "Architecture"}
          </p>
        </div>

        <Select value={store.persona} onValueChange={store.setPersona}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Persona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="technical">Overview</SelectItem>
            <SelectItem value="junior">Learn</SelectItem>
            <SelectItem value="deep">Deep Dive</SelectItem>
          </SelectContent>
        </Select>

        {hasDomainGraph ? (
          <div className="flex items-center rounded-lg bg-muted/50 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={store.viewMode === "domain" ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => store.setViewMode("domain")}
            >
              Domain
            </Button>
            <Button
              type="button"
              size="sm"
              variant={store.viewMode === "structural" ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => store.setViewMode("structural")}
            >
              Structural
            </Button>
          </div>
        ) : null}

        <ArchitectureDetailLevelToggle
          detailLevel={store.detailLevel}
          showFunctionsInClassView={store.showFunctionsInClassView}
          onSetDetailLevel={store.setDetailLevel}
          onToggleFunctions={store.toggleShowFunctionsInClassView}
          hidden={store.viewMode === "domain"}
        />

        <ArchitectureDiffToggle diffEnabled={store.diffEnabled} onToggle={store.setDiffEnabled} />

        <ArchitectureFilterPanel
          open={store.filterPanelOpen}
          filters={store.filters}
          layers={layers}
          onToggleOpen={store.toggleFilterPanel}
          onSetFilters={store.setFilters}
          onReset={store.resetFilters}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onExportGraph}
        >
          <Download className="size-3.5" />
          Export
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onOpenPathFinder}
        >
          <Route className="size-3.5" />
          Path
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={store.openTourTab}
        >
          <GitBranch className="size-3.5" />
          Tour
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ArchitectureSearchBar
          ref={searchInputRef}
          graph={graph}
          searchQuery={store.searchQuery}
          searchResults={store.searchResults}
          onSearch={(query) => store.setSearchQuery(graph, query)}
          onSelectResult={onNavigateSearchResult}
        />
        <ArchitectureNodeTypePills
          nodeTypeFilters={store.nodeTypeFilters}
          onToggle={store.toggleNodeTypeFilter}
        />
      </div>
    </div>
  );
}
