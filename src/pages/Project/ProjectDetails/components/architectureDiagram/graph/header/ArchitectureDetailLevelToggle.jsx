import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Files vs +Classes detail level toggle.
 */
export function ArchitectureDetailLevelToggle({
  detailLevel,
  showFunctionsInClassView,
  onSetDetailLevel,
  onToggleFunctions,
  hidden = false,
}) {
  if (hidden) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center rounded-lg bg-muted/50 p-0.5">
        <Button
          type="button"
          size="sm"
          variant={detailLevel === "file" ? "default" : "ghost"}
          className="h-7 px-2 text-xs"
          onClick={() => onSetDetailLevel("file")}
        >
          Files
        </Button>
        <Button
          type="button"
          size="sm"
          variant={detailLevel === "class" ? "default" : "ghost"}
          className="h-7 px-2 text-xs"
          onClick={() => onSetDetailLevel("class")}
        >
          +Classes
        </Button>
      </div>
      {detailLevel === "class" ? (
        <Button
          type="button"
          size="sm"
          variant={showFunctionsInClassView ? "default" : "outline"}
          className="h-7 px-2 text-[10px] uppercase"
          onClick={onToggleFunctions}
        >
          FN
        </Button>
      ) : null}
    </div>
  );
}
