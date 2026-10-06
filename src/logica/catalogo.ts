/**
 * Lógica pura sobre el catálogo: búsquedas y ordenación.
 * No toca el DOM ni el almacenamiento.
 */

import type { Catalogo, Curso, Pregunta, Tema } from './tipos';

/** Cursos ordenados por su campo `orden`. */
export function cursosOrdenados(catalogo: Catalogo): Curso[] {
  return [...catalogo.cursos].sort((a, b) => a.orden - b.orden);
}

/** Temas de un curso ordenados por su campo `orden`. */
export function temasOrdenados(curso: Curso): Tema[] {
  return [...curso.temas].sort((a, b) => a.orden - b.orden);
}

export function buscarCurso(catalogo: Catalogo, cursoId: string): Curso | undefined {
  return catalogo.cursos.find((curso) => curso.id === cursoId);
}

export function buscarTema(curso: Curso, temaId: string): Tema | undefined {
  return curso.temas.find((tema) => tema.id === temaId);
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
