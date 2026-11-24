import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdminPlatformActivity } from "@/api";
import { formatRelativeTime } from "../platformAnalyticsDisplay";

const PAGE_SIZE = 30;

export function ActivityTab({ rangeParams }) {
  const [kind, setKind] = useState("");
  const [debouncedKind, setDebouncedKind] = useState("");
  const [order, setOrder] = useState("desc");
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKind(kind.trim()), 300);
    return () => clearTimeout(t);
  }, [kind]);

  const baseParams = useCallback(
    () => ({
      from: rangeParams.from,
      to: rangeParams.to,
      kind: debouncedKind || undefined,
      order,
      limit: PAGE_SIZE,
    }),
    [debouncedKind, order, rangeParams.from, rangeParams.to],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAdminPlatformActivity(baseParams())
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setCursor(d.nextCursor);
      })
      .catch((err) => !cancelled && setError(err?.message || "Could not load activity."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [baseParams]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await listAdminPlatformActivity({ ...baseParams(), cursor });
      setItems((prev) => [...prev, ...d.items]);
      setCursor(d.nextCursor);
    } catch (err) {
      setError(err?.message || "Could not load more activity.");
    } finally {
      setLoadingMore(false);
    }
  }, [baseParams, cursor, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          placeholder="Filter by kind (e.g. agent, release.updated)"
          className="max-w-md"
        />
        <Select value={order} onValueChange={setOrder}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading activity">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No activity in this range.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((e) => {
            const isAgent = e.actorType === "agent";
            const actor =
              e.actorUser?.name || e.actorLabel || e.actorEmail || (isAgent ? "Agent" : "Someone");
            const Icon = isAgent ? Bot : User;
            return (
              <li key={e.id} className="flex gap-3 px-4 py-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{actor}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {e.kind}
                    </Badge>
                    {e.project ? (
                      <Link to={`/projects/details/${e.project.id}`} className="hover:underline">
                        {e.project.name}
                      </Link>
                    ) : null}
                    <span className="ml-auto">{formatRelativeTime(e.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm">{e.summary}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className="min-h-8">
        {loadingMore ? (
          <div
            className="space-y-2"
            role="status"
            aria-busy="true"
            aria-label="Loading more activity"
          >
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
