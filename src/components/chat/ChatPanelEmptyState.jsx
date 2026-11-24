import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/** Empty chat state with optional suggested prompts. */
export function ChatPanelEmptyState({
  title,
  description,
  prompts = [],
  onSelectPrompt,
  composerDisabled = false,
  isFullscreen = false,
}) {
  return (
    <div className={cn("flex flex-col gap-5", isFullscreen ? "py-4" : "py-2")}>
      <Empty
        className={cn(
          "rounded-2xl border-border bg-muted/20",
          isFullscreen ? "px-8 py-10" : "px-4 py-6",
        )}
      >
        <EmptyHeader className="max-w-md">
          <EmptyMedia
            variant="icon"
            className={cn(
              "rounded-full bg-primary/10 text-primary",
              isFullscreen ? "size-12 [&_svg:not([class*='size-'])]:size-6" : "size-10",
            )}
          >
            <Sparkles aria-hidden />
          </EmptyMedia>
          <EmptyTitle className={isFullscreen ? "text-base" : "text-sm"}>{title}</EmptyTitle>
          <EmptyDescription className="max-w-md text-xs md:text-sm">{description}</EmptyDescription>
        </EmptyHeader>

        {prompts.length > 0 ? (
          <EmptyContent className="max-w-none gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Try one of these
            </p>
            <div
              className={cn(
                "grid w-full gap-2",
                isFullscreen && prompts.length > 1 ? "sm:grid-cols-2" : "grid-cols-1",
              )}
            >
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={composerDisabled}
                  onClick={() => onSelectPrompt(prompt)}
                  className={cn(
                    "rounded-xl border border-border bg-background text-left text-foreground transition-all hover:border-primary/30 hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
                    isFullscreen ? "px-4 py-3.5 text-sm" : "px-3 py-2.5 text-sm",
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  );
}
