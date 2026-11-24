import { cn } from "@/lib/utils";

const WIDTH_CLASS = {
  /** Centered content column — Automations, job forms, etc. */
  constrained: "mx-auto w-full max-w-6xl min-w-0 px-1 sm:px-0",
  /** Narrow forms — Connected accounts settings */
  narrow: "container mx-auto max-w-2xl",
  /** Edge-to-edge within the main panel — Projects, Prompt management */
  full: "w-full min-w-0",
};

/**
 * @param {{ width?: keyof typeof WIDTH_CLASS, className?: string, children: React.ReactNode }} props
 */
export function PageShell({ width = "constrained", className, children }) {
  return (
    <div
      className={cn("space-y-5 rounded-lg bg-card p-4 md:p-6", WIDTH_CLASS[width], className)}
      data-console-content
    >
      {children}
    </div>
  );
}
