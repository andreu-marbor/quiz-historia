/**
 * Lógica pura sobre el catálogo: búsquedas y ordenación.
 * No toca el DOM ni el almacenamiento.
 */

import type { Asignatura, Catalogo, Curso, Pregunta, Tema } from './tipos';

/** Cursos ordenados por su campo `orden`. */
export function cursosOrdenados(catalogo: Catalogo): Curso[] {
  return [...catalogo.cursos].sort((a, b) => a.orden - b.orden);
}

/** Asignaturas de un curso ordenadas por su campo `orden`. */
export function asignaturasDeCurso(curso: Curso): Asignatura[] {
  return [...(curso.asignaturas ?? [])].sort((a, b) => a.orden - b.orden);
}

/** Temas de una asignatura ordenados por su campo `orden`. */
export function temasDeAsignatura(asignatura: Asignatura): Tema[] {
  return [...(asignatura.temas ?? [])].sort((a, b) => a.orden - b.orden);
}

/**
 * Todos los temas de un curso, aplanados y en orden (asignaturas → temas).
 * Sirve para buscar por `temaId` (es único DENTRO del curso, §13.2).
 */
export function temasDelCurso(curso: Curso): Tema[] {
  return asignaturasDeCurso(curso).flatMap(temasDeAsignatura);
}

export function buscarCurso(catalogo: Catalogo, cursoId: string): Curso | undefined {
  return catalogo.cursos.find((curso) => curso.id === cursoId);
}

export function buscarTema(curso: Curso, temaId: string): Tema | undefined {
  return temasDelCurso(curso).find((tema) => tema.id === temaId);
}

/** Clave de un tema en el índice de preguntas: `<curso>/<tema>`. */
export function claveTema(cursoId: string, temaId: string): string {
  return `${cursoId}/${temaId}`;
}

/** Asignatura concreta de un curso (o `undefined`). */
export function asignaturaDeCurso(curso: Curso, asignaturaId: string): Asignatura | undefined {
  return (curso.asignaturas ?? []).find((asignatura) => asignatura.id === asignaturaId);
}

/** Preguntas de un tema concreto a partir del índice. */
export function preguntasDeTema(
  indice: ReadonlyMap<string, readonly Pregunta[]>,
  cursoId: string,
  temaId: string,
): readonly Pregunta[] {
  return indice.get(claveTema(cursoId, temaId)) ?? [];
}

/**
 * Clave de progreso de la fila «Todos los temas de {asignatura}» (§13.1):
 * `<curso>/__todos__/<asignatura>`. `__todos__` no es un id válido de curso ni
 * de tema (el validador exige kebab-case), así que **nunca choca** con una clave
 * real de tema, y las claves existentes `<curso>/<tema>` no cambian: el
 * progreso guardado se conserva igualmente.
 */
export function claveConjunto(cursoId: string, asignaturaId: string): string {
  return `${cursoId}/__todos__/${asignaturaId}`;
}

/**
 * Preguntas de TODOS los temas de una asignatura y curso, en orden y **sin ids
 * repetidos** (un banco compartido: `seleccionarPreguntas` muestrea de aquí).
 */
export function preguntasDeConjunto(
  indice: ReadonlyMap<string, readonly Pregunta[]>,
  curso: Curso,
  asignaturaId: string,
): readonly Pregunta[] {
  const asignatura = asignaturaDeCurso(curso, asignaturaId);
  if (!asignatura) return [];

  const vistas = new Set<string>();
  const salida: Pregunta[] = [];
  for (const tema of temasDeAsignatura(asignatura)) {
    for (const pregunta of preguntasDeTema(indice, curso.id, tema.id)) {
      if (vistas.has(pregunta.id)) continue;
      vistas.add(pregunta.id);
      salida.push(pregunta);
    }
  }
  return salida;
}

/**
 * Umbral de jugabilidad de un conjunto: el **mayor** `minPreguntas` de sus
 * temas (si un tema exige 10, el conjunto ofrece ≥10 preguntas).
 */
export function minimoDeConjunto(temas: readonly Tema[]): number {
  return temas.reduce((maximo, tema) => Math.max(maximo, tema.minPreguntas), 0);
}

/**
 * ¿Tiene el tema suficientes preguntas para ofrecerse? (`minPreguntas` del catálogo).
 * Un tema por debajo del mínimo no se puede jugar (R/05 y §3 del PLAN).
 */
export function temaJugable(preguntas: readonly Pregunta[], tema: Tema): boolean {
  return preguntas.length >= tema.minPreguntas;
}
