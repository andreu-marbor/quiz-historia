/* ============================================================
   sw.js — Service worker de "Repaso de Historia" (PWA)
   Estrategia: CACHÉ primero con revalidación en segundo plano
   (stale-while-revalidate), y red primero solo para las
   navegaciones (HTML):

   - Navegaciones (cargar la app): red → caché. Así cada build
     nuevo se ve en cuanto hay conexión, y sin internet se sirve
     el HTML guardado (uso en el aula).
   - Resto de GET del mismo origen (JS/CSS con hash, iconos,
     manifest, JSON): caché primero → responde al instante y
     actualiza la copia en segundo plano.
   - Sin red y sin copia: se responde con el index.html guardado.
   ============================================================ */

const CACHE = 'repaso-historia-v1';

// Carcasa precargada en la instalación (todo lo necesario para abrir la app)
const CARCASA = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icono-192.png',
  './icons/icono-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CARCASA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const solicitud = event.request;
  if (solicitud.method !== 'GET') return;

  // Solo el mismo origen: las peticiones externas (si alguna vez las hay) van directas a la red
  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) return;

  if (solicitud.mode === 'navigate') {
    event.respondWith(navegar(solicitud));
  } else {
    event.respondWith(recurso(solicitud));
  }
});

/** HTML: red primero, con la caché como respaldo offline. */
async function navegar(solicitud) {
  try {
    const respuesta = await fetch(solicitud);
    if (respuesta.ok) guardar(solicitud, respuesta.clone());
    return respuesta;
  } catch {
    return (await caches.match(solicitud)) ?? (await caches.match('./index.html'));
  }
}

/** Assets: caché primero, revalidando en segundo plano. */
async function recurso(solicitud) {
  const guardada = await caches.match(solicitud);
  const enRed = fetch(solicitud)
    .then((respuesta) => {
      if (respuesta.ok) guardar(solicitud, respuesta.clone());
      return respuesta;
    })
    // Sin red: si estaba guardado se devuelve la copia, si no, un 504 de red
    .catch(async () => (await caches.match(solicitud)) ?? Response.error());

  if (guardada) {
    // Revalidar sin esperar (la respuesta de red se usa solo para refrescar la caché)
    enRed.catch(() => {});
    return guardada;
  }
  return enRed;
}

function guardar(solicitud, respuesta) {
  return caches.open(CACHE).then((cache) => cache.put(solicitud, respuesta));
}
