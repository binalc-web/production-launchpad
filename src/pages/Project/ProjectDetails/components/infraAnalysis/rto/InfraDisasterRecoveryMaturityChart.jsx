import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { drStages } from "./drMaturity.js";

function StageMarker({ isCurrent, isTarget, isPast }) {
  if (isCurrent) {
    return (
      <div className="relative z-10 flex size-5 items-center justify-center rounded-full border-2 border-amber-500 bg-background shadow-sm ring-4 ring-amber-100 dark:ring-amber-500/20">
        <div className="size-2 rounded-full bg-amber-500" />
      </div>
    );
  }
  if (isTarget) {
    return (
      <div className="relative z-10 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-primary shadow-sm ring-4 ring-primary/20">
        <div className="size-2 rounded-full bg-primary-foreground" />
      </div>
    );
  }
  if (isPast) {
    return (
      <div className="relative z-10 size-4 rounded-full border-2 border-muted-foreground/40 bg-background" />
    );
  }
  return <div className="relative z-10 size-4 rounded-full border-2 border-border bg-muted" />;
}

/**
 * Left-to-right DR maturity chart (InfraPilot DisasterRecoveryMaturityChart port).
 */
export function InfraDisasterRecoveryMaturityChart({
  currentStage,
  targetStage,
  stages = drStages,
  summary,
  className,
}) {
  const currentIdx = stages.findIndex((stage) => stage.id === currentStage);
  const targetIdx = stages.findIndex((stage) => stage.id === targetStage);

  return (
    <div className={cn("w-full", className)}>
      {summary ? (
        <p className="mb-5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-3">
        {stages.map((stage, idx) => {
          const isCurrent = stage.id === currentStage;
          const isTarget = stage.id === targetStage;
          const isMuted = idx > targetIdx && !isTarget;

          return (
            <div
              key={stage.id}
              className={cn("flex flex-col items-center text-center", isMuted && "opacity-60")}
            >
              <div className="mb-1.5 flex min-h-[22px] flex-wrap items-center justify-center gap-1">
                {isCurrent ? (
                  <Badge className="h-5 rounded-md border-0 bg-amber-100 px-1.5 text-[10px] font-semibold uppercase text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-200">
                    Current
                  </Badge>
                ) : null}
                {isTarget ? (
                  <Badge className="h-5 rounded-md border-0 bg-primary/15 px-1.5 text-[10px] font-semibold uppercase text-primary hover:bg-primary/15">
                    Target
                  </Badge>
                ) : null}
              </div>
              <h4
                className={cn(
                  "text-xs font-semibold leading-snug sm:text-sm",
                  isCurrent && "text-amber-700 dark:text-amber-300",
                  isTarget && "text-primary",
                  !isCurrent && !isTarget && "text-foreground",
                )}
              >
                {stage.title}
              </h4>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-3">
        {stages.map((stage) => (
          <div key={`${stage.id}-line`} className="flex justify-center">
            <div
              className={cn(
                "h-6 w-px",
                stage.id === currentStage && "bg-amber-400",
                stage.id === targetStage && stage.id !== currentStage && "bg-primary",
                stage.id !== currentStage && stage.id !== targetStage && "bg-border",
              )}
            />
          </div>
        ))}
      </div>

      <div className="relative my-1 py-2">
        <div className="relative flex h-10 w-full items-center">
          <div
            className="h-3 flex-1 rounded-l-full shadow-inner"
            style={{
              background:
                "linear-gradient(90deg, #38bdf8 0%, #818cf8 28%, #c084fc 52%, #f472b6 72%, #fb923c 92%, #f97316 100%)",
            }}
          />
          <div
            className="h-0 w-0 shrink-0"
            style={{
              borderTop: "14px solid transparent",
              borderBottom: "14px solid transparent",
              borderLeft: "22px solid #f97316",
            }}
            aria-hidden
          />
        </div>
        <div className="pointer-events-none absolute inset-0 grid grid-cols-2 items-center lg:grid-cols-4">
          {stages.map((stage, idx) => {
            const isCurrent = stage.id === currentStage;
            const isTarget = stage.id === targetStage;
            const isPast = idx < currentIdx;
            return (
              <div key={`${stage.id}-marker`} className="flex justify-center">
                <StageMarker isCurrent={isCurrent} isTarget={isTarget} isPast={isPast} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-3">
        {stages.map((stage) => {
          const isCurrent = stage.id === currentStage;
          const isTarget = stage.id === targetStage;
          return (
            <div key={`${stage.id}-rto`} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                RPO / RTO
              </p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-sm font-semibold",
                  isCurrent && "text-amber-700 dark:text-amber-300",
                  isTarget && "text-primary",
                  !isCurrent && !isTarget && "text-foreground",
                )}
              >
                {stage.rtoRpo}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
        {stages.map((stage, idx) => {
          const isCurrent = stage.id === currentStage;
          const isTarget = stage.id === targetStage;
          const isMuted = idx > targetIdx && !isTarget;

          return (
            <div
              key={`${stage.id}-detail`}
              className={cn(
                "rounded-lg border p-3",
                isCurrent &&
                  "border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10",
                isTarget && !isCurrent && "border-primary/30 bg-primary/5",
                !isCurrent && !isTarget && "border-border bg-muted/30",
                isMuted && "opacity-70",
              )}
            >
              <p className="mb-2 text-xs font-semibold text-foreground">{stage.title}</p>
              <ul className="space-y-1.5">
                {stage.bullets?.length ? (
                  stage.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1 shrink-0 rounded-full",
                          isCurrent && "bg-amber-500",
                          isTarget && !isCurrent && "bg-primary",
                          !isCurrent && !isTarget && "bg-muted-foreground/40",
                        )}
                      />
                      {bullet}
                    </li>
                  ))
                ) : (
                  <li className="text-[11px] text-muted-foreground/70">
                    No details for this stage yet.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
