import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { TourProvider, useTour } from "@reactour/tour";
import "@reactour/tour/dist/index.css";
import { Button } from "@/components/ui/button";
import { PROJECT_STAGES } from "../constants/projectStages";
import { buildJourneyTourSteps } from "../constants/projectJourneyTourSteps";

const AUTO_START_DELAY_MS = 600;

const TourSidebarContext = createContext({
  tourActive: false,
  tourStepId: null,
  tourExpandServiceId: null,
});

/** Sidebar expand + open state derived synchronously from the active tour step. */
export function useTourSidebar() {
  return useContext(TourSidebarContext);
}

/** Popover body rendered for every step; styled with theme tokens. */
function TourContent({ currentStep, setCurrentStep, setIsOpen, steps, onSkip, onFinish }) {
  const total = steps?.length ?? 0;
  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;
  const { title, description, points } = steps?.[currentStep]?.content || {};

  const handleNext = () => {
    if (isLast) {
      onFinish?.();
      setIsOpen(false);
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, total - 1));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => {
    onSkip?.();
    setIsOpen(false);
  };

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Step {currentStep + 1} of {total}
        </span>
        {!isLast ? (
          <button
            type="button"
            onClick={handleSkip}
            className="cursor-pointer text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
        ) : null}
      </div>

      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {points?.length ? (
        <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        {!isFirst ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
            Back
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={handleNext}>
          {isLast ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Drives auto-start (first visit) and manual replays (startSignal), and resets
 * to the first step whenever the tour opens.
 */
function TourController({ shouldAutoStart, startSignal }) {
  const { setIsOpen, setCurrentStep } = useTour();
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!shouldAutoStart || autoStartedRef.current) return undefined;
    autoStartedRef.current = true;
    const timer = setTimeout(() => {
      setCurrentStep(0);
      setIsOpen(true);
    }, AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldAutoStart, setIsOpen, setCurrentStep]);

  useEffect(() => {
    if (startSignal <= 0) return;
    setCurrentStep(0);
    setIsOpen(true);
  }, [startSignal, setIsOpen, setCurrentStep]);

  return null;
}

/** Derives sidebar expand state in the same render as the active tour step. */
function TourSidebarBridge({ steps, children }) {
  const { currentStep, isOpen } = useTour();
  const value = useMemo(
    () => ({
      tourActive: isOpen,
      tourStepId: isOpen ? (steps[currentStep]?.id ?? null) : null,
      tourExpandServiceId: isOpen ? (steps[currentStep]?.serviceId ?? null) : null,
    }),
    [isOpen, currentStep, steps],
  );
  return <TourSidebarContext.Provider value={value}>{children}</TourSidebarContext.Provider>;
}

const popoverStyles = {
  popover: (base) => ({
    ...base,
    "--reactour-accent": "var(--primary)",
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "1rem",
    boxShadow: "0 10px 30px -10px rgb(0 0 0 / 0.25)",
  }),
  maskArea: (base) => ({ ...base, rx: 12 }),
  badge: (base) => ({ ...base, display: "none" }),
};

export function ProjectJourneyTour({
  children,
  shouldAutoStart = false,
  startSignal = 0,
  onSkip,
  onFinish,
}) {
  const steps = useMemo(() => buildJourneyTourSteps(PROJECT_STAGES), []);

  const ContentComponent = useCallback(
    (props) => <TourContent {...props} onSkip={onSkip} onFinish={onFinish} />,
    [onSkip, onFinish],
  );

  return (
    <TourProvider
      steps={steps}
      styles={popoverStyles}
      ContentComponent={ContentComponent}
      showBadge={false}
      showCloseButton={false}
      showNavigation={false}
      showDots={false}
      showPrevNextButtons={false}
      disableInteraction
      scrollSmooth={false}
      onClickMask={({ setIsOpen }) => {
        onSkip?.();
        setIsOpen(false);
      }}
      padding={{ mask: 6, popover: [10, 10] }}
    >
      <TourController shouldAutoStart={shouldAutoStart} startSignal={startSignal} />
      <TourSidebarBridge steps={steps}>{children}</TourSidebarBridge>
    </TourProvider>
  );
}
