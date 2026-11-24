import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import jiraMarkSvg from "@/assets/apps/Jira.svg";

export function JiraProjectBadge({ projectKey, className }) {
  const key = typeof projectKey === "string" ? projectKey.trim() : "";
  if (!key) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 pl-1.5 font-mono text-[10px] uppercase tracking-wide",
        className,
      )}
    >
      <img src={jiraMarkSvg} alt="" className="size-3.5 shrink-0 object-contain" aria-hidden />
      {key}
    </Badge>
  );
}
