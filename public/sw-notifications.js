/**
 * Web Push service worker for LaunchPad notifications.
 * Registered from the notification preferences page.
 */
self.addEventListener("push", (event) => {
  let payload = { title: "LaunchPad", body: "", data: {} };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    try {
      payload.body = event.data?.text() || "";
    } catch {
      /* ignore */
    }
  }
  const title = payload.title || "LaunchPad";
  const options = {
    body: payload.body || "",
    data: payload.data || {},
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    event.notification?.data?.url ||
    event.notification?.data?.href ||
    "/notifications";
  const target = href.startsWith("http")
    ? href
    : new URL(href, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
