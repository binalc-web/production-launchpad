import { useCallback, useEffect, useState } from "react";
import {
  isChatQueueCancelAlreadyGoneError,
  isDispatchingChatQueueItem,
} from "../lib/chatMessageQueue.util";

/**
 * Shared hook for server-persisted AI chat message queues.
 * @param {{
 *   loadQueue?: () => Promise<{ items?: unknown[] }>,
 *   reorderQueue?: (orderedIds: Array<string|number>) => Promise<{ items?: unknown[] }>,
 *   cancelQueueItem?: (id: string|number) => Promise<{ items?: unknown[] }>,
 *   steerQueueItem?: (id: string|number) => Promise<{ items?: unknown[] }>,
 *   onItemCancelled?: () => void,
 *   onItemSteered?: () => void,
 *   onSteerFailed?: (error: unknown) => void,
 *   onCancelFailed?: (error: unknown) => void,
 *   enabled?: boolean,
 * }} options
 */
export function useChatMessageQueue({
  loadQueue,
  reorderQueue,
  cancelQueueItem,
  steerQueueItem,
  onItemCancelled,
  onItemSteered,
  onSteerFailed,
  onCancelFailed,
  enabled = true,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const reload = useCallback(
    async (opts = {}) => {
      if (!enabled || typeof loadQueue !== "function") {
        setItems([]);
        return [];
      }
      const silent = Boolean(opts?.silent);
      if (!silent) setLoading(true);
      try {
        const data = await loadQueue();
        const next = Array.isArray(data?.items) ? data.items : [];
        setItems(next);
        return next;
      } catch {
        setItems([]);
        return [];
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, loadQueue],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const applyItems = useCallback((data) => {
    const next = Array.isArray(data?.items) ? data.items : [];
    setItems(next);
    return next;
  }, []);

  const moveItem = useCallback(
    async (id, direction) => {
      if (!enabled || typeof reorderQueue !== "function" || mutating) return;
      const movable = items.filter((item) => !isDispatchingChatQueueItem(item));
      const idx = movable.findIndex((item) => String(item?.id) === String(id));
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= movable.length) return;

      const orderedIds = movable.map((item) => item.id);
      const [removed] = orderedIds.splice(idx, 1);
      orderedIds.splice(targetIdx, 0, removed);

      setMutating(true);
      try {
        const data = await reorderQueue(orderedIds);
        applyItems(data);
      } finally {
        setMutating(false);
      }
    },
    [applyItems, enabled, items, mutating, reorderQueue],
  );

  const cancelItem = useCallback(
    async (id) => {
      if (!enabled || typeof cancelQueueItem !== "function" || mutating) return;
      setMutating(true);
      try {
        const data = await cancelQueueItem(id);
        applyItems(data);
        onItemCancelled?.();
      } catch (err) {
        // Race: item already left the queue (dispatched/cancelled) — sync UI, no unhandled rejection.
        if (isChatQueueCancelAlreadyGoneError(err)) {
          await reload({ silent: true });
          onItemCancelled?.();
          return;
        }
        onCancelFailed?.(err);
      } finally {
        setMutating(false);
      }
    },
    [applyItems, cancelQueueItem, enabled, mutating, onCancelFailed, onItemCancelled, reload],
  );

  const steerItem = useCallback(
    async (id) => {
      if (!enabled || typeof steerQueueItem !== "function" || mutating) return;
      setMutating(true);
      try {
        const data = await steerQueueItem(id);
        applyItems(data);
        onItemSteered?.();
      } catch (err) {
        onSteerFailed?.(err);
      } finally {
        setMutating(false);
      }
    },
    [applyItems, enabled, mutating, onItemSteered, onSteerFailed, steerQueueItem],
  );

  return {
    items,
    queuedCount: items.length,
    loading,
    mutating,
    reload,
    moveUp: (id) => moveItem(id, "up"),
    moveDown: (id) => moveItem(id, "down"),
    cancelItem,
    steerItem,
  };
}
