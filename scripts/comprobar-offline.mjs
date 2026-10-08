/* ============================================================
   scripts/comprobar-offline.mjs — Comprueba que la PWA funciona
   sin conexión, sin depender de Lighthouse (que ya no incluye
   las auditorías de offline/service worker).

   Cómo funciona (Chrome headless + CDP):
   1. Carga la app con red → el service worker se instala y precachea.
   2. Corta la red con `Network.emulateNetworkConditions` TANTO en la
      página como en el service worker, y desactiva la caché HTTP.
   3. Vuelve a navegar: si la app se monta, sale de CacheStorage.
   Y comprueba el aviso «sin conexión» en los dos estados: CON red
   debe estar OCULTO de verdad (atributo + regla `[hidden]` de
   base.css — INC-03) y SIN red debe verse.

   ⚠️ El flag `--offline` de Chrome NO sirve: en headless no corta
   nada y el test daría falso positivo (comprobado el 2026-10-07).

   Uso: node scripts/comprobar-offline.mjs [url]
        (por defecto, la URL pública de GitHub Pages)
   ============================================================ */

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = process.argv[2] ?? 'https://andreu-marbor.github.io/quiz-historia/';
const PUERTO = 9333;
const PERFIL = path.join(os.tmpdir(), 'perfil-comprobar-offline');
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

let ws = null;

/** Chrome/Chromium en Windows, macOS y Linux (o `CHROME_PATH`). */
function rutaChrome() {
  const candidatas = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const encontrada = candidatas.find((ruta) => existsSync(ruta));
  if (!encontrada) throw new Error('No se encontró Chrome. Define CHROME_PATH.');
  return encontrada;
}

// El perfil viejo se limpia ANTES de lanzar Chrome: si se borra después,
// Chrome ya está creando sus ficheros y arranca roto (no abre el puerto).
if (existsSync(PERFIL)) rmSync(PERFIL, { recursive: true, force: true });

const chrome = spawn(
  rutaChrome(),
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${PERFIL}`,
    `--remote-debugging-port=${PUERTO}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function json(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`${url} → ${respuesta.status}`);
  return respuesta.json();
}

try {
  let version;
  for (let intento = 0; intento < 120 && !version; intento += 1) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome terminó antes de abrir el puerto (código ${chrome.exitCode}).`);
    }
    try {
      version = await json(`http://127.0.0.1:${PUERTO}/json/version`);
    } catch {
      await dormir(250);
    }
  }
  if (!version) throw new Error('Chrome no abrió el puerto de depuración.');

  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolver) => ws.addEventListener('open', resolver));

  let id = 0;
  const pendientes = new Map();
  ws.addEventListener('message', (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id && pendientes.has(mensaje.id)) {
      pendientes.get(mensaje.id)(mensaje);
      pendientes.delete(mensaje.id);
    }
  });
  const enviar = (metodo, parametros = {}, sesion) =>
    new Promise((resolver) => {
      id += 1;
      pendientes.set(id, resolver);
      ws.send(JSON.stringify({ id, method: metodo, params: parametros, ...(sesion ? { sessionId: sesion } : {}) }));
    });
  const adjuntar = async (targetId) =>
    (await enviar('Target.attachToTarget', { targetId, flatten: true })).result.sessionId;
  const evaluar = async (expresion, sesion) =>
    (
      await enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true }, sesion)
    ).result.result.value;

  // 1) carga online → instala y precachea
  const paginas = (await json(`http://127.0.0.1:${PUERTO}/json/list`)).filter((o) => o.type === 'page');
  const sesionPagina = await adjuntar(paginas[0].id);
  await enviar('Page.enable', {}, sesionPagina);
  await enviar('Network.enable', {}, sesionPagina);
  await enviar('Runtime.enable', {}, sesionPagina);
  await enviar('Page.navigate', { url: APP }, sesionPagina);
  await dormir(6000);

  // 1.5) CON red: el aviso «sin conexión» tiene que estar oculto de verdad.
  //      El `hidden` del atributo no basta si el CSS lo pisa (INC-03).
  const avisoEnLinea = await evaluar(
    `(() => {
       const aviso = document.getElementById('aviso-conexion');
       return !!aviso && getComputedStyle(aviso).display === 'none';
     })()`,
    sesionPagina,
  );

  // 2) cortar la red en la página y en el service worker
  await enviar('Network.setCacheDisabled', { cacheDisabled: true }, sesionPagina);
  await enviar(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    sesionPagina,
  );

  const objetivoSW = (await json(`http://127.0.0.1:${PUERTO}/json/list`)).find(
    (o) => o.type === 'service_worker',
  );
  if (!objetivoSW) throw new Error('No hay ningún service worker instalado: ¿está en producción?');
  const sesionSW = await adjuntar(objetivoSW.id);
  await enviar('Network.enable', {}, sesionSW);
  await enviar(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    sesionSW,
  );

  // 3) navegar sin red
  await enviar('Page.navigate', { url: APP }, sesionPagina);
  await dormir(5000);

  const datos = JSON.parse(
    await evaluar(
      `(async () => {
        const claves = await caches.keys();
        let entradas = [];
        for (const c of claves) {
          const cache = await caches.open(c);
          entradas = entradas.concat((await cache.keys()).map((r) => new URL(r.url).pathname));
        }
        return JSON.stringify({
          swControlador: !!navigator.serviceWorker.controller,
          appMontada: !!document.querySelector('header.cabecera'),
          avisoOculto: (() => {
            const aviso = document.getElementById('aviso-conexion');
            return aviso ? getComputedStyle(aviso).display === 'none' : null;
          })(),
          primerasLineas: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 120),
          cachés: claves,
          entradasCaché: entradas,
        });
      })()`,
      sesionPagina,
    ),
  );

  console.log(`URL: ${APP}`);
  console.log(JSON.stringify(datos, null, 2));

  const avisoCorrecto = avisoEnLinea === true && datos.avisoOculto === false;
  console.log(
    `Aviso «sin conexión» → con red: ${avisoEnLinea ? 'oculto ✅' : 'VISIBLE ❌ (INC-03)'}` +
      ` · sin red: ${datos.avisoOculto === false ? 'visible ✅' : 'OCULTO ❌'}`,
  );

  const correcto = datos.swControlador && datos.appMontada && avisoCorrecto;
  console.log(
    correcto
      ? '\n✅ La app funciona sin conexión (servida por el service worker) y el aviso de conexión va bien.'
      : '\n❌ La app NO se monta sin conexión (o el aviso de conexión falla: INC-03).',
  );
  process.exitCode = correcto ? 0 : 1;
} finally {
  // `ws` puede ser null si fallamos antes de conectar: sin esto, el error del
  // `finally` tapaba al original y solo salía "Cannot read ... (reading 'close')".
  ws?.close();
  if (chrome.exitCode === null) chrome.kill();
}
