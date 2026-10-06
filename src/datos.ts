/**
 * Carga integrada de los datos: catálogo + preguntas empaquetadas en el bundle.
 *
 * Fuera de `logica/` porque `import.meta.glob` es una API de Vite (no de Node):
 * por eso las pruebas no importan este módulo, solo lo hace la app.
 * Al ir en el bundle, la app funciona sin internet de serie (R/06).
 */

import catalogoDeDatos from '../datos/temas.json';
import type { Catalogo, Curso, Pregunta } from './logica/tipos';

const ARCHIVOS = import.meta.glob('../datos/preguntas/**/*.json', {
  eager: true,
  import: 'default',
});

/** `../datos/preguntas/<curso>/<tema>.json` → [curso, tema] */
const RUTA_TEMA = /^\.\.\/datos\/preguntas\/([^/]+)\/([^/]+)\.json$/;

export const catalogo: Catalogo = catalogoDeDatos;

/** Clave de tema (`<curso>/<tema>`) → preguntas de ese tema. */
const indice = new Map<string, Pregunta[]>();

let total = 0;
for (const [ruta, contenido] of Object.entries(ARCHIVOS)) {
  const coincidencia = RUTA_TEMA.exec(ruta);
  if (!coincidencia) continue;
  const preguntas = Array.isArray(contenido) ? (contenido as Pregunta[]) : [];
  const clave = `${coincidencia[1]}/${coincidencia[2]}`;
  indice.set(clave, [...(indice.get(clave) ?? []), ...preguntas]);
  total += preguntas.length;
}

export const preguntasPorTema: ReadonlyMap<string, readonly Pregunta[]> = indice;

/** Nº total de preguntas del proyecto. */
export const totalPreguntas = total;

/** Cursos ordenados por su campo `orden`. */
export function cursosOrdenados(): Curso[] {
  return [...catalogo.cursos].sort((a, b) => a.orden - b.orden);
}
