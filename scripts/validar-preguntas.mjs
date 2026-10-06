#!/usr/bin/env node
/**
 * Validador de `datos/` — reglas de PLAN.md §3 y AGENTS.md.
 * Sin dependencias externas: solo `node:fs` / `node:path`.
 *
 * Como CLI:      node scripts/validar-preguntas.mjs
 * Como módulo:   import { validarDatos, validarPregunta, validarCatalogo } from '...'
 *                (lo usa `pruebas/datos.ts`, que además ensaya reglas con datos falsos)
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

export const TIPOS_VALIDOS = ['opcion-multiple', 'verdadero-falso', 'fecha', 'imagen'];
export const DIFICULTADES_VALIDAS = [1, 2, 3];
export const CAMPOS_VALIDOS = [
  'id',
  'enunciado',
  'tipo',
  'opciones',
  'respuesta',
  'explicacion',
  'dificultad',
  'imagen',
  'tags',
];
const CAMPOS_OBLIGATORIOS = [
  'id',
  'enunciado',
  'tipo',
  'opciones',
  'respuesta',
  'explicacion',
  'dificultad',
];

const RE_KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_NNN = /^\d{3}$/;
const MINIMO_OPCIONES = 2;
const MAXIMO_OPCIONES = 6;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const textoNoVacio = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Valida una pregunta suelta.
 * @param {*} pregunta
 * @param {{ donde?: string, curso?: string, tema?: string, raizPublic?: string }} contexto
 * @returns {string[]} lista de errores (vacía si la pregunta es válida)
 */
export function validarPregunta(pregunta, contexto = {}) {
  const donde = contexto.donde ?? 'pregunta';
  const errores = [];
  const error = (mensaje) => errores.push(`${donde}: ${mensaje}`);

  if (!esObjeto(pregunta)) {
    error('cada pregunta debe ser un objeto JSON');
    return errores;
  }

  for (const clave of Object.keys(pregunta)) {
    if (!CAMPOS_VALIDOS.includes(clave)) {
      error(`campo desconocido "${clave}" (campos válidos: ${CAMPOS_VALIDOS.join(', ')})`);
    }
  }

  for (const clave of CAMPOS_OBLIGATORIOS) {
    if (!(clave in pregunta)) error(`falta el campo obligatorio "${clave}"`);
  }

  const texto = (clave) => {
    if (!(clave in pregunta)) return null;
    if (!textoNoVacio(pregunta[clave])) {
      error(`"${clave}" debe ser un texto no vacío`);
      return null;
    }
    return pregunta[clave];
  };

  // --- id: único en el proyecto y con la convención <curso>-<tema>-<nnn> ---
  const id = texto('id');
  if (id !== null) {
    if (contexto.curso && contexto.tema) {
      const prefijo = `${contexto.curso}-${contexto.tema}-`;
      if (!id.startsWith(prefijo)) {
        error(`"id" "${id}" no sigue la convención <curso>-<tema>-<nnn>: debe empezar por "${prefijo}"`);
      } else if (!RE_NNN.test(id.slice(prefijo.length))) {
        error(`"id" "${id}" debe terminar en 3 dígitos (p. ej. ${prefijo}001)`);
      }
    } else if (!RE_KEBAB.test(id)) {
      error(`"id" "${id}" debe ir en minúsculas y guiones (kebab-case)`);
    }
  }

  texto('enunciado');
  texto('explicacion');

  // --- tipo ---
  const tipo = pregunta.tipo;
  if ('tipo' in pregunta) {
    if (typeof tipo !== 'string') {
      error('"tipo" debe ser un texto');
    } else if (!TIPOS_VALIDOS.includes(tipo)) {
      error(`"tipo" inválido: "${tipo}". Debe ser uno de: ${TIPOS_VALIDOS.join(' | ')}`);
    }
  }

  // --- opciones ---
  if ('opciones' in pregunta) {
    const opciones = pregunta.opciones;
    if (!Array.isArray(opciones)) {
      error('"opciones" debe ser una lista de textos');
    } else {
      if (opciones.length < MINIMO_OPCIONES || opciones.length > MAXIMO_OPCIONES) {
        error(
          `"opciones" debe tener entre ${MINIMO_OPCIONES} y ${MAXIMO_OPCIONES} elementos (tiene ${opciones.length})`,
        );
      }
      const normalizadas = [];
      opciones.forEach((opcion, i) => {
        if (!textoNoVacio(opcion)) {
          error(`la opción ${i + 1} debe ser un texto no vacío`);
          return;
        }
        normalizadas.push(opcion.trim().toLowerCase());
      });
      if (new Set(normalizadas).size !== normalizadas.length) {
        error('hay opciones repetidas: la respuesta sería ambigua');
      }
      if (tipo === 'verdadero-falso') {
        const correctas =
          normalizadas.length === 2 &&
          normalizadas[0] === 'verdadero' &&
          normalizadas[1] === 'falso';
        if (!correctas) {
          error('en "verdadero-falso" las opciones deben ser exactamente ["Verdadero", "Falso"]');
        }
      }
    }
  }

  // --- respuesta: índice dentro de opciones ---
  if ('respuesta' in pregunta) {
    const respuesta = pregunta.respuesta;
    if (!Number.isInteger(respuesta)) {
      error(`"respuesta" debe ser un número entero (índice de la opción correcta), se recibió: ${JSON.stringify(respuesta)}`);
    } else if (Array.isArray(pregunta.opciones) && pregunta.opciones.length > 0) {
      if (respuesta < 0 || respuesta >= pregunta.opciones.length) {
        error(`"respuesta" (${respuesta}) está fuera del rango de opciones válido (0..${pregunta.opciones.length - 1})`);
      }
    }
  }

  // --- dificultad ---
  if ('dificultad' in pregunta && !DIFICULTADES_VALIDAS.includes(pregunta.dificultad)) {
    error(`"dificultad" debe ser 1, 2 o 3 (se recibió: ${JSON.stringify(pregunta.dificultad)})`);
  }

  // --- imagen ---
  if (tipo === 'imagen' && !('imagen' in pregunta)) {
    error('las preguntas de tipo "imagen" deben incluir el campo "imagen"');
  }
  if ('imagen' in pregunta) {
    const ruta = pregunta.imagen;
    if (!textoNoVacio(ruta)) {
      error('"imagen" debe ser una ruta no vacía relativa a public/');
    } else if (contexto.raizPublic && !existsSync(join(contexto.raizPublic, ruta))) {
      error(`no existe el fichero "public/${ruta}"`);
    }
  }

  // --- tags ---
  if ('tags' in pregunta) {
    const tags = pregunta.tags;
    if (!Array.isArray(tags)) {
      error('"tags" debe ser una lista de textos');
    } else {
      const normalizadas = [];
      tags.forEach((tag, i) => {
        if (!textoNoVacio(tag)) {
          error(`la etiqueta ${i + 1} debe ser un texto no vacío`);
          return;
        }
        normalizadas.push(tag.trim());
      });
      if (new Set(normalizadas).size !== normalizadas.length) {
        error('hay etiquetas repetidas');
      }
    }
  }

  return errores;
}

/**
 * Valida la estructura de `datos/temas.json` (catálogo).
 * @returns {string[]} lista de errores
 */
export function validarCatalogo(datos, donde = 'temas.json') {
  const errores = [];
  const error = (mensaje) => errores.push(`${donde}: ${mensaje}`);

  if (!esObjeto(datos)) {
    error('debe ser un objeto JSON con la clave "cursos"');
    return errores;
  }
  if (!Array.isArray(datos.cursos) || datos.cursos.length === 0) {
    error('la clave "cursos" debe ser una lista no vacía');
    return errores;
  }

  const idsCurso = new Set();
  datos.cursos.forEach((curso, i) => {
    const en = `${donde} → cursos[${i}]`;
    if (!esObjeto(curso)) {
      errores.push(`${en}: debe ser un objeto`);
      return;
    }

    if (!textoNoVacio(curso.id)) {
      errores.push(`${en}: falta el "id" (texto no vacío)`);
    } else {
      if (!RE_KEBAB.test(curso.id)) {
        errores.push(`${en}: el "id" "${curso.id}" debe ir en minúsculas y guiones (kebab-case)`);
      }
      if (idsCurso.has(curso.id)) errores.push(`${en}: el curso "${curso.id}" está duplicado`);
      idsCurso.add(curso.id);
    }

    if (!textoNoVacio(curso.titulo)) errores.push(`${en}: falta el "titulo" (texto no vacío)`);
    if (!Number.isInteger(curso.orden)) errores.push(`${en}: "orden" debe ser un número entero`);

    if (!Array.isArray(curso.temas) || curso.temas.length === 0) {
      errores.push(`${en}: "temas" debe ser una lista no vacía`);
      return;
    }

    const idsTema = new Set();
    curso.temas.forEach((tema, j) => {
      const enTema = `${en} → temas[${j}]`;
      if (!esObjeto(tema)) {
        errores.push(`${enTema}: debe ser un objeto`);
        return;
      }
      if (!textoNoVacio(tema.id)) {
        errores.push(`${enTema}: falta el "id" (texto no vacío)`);
      } else {
        if (!RE_KEBAB.test(tema.id)) {
          errores.push(`${enTema}: el "id" "${tema.id}" debe ir en minúsculas y guiones (kebab-case)`);
        }
        if (idsTema.has(tema.id)) errores.push(`${enTema}: el tema "${tema.id}" está duplicado en el curso`);
        idsTema.add(tema.id);
      }
      if (!textoNoVacio(tema.titulo)) errores.push(`${enTema}: falta el "titulo" (texto no vacío)`);
      if (!Number.isInteger(tema.orden)) errores.push(`${enTema}: "orden" debe ser un número entero`);
      if (!Number.isInteger(tema.minPreguntas) || tema.minPreguntas < 1) {
        errores.push(`${enTema}: "minPreguntas" debe ser un entero ≥ 1`);
      }
    });
  });

  return errores;
}

/**
 * Valida todo el contenido: catálogo + ficheros de preguntas.
 * @param {string} raizDatos ruta absoluta de `datos/`
 * @param {{ raizPublic?: string }} [opciones] para comprobar la existencia de imágenes
 * @returns {string[]} lista de errores (vacía = todo correcto)
 */
export function validarDatos(raizDatos, opciones = {}) {
  const raizPublic = opciones.raizPublic;
  const rutaCatalogo = join(raizDatos, 'temas.json');

  if (!existsSync(rutaCatalogo)) return [`no existe el fichero ${rutaCatalogo}`];

  let catalogo;
  try {
    catalogo = JSON.parse(readFileSync(rutaCatalogo, 'utf8'));
  } catch (e) {
    return [`temas.json no es JSON válido: ${e.message}`];
  }

  const errores = validarCatalogo(catalogo);

  const cursos = Array.isArray(catalogo?.cursos) ? catalogo.cursos : [];
  const idsCurso = new Set(cursos.map((c) => c?.id).filter((id) => typeof id === 'string'));
  const temasPorCurso = new Map();
  for (const curso of cursos) {
    if (!esObjeto(curso) || typeof curso.id !== 'string') continue;
    const ids = new Set();
    for (const tema of Array.isArray(curso.temas) ? curso.temas : []) {
      if (esObjeto(tema) && typeof tema.id === 'string') ids.add(tema.id);
    }
    temasPorCurso.set(curso.id, ids);
  }

  const raizPreguntas = join(raizDatos, 'preguntas');
  if (!existsSync(raizPreguntas)) {
    errores.push('no existe el directorio datos/preguntas/');
    return errores;
  }

  /** id → fichero donde ya se ha usado */
  const idsVistos = new Map();
  /** `${curso}/${tema}` → ruta del fichero */
  const ficherosPorTema = new Map();
  /** `${curso}/${tema}` → nº de preguntas */
  const conteoPorTema = new Map();

  const entradas = readdirSync(raizPreguntas, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  for (const entrada of entradas) {
    const relCurso = `datos/preguntas/${entrada.name}`;

    if (!entrada.isDirectory()) {
      errores.push(`${relCurso}: las preguntas deben ir en <curso>/<tema>.json (aquí hay un fichero suelto)`);
      continue;
    }

    const curso = entrada.name;
    if (!idsCurso.has(curso)) {
      errores.push(
        `${relCurso}/: "${curso}" no es un curso del catálogo (cursos válidos: ${[...idsCurso].join(', ') || 'ninguno'})`,
      );
    }
    const temasDelCurso = temasPorCurso.get(curso) ?? new Set();
    const rutaCurso = join(raizPreguntas, curso);

    const ficheros = readdirSync(rutaCurso, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    for (const fichero of ficheros) {
      const rel = `${relCurso}/${fichero.name}`;

      if (!fichero.isFile()) {
        errores.push(`${rel}: aquí solo se esperan ficheros`);
        continue;
      }
      if (!fichero.name.endsWith('.json')) {
        errores.push(`${rel}: solo se admiten ficheros .json`);
        continue;
      }

      const tema = basename(fichero.name, '.json');
      if (!temasDelCurso.has(tema)) {
        errores.push(
          `${rel}: "${tema}" no es un tema del curso ${curso} (temas del catálogo: ${[...temasDelCurso].join(', ') || 'ninguno'})`,
        );
      }

      let contenido;
      try {
        contenido = JSON.parse(readFileSync(join(rutaCurso, fichero.name), 'utf8'));
      } catch (e) {
        errores.push(`${rel}: no es JSON válido (${e.message})`);
        continue;
      }

      if (!Array.isArray(contenido)) {
        errores.push(`${rel}: debe contener una lista JSON de preguntas`);
        continue;
      }
      if (contenido.length === 0) {
        errores.push(`${rel}: el tema no tiene ninguna pregunta`);
      }

      contenido.forEach((pregunta, indice) => {
        const donde = `${rel} [${indice + 1}]`;
        errores.push(...validarPregunta(pregunta, { donde, curso, tema, raizPublic }));
        if (esObjeto(pregunta) && textoNoVacio(pregunta.id)) {
          const previa = idsVistos.get(pregunta.id);
          if (previa) {
            errores.push(`${donde}: el id "${pregunta.id}" ya se usa en ${previa}`);
          } else {
            idsVistos.set(pregunta.id, donde);
          }
        }
      });

      ficherosPorTema.set(`${curso}/${tema}`, rel);
      conteoPorTema.set(`${curso}/${tema}`, contenido.length);
    }
  }

  // Todo tema del catálogo debe tener fichero y alcanzar minPreguntas
  for (const curso of cursos) {
    if (!esObjeto(curso) || typeof curso.id !== 'string' || !Array.isArray(curso.temas)) continue;
    for (const tema of curso.temas) {
      if (!esObjeto(tema) || typeof tema.id !== 'string') continue;
      const clave = `${curso.id}/${tema.id}`;
      const rel = `datos/preguntas/${curso.id}/${tema.id}.json`;
      const min = Number.isInteger(tema.minPreguntas) ? tema.minPreguntas : 1;
      if (!ficherosPorTema.has(clave)) {
        errores.push(`falta el fichero ${rel}: el catálogo declara ese tema`);
      } else {
        const total = conteoPorTema.get(clave);
        if (total < min) {
          errores.push(`${rel}: tiene ${total} preguntas y el catálogo exige minPreguntas=${min}`);
        }
      }
    }
  }

  return errores;
}

/** Cuenta preguntas del repositorio (para el resumen de la CLI). */
export function contarPreguntas(raizDatos) {
  const raizPreguntas = join(raizDatos, 'preguntas');
  if (!existsSync(raizPreguntas)) return 0;

  let total = 0;
  for (const curso of readdirSync(raizPreguntas, { withFileTypes: true })) {
    if (!curso.isDirectory()) continue;
    const rutaCurso = join(raizPreguntas, curso.name);
    for (const fichero of readdirSync(rutaCurso, { withFileTypes: true })) {
      if (!fichero.isFile() || !fichero.name.endsWith('.json')) continue;
      try {
        const contenido = JSON.parse(readFileSync(join(rutaCurso, fichero.name), 'utf8'));
        if (Array.isArray(contenido)) total += contenido.length;
      } catch {
        // los errores de JSON ya los informa validarDatos
      }
    }
  }
  return total;
}

/** Resumen del catálogo: nº de cursos, temas y preguntas. */
export function resumenDatos(raizDatos) {
  let catalogo = null;
  try {
    catalogo = JSON.parse(readFileSync(join(raizDatos, 'temas.json'), 'utf8'));
  } catch {
    catalogo = null;
  }
  const cursos = Array.isArray(catalogo?.cursos) ? catalogo.cursos : [];
  let temas = 0;
  for (const curso of cursos) {
    if (Array.isArray(curso?.temas)) temas += curso.temas.length;
  }
  return { cursos: cursos.length, temas, preguntas: contarPreguntas(raizDatos) };
}

function main() {
  const raiz = process.cwd();
  const raizDatos = join(raiz, 'datos');
  const errores = validarDatos(raizDatos, { raizPublic: join(raiz, 'public') });

  if (errores.length > 0) {
    console.error(`\n❌ ${errores.length} error(es) en datos/:\n`);
    for (const e of errores) console.error(`  · ${e}`);
    console.error('');
    process.exit(1);
  }

  const { cursos, temas, preguntas } = resumenDatos(raizDatos);
  console.log(`✅ datos/ válido: ${cursos} curso(s), ${temas} tema(s), ${preguntas} pregunta(s)`);
}

// Solo se ejecuta al lanzarlo como CLI; al empaquetarse en las pruebas no debe arrancar.
const lanzador = (process.argv[1] ?? '').replace(/\\/g, '/');
if (lanzador.endsWith('scripts/validar-preguntas.mjs')) main();
