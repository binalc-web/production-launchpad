import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchVapidPublicKey,
  subscribePushNotifications,
  unsubscribePushNotifications,
} from "@/api";
import { logger } from "@/utils/logger";
import { isBrowserPushSupported, urlBase64ToUint8Array } from "@/utils/browserPush.util";

/**
 * Browser Web Push subscription state and enable/disable actions.
 */
export function useBrowserPush({ autoRefresh = true } = {}) {
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    const supported = isBrowserPushSupported();
    setPushSupported(supported);
    if (!supported) {
      setPushEnabled(false);
      return;
    }
    try {
      if (Notification.permission !== "granted") {
        setPushEnabled(false);
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration("/sw-notifications.js");
      const sub = await reg?.pushManager?.getSubscription();
      setPushEnabled(Boolean(sub));
    } catch {
      setPushEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    void refreshPushStatus();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshPushStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [autoRefresh, refreshPushStatus]);

  const enablePush = useCallback(async () => {
    if (!isBrowserPushSupported()) {
      toast.error("Browser push is not supported here");
      return false;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        return false;
      }
      const { publicKey } = await fetchVapidPublicKey();
      if (!publicKey) {
        throw new Error("Web Push is not configured on the server");
      }
      const reg = await navigator.serviceWorker.register("/sw-notifications.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await subscribePushNotifications(sub);
      setPushEnabled(true);
      toast.success("Browser notifications enabled");
      return true;
    } catch (err) {
      logger.error("notification_push_enable", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Could not enable browser notifications",
      );
      return false;
    } finally {
      setPushBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-notifications.js");
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await unsubscribePushNotifications(sub.endpoint);
        await sub.unsubscribe();
      }
      setPushEnabled(false);
      toast.success("Browser notifications disabled");
      return true;
    } catch (err) {
      logger.error("notification_push_disable", err);
      toast.error("Could not disable browser notifications");
      return false;
    } finally {
      setPushBusy(false);
    }
  }, []);

  return {
    pushBusy,
    pushSupported,
    pushEnabled,
    refreshPushStatus,
    enablePush,
    disablePush,
  };
}
