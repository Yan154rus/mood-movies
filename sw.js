const CACHE_NAME = 'mood-movies-v4';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './icon-192.png',
  './icon-512.png',
  './helper.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // API — сеть сначала: данные всегда свежие, кэш только офлайн-запас
  const isApi = url.includes('themoviedb') || url.includes('pollinations') || url.includes('wikipedia');

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return isApi ? fetchPromise : (cached || fetchPromise);
    })
  );
});
