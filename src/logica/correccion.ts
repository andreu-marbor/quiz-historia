/**
 * Corrección de un cuestionario: puntuación, aciertos y lista de falladas (R/02, R/03).
 * Lógica pura: no toca el DOM (se testea sin navegador).
 */

import type { Pregunta } from './tipos';

export interface Correccion {
  /** Índice elegido por la persona (dentro de `pregunta.opciones`) */
  elegida: number;
  /** Índice de la opción correcta */
  correcta: number;
  acertada: boolean;
}

export interface DetalleCorreccion {
  pregunta: Pregunta;
  /** `null` = sin responder */
  elegida: number | null;
  correcta: number;
  acertada: boolean;
}

export interface Resultado {
  total: number;
  aciertos: number;
  errores: number;
  /** 0–100, redondeada */
  nota: number;
  acertadas: Pregunta[];
  falladas: Pregunta[];
  detalles: DetalleCorreccion[];
}

/** Corrige una única respuesta. Lanza si el índice no es un entero dentro de `opciones`. */
export function corregir(pregunta: Pregunta, elegida: number): Correccion {
  if (!Number.isInteger(elegida)) {
    throw new Error(`La respuesta debe ser un índice entero, se recibió: ${String(elegida)}`);
  }
  if (elegida < 0 || elegida >= pregunta.opciones.length) {
    throw new Error(
      `El índice ${elegida} está fuera del rango de opciones de la pregunta ${pregunta.id} (0..${pregunta.opciones.length - 1})`,
    );
  }
  return { elegida, correcta: pregunta.respuesta, acertada: elegida === pregunta.respuesta };
}

/**
 * Corrige un cuestionario completo.
 * `elegidas[i]` es el índice elegido para `preguntas[i]`, o `null` si no se respondió.
 */
export function resumir(
  preguntas: readonly Pregunta[],
  elegidas: readonly (number | null)[],
): Resultado {
  if (preguntas.length !== elegidas.length) {
    throw new Error(
      `Hay ${preguntas.length} preguntas pero ${elegidas.length} respuestas: no se puede corregir`,
    );
  }

  const detalles: DetalleCorreccion[] = preguntas.map((pregunta, i) => {
    const elegida = elegidas[i];
    if (elegida === null) {
      return { pregunta, elegida: null, correcta: pregunta.respuesta, acertada: false };
    }
    return { pregunta, ...corregir(pregunta, elegida) };
  });

  const acertadas = detalles.filter((d) => d.acertada).map((d) => d.pregunta);
  const falladas = detalles.filter((d) => !d.acertada).map((d) => d.pregunta);
  const total = preguntas.length;

  return {
    total,
    aciertos: acertadas.length,
    errores: falladas.length,
    nota: total === 0 ? 0 : Math.round((acertadas.length / total) * 100),
    acertadas,
    falladas,
    detalles,
  };
}
