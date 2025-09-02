const CACHE = 'mcb-cache-v1';
const FILES = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './offline.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('./offline.html')))
  );
});
