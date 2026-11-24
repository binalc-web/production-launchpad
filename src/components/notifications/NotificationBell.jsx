import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBrowserPush } from "@/hooks/useBrowserPush";
import { useNotifications } from "@/hooks/useNotifications";

function formatRelative(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function NotificationListSkeleton() {
  return (
    <ul className="divide-y" role="status" aria-busy="true" aria-label="Loading notifications">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="space-y-1.5 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-6" />
          </div>
          <Skeleton className="h-3 w-4/5" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Console top-bar notification bell + preview popover.
 */
export function NotificationBell({ className }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markRead, refresh } = useNotifications();
  const { pushBusy, pushSupported, pushEnabled, refreshPushStatus, enablePush } = useBrowserPush();

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const onOpenChange = (next) => {
    setOpen(next);
    if (next) {
      void refresh();
      void refreshPushStatus();
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "relative size-8 shrink-0 p-0 text-sidebar-foreground",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0"
        data-tour="notification-bell-popover"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <div className="flex shrink-0 items-center gap-1">
            {unreadCount > 0 ? (
              <button
                type="button"
                className="rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => void markRead(true)}
              >
                Mark all read
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => go("/settings/notifications")}
            >
              <Settings className="size-3.5" aria-hidden />
              Settings
            </button>
          </div>
        </div>
        {pushSupported && !pushEnabled ? (
          <div className="border-b bg-primary/5 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <BellRing className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">Get alerts when LaunchPad is closed</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Enable browser notifications so you never miss an update.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 px-2.5 text-xs"
                  disabled={pushBusy}
                  onClick={() => void enablePush()}
                >
                  {pushBusy ? "Enabling…" : "Enable notifications"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="max-h-[360px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <NotificationListSkeleton />
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const isRead = Boolean(n.readAt);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      data-read={isRead ? "true" : "false"}
                      className={cn(
                        "block w-full px-3 py-2.5 text-left hover:bg-muted/60",
                        isRead
                          ? "bg-transparent text-muted-foreground"
                          : "bg-muted/30 text-foreground",
                      )}
                      onClick={() => {
                        if (!isRead) void markRead([n.id]);
                        go(n.href || "/notifications");
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            isRead
                              ? "font-normal text-muted-foreground"
                              : "font-medium text-foreground",
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                      {n.body ? (
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 text-xs",
                            isRead ? "text-muted-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          {n.body}
                        </p>
                      ) : null}
                      {n.project?.name ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">{n.project.name}</p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2">
          <button
            type="button"
            className="text-xs font-medium text-foreground hover:underline"
            onClick={() => go("/notifications")}
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
