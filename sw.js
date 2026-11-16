const CACHE_NAME = 'rioracer-v2.0.3-3d';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css?v=2.0.3',
    './script.js?v=2.0.3',
    './manifest.json?v=2.0.3',
    './src/engine3d.js?v=2.0.1',
    './src/models3d.js?v=2.0.1',
    './src/world3d.js?v=2.0.1',
    './src/vfx3d.js?v=2.0.1',
    './src/vendor/three.module.min.js',
    './gfx_game_cover_3d.jpg?v=2.0.3',
    './favicon.png?v=2.0.3',
    './gfx_icon_small.png?v=2.0.3',
    './gfx_icon.png?v=2.0.3'
];

// Install Event: Bypass browser HTTP cache ('reload') and activate immediately
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            const requests = ASSETS_TO_CACHE.map((url) => new Request(url, { cache: 'reload' }));
            await Promise.all(
                requests.map(async (req) => {
                    try {
                        const res = await fetch(req);
                        if (res.ok) {
                            await cache.put(req, res);
                        }
                    } catch (err) {
                        console.warn('[SW] Failed to pre-cache:', req.url, err);
                    }
                })
            );
        })
    );
});

// Activate Event: Purge ALL old v1.x / v2.0.0 caches and immediately claim all open tabs
self.addEventListener('activate', (e) => {
    e.waitUntil(
        (async () => {
            const keyList = await caches.keys();
            await Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Purging old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
            // Take control of all open clients immediately (triggers controllerchange reload in v1.9.20)
            await self.clients.claim();

            // Also notify any open window clients to reload
            const windowClients = await self.clients.matchAll({ type: 'window' });
            for (const client of windowClients) {
                client.postMessage({ type: 'FORCE_RELOAD', version: CACHE_NAME });
            }
        })()
    );
});

// Fetch Event: Network-First for HTML, JS, CSS, and JSON so updates are always live immediately
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isCodeOrDoc =
        e.request.mode === 'navigate' ||
        url.pathname.endsWith('/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.json');

    if (isSameOrigin && isCodeOrDoc) {
        e.respondWith(
            fetch(new Request(e.request, { cache: 'no-cache' }))
                .then((networkRes) => {
                    if (networkRes && networkRes.ok) {
                        const resClone = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
                    }
                    return networkRes;
                })
                .catch(() => caches.match(e.request, { ignoreSearch: true }))
        );
        return;
    }

    // Cache-First with network fallback for static images/vendors
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((cachedRes) => {
            return (
                cachedRes ||
                fetch(e.request).then((networkRes) => {
                    if (isSameOrigin && networkRes && networkRes.ok) {
                        const resClone = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
                    }
                    return networkRes;
                })
            );
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
