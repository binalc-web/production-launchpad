import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ALL_COMPLEXITIES, ALL_EDGE_CATEGORIES, ALL_NODE_TYPES } from "../graphConstants.js";

/**
 * Advanced filter panel for node types, complexity, layers, and edge categories.
 */
export function ArchitectureFilterPanel({
  open,
  filters,
  layers,
  onToggleOpen,
  onSetFilters,
  onReset,
}) {
  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={onToggleOpen}
      >
        Filter
      </Button>
    );
  }

  const toggleSetValue = (set, value) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="default"
        className="h-7 px-2 text-xs"
        onClick={onToggleOpen}
      >
        Filter
      </Button>
      <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 rounded-md border border-border bg-popover p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </p>
          <button
            type="button"
            className="text-[11px] text-primary hover:underline"
            onClick={onReset}
          >
            Reset
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <section>
            <p className="mb-1 font-medium text-foreground">Node types</p>
            <div className="flex flex-wrap gap-1">
              {ALL_NODE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    "rounded border px-1.5 py-0.5 capitalize",
                    filters.nodeTypes.has(type)
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground line-through",
                  )}
                  onClick={() =>
                    onSetFilters({ ...filters, nodeTypes: toggleSetValue(filters.nodeTypes, type) })
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1 font-medium text-foreground">Complexity</p>
            <div className="flex flex-wrap gap-1">
              {ALL_COMPLEXITIES.map((complexity) => (
                <button
                  key={complexity}
                  type="button"
                  className={cn(
                    "rounded border px-1.5 py-0.5 capitalize",
                    filters.complexities.has(complexity)
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground line-through",
                  )}
                  onClick={() =>
                    onSetFilters({
                      ...filters,
                      complexities: toggleSetValue(filters.complexities, complexity),
                    })
                  }
                >
                  {complexity}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1 font-medium text-foreground">Layers</p>
            <div className="flex flex-wrap gap-1">
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className={cn(
                    "rounded border px-1.5 py-0.5",
                    filters.layerIds.has(layer.id)
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                  onClick={() =>
                    onSetFilters({
                      ...filters,
                      layerIds: toggleSetValue(filters.layerIds, layer.id),
                    })
                  }
                >
                  {layer.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1 font-medium text-foreground">Edge categories</p>
            <div className="flex flex-wrap gap-1">
              {ALL_EDGE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={cn(
                    "rounded border px-1.5 py-0.5 capitalize",
                    filters.edgeCategories.has(category)
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground line-through",
                  )}
                  onClick={() =>
                    onSetFilters({
                      ...filters,
                      edgeCategories: toggleSetValue(filters.edgeCategories, category),
                    })
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
