const CACHE_NAME = 'securevault-offline-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install Event: Pre-cache core assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Network-First Strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!(event.request.url.indexOf('http') === 0)) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If network works, update cache and return
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;

                    // Fallback to offline index.html for navigation
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
