const CACHE_NAME = 'rioracer-v2.0.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './src/engine3d.js',
    './src/models3d.js',
    './src/world3d.js',
    './src/vfx3d.js',
    './src/vendor/three.module.min.js',
    './v1-classic/index.html',
    './v1-classic/style.css',
    './v1-classic/script.js',
    './gfx_game_cover.png',
    './gfx_hero.jpg',
    './gfx_hero_super.png',
    './gfx_hero_start.png',
    './gfx_golden_bone.png',
    './gfx_obst_Cat.jpg',
    './gfx_obst_Dog.jpg',
    './gfx_obst_dog2.png',
    './gfx_background_seamless_v2.png',
    './gfx_icon_small.png',
    './gfx_icon.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((r) => {
            return r || fetch(e.request);
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
