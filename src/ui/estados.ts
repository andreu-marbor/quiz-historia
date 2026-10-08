/**
 * Componente de estados vacíos y degradados (§14 T7).
 *
 * Un único recuadro —icono decorativo + texto— para todos los casos:
 * sin cursos, sin temas, progreso vacío, sin almacenamiento, sin conexión
 * y nota 100 (variante positiva). El texto **nunca** se escribe aquí:
 * siempre llega desde `cadenas.ts` (regla del proyecto).
 *
 * El mínimo no alcanzado no usa este recuadro: vive DENTRO de un botón de
 * tema, donde un `p` no cabe → se resuelve ahí con el mismo icono en línea.
 */

import { h } from './dom';
import { icono, type NombreIcono } from './iconos';

interface OpcionesEstado {
  /** Variante «positiva»: lo que pasó es bueno (nota 100 sin fallos). */
  positivo?: boolean;
  /** Clase extra (p. ej. `estado-vacio--conexion` en el shell). */
  clase?: string;
}

/**
 * Recuadro de estado: `estadoVacio('libro', T.inicio.sinContenido)`.
 * El icono lleva `aria-hidden` → el mensaje accesible es SOLO el texto.
 */
export function estadoVacio(
  nombre: NombreIcono,
  texto: string,
  opciones: OpcionesEstado = {},
): HTMLElement {
  const clases = ['estado-vacio', opciones.positivo ? 'estado-vacio--positivo' : '', opciones.clase]
    .filter(Boolean)
    .join(' ');
  return h('p', { class: clases }, icono(nombre), texto);
}
