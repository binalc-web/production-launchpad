import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * Compact Chrome-like find bar (fixed top-right, below modals at z-[100]).
 * Uses a native input (shared Input does not forward refs).
 */
export function FindInPageBar({
  query,
  setQuery,
  activeMatchOrdinal,
  matches,
  onNext,
  onPrev,
  onClose,
  inputRef,
  isOpen,
}) {
  if (!isOpen) return null;

  const countLabel =
    matches === 0 ? '0/0' : `${activeMatchOrdinal}/${matches}`;

  return (
    <div
      data-find-in-page-bar=""
      role="search"
      aria-label="Find in page"
      className="fixed top-3 right-3 z-[95] flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 shadow-md"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in page"
        aria-label="Find in page"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          'border-input bg-transparent file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-8 w-44 min-w-0 rounded-md border px-3 py-1 font-sans text-sm shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        )}
        onKeyDown={(e) => {
          // Let window capture handler own Enter / Esc; avoid double-handling from bubble
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.stopPropagation();
          }
        }}
      />
      <span
        className="min-w-[3rem] text-center font-sans text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        {countLabel}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous match"
        onClick={onPrev}
        disabled={matches === 0}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next match"
        onClick={onNext}
        disabled={matches === 0}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close find"
        onClick={onClose}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
