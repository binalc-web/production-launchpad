import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const VARIANT_STYLES = {
  /** Pre-router bootstrap — matches MainLayout outer shell. */
  app: "min-h-svh w-full bg-muted/40",
  /** Fills a routed workspace panel (project console, AI home, etc.). */
  workspace: "flex-1 min-h-0 w-full self-stretch bg-background",
  /** Embedded wait inside a page that already has chrome. */
  inline: "min-h-80 w-full",
};

/**
 * Centered loading state shared across bootstrap and in-app routes.
 *
 * @param {{
 *   message?: string;
 *   variant?: keyof typeof VARIANT_STYLES;
 *   className?: string;
 *   spinnerClassName?: string;
 * }} props
 */
export function LoadingScreen({
  message,
  variant = "inline",
  className,
  spinnerClassName,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.inline,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className={cn("size-8 text-primary", spinnerClassName)} />
      {message ? <p className="text-sm font-medium">{message}</p> : null}
    </div>
  );
}
