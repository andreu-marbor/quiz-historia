/**
 * Selección de preguntas para un cuestionario.
 * Reglas: sin repetir, respetando los filtros y equilibrando la dificultad.
 * Lógica pura: no toca el DOM.
 */

import { barajar, type Aleatorio } from './barajado';
import type { Dificultad, Pregunta } from './tipos';

export interface OpcionesSeleccion {
  /** Nº de preguntas del cuestionario (si hay menos candidatas, se usan todas) */
  cantidad: number;
  /** Si se indica, solo preguntas de esa dificultad */
  dificultad?: Dificultad;
  /** Si se indica, solo preguntas que tengan alguna de esas etiquetas */
  tags?: readonly string[];
  /** Ids a descartar (p. ej. las ya falladas al repetir) */
  excluirIds?: readonly string[];
}

/**
 * Elige las preguntas de un cuestionario.
 * - Nunca repite: parte de ids únicos.
 * - Filtra por dificultad, tags y `excluirIds`.
 * - Si no se pide una dificultad concreta y hay más candidatas que las necesarias,
 *   reparte 1·2·3 para que el cuestionario no salga todo del mismo nivel.
 */
export function seleccionarPreguntas(
  disponibles: readonly Pregunta[],
  opciones: OpcionesSeleccion,
  aleatorio: Aleatorio = Math.random,
): Pregunta[] {
  if (!Number.isInteger(opciones.cantidad) || opciones.cantidad < 0) {
    throw new Error(`La cantidad de preguntas debe ser un entero ≥ 0, se recibió: ${String(opciones.cantidad)}`);
  }

  const excluidos = new Set(opciones.excluirIds ?? []);
  const tags = opciones.tags;

  let candidatas = disponibles.filter((p) => {
    if (excluidos.has(p.id)) return false;
    if (opciones.dificultad !== undefined && p.dificultad !== opciones.dificultad) return false;
    if (tags && tags.length > 0 && !p.tags?.some((t) => tags.includes(t))) return false;
    return true;
  });

  // Sin repetir: por si acaso entraran ids duplicados, nos quedamos con el primero.
  const vistos = new Set<string>();
  candidatas = candidatas.filter((p) => {
    if (vistos.has(p.id)) return false;
    vistos.add(p.id);
    return true;
  });

  if (candidatas.length <= opciones.cantidad) {
    return barajar(candidatas, aleatorio);
  }

  if (opciones.dificultad !== undefined) {
    return barajar(candidatas, aleatorio).slice(0, opciones.cantidad);
  }

  return combinarPorDificultad(candidatas, opciones.cantidad, aleatorio);
}

/** Reparte por dificultad en rondas (1,2,3,1,2,3…) hasta cubrir la cantidad. */
function combinarPorDificultad(
  candidatas: readonly Pregunta[],
  cantidad: number,
  aleatorio: Aleatorio,
): Pregunta[] {
  const niveles: Dificultad[] = [1, 2, 3];
  const grupos = niveles
    .map((nivel) => barajar(candidatas.filter((p) => p.dificultad === nivel), aleatorio))
    .filter((grupo) => grupo.length > 0);

  const seleccion: Pregunta[] = [];
  let vuelta = 0;
  while (seleccion.length < cantidad) {
    let anyadido = false;
    for (const grupo of grupos) {
      if (seleccion.length >= cantidad) break;
      if (grupo[vuelta]) {
        seleccion.push(grupo[vuelta]);
        anyadido = true;
      }
    }
    if (!anyadido) break; // se agotaron las candidatas
    vuelta++;
  }
  return seleccion;
}
