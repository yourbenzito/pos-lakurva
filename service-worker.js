// Updated cache version to force reload of transactional integrity
const CACHE_NAME = 'pos-minimarket-v2.8-transactional-integrity';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/db.js'
];

self.addEventListener('install', event => {
  // Skip waiting to activate new service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Delete old cache first
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Cache install error:', err);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  // For JS files, always fetch from network first (no cache for JS)
  if (event.request.url.includes('.js') || event.request.url.includes('?v=')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  } else {
    // For other files, try cache first
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

self.addEventListener('activate', event => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      clients.claim()
    ])
  );
});
