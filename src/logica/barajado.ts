/**
 * Barajado (Fisher-Yates) y presentación de preguntas con las opciones en orden aleatorio.
 * Lógica pura: no toca el DOM.
 */

import type { Pregunta } from './tipos';

/** Generador de aleatoriedad inyectable: en pruebas se pasa uno determinista. */
export type Aleatorio = () => number;

/** Devuelve una copia barajada; no modifica el array original. */
export function barajar<T>(elementos: readonly T[], aleatorio: Aleatorio = Math.random): T[] {
  const copia = [...elementos];
  for (let i = copia.length - 1; i > 0; i--) {
    const bruto = aleatorio();
    const r = Number.isFinite(bruto) ? Math.min(Math.max(bruto, 0), 0.999999999) : 0;
    const j = Math.floor(r * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Pregunta tal y como se muestra en pantalla: opciones en el orden mostrado. */
export interface PreguntaPresentada {
  pregunta: Pregunta;
  /** Opciones ya reordenadas si procede */
  opciones: string[];
  /** Índice de la correcta DENTRO de `opciones` (no el de `pregunta.respuesta`) */
  respuesta: number;
}

export interface OpcionesPresentacion {
  /** Desactiva el barajado (ajuste del usuario, fase 2). Por defecto, activado. */
  barajar?: boolean;
  aleatorio?: Aleatorio;
}

/**
 * Prepara una pregunta para mostrarse.
 * Las de tipo `verdadero-falso` nunca se barajan: "Verdadero" va primero por convención.
 */
export function presentarPregunta(
  pregunta: Pregunta,
  opciones: OpcionesPresentacion = {},
): PreguntaPresentada {
  const { barajar: barajarOpciones = true, aleatorio = Math.random } = opciones;

  if (!barajarOpciones || pregunta.tipo === 'verdadero-falso') {
    return { pregunta, opciones: [...pregunta.opciones], respuesta: pregunta.respuesta };
  }

  const pares = pregunta.opciones.map((texto, indice) => ({
    texto,
    esCorrecta: indice === pregunta.respuesta,
  }));
  const paresBarajados = barajar(pares, aleatorio);

  return {
    pregunta,
    opciones: paresBarajados.map((p) => p.texto),
    respuesta: paresBarajados.findIndex((p) => p.esCorrecta),
  };
}
