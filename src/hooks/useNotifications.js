import { useCallback, useEffect, useState } from "react";
import {
  fetchNotifications,
  fetchNotificationUnreadCount,
  markNotificationsRead,
} from "@/api";
import { useAuth } from "@/context/AuthContext";
import { subscribeNotificationsLive } from "@/lib/notificationsLive.util";
import { logger } from "@/utils/logger";
import { runMarkNotificationsRead } from "./notificationsMarkRead.util";

const PREVIEW_LIMIT = 12;

/**
 * Shared notifications state: preview list, unread count, SSE updates.
 * Live SSE is shared across tabs/mounts (see notificationsLive.util) so we do not
 * open one long-lived connection per NotificationBell / page.
 */
export function useNotifications({ previewLimit = PREVIEW_LIMIT } = {}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: previewLimit });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setNextCursor(data?.nextCursor ?? null);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch (err) {
      logger.warn("notifications_refresh_failed", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, previewLimit]);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchNotificationUnreadCount();
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const markRead = useCallback(async (idsOrAll) => {
    // Do not rethrow: NotificationBell / center call `void markRead(...)`.
    // A rethrown Axios 401 becomes an unhandledrejection (Sentry RND-LAUNCHPAD-FE-B).
    const result = await runMarkNotificationsRead(markNotificationsRead, idsOrAll);
    if (!result.ok) {
      logger.warn("notifications_mark_read_failed", result.error);
      return undefined;
    }
    const { body, data } = result;
    setUnreadCount(Number(data?.unreadCount) || 0);
    if (body.all) {
      setNotifications((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      );
    } else {
      const idSet = new Set(body.ids.map(String));
      setNotifications((prev) =>
        prev.map((n) =>
          idSet.has(String(n.id)) && !n.readAt
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
      );
    }
    return data;
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !user?.id) return;
    try {
      const data = await fetchNotifications({ limit: previewLimit, cursor: nextCursor });
      const more = Array.isArray(data?.notifications) ? data.notifications : [];
      setNotifications((prev) => [...prev, ...more]);
      setNextCursor(data?.nextCursor ?? null);
      if (data?.unreadCount != null) setUnreadCount(Number(data.unreadCount) || 0);
    } catch (err) {
      logger.warn("notifications_load_more_failed", err);
    }
  }, [nextCursor, user?.id, previewLimit]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    void refresh();

    return subscribeNotificationsLive((evt) => {
      if (!evt || typeof evt !== "object") return;
      if (evt.type === "connected" || evt.type === "unread_count") {
        if (evt.unreadCount != null) setUnreadCount(Number(evt.unreadCount) || 0);
      }
      if (evt.type === "notification" && evt.notification) {
        setNotifications((prev) => {
          const id = evt.notification.id;
          if (prev.some((n) => n.id === id)) return prev;
          return [evt.notification, ...prev].slice(0, Math.max(previewLimit, 30));
        });
        if (evt.unreadCount != null) setUnreadCount(Number(evt.unreadCount) || 0);
      }
    });
  }, [user?.id, refresh, previewLimit]);

  return {
    notifications,
    unreadCount,
    loading,
    nextCursor,
    refresh,
    refreshCount,
    markRead,
    loadMore,
  };
}
