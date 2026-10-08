#!/usr/bin/env node
/**
 * §13.3 · Aplica (o reaplica) el widget de la racha al proyecto Android.
 *
 * `app/`, `build.gradle` y `app/build.gradle` los **genera** Bubblewrap a partir
 * de `twa-manifest.json` (regla de AGENTS.md: no se editan a mano) y un
 * `bubblewrap update` los vuelve a escribir. Este script es el único sitio
 * permitido para tocarlos: copia las fuentes de `android/widget/` y añade los
 * parches (manifiesto + plugin de Kotlin) de forma **idempotente**.
 *
 *     node scripts/aplicar-widget.mjs     (o: npm.cmd run widget)
 *
 * Si un ancla no está donde se esperaba, **falla en voz alta** en lugar de
 * seguir con el proyecto a medias: mejor un error ahora que un APK sin widget.
 *
 * Orden habitual (después de cambiar `twa-manifest.json`):
 *     bubblewrap.cmd update   →   node scripts/aplicar-widget.mjs   →   bubblewrap.cmd build
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'android', 'widget');
const destino = join(raiz, 'app', 'src', 'main');

/** Versión del plugin de Kotlin que se engancha a `build.gradle` (ver PLAN §13.3). */
const KOTLIN = '2.1.21';

const hechos = [];

function fallo(mensaje) {
  console.error(`\n❌ ${mensaje}`);
  process.exit(1);
}

function leer(ruta) {
  if (!existsSync(ruta)) fallo(`No existe ${ruta}`);
  return readFileSync(ruta, 'utf8');
}

function exigir(condicion, mensaje) {
  if (!condicion) fallo(mensaje);
}

function parchear(ruta, aplicar, que) {
  const antes = leer(ruta);
  const despues = aplicar(antes);
  if (despues === antes) {
    hechos.push(`${que}: ya estaba`);
    return;
  }
  writeFileSync(ruta, despues, 'utf8');
  hechos.push(`${que}: aplicado`);
}

function archivosDe(directorio, base = directorio) {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    return entrada.isDirectory() ? archivosDe(ruta, base) : [relative(base, ruta)];
  });
}

// ---------------------------------------------------------------------------
// 0 · Comprobaciones previas
// ---------------------------------------------------------------------------
exigir(existsSync(join(raiz, 'app')), 'No existe `app/`: primero genera el proyecto Android (bubblewrap.cmd update).');
exigir(existsSync(origen), `No existe ${origen}: ahí viven las fuentes del widget.`);

const packageId = JSON.parse(leer(join(raiz, 'twa-manifest.json'))).packageId;
const dirPaquete = packageId.split('.').join('/');
exigir(
  existsSync(join(origen, 'java', dirPaquete, 'widget')),
  `Las fuentes del widget no coinciden con el packageId (${packageId}): se esperaba android/widget/java/${dirPaquete}/widget`,
);

// ---------------------------------------------------------------------------
// 1 · Copia de fuentes (Kotlin + recursos) sobre el proyecto generado
// ---------------------------------------------------------------------------
let copiados = 0;
for (const subdirectorio of ['java', 'res']) {
  const desde = join(origen, subdirectorio);
  if (!existsSync(desde)) continue;
  for (const relativo of archivosDe(desde)) {
    const destinoRelativo = join(destino, subdirectorio, relativo);
    mkdirSync(dirname(destinoRelativo), { recursive: true });
    copyFileSync(join(desde, relativo), destinoRelativo);
    copiados += 1;
  }
}
exigir(copiados > 0, 'No se ha copiado ni un fichero: revisa android/widget/.');
hechos.push(`fuentes: ${copiados} ficheros copiados a app/src/main/ (Kotlin + recursos)`);

// ---------------------------------------------------------------------------
// 2 · AndroidManifest.xml: actividad del puente + receiver del widget
// ---------------------------------------------------------------------------
parchear(join(destino, 'AndroidManifest.xml'), (manifiesto) => {
  if (manifiesto.includes('WidgetBridgeActivity')) return manifiesto;
  const cierre = '</application>';
  const marca = manifiesto.lastIndexOf(cierre);
  exigir(marca !== -1, 'No se encontró `</application>` en AndroidManifest.xml');
  const inicioDeLinea = manifiesto.lastIndexOf('\n', marca) + 1;
  const fragmento = leer(join(origen, 'parche', 'manifiesto.xml')).trimEnd();
  return manifiesto.slice(0, inicioDeLinea) + fragmento + '\n' + manifiesto.slice(inicioDeLinea);
}, 'AndroidManifest.xml (activity + receiver)');

// ---------------------------------------------------------------------------
// 3 · build.gradle (raíz): repositorio de Maven Central + plugin de Kotlin
// ---------------------------------------------------------------------------
parchear(join(raiz, 'build.gradle'), (texto) => {
  let g = texto;
  if (!g.includes('mavenCentral()')) {
    const conMaven = g.replace(/^([ \t]*)google\(\)$/gm, (_m, esp) => `${esp}google()\n${esp}mavenCentral()`);
    exigir(conMaven !== g, 'No se encontró ningún `google()` en build.gradle');
    g = conMaven;
  }
  if (!g.includes('kotlin-gradle-plugin')) {
    const conKotlin = g.replace(
      /^([ \t]*)(classpath 'com\.android\.tools\.build:gradle:[^']+')$/m,
      (_m, esp, clase) => `${esp}${clase}\n${esp}classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN}'`,
    );
    exigir(conKotlin !== g, 'No se encontró el classpath del plugin de Android en build.gradle');
    g = conKotlin;
  }
  return g;
}, 'build.gradle (mavenCentral + Kotlin)');

// ---------------------------------------------------------------------------
// 4 · app/build.gradle: activar Kotlin y alinear su JVM con la de Java (1.8)
// ---------------------------------------------------------------------------
parchear(join(raiz, 'app', 'build.gradle'), (texto) => {
  let a = texto;
  if (!a.includes("apply plugin: 'kotlin-android'")) {
    const conPlugin = a.replace(/(plugins \{[^}]*\})/, '$1\n\napply plugin: \'kotlin-android\'');
    exigir(conPlugin !== a, 'No se encontró el bloque `plugins { … }` en app/build.gradle');
    a = conPlugin;
  }
  if (!a.includes('kotlinOptions')) {
    const conJvm = a.replace(
      /(compileOptions \{[^}]*\})/,
      '$1\n    kotlinOptions {\n        jvmTarget = \'1.8\'\n    }',
    );
    exigir(conJvm !== a, 'No se encontró el bloque `compileOptions` en app/build.gradle');
    a = conJvm;
  }
  return a;
}, 'app/build.gradle (plugin kotlin-android)');

// ---------------------------------------------------------------------------
console.log('\n✅ Widget aplicado al proyecto Android (§13.3):');
for (const hecho of hechos) console.log(`   · ${hecho}`);
console.log('\nSiguiente paso: bubblewrap.cmd build');
