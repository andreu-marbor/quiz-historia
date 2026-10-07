/* ============================================================
   scripts/generar-iconos.mjs — Genera los PNG del PWA
   desde los SVG de public/icons (usando sharp).
   Uso: npm.cmd run iconos
   ============================================================ */

import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(raiz, 'public', 'icons');

const objetivos = [
  { origen: 'icono.svg', salida: 'icono-192.png', tam: 192 },
  { origen: 'icono.svg', salida: 'icono-512.png', tam: 512 },
  { origen: 'icono.svg', salida: 'apple-touch-icon.png', tam: 180 },
  { origen: 'icono-maskable.svg', salida: 'maskable-192.png', tam: 192 },
  { origen: 'icono-maskable.svg', salida: 'maskable-512.png', tam: 512 },
];

await mkdir(dir, { recursive: true });

for (const { origen, salida, tam } of objetivos) {
  await sharp(path.join(dir, origen))
    .resize(tam, tam)
    .png({ compressionLevel: 9 })
    .toFile(path.join(dir, salida));
  console.log(`  ✅ ${salida} (${tam}×${tam})`);
}

// Favicon: el SVG original se usa tal cual (escalable)
await copyFile(path.join(dir, 'icono.svg'), path.join(dir, 'favicon.svg'));
console.log('  ✅ favicon.svg');

console.log('🎉 Iconos generados en public/icons/');
