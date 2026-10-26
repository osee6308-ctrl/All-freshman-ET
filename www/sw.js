// 🚨 IMPORTANT: Change this version number every time you upload new code to Cloudflare!
// Example: v1.0 -> v1.1 -> v1.2
const CACHE_NAME = 'all-freshman-v1.126';

const ASSETS = [
  './manifest.json',
  './logo.png',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

// 1. INSTALL: Cache the assets but DO NOT force the update yet.
self.addEventListener('install', (e) => {
  // We do NOT call self.skipWaiting() here so the user can be prompted.
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

// 2. ACTIVATE: Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 3. MESSAGE: Listen for the "Update Now" click from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. FETCH: Handle offline caching safely
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // A. Handle Navigation (HTML pages)
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then((res) => {
        // Only cache successful HTML responses
        if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req)) // If offline, load from cache
    );
    return;
  }

  // B. Handle Static Assets (JS, CSS, Images)
  e.respondWith(
    caches.match(req).then((res) => {
      if (res) return res; // Return cached asset if it exists

      return fetch(req).then((r) => {
        // 🚨 CRITICAL FIX: Prevent caching HTML fallbacks for JS/CSS files (Blue screen fix)
        const contentType = r.headers.get('content-type') || '';
        const isAsset = req.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|json)$/i);

        // If it's an asset request but the server returned HTML, DON'T cache it!
        if (r && r.ok && url.origin === self.location.origin && !(isAsset && contentType.includes('text/html'))) {
          const copy = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => caches.match(req)); // If network fails, try cache again
    })
  );
});
