const CACHE = 'fitness-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
const NET_TIMEOUT = 3000;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('net-timeout')), ms))]);
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isDoc) {
    e.respondWith((async () => {
      const cached = (await caches.match(req)) || (await caches.match('./index.html'));
      try {
        const r = await withTimeout(fetch(req), NET_TIMEOUT);
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put(req, cp));
        return r;
      } catch (err) {
        if (cached) return cached;
        return fetch(req);   // 连缓存都没有（首次）就只能老实等网络
      }
    })());
  } else {
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; }))
    );
  }
});
