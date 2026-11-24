import { cn } from "@/lib/utils";

/** Pulsing dot shown while an agent turn is actively streaming. */
export function AgentWorkingLiveDot({ className }) {
  return (
    <span
      className={cn("relative flex size-2 shrink-0", className)}
      aria-hidden
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  );
}

/** Shimmer text line used for agent pipeline status (ClientLink + deploy live panel). */
export function AgentPipelineStatusShimmer({ text, className }) {
  const s = typeof text === "string" ? text.trim() : "";
  if (!s) return null;
  return (
    <p
      className={cn(
        "mx-auto block max-w-full text-center text-sm font-semibold leading-snug",
        "bg-size-[200%_100%] bg-clip-text text-transparent",
        "bg-[linear-gradient(110deg,var(--muted-foreground),42%,var(--foreground),58%,var(--muted-foreground))]",
        "motion-safe:animate-[client-link-text-shimmer_2.5s_linear_infinite]",
        className,
      )}
    >
      {s}
    </p>
  );
}

/**
 * Centered pipeline status row with optional live dot — shared by ClientLink chat and deploy panel.
 */
export function AgentWorkingStatusRow({
  text,
  showLiveDot = false,
  className,
}) {
  const s = typeof text === "string" ? text.trim() : "";
  if (!s) return null;
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-2.5",
        className,
      )}
      role="presentation"
    >
      {showLiveDot ? <AgentWorkingLiveDot /> : null}
      <AgentPipelineStatusShimmer
        text={s}
        className="mx-0 min-w-0 flex-1 text-center"
      />
    </div>
  );
}
