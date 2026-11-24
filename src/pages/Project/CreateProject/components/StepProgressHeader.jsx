import React from "react";

export const StepProgressHeader = ({ steps, step }) => {
  const totalSteps = steps.length;
  const foundIndex = steps.findIndex((item) => item.id === step);
  const position =
    foundIndex >= 0
      ? foundIndex + 1
      : Math.min(Math.max(steps.filter((item) => item.id < step).length, 1), totalSteps);
  const progressPercent = totalSteps <= 0 ? 0 : (position / totalSteps) * 100;
  const activeStep = steps[position - 1];
  const ActiveStepIcon = activeStep?.icon;

  return (
    <div className="space-y-3 px-1 md:px-2">
      <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
        Step {position} of {totalSteps}
      </p>
      {activeStep ? (
        <div className="flex items-center gap-2 text-foreground">
          {ActiveStepIcon ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ActiveStepIcon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <p className="text-base font-semibold">{activeStep.title}</p>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
};
