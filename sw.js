/* Mood Movies — service worker, версия кэша v7 */
const CACHE_NAME = 'mood-movies-v7';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './mobile.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './marvel.jpg',
  './background-day.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(
        CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API (TMDB, Pollinations, Wikipedia): сеть-сначала, кэш как офлайн-резерв
  const isApi = /themoviedb|tmdb|pollinations|wikipedia/i.test(url.hostname);
  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Статика своего сайта: кэш-сначала, иначе сеть и запись в кэш
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
