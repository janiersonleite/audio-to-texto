const CACHE = 'audio-texto-v4';
const ASSETS = ['./icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // Cacheia apenas os ícones — HTML/JS sempre vem da rede
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove todos os caches antigos
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ícones: cache first
  if (url.pathname.includes('/icons/')) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
    return;
  }

  // HTML e JS: network first — garante versão mais nova sempre
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
