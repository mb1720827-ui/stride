// Stride's service worker: shows reminders and handles their Done / Skip buttons.

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Stride", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "stride",
      data: { url: data.url || "/", item_id: data.item_id || null },
      actions: data.actions
        ? [
            { action: "done", title: "Done" },
            { action: "skip", title: "Skip" },
          ]
        : [],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, item_id } = event.notification.data || {};
  if (item_id && (event.action === "done" || event.action === "skip")) {
    event.waitUntil(
      fetch(`/api/items/${item_id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: event.action === "done" ? "done" : "skipped" }),
      }),
    );
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ("focus" in w) {
          w.navigate(url || "/");
          return w.focus();
        }
      }
      return self.clients.openWindow(url || "/");
    }),
  );
});
