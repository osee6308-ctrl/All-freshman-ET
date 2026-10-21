const CACHE_NAME = 'all-freshman-v1.117.0'; // 🚨 CHANGE THIS ONLY WHEN UPLOADING NEW CODE
const ASSETS = [
  './manifest.json',
  './logo.png',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Forces the new service worker to take over immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Handle Navigation (HTML pages)
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 2. Handle Static Assets (JS, CSS, Images)
  e.respondWith(
    caches.match(req).then((res) => {
      if (res) return res; // Return cached asset if it exists

      return fetch(req).then((r) => {
        // CRITICAL FIX: Prevent caching HTML fallbacks for JS/CSS files
        const contentType = r.headers.get('content-type') || '';
        const isAsset = req.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|json)$/i);

        if (r && r.ok && url.origin === self.location.origin && !(isAsset && contentType.includes('text/html'))) {
          const copy = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => caches.match(req));
    })
  );
});
