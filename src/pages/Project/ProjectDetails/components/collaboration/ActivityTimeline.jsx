import { useMemo, useState } from "react";
import {
  Bot,
  GitBranch,
  Lock,
  MessageSquare,
  Package,
  Rocket,
  Wallet,
  UserRound,
  Activity as ActivityIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const KIND_META = {
  "release.updated": { icon: Package, label: "Release" },
  "release.locked": { icon: Lock, label: "Release locked" },
  "backlog.changed": { icon: GitBranch, label: "Backlog" },
  "comment.added": { icon: MessageSquare, label: "Comment" },
  "budget.adjusted": { icon: Wallet, label: "Budget" },
  "project.creator.transferred": { icon: UserRound, label: "Creator" },
  "deploy.started": { icon: Rocket, label: "Deploy" },
  "agent.started": { icon: Bot, label: "Agent" },
  "agent.finished": { icon: Bot, label: "Agent" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "human", label: "People" },
  { id: "agent", label: "Agents" },
];

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function actorName(ev) {
  return (
    ev.actorName ||
    ev.actorLabel ||
    ev.actorEmail ||
    (ev.actorType === "agent" ? "AI agent" : "Team member")
  );
}

/**
 * Chronological, filterable feed of human + agent activity.
 * @param {{ events: object[], loading?: boolean, hasMore?: boolean, loadingMore?: boolean, onLoadMore?: () => void }} props
 */
export function ActivityTimeline({ events, loading, hasMore, loadingMore, onLoadMore }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.actorType === filter);
  }, [events, filter]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="size-4 text-muted-foreground" aria-hidden />
          Project timeline
        </CardTitle>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading activity">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
            {filtered.map((ev) => {
              const meta = KIND_META[ev.kind] ?? { icon: ActivityIcon, label: ev.kind };
              const Icon = meta.icon;
              const isAgent = ev.actorType === "agent";
              return (
                <li key={ev.id} className="relative flex gap-3">
                  <span
                    className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${
                      isAgent ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium">{actorName(ev)}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(ev.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">{ev.summary}</p>
                    {ev.branch ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <GitBranch className="size-3" aria-hidden />
                        {ev.branch}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
