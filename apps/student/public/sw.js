// Dumalneg National High School - Student Portal Progressive Web App Service Worker
const CACHE_NAME = 'dnhs-student-portal-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/dumalneg-logo.png'
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
  // Always bypass caching for API routes, Supabase queries, dynamic routes, and non-GET requests
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
