/* ============================================================
   scripts/comprobar-movil.mjs — Comprueba en un viewport de móvil
   (por defecto 320 CSS px, el ancho mínimo que exige WCAG 1.4.10
   Reflow) que las 5 pantallas:

   1. No generan scroll horizontal (ningún elemento se sale del
      ancho de la ventana).
   2. Todos los objetivos interactivos miden ≥24 CSS px en su
      lado menor (WCAG 2.2 · 2.5.8 Target Size Minimum, AA).

   Chrome headless + CDP, igual que comprobar-offline.mjs.

   Uso: node scripts/comprobar-movil.mjs [url] [ancho]
        (por defecto: URL pública de GitHub Pages y 320 px)
   ============================================================ */

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = process.argv[2] ?? 'https://andreu-marbor.github.io/quiz-historia/';
const ANCHO = Number(process.argv[3] ?? 320);
const ALTO = 740;
const PUERTO = 9334;
const PERFIL = path.join(os.tmpdir(), 'perfil-comprobar-movil');
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

let ws = null;

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

// Perfil limpio ANTES de lanzar Chrome (si se borra después, arranca roto).
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

/** Evalúa `expresión` y devuelve su valor (JSON). */
function script() {
  return `(() => {
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const culpables = [...document.querySelectorAll('#app *')]
      .filter((e) => visible(e) && e.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 6)
      .map((e) => {
        const clases = typeof e.className === 'string' && e.className.trim()
          ? '.' + e.className.trim().split(/\\s+/).join('.')
          : '';
        return e.tagName.toLowerCase() + clases + ' → ' + Math.round(e.getBoundingClientRect().right) + 'px';
      });
    // Objetivo = área realmente clicable: dentro de una etiqueta manda la
    // etiqueta, porque el clic en ella es el que activa el control.
    const objetivos = [...document.querySelectorAll('button, a[href], select, input, summary, label')]
      .filter(visible)
      .map((e) => {
        const r = (e.closest('label') ?? e).getBoundingClientRect();
        return Math.round(Math.min(r.width, r.height));
      });
    return JSON.stringify({
      ruta: location.hash || '#/',
      desborde: document.documentElement.scrollWidth - window.innerWidth,
      culpables,
      objetivoMin: objetivos.length ? Math.min(...objetivos) : 0,
      objetivoPequeño: objetivos.filter((v) => v < 24).length,
    });
  })()`;
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
    (await enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true }, sesion))
      .result.result.value;

  const paginas = (await json(`http://127.0.0.1:${PUERTO}/json/list`)).filter((o) => o.type === 'page');
  const sesion = await adjuntar(paginas[0].id);
  await enviar('Page.enable', {}, sesion);
  await enviar('Runtime.enable', {}, sesion);
  await enviar(
    'Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: ALTO, deviceScaleFactor: 2, mobile: true },
    sesion,
  );
  await enviar('Page.navigate', { url: APP }, sesion);
  await dormir(3500);

  const medidas = [];
  const medir = async () => JSON.parse(await evaluar(script(), sesion));

  medidas.push(await medir()); // 1 · inicio

  // 2 · cuestionario: la primera fila jugable
  await evaluar(`document.querySelector('.tema:not([disabled])')?.click()`, sesion);
  await dormir(800);
  medidas.push(await medir());

  // 3 · resultados: se responde hasta el final. `#siguiente` existe desde
  //     el principio pero viene deshabilitado hasta responder, así que solo
  //     se pulsa si está activo; si no, se elige una opción.
  for (let i = 0; i < 120; i++) {
    const ruta = await evaluar('location.hash', sesion);
    if (ruta === '#/resultados') break;
    const pulsado = await evaluar(
      `(() => { const sig = document.querySelector('#siguiente');` +
        ` const e = sig && !sig.disabled ? sig : document.querySelector('.opcion:not([disabled])');` +
        ` if (!e) return false; e.click(); return true; })()`,
      sesion,
    );
    if (!pulsado) {
      console.log(`  (se paró en ${ruta}: no quedaba nada que pulsar)`);
      break;
    }
    await dormir(250);
  }
  medidas.push(await medir());

  // 4 · progreso  y  5 · ajustes
  await evaluar(`location.hash = '#/progreso'`, sesion);
  await dormir(700);
  medidas.push(await medir());
  await evaluar(`location.hash = '#/ajustes'`, sesion);
  await dormir(700);
  medidas.push(await medir());

  console.log(`URL: ${APP}\nViewport: ${ANCHO}×${ALTO} CSS px\n`);
  let fallos = 0;
  for (const m of medidas) {
    const sinDesborde = m.desborde <= 1;
    const objetivos = m.objetivoPequeño === 0;
    if (!sinDesborde || !objetivos) fallos += 1;
    console.log(
      `${sinDesborde && objetivos ? 'OK  ' : 'FALL'} ${m.ruta.padEnd(16)} desborde ${String(m.desborde).padStart(3)}px` +
        ` · objetivo mínimo ${m.objetivoMin}px (${m.objetivoPequeño} bajo 24px)`,
    );
    for (const c of m.culpables) console.log(`        → ${c}`);
  }

  console.log(
    fallos === 0
      ? `\n✅ ${medidas.length} pantallas sin scroll horizontal y con objetivos ≥24px a ${ANCHO}px.`
      : `\n❌ ${fallos} pantalla(s) con problemas a ${ANCHO}px.`,
  );
  process.exitCode = fallos === 0 ? 0 : 1;
} finally {
  ws?.close();
  if (chrome.exitCode === null) chrome.kill();
}
