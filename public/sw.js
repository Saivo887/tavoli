// Service worker di Tavoli: mostra le notifiche e apre la pagina giusta al tocco.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { testo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titolo || 'Tavoli', {
    body: d.testo || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    for (const c of lista) {
      if ('focus' in c) { if ('navigate' in c) c.navigate(url); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
