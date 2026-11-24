import { cn } from "@/lib/utils";

export function QuestionProgressFooter({ answeredCount, totalQuestions, footerNote }) {
  return (
    <footer className="border-t bg-card/95 backdrop-blur px-4 py-3 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-muted-foreground shrink-0">Your progress</span>
          <div className="flex gap-0.5 flex-1 max-w-[200px]">
            {Array.from({ length: totalQuestions || 1 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < answeredCount ? "bg-emerald-500" : i === answeredCount ? "bg-primary/60" : "bg-muted",
                )}
              />
            ))}
          </div>
          <span className="text-muted-foreground shrink-0">
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>
        {footerNote && <span className="text-xs text-muted-foreground">{footerNote}</span>}
      </div>
    </footer>
  );
}
