import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function NotificationListSkeleton() {
  return (
    <ul
      className="divide-y divide-border"
      role="status"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="space-y-2 px-4 py-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-1/4" />
        </li>
      ))}
    </ul>
  );
}

export default function NotificationCenterPage() {
  const { notifications, unreadCount, loading, nextCursor, markRead, loadMore, refresh } =
    useNotifications({ previewLimit: 40 });

  return (
    <div data-tour="notification-center">
      <PageShell width="narrow">
        <PageHeader
          title="Notifications"
          description={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up."
          }
        >
          {unreadCount > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void markRead(true)}>
              Mark all read
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/settings/notifications">
              <Settings className="mr-1.5 size-3.5" aria-hidden />
              Preferences
            </Link>
          </Button>
        </PageHeader>

        <div className="rounded-lg border border-border bg-card">
          {loading && notifications.length === 0 ? (
            <NotificationListSkeleton />
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const isRead = Boolean(n.readAt);
                return (
                  <li key={n.id}>
                    <Link
                      to={n.href || "#"}
                      data-read={isRead ? "true" : "false"}
                      className={cn(
                        "block px-4 py-3 hover:bg-muted/50",
                        isRead
                          ? "bg-transparent text-muted-foreground"
                          : "bg-muted/20 text-foreground",
                      )}
                      onClick={() => {
                        if (!isRead) void markRead([n.id]);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm",
                              isRead
                                ? "font-normal text-muted-foreground"
                                : "font-medium text-foreground",
                            )}
                          >
                            {n.title}
                          </p>
                          {n.body ? (
                            <p
                              className={cn(
                                "mt-1 whitespace-pre-wrap text-sm",
                                isRead ? "text-muted-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              {n.body}
                            </p>
                          ) : null}
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {[n.project?.name, formatWhen(n.createdAt)].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {!isRead ? (
                          <span
                            className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {nextCursor ? (
            <div className="border-t border-border p-3 text-center">
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadMore()}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="self-start text-xs text-muted-foreground hover:text-foreground"
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </PageShell>
    </div>
  );
}
