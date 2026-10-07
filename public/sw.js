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

const CACHE = 'repaso-historia-v2';

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
  event.waitUntil(precachear().then(() => self.skipWaiting()));
});

/**
 * Precachea la carcasa y los assets del build.
 * Los JS/CSS llevan hash en el nombre (cambian en cada build), así que no se
 * pueden listar a mano: se extraen del index.html ya cacheado. Sin eso, la
 * primera visita online cachearía solo el HTML y sin red no arrancaría el JS
 * (detectado con la prueba offline del 2026-10-07).
 */
async function precachear() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CARCASA);

  // `ignoreVary: true` en todas las comparaciones: los servidores pueden
  // responder con `Vary: Origin/Accept-Encoding`, y la request guardada
  // (creada desde aquí, sin esas cabeceras) no casaría con la que llega
  // desde la página → el JS no se encontraría y la app no arrancaría sin red.
  const html = await (await cache.match('./index.html', { ignoreVary: true }))?.text();
  if (!html) return;

  const rutas = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((coincidencia) => coincidencia[1])
    .filter((ruta) => ruta.startsWith('/') || ruta.startsWith('./'))
    .map((ruta) => new URL(ruta, self.location.href).href);

  // Si algún asset no se puede guardar no debe romper la instalación entera
  await Promise.all(rutas.map((ruta) => cache.add(ruta).catch(() => {})));
}

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
    return (
      (await caches.match(solicitud, { ignoreVary: true })) ??
      (await caches.match('./index.html', { ignoreVary: true }))
    );
  }
}

/** Assets: caché primero, revalidando en segundo plano. */
async function recurso(solicitud) {
  const guardada = await caches.match(solicitud, { ignoreVary: true });
  const enRed = fetch(solicitud)
    .then((respuesta) => {
      if (respuesta.ok) guardar(solicitud, respuesta.clone());
      return respuesta;
    })
    // Sin red: si estaba guardado se devuelve la copia, si no, un error de red
    .catch(async () => (await caches.match(solicitud, { ignoreVary: true })) ?? Response.error());

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
