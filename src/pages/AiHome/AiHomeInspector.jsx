import { ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { buildConsolePath, buildEmbedConsolePath } from "@/lib/assistantCitations";
import { cn } from "@/lib/utils";

export function AiHomeInspector({ inspector, onClose, className }) {
  if (!inspector?.projectId) return null;
  const { projectId, section, area, label } = inspector;
  const fullPath = buildConsolePath(projectId, { section, area });
  const embedPath = buildEmbedConsolePath(projectId, { section, area });

  return (
    <aside
      className={cn(
        "flex h-full min-w-0 w-full shrink-0 flex-col border-l border-border bg-background md:w-[min(100%,42rem)]",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Workspace</p>
          {label ? <p className="truncate text-[11px] text-muted-foreground">{label}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
            <Link to={fullPath} target="_top">
              <ExternalLink className="size-3.5" aria-hidden />
              Open full
            </Link>
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close workspace"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <iframe
        title="Project workspace"
        src={embedPath}
        className="min-h-0 w-full flex-1 border-0 bg-background"
      />
    </aside>
  );
}
