const CACHE = 'ant-pit-v1';
const PAGE = '/pit/?s=offline';

const save = () => caches.open(CACHE).then((c) => fetch(new Request(PAGE, { cache: 'no-cache' })).then((r) => (r.ok ? c.put(PAGE, r) : null)));

self.addEventListener('install', (e) => {
  e.waitUntil(save().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

let refreshed = false;
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith((async () => {
    try {
      const r = (await e.preloadResponse) || (await fetch(e.request));
      if (!refreshed) { refreshed = true; e.waitUntil(save().catch(() => {})); }
      return r;
    } catch {
      return (await caches.match(PAGE)) || Response.error();
    }
  })());
});
