export function urlBase64ToUint8Array(base64String) {
  if (typeof base64String !== "string" || !base64String.trim()) {
    throw new Error("Web Push is not configured (missing VAPID public key)");
  }
  let cleaned = base64String.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9\-_+/=]+$/.test(cleaned)) {
    throw new Error(
      "Invalid VAPID public key — set VAPID_PUBLIC_KEY from `npx web-push generate-vapid-keys`",
    );
  }
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  let rawData;
  try {
    rawData = window.atob(base64);
  } catch {
    throw new Error(
      "Invalid VAPID public key encoding — regenerate with `npx web-push generate-vapid-keys`",
    );
  }
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isBrowserPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
