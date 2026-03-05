const CACHE_NAME = 'pos-lakurva-v1.1.0';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/config.js',
    './js/db.js',
    './js/auth.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalación: Guardar archivos básicos en cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando archivos base...');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activación: Limpiar caches viejos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    console.log('[SW] Nueva versión activada:', CACHE_NAME);
    return self.clients.claim();
});

// Estrategia de carga: Network First with Cache Fallback for common assets
self.addEventListener('fetch', (event) => {
    // No interceptar peticiones de la API (siempre deben ir a la red)
    if (event.request.url.includes('/api/')) return;

    // Solo interceptar peticiones GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, guardarla en cache
                if (response.status === 200) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, intentar buscar en el cache
                return caches.match(event.request);
            })
    );
});
