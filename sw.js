// Offline-first service worker. Change the version below if you ever need to force a full reset.
const CACHE = 'lathe-gears-v2';
const FILES = ['./', './index.html', './manifest.json', './sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(FILES.map(u =>
        fetch(new Request(u, { cache: 'reload' })).then(r => {
          if (!r.ok) throw new Error('Precache failed: ' + u);
          return cache.put(new Request(u), r);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Every page open (including the home-screen start URL) is served from index.html in the cache
  const isPage = req.mode === 'navigate';
  const lookup = isPage ? new Request('./index.html') : req;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(lookup, { ignoreSearch: true }).then(hit => {
        // Refresh the cached copy in the background when online
        const refresh = fetch(isPage ? new Request('./index.html', { cache: 'reload' }) : req)
          .then(r => { if (r && r.ok) cache.put(lookup, r.clone()); return r; })
          .catch(() => null);
        if (hit) { e.waitUntil(refresh); return hit; }
        return refresh.then(r => r || new Response('Offline and not cached yet.', {
          status: 503, headers: { 'Content-Type': 'text/plain' } }));
      })
    )
  );
});
