const CACHE_NAME = 'cajafacil-v2026.3';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/config.js',
    './js/app.js',
    './js/db.js',
    './js/auth.js',
    './js/utils/api-client.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@400;500;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
];

// Instalación: Guardar archivos básicos en cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando archivos base para CajaFácil...');
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

// Estrategia de carga: Stale-While-Revalidate (Ultra rápido)
self.addEventListener('fetch', (event) => {
    // No interceptar peticiones de la API (siempre deben ir a la red)
    if (event.request.url.includes('/api/')) return;

    // Solo interceptar peticiones GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Actualizar el cache en segundo plano si la respuesta es válida
                if (networkResponse.status === 200) {
                    const resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Si la red falla y no hay cache, podemos devolver una página offline o simplemente fallar
            });

            // Retornar cache instantáneamente si existe, si no, esperar a la red
            return cachedResponse || fetchPromise;
        })
    );
});
