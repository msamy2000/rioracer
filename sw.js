const CACHE_NAME = 'rioracer-v1.9.18';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './gfx_game_cover.png?v=1.9.16',
    './gfx_hero.jpg?v=1.9.16',
    './gfx_hero_super.png?v=1.9.16',
    './gfx_hero_start.png?v=1.9.16',
    './gfx_golden_bone.png?v=1.9.16',
    './gfx_obst_Cat.jpg?v=1.9.16',
    './gfx_obst_Dog.jpg?v=1.9.16',
    './gfx_obst_dog2.png?v=1.9.16',
    './gfx_background_seamless_v2.png?v=1.9.16',
    './gfx_icon_small.png?v=1.9.16',
    './gfx_icon.png?v=1.9.16'
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
// Message Handler for Skip Waiting
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
