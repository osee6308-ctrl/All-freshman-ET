const CACHE_NAME = 'freshman-cache-v1.128'; // Keep changing this number

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the new service worker to activate immediately
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key); // Delete all old caches
        }
      }));
    })
  );
  self.clients.claim();
});

// NETWORK FIRST STRATEGY
self.addEventListener('fetch', (e) => {
  // Ignore non-GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If network works, save a fresh copy to cache
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // If offline, serve from cache
        return caches.match(e.request);
      })
  );
});
