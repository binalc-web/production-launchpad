import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ARCHITECTURE_DIAGRAM_PIPELINE_STEPS,
  resolveArchitectureDiagramActiveStepIndex,
  resolveArchitectureDiagramStepState,
} from "./architectureDiagramSteps";

function StepIndicator({ stepNumber, state }) {
  if (state === "failed") {
    return (
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-destructive bg-destructive text-destructive-foreground shadow-sm"
        aria-hidden
      >
        <X className="size-4" />
      </div>
    );
  }
  if (state === "done") {
    return (
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-sm"
        aria-hidden
      >
        <Check className="size-4" />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary shadow-sm ring-4 ring-primary/15"
        aria-hidden
      >
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-sm font-semibold text-muted-foreground"
      aria-hidden
    >
      {stepNumber}
    </div>
  );
}

function StepConnector({ done }) {
  return (
    <div
      className={cn("my-1 w-0.5 min-h-4 flex-1", done ? "bg-primary" : "bg-border")}
      aria-hidden
    />
  );
}

export function ArchitectureDiagramStepper({ run, className, showHeading = true }) {
  const failed = run?.status === "failed";
  const completed = run?.status === "ready";
  const activeIndex = resolveArchitectureDiagramActiveStepIndex(run?.currentPhase, run?.status);
  const lastIndex = ARCHITECTURE_DIAGRAM_PIPELINE_STEPS.length - 1;

  return (
    <nav
      aria-label="Architecture diagram pipeline"
      className={cn("rounded-lg border border-border bg-card/80 p-4 shadow-sm", className)}
    >
      {showHeading ? (
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Generation steps
        </p>
      ) : null}
      <ol className="flex flex-col">
        {ARCHITECTURE_DIAGRAM_PIPELINE_STEPS.map((step, index) => {
          const state = resolveArchitectureDiagramStepState(index, activeIndex, {
            failed,
            completed,
          });
          const connectorDone = completed || index < activeIndex;
          const isLast = index === lastIndex;

          return (
            <li
              key={step.id}
              className="flex min-w-0 gap-3"
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className="flex flex-col items-center">
                <StepIndicator stepNumber={index + 1} state={state} />
                {!isLast ? <StepConnector done={connectorDone} /> : null}
              </div>
              <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    state === "active" && "text-primary",
                    state === "done" && "text-foreground",
                    state === "pending" && "text-muted-foreground",
                    state === "failed" && "text-destructive",
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground break-words">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
