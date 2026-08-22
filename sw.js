const CACHE_VERSION = 'mudro-v8';

const PRECACHE = [
    './',
    './index.html',
    './teacher.html',
    './login.html',
    './firebase-config.js',
    './auth.js',
    './manifest.json',
    './favicon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-192.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];

const CDN_ORIGINS = ['https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://www.gstatic.com'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    if (CDN_ORIGINS.includes(url.origin)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const network = fetch(request).then((response) => {
                    if (response && (response.ok || response.type === 'opaque')) {
                        const copy = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                    }
                    return response;
                }).catch(() => cached);
                return cached || network;
            })
        );
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request))
        );
    }
});
