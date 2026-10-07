// Service worker de Chaumière : reçoit les notifications push et ouvre la bonne page au toucher.

self.addEventListener("push", (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.title || "Chaumière", {
      body: d.body,
      icon: "/apple-icon",
      badge: "/apple-icon",
      tag: d.tag, // une notification du même sujet remplace la précédente
      renotify: !!d.tag,
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => "focus" in c);
      if (open) return open.navigate(url).then((c) => (c || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
