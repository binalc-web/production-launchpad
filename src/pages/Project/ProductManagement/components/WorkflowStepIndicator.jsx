import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkflowStepIndicator({ steps, currentId, completedIds = [], onSelect }) {
  const completed = new Set(completedIds);

  return (
    <div className="flex flex-nowrap items-center gap-1">
      {steps.map((step, i) => {
        const isCompleted = completed.has(step.id);
        const isCurrent = step.id === currentId;
        const isUpcoming = !isCompleted && !isCurrent;

        return (
          <div key={step.id} className="flex items-center gap-1">
            {i > 0 ? <span className="text-muted-foreground/40 text-xs mx-0.5">›</span> : null}
            <button
              type="button"
              onClick={() => onSelect?.(step.id)}
              disabled={!onSelect}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                isCompleted && !isCurrent && "bg-primary/10 text-primary",
                isCurrent && isCompleted && "bg-primary/15 text-primary ring-1 ring-primary/30",
                isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                isUpcoming && "bg-muted text-muted-foreground hover:text-foreground",
                onSelect && "cursor-pointer",
                !onSelect && "cursor-default",
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <span className="size-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-semibold">
                  {i + 1}
                </span>
              )}
              <span className={cn(isCompleted && "line-through decoration-primary/40")}>{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
