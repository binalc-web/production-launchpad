import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSortedTourSteps } from "../layout/resolveTourNodeIds.js";

/**
 * Project Tour panel — preview, active walkthrough, and empty states.
 */
export function ArchitectureProjectTour({
  graph,
  tourActive,
  currentTourStep,
  onStartTour,
  onStopTour,
  onNextStep,
  onPrevStep,
  onGoToStep,
  onNavigateToNode,
}) {
  const tourSteps = useMemo(() => getSortedTourSteps(graph), [graph]);
  const hasTour = tourSteps.length > 0;

  if (!hasTour) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
        <Compass className="mb-3 size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">No tour yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Refresh the graph to generate a guided walkthrough.
        </p>
      </div>
    );
  }

  if (!tourActive) {
    return (
      <div className="h-full overflow-y-auto overscroll-y-contain px-4 pb-10 pt-4">
        <div className="mb-4">
          <h2 className="arch-graph-heading text-lg font-semibold text-foreground">Project Tour</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {tourSteps.length} steps · guided walkthrough of this codebase
          </p>
        </div>

        <Button type="button" className="mb-4 w-full" onClick={onStartTour}>
          Start tour
        </Button>

        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">Steps</h3>
          {tourSteps.map((step, index) => (
            <div
              key={step.order ?? index}
              className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
            >
              <span className="mt-0.5 shrink-0 font-mono text-primary">{index + 1}.</span>
              <span className="text-foreground">{step.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const step = tourSteps[currentTourStep];
  if (!step) return null;

  const totalSteps = tourSteps.length;
  const progressPct = ((currentTourStep + 1) / totalSteps) * 100;
  const isFirst = currentTourStep === 0;
  const isLast = currentTourStep === totalSteps - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">Tour</h3>
          <span className="text-xs text-muted-foreground">
            {currentTourStep + 1} / {totalSteps}
          </span>
        </div>
        <button
          type="button"
          onClick={onStopTour}
          className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Exit tour
        </button>
      </div>

      <div className="h-1 shrink-0 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
        <h2 className="arch-graph-heading mb-3 text-lg font-semibold text-foreground">
          {step.title}
        </h2>

        <div className="tour-markdown mb-4 text-sm leading-relaxed text-muted-foreground">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              code: ({ className, children }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code className="mb-1.5 block overflow-x-auto rounded bg-muted px-2 py-1.5 text-[11px] leading-relaxed">
                    {children}
                  </code>
                ) : (
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{children}</code>
                );
              },
              ul: ({ children }) => (
                <ul className="mb-1.5 list-inside list-disc space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-1.5 list-inside list-decimal space-y-0.5">{children}</ol>
              ),
            }}
          >
            {step.description || ""}
          </ReactMarkdown>
        </div>

        {step.languageLesson ? (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Language note
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.languageLesson}</p>
          </div>
        ) : null}

        {step.nodeIds?.length > 0 ? (
          <div className="mb-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Related parts
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {step.nodeIds.map((nodeId) => {
                const node = graph?.nodes?.find((n) => n.id === nodeId);
                return (
                  <button
                    key={nodeId}
                    type="button"
                    onClick={() => onNavigateToNode?.(nodeId)}
                    className="cursor-pointer rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {node?.name ?? nodeId}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="z-10 shrink-0 border-t border-border bg-card px-3 py-2">
        <div className="mb-2 flex justify-center gap-1.5">
          {tourSteps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onGoToStep?.(index)}
              className={cn(
                "size-2 rounded-full transition-colors",
                index === currentTourStep ? "bg-primary" : "bg-muted hover:bg-muted-foreground/30",
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={onPrevStep}
            disabled={isFirst}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 text-xs"
            onClick={isLast ? onStopTour : onNextStep}
          >
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
