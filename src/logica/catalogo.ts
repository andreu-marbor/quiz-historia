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

/** Preguntas de un tema concreto a partir del índice. */
export function preguntasDeTema(
  indice: ReadonlyMap<string, readonly Pregunta[]>,
  cursoId: string,
  temaId: string,
): readonly Pregunta[] {
  return indice.get(claveTema(cursoId, temaId)) ?? [];
}

/**
 * ¿Tiene el tema suficientes preguntas para ofrecerse? (`minPreguntas` del catálogo).
 * Un tema por debajo del mínimo no se puede jugar (R/05 y §3 del PLAN).
 */
export function temaJugable(preguntas: readonly Pregunta[], tema: Tema): boolean {
  return preguntas.length >= tema.minPreguntas;
}
