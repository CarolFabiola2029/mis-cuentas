// Guarda todos los archivos para que la app funcione sin internet.
// publicar.bat cambia VERSION en cada publicacion: asi el telefono detecta la novedad.
const VERSION = 'v20261102-152856';
const CACHE = `mis-cuentas-${VERSION}`;

const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estilos.css',
  'js/ajustes.js',
  'js/app.js',
  'js/bienvenida.js',
  'js/calculos.js',
  'js/datos.js',
  'js/dinero.js',
  'js/editar.js',
  'js/evolucion.js',
  'js/fechas.js',
  'js/graficos.js',
  'js/registro.js',
  'js/respaldo.js',
  'js/resumen.js',
  'js/ui.js',
  'vendor/idb.js',
  'vendor/xlsx.mini.min.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
];

self.addEventListener('install', (evento) => {
  // cache: 'reload' evita copiar versiones viejas guardadas por el navegador.
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(
      ARCHIVOS.map((url) => new Request(url, { cache: 'reload' })),
    )),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres
        .filter((n) => n.startsWith('mis-cuentas-') && n !== CACHE)
        .map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'activar') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardada = await cache.match(request, { ignoreSearch: true });
    if (guardada) return guardada;
    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === 'navigate') return cache.match('index.html');
      throw error;
    }
  })());
});
