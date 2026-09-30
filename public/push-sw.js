self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Un momento para ti';
  const body = typeof payload.body === 'string' ? payload.body : 'Tienes un recordatorio de Alivia.';
  const path = typeof payload.path === 'string' && payload.path.startsWith('/') ? payload.path : '/';

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-128.png',
    tag: typeof payload.tag === 'string' ? payload.tag : 'alivia-reminder',
    renotify: false,
    data: { url: `${self.location.origin}/#${path}` },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url;
  if (typeof target !== 'string') return;
  let targetUrl;
  try {
    targetUrl = new URL(target, self.location.origin);
  } catch {
    return;
  }
  if (targetUrl.origin !== self.location.origin) return;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => 'focus' in client);
    if (existing) {
      return existing.navigate(targetUrl.href).then(() => existing.focus());
    }
    return self.clients.openWindow(targetUrl.href);
  }));
});
