import { cn } from "@/lib/utils";

function computeLineDiff(original, modified) {
  const a = String(original ?? "").split("\n");
  const b = String(modified ?? "").split("\n");
  const max = Math.max(a.length, b.length);
  const lines = [];
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left !== undefined) lines.push({ type: "same", text: left });
      continue;
    }
    if (left !== undefined) lines.push({ type: "removed", text: left });
    if (right !== undefined) lines.push({ type: "added", text: right });
  }
  return lines;
}

function DiffView({ original, modified, className }) {
  const lines = computeLineDiff(original, modified);
  if (!lines.length) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed bg-muted/10">
        <p className="text-sm text-muted-foreground">No differences.</p>
      </div>
    );
  }
  return (
    <pre
      className={cn(
        "h-full min-h-0 overflow-auto rounded-lg border bg-muted/20 p-3 font-mono text-sm leading-relaxed",
        className,
      )}
    >
      {lines.map((line, idx) => (
        <div
          key={`${idx}-${line.type}`}
          className={
            line.type === "added"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : line.type === "removed"
                ? "bg-rose-500/10 text-rose-800 dark:text-rose-200"
                : ""
          }
        >
          <span className="mr-2 select-none text-muted-foreground">
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
          </span>
          {line.text || " "}
        </div>
      ))}
    </pre>
  );
}

export { computeLineDiff, DiffView };
