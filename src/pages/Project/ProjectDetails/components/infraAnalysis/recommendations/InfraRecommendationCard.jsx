import { MapPin, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { categoryLabel } from "./categoryLabels.js";
import {
  categoryIcon,
  normalizeSeverity,
  SEVERITY_BADGE_CLASS,
  SEVERITY_PILL_CLASS,
} from "./recommendationStyles.js";
import { resolveRelatedNodeLabels } from "./resolveNodeLabels.js";

function itemDescription(item) {
  return (item.description ?? item.detail ?? item.reason ?? "").trim();
}

function itemAffectedFiles(item) {
  return Array.isArray(item.affectedFiles) ? item.affectedFiles : [];
}

function itemRelatedIds(item) {
  return Array.isArray(item.relatedNodeIds) ? item.relatedNodeIds : [];
}

/**
 * Shared recommendation card — compact (Top 10) or full (suggestions list).
 */
export function InfraRecommendationCard({
  item,
  mode = "full",
  rank,
  nodeLabelMap,
  selectedNodeId = null,
  onFocusDiagram,
  onFix,
  onCardClick,
}) {
  const severity = normalizeSeverity(item.severity);
  const CategoryIcon = categoryIcon(item.category);
  const description = itemDescription(item);
  const affectedFiles = itemAffectedFiles(item);
  const relatedIds = itemRelatedIds(item);
  const relatedNodes = resolveRelatedNodeLabels(relatedIds, nodeLabelMap);
  const isRelated = selectedNodeId && relatedIds.map(String).includes(String(selectedNodeId));
  const isHighPriority = severity === "critical" || severity === "high";

  const handleFix = (event) => {
    event.stopPropagation();
    onFix?.(item);
  };

  const handleCardClick = () => {
    if (relatedIds.length && onFocusDiagram) {
      onFocusDiagram(relatedIds);
    }
    onCardClick?.(item);
  };

  if (mode === "compact") {
    return (
      <article
        role={relatedIds.length ? "button" : undefined}
        tabIndex={relatedIds.length ? 0 : undefined}
        onClick={relatedIds.length ? handleCardClick : undefined}
        onKeyDown={
          relatedIds.length
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCardClick();
                }
              }
            : undefined
        }
        className={cn(
          "rounded-xl border bg-background p-4 shadow-sm transition-colors",
          isHighPriority && "border-amber-500/25",
          isRelated && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
          relatedIds.length && "cursor-pointer hover:border-primary/30 hover:shadow-md",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {typeof rank === "number" ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-bold text-muted-foreground">
                {rank}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 text-[10px] font-medium capitalize",
                SEVERITY_PILL_CLASS[severity],
              )}
            >
              {severity}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {categoryLabel(item.category)}
          </span>
        </div>
        <h4 className="mt-2 text-sm font-semibold text-card-foreground">{item.title}</h4>
        {description ? (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {affectedFiles.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Includes
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {affectedFiles.slice(0, 3).map((file) => (
                <li key={file} className="truncate font-mono">
                  • {file}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {relatedNodes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {relatedNodes.slice(0, 2).map((node) => (
              <span
                key={node.id}
                className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium"
              >
                <MapPin className="size-2.5 shrink-0 text-primary" />
                {node.label}
              </span>
            ))}
          </div>
        ) : null}
        {onFix ? (
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              className="h-8 w-full rounded-md text-xs"
              onClick={handleFix}
            >
              <Wrench className="mr-1 size-3" />
              Fix
            </Button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-colors duration-150 hover:border-primary/30 hover:shadow-md lg:min-h-[120px] lg:flex-row lg:items-center lg:gap-3",
        isHighPriority && "border-amber-500/20",
        isRelated && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
        <div className="flex items-start gap-2 lg:min-w-0 lg:flex-1">
          <div className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-muted text-muted-foreground transition group-hover:border-primary/20 group-hover:text-primary">
            <CategoryIcon className="size-3.5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {item.title ?? "Suggestion"}
              </h4>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <Badge
                  variant="secondary"
                  className="h-5 rounded-md px-1.5 text-xs font-medium capitalize"
                >
                  {categoryLabel(item.category)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 rounded-md px-1.5 text-xs font-medium capitalize",
                    SEVERITY_BADGE_CLASS[severity],
                  )}
                >
                  {severity}
                </Badge>
              </div>
            </div>
            {description ? (
              <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
            {affectedFiles.length > 0 ? (
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/80">
                {affectedFiles.slice(0, 3).join(" · ")}
              </p>
            ) : null}
            {relatedNodes.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {relatedNodes.slice(0, 3).map((node) => (
                  <span
                    key={node.id}
                    className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    <MapPin className="size-2.5 shrink-0 text-primary" />
                    {node.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs italic text-muted-foreground">
                Not linked to diagram yet
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 gap-1.5 lg:mt-0 lg:w-[120px] lg:flex-col">
        <Button
          type="button"
          size="sm"
          className="h-8 flex-1 rounded-md text-xs lg:flex-none"
          onClick={handleFix}
        >
          <Wrench className="mr-1 size-3" />
          Fix
        </Button>
      </div>
    </article>
  );
}
