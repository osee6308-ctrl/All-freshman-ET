/* ============ All Freshman ET — Service Worker ============ */
const CACHE_NAME = 'freshman-cache-v3';   // BUMP THIS on every release

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // Cloudflare Worker API → network only
  if (url.hostname.includes('workers.dev') || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).catch(() => new Response('{"ok":false}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // External (pdf.js, YouTube, CDNs) → network first
  if (url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Local → cache-first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
