const CACHE_NAME = 'alivia-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        });
    })
  );
});
