const CACHE = 'asistencia-v2';
const STATIC = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/favicon.svg',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))),
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API calls: network only
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Navigations: network first, fallback to offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    );
    return;
  }

  // Static assets: cache first
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
