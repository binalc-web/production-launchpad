import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function diffLineClass(line) {
  if (line.startsWith("+"))
    return "text-emerald-600/80 dark:text-emerald-400/80";
  if (line.startsWith("-")) return "text-destructive/80";
  return "text-muted-foreground";
}

/** Collapsible diff preview for edit/write tool cards (collapsed by default). */
export function AgentToolCallDiff({ diff, diffAdded, diffRemoved, className }) {
  const text = typeof diff === "string" ? diff.trim() : "";
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const lines = text.split("\n");
  const added =
    typeof diffAdded === "number" && diffAdded >= 0 ? diffAdded : null;
  const removed =
    typeof diffRemoved === "number" && diffRemoved >= 0 ? diffRemoved : null;
  const summaryParts = [];
  if (added !== null && added > 0) summaryParts.push(`+${added}`);
  if (removed !== null && removed > 0) summaryParts.push(`-${removed}`);
  const summary =
    summaryParts.length > 0 ? summaryParts.join(" ") : "View changes";
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("ml-5", className)}
    >
      <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
        <span>{summary}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 text-[10px] leading-snug whitespace-pre-wrap break-all">
          {lines.map((line, index) => (
            <span key={index} className={diffLineClass(line)}>
              {line}
              {index < lines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
