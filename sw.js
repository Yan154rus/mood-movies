// Mood Movies — Service Worker v8
// Предзагрузка ядра; постеры кэшируются по мере показа (runtime cache)

const CACHE_NAME = 'mood-movies-v10';
const CORE = [
  'index.html',
  'style.css',
  'mobile.css',
  'app.js',
  'data.js',
  'posters.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'marvel.jpg',
  'background-day.jpg'
];

// ставим ядро: отсутствующие файлы не роняют установку
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(CORE.map(function(f) {
        return cache.add(new Request(f, { cache: 'reload' })).catch(function() {});
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

// активация: удаляем ВСЕ старые версии кэша
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

// стратегия: ядро — cache-first с фоновым обновлением,
// картинки (posters/, wikimedia) — cache-first + докачка при промахе
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  const isImage = url.pathname.includes('/posters/') ||
    /upload\.wikimedia\.org|thumb\.wikimedia\.org/.test(url.hostname);

  if (isImage) {
    event.respondWith(
      caches.match(event.request).then(function(hit) {
        if (hit) return hit;
        return fetch(event.request).then(function(resp) {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(event.request, copy); });
          }
          return resp;
        }).catch(function() { return hit; });
      })
    );
    return;
  }

  // прочие запросы своего origin: из кэша, обновляем в фоне
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(function(hit) {
        const network = fetch(event.request).then(function(resp) {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(event.request, copy); });
          }
          return resp;
        }).catch(function() { return hit; });
        return hit || network;
      })
    );
  }
});
