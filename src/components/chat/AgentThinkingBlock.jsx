import { Brain } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function ThinkingLabel({ isStreaming }) {
  if (!isStreaming) return "Thought process";

  return (
    <span
      className={cn(
        "inline-block bg-size-[200%_100%] bg-clip-text text-transparent",
        "bg-[linear-gradient(110deg,var(--muted-foreground),42%,var(--foreground),58%,var(--muted-foreground))]",
        "motion-safe:animate-[client-link-text-shimmer_2.5s_linear_infinite]",
      )}
    >
      Thinking…
    </span>
  );
}

/** Collapsible thinking block — collapsed by default while the agent runs. */
export function AgentThinkingBlock({ text, isStreaming = false, className }) {
  const content = typeof text === "string" ? text.trim() : "";
  if (!content) return null;

  return (
    <Collapsible defaultOpen={false} className={cn("w-full", className)}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/35">
        <Brain className="size-3.5 shrink-0 text-primary/80" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {isStreaming ? (
            <ThinkingLabel isStreaming />
          ) : (
            content.split("\n").find((line) => line.trim()) || "Thought process"
          )}
        </span>
        {isStreaming ? (
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary/70" />
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
        <p className="whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-muted-foreground">
          {content}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
