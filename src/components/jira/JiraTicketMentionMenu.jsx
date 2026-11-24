import { createPortal } from "react-dom";
import { AlertCircle, Search, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { JIRA_MENTION_MIN_SEARCH_LEN } from "@/lib/jira-mention/constants.js";
import { parseJiraTicketLinkEntry } from "@/lib/jira-mention/normalizeLinks.js";

function JiraIssueTypeAvatar({ src, size = "sm" }) {
  const boxClass = size === "sm" ? "size-4" : "size-5";
  const imgClass = size === "sm" ? "size-3.5" : "size-4";
  const iconClass = size === "sm" ? "size-3.5" : "size-4";
  if (!src) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[3px] bg-neutral-100 text-neutral-400",
          boxClass,
        )}
      >
        <Ticket className={iconClass} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-white",
        boxClass,
      )}
    >
      <img src={src} alt="" className={cn("object-contain", imgClass)} />
    </span>
  );
}

function JiraMentionError({ message }) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return null;

  const isConfigMissing = /jira configuration missing/i.test(text);
  const isProjectKeyMissing = /jira project key is missing/i.test(text);

  return (
    <div className="mx-3 my-2 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-amber-950">{text}</p>
          {isConfigMissing || isProjectKeyMissing ? (
            <p className="text-xs leading-relaxed text-amber-800/90">
              Connect Jira under Connected accounts, then link a Jira site in Project settings → Git
              & Jira before using @ mentions.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MentionResultsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Searching Jira tickets">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
          <Skeleton className="size-5 shrink-0 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function MentionMenuPanel({
  menuRef,
  style,
  loading,
  error,
  tickets,
  highlightIndex,
  onHighlight,
  onSelect,
  atMaxMentions,
  searchValue,
  searchReady = false,
  onSearchChange,
  onSearchKeyDown,
  onSearchBlur,
}) {
  const hasError = Boolean(error);
  const searchDisabled = hasError;
  const trimmedSearch = typeof searchValue === "string" ? searchValue.trim() : "";

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Jira tickets"
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-200/90",
        "bg-white text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]",
      )}
      style={style}
    >
      <div className="border-b border-neutral-100 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            onBlur={onSearchBlur}
            disabled={searchDisabled}
            placeholder={
              searchDisabled ? "Jira is not configured for this project" : "Search Jira tickets…"
            }
            className={cn(
              "h-9 border-neutral-200 bg-neutral-50 pl-9 pr-9 text-sm text-foreground",
              "placeholder:text-neutral-400 focus-visible:ring-primary/30",
              loading && "opacity-80",
              searchDisabled && "cursor-not-allowed opacity-60",
            )}
          />
        </div>
      </div>

      <div className="relative max-h-80 overflow-y-auto py-1.5">
        {atMaxMentions ? (
          <p className="px-4 py-3 text-sm text-neutral-500">Maximum Jira tickets selected.</p>
        ) : error ? (
          <JiraMentionError message={error} />
        ) : loading && tickets.length === 0 ? (
          <MentionResultsSkeleton />
        ) : !loading && !searchReady ? (
          <p className="px-4 py-3 text-sm text-neutral-500">
            {trimmedSearch.length > 0
              ? `Type at least ${JIRA_MENTION_MIN_SEARCH_LEN} characters to search Jira tickets.`
              : "Search Jira tickets by key or name"}
          </p>
        ) : !loading && tickets.length === 0 ? (
          <p className="px-4 py-3 text-sm text-neutral-500">No matching Jira tickets.</p>
        ) : (
          tickets.map((ticket, index) => {
            const highlighted = index === highlightIndex;
            return (
              <button
                key={ticket.key}
                type="button"
                role="option"
                aria-selected={highlighted}
                onMouseEnter={() => onHighlight?.(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect?.(ticket)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150",
                  highlighted ? "bg-neutral-100" : "hover:bg-neutral-50",
                )}
              >
                <JiraIssueTypeAvatar src={ticket.icon} size="md" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium text-neutral-900">{ticket.key}</span>
                  <span className="text-neutral-500"> {ticket.summary}</span>
                </span>
                <span className="shrink-0 text-xs text-neutral-400">{ticket.status}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function JiraTicketMentionMenu({
  open,
  loading,
  error,
  tickets = [],
  highlightIndex = 0,
  onHighlight,
  onSelect,
  style,
  atMaxMentions = false,
  searchValue = "",
  searchReady = false,
  onSearchChange,
  menuRef,
  onSearchKeyDown,
  onSearchBlur,
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <MentionMenuPanel
      menuRef={menuRef}
      style={style}
      loading={loading}
      error={error}
      tickets={tickets}
      highlightIndex={highlightIndex}
      onHighlight={onHighlight}
      onSelect={onSelect}
      atMaxMentions={atMaxMentions}
      searchValue={searchValue}
      searchReady={searchReady}
      onSearchChange={onSearchChange}
      onSearchKeyDown={onSearchKeyDown}
      onSearchBlur={onSearchBlur}
    />,
    document.body,
  );
}

export function JiraTicketMentionChips({ tickets = [], onRemove, disabled }) {
  if (!tickets.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
      {tickets.map((ticket) => (
        <span
          key={ticket.key}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200/80",
            "bg-neutral-50 py-1 pl-1 pr-2 text-[11px] font-medium text-neutral-700",
            "dark:border-border dark:bg-muted dark:text-foreground",
          )}
        >
          <JiraIssueTypeAvatar src={ticket.icon} size="sm" />
          <span className="truncate">{ticket.key}</span>
          {!disabled ? (
            <button
              type="button"
              aria-label={`Remove ${ticket.key}`}
              onClick={() => onRemove?.(ticket.key)}
              className="rounded-full px-0.5 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-foreground"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function JiraTicketLinkBadges({ links = [], className }) {
  if (!Array.isArray(links) || links.length === 0) return null;
  const items = links.map(parseJiraTicketLinkEntry).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200/80",
            "bg-neutral-50 py-1 pl-1 pr-2 text-[11px] font-medium text-primary hover:underline",
            "dark:border-border dark:bg-muted",
          )}
        >
          <JiraIssueTypeAvatar src={item.icon} size="sm" />
          <span className="truncate">{item.key}</span>
        </a>
      ))}
    </div>
  );
}
