/* FamOs push service worker.
   Shows a notification when a push arrives and focuses/opens the app on click.
   Served from the site root as /sw.js (copied from public/ during expo export). */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'FamOs', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'FamOs';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try { client.navigate(targetUrl); } catch (e) { /* cross-origin guard */ }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
