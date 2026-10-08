/**
 * Comprobación de contraste WCAG 2.1 AA (§14 T8).
 *
 * Lee la paleta de `src/estilos/base.css` —no la duplica— y comprueba los
 * pares de colores que la app usa de verdad, en claro y en oscuro. Si alguien
 * cambia un color y rompe AA, la CI se entera.
 *
 *   npm.cmd run comprobar:contraste   (también va dentro de `npm.cmd run prueba`)
 *
 * Salida: una línea por par y código de salida 1 si algo baja del mínimo.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(raiz, 'src/estilos/base.css'), 'utf8');

/** Devuelve el interior del primer bloque que arranque por `inicio` (llaves balanceadas). */
function bloque(texto, inicio) {
  const m = inicio.exec(texto);
  if (!m) throw new Error(`no se encontró «${inicio.source}» en base.css`);
  const abre = texto.indexOf('{', m.index);
  let nivel = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') nivel++;
    else if (texto[i] === '}') {
      nivel--;
      if (nivel === 0) return texto.slice(abre + 1, i);
    }
  }
  throw new Error('llaves desbalanceadas en base.css');
}

/** `--nombre: valor;` de un bloque. */
function variables(texto) {
  const salida = {};
  for (const m of texto.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) salida[m[1]] = m[2].trim();
  return salida;
}

const claro = variables(bloque(css, /:root\s*{/));
const bloqueOscuro = bloque(css, /@media\s*\(prefers-color-scheme:\s*dark\)/);
const oscuro = variables(bloque(bloqueOscuro, /:root:not\(\[data-tema='claro'\]\)\s*{/));
const oscuroManual = variables(bloque(css, /:root\[data-tema='oscuro'\]\s*{/));

const fallos = [];

// 1) Los dos bloques oscuros deben ser idénticos: si no, el tema elegido a mano
//    y el del sistema divergen (drift difícil de ver a simple vista).
const clavesOscuro = Object.keys(oscuro).sort();
const clavesManual = Object.keys(oscuroManual).sort();
if (clavesOscuro.join() !== clavesManual.join()) {
  fallos.push(`los bloques oscuros no definen las mismas variables: ${clavesOscuro} vs ${clavesManual}`);
}
for (const clave of clavesOscuro) {
  if (oscuro[clave] !== oscuroManual[clave]) {
    fallos.push(`«${clave}» difiere entre tema oscuro del sistema (${oscuro[clave]}) y elegido (${oscuroManual[clave]})`);
  }
}

// 2) Pares reales de la app → [primer plano, fondo, uso, mínimo].
//    4.5 = texto normal; 3 = texto grande, iconos, anillos de foco y
//    contornos de componentes (1.4.11, p. ej. el borde de un select).
const pares = [
  ['--texto', '--bg', 'cuerpo sobre página', 4.5],
  ['--texto', '--bg-secundario', 'cuerpo sobre tarjeta', 4.5],
  ['--texto-tenue', '--bg', 'ayudas y metadatos sobre página', 4.5],
  ['--texto-tenue', '--bg-secundario', 'ayudas sobre tarjeta', 4.5],
  ['--accent', '--bg', 'h1, enlaces, nota y legend sobre página', 4.5],
  ['--accent', '--bg-secundario', 'títulos y nota sobre tarjeta', 4.5],
  ['--accent-texto', '--accent', 'nav activa y botón primario', 4.5],
  ['--ok', '--bg', 'aciertos y estado positivo', 4.5],
  ['--ok', '--bg-secundario', '«Ajuste guardado» en la cabecera', 4.5],
  ['--ok', '--ok-fondo', 'insignia de nota alta', 4.5],
  ['--error', '--bg', 'zona de peligro y respuesta ✗', 4.5],
  ['--error', '--bg-secundario', 'botón de peligro sobre tarjeta', 4.5],
  ['--error', '--error-fondo', 'hover del botón de peligro', 4.5],
  ['--aviso', '--bg', 'aviso de conexión (icono y borde)', 3],
  ['--aviso', '--bg-secundario', 'icono de aviso sobre tarjeta', 3],
  ['--borde-control', '--bg', 'borde de botones, filas y select (1.4.11)', 3],
  ['--borde-control', '--bg-secundario', 'borde de controles sobre tarjeta (1.4.11)', 3],
  ['--accent', '--bg-secundario', 'anillo de foco 3px (1.4.11)', 3],
];

const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
}

let comprobaciones = 0;
for (const [nombre, tema] of [
  ['CLARO', claro],
  ['OSCURO', oscuro],
]) {
  console.log(`\n${nombre}`);
  for (const [fg, bg, uso, minimo] of pares) {
    const a = tema[fg];
    const b = tema[bg];
    if (!a || !b) {
      fallos.push(`${nombre}: falta la variable ${!a ? fg : bg}`);
      continue;
    }
    const r = ratio(a, b);
    const cumple = r >= minimo;
    comprobaciones++;
    if (!cumple) fallos.push(`${nombre}: ${fg} sobre ${bg} = ${r.toFixed(2)} (mínimo ${minimo}) — ${uso}`);
    console.log(`  ${cumple ? 'OK  ' : 'FALL'} ${r.toFixed(2).padStart(5)} / ${minimo}  ${fg} sobre ${bg} — ${uso}`);
  }
}

if (fallos.length > 0) {
  console.error(`\n❌ ${fallos.length} problema(s) de contraste:`);
  for (const f of fallos) console.error(`   → ${f}`);
  process.exit(1);
}
console.log(`\n🎉 Contraste AA en claro y oscuro (${comprobaciones} pares)`);
