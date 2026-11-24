import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NODE_TYPE_PILL_CATEGORIES } from "../graphConstants.js";

/**
 * Quick category toggles for code/config/docs/infra/data/domain nodes.
 */
export function ArchitectureNodeTypePills({ nodeTypeFilters, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {NODE_TYPE_PILL_CATEGORIES.map((category) => {
        const active = nodeTypeFilters[category.key] !== false;
        return (
          <button
            key={category.key}
            type="button"
            onClick={() => onToggle(category.key)}
            className={cn(
              "rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              active
                ? "border-border bg-muted/50 text-foreground"
                : "border-transparent text-muted-foreground/50 line-through",
            )}
            style={active ? { borderColor: `${category.color}55` } : undefined}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
