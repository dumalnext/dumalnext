// Dumalneg National High School - Progressive Web App Service Worker
const CACHE_NAME = 'dnhs-portal-pwa-v3';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/dumalneg-logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('_next/data')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((res) => res || fetch(event.request)))
  );
});

// =========================================================================
// PUSH NOTIFICATION EVENT (PC and Mobile Phone / CP)
// Handles incoming Web Push payloads and renders native OS notifications
// =========================================================================
self.addEventListener('push', (event) => {
  let data = {
    title: 'Dumalneg National High School',
    body: 'You have a new official notification from Dumalneg NHS.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/',
    tag: 'dnhs-announcement',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (err) {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  const title = data.title || 'Dumalneg National High School';
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    tag: data.tag || 'dnhs-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'open', title: 'Open Portal' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// =========================================================================
// NOTIFICATION CLICK ROUTING (PC and Mobile Phone / CP)
// Focuses or opens the relevant URL when user clicks the notification
// =========================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
