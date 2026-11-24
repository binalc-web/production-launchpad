import { Brain, ChevronDown, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function ThinkingLabel({ isStreaming }) {
  if (!isStreaming) return null;
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

/**
 * Collapsed-by-default tool activity. Label is "Thinking…"; expand to see every tool.
 */
export function AiHomeThinkingTools({ tools, isStreaming = false, className }) {
  const rows = Array.isArray(tools) ? tools.filter((t) => t?.name) : [];
  if (!rows.length && !isStreaming) return null;

  const doneCount = rows.filter((t) => t.status === "done" || t.status === "failed").length;
  const summary = isStreaming
    ? null
    : rows.length === 1
      ? `Used ${rows[0].name}`
      : `Thought process · ${doneCount || rows.length} tools`;

  return (
    <Collapsible defaultOpen={false} className={cn("w-full", className)}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/35">
        {isStreaming ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary/80" aria-hidden />
        ) : (
          <Brain className="size-3.5 shrink-0 text-primary/80" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">
          {isStreaming ? <ThinkingLabel isStreaming /> : summary}
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      {rows.length ? (
        <CollapsibleContent className="mt-1.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {rows.map((t, i) => (
              <li key={`${t.name}-${i}`} className="flex items-center gap-1.5">
                {t.status === "running" ? (
                  <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
                ) : null}
                <span>
                  Used <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{t.name}</code>
                  {t.status ? ` · ${t.status}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
