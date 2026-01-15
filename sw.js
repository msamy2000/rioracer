const CACHE_NAME = 'rioracer-v1.8.6';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './graphics/game_cover.png',
    './graphics/hero.jpg',
    './graphics/hero_super.png',
    './graphics/hero_start.png',
    './graphics/golden_bone.png',
    './graphics/obst_Cat.jpg',
    './graphics/obst_Dog.jpg',
    './graphics/obst_dog2.png',
    './graphics/background_seamless_v2.png',
    './graphics/icon_small.png',
    './graphics/icon.png'
];

// Install Event: Cache files
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch Event: Serve from cache if available, network fallback
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((r) => {
            console.log('[Service Worker] Fetching resource: ' + e.request.url);
            return r || fetch(e.request).then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    console.log('[Service Worker] Caching new resource: ' + e.request.url);
                    // cache.put(e.request, response.clone()); // Optional: Cache dynamic items
                    return response;
                });
            });
        })
    );
});
