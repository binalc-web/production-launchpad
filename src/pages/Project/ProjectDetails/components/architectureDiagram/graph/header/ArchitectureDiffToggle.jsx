import { Button } from "@/components/ui/button";

/** Toggle diff overlay highlighting on the graph. */
export function ArchitectureDiffToggle({ diffEnabled, onToggle }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={diffEnabled ? "default" : "outline"}
      className="h-7 px-2 text-xs uppercase"
      onClick={() => onToggle(!diffEnabled)}
    >
      Diff {diffEnabled ? "ON" : "OFF"}
    </Button>
  );
}
