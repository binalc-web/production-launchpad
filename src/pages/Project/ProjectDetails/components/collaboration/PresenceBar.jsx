import { Bot, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** @param {{ name?: string|null, email?: string|null }} p */
function initialsOf({ name, email }) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/**
 * "Who's active now" — live humans and running AI agents.
 * @param {{ presence: { humans: object[], agents: object[], counts: object } }} props
 */
export function PresenceBar({ presence }) {
  const humans = presence?.humans ?? [];
  const agents = presence?.agents ?? [];
  const total = humans.length + agents.length;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="size-4 text-muted-foreground" aria-hidden />
        <span>Active now</span>
        <Badge variant="secondary" className="tabular-nums">
          {total}
        </Badge>
      </div>

      {total === 0 ? (
        <span className="text-sm text-muted-foreground">No one else is active right now.</span>
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center gap-2">
            {humans.map((h) => (
              <Tooltip key={`h-${h.userId}`}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-7 border">
                      <AvatarFallback className="text-[10px] font-semibold">
                        {initialsOf(h)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{h.name || h.email || "Team member"}</p>
                  {h.section ? (
                    <p className="text-xs text-muted-foreground">Viewing {h.section}</p>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            ))}

            {agents.map((a) => (
              <Tooltip key={`a-${a.cursorAgentId}`}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/30 bg-primary/5 text-primary"
                  >
                    <Bot className="size-3.5" aria-hidden />
                    <span className="max-w-[140px] truncate">
                      {a.label || a.source || "AI agent"}
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{a.label || "AI agent"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.status || "running"}
                    {a.source ? ` · ${a.source}` : ""}
                    {a.releaseId != null ? ` · release #${a.releaseId}` : ""}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
