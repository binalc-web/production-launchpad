import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

/**
 * Search nodes by name, summary, tags, or file path.
 */
export const ArchitectureSearchBar = forwardRef(function ArchitectureSearchBar(
  { graph, searchQuery, searchResults, onSearch, onSelectResult },
  ref,
) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Input
        ref={ref}
        value={searchQuery}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search nodes by name, summary, or tags... (/)"
        className="h-8 text-xs"
      />
      {searchQuery && searchResults.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {searchResults.map((result) => {
            const node = graph?.nodes?.find((entry) => entry.id === result.nodeId);
            return (
              <button
                key={result.nodeId}
                type="button"
                className="block w-full border-b border-border/60 px-3 py-2 text-left text-xs hover:bg-muted/60"
                onClick={() => onSelectResult(result.nodeId)}
              >
                <span className="font-medium text-foreground">{node?.name ?? result.nodeId}</span>
                {node?.filePath ? (
                  <span className="mt-0.5 block truncate text-muted-foreground">
                    {node.filePath}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {searchQuery && searchResults.length === 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          No matches found.
        </div>
      ) : null}
    </div>
  );
});
