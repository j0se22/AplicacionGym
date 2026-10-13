// Service worker: cachea la app para que funcione sin conexión.
const CACHE = 'pueblos-sevilla-v3';
const ASSETS = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'js/core.js', 'js/data.js', 'js/geo.js', 'js/info.js', 'js/photos.js', 'js/sync.js', 'manifest.json', 'icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (event) => {
  // cache: 'reload' → descarga del servidor, no de la caché del navegador (que puede tener la versión anterior).
  const fresh = ASSETS.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pueblos-sevilla-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Red primero (para recibir actualizaciones) y caché como respaldo sin conexión.
// 'no-cache' obliga a preguntar al servidor si hay versión nueva: GitHub Pages deja los archivos
// 10 minutos en la caché del navegador y, sin esto, se mezclarían archivos viejos y nuevos.
self.addEventListener('fetch', (event) => {
  // Solo los archivos de la app: las llamadas a Supabase y las fotos subidas van siempre a la red.
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
