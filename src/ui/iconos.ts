/**
 * Iconos SVG inline propios (§14.2 idea 2 · tarea T1).
 *
 * Sin dependencias ni fuentes externas: la app sigue funcionando sin internet.
 *
 * Reglas de accesibilidad:
 * - Son **decorativos**: siempre `aria-hidden="true"` y `focusable="false"`.
 *   El NOMBRE ACCESIBLE lo manda el texto visible (Lighthouse
 *   `label-content-name-mismatch`), igual que ya hacía `inicio.ts` con su texto
 *   oculto → **nunca** poner el significado solo dentro del icono.
 * - `currentColor`: heredan el color del texto que acompañan (modo oscuro incluido).
 * - No se usa `h()` (que crea elementos HTML): un SVG necesita el espacio de
 *   nombres `http://www.w3.org/2000/svg`.
 */

const ESPACIO_SVG = 'http://www.w3.org/2000/svg';

/** Catálogo: 24×24, trazos de 2, extremos redondeados. */
const TRAZOS = {
  /** ▶ nav «Jugar» */
  jugar: ['M8 5.5v13l11-6.5z'],
  /** barras: nav «Progreso» */
  progreso: ['M4 20h16', 'M7 20v-6', 'M12 20V6', 'M17 20v-9'],
  /** deslizadores: nav «Ajustes» */
  ajustes: [
    'M4 7h16',
    'M4 17h16',
    'M7 5a2 2 0 1 0 0 4 2 2 0 1 0 0-4',
    'M15 15a2 2 0 1 0 0 4 2 2 0 1 0 0-4',
  ],
  /** → enlace de fila de tema */
  flecha: ['M5 12h14', 'M13 6l6 6-6 6'],
  /** ✓ respuesta correcta */
  check: ['M4 12.5l5 5L20 6.5'],
  /** ✗ respuesta incorrecta */
  cruz: ['M6 6l12 12', 'M18 6L6 18'],
  /** ⚠ estados vacíos y avisos */
  aviso: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17h.01'],
  /** ⚡ tarjeta de racha (T5) */
  rayo: ['M13 3L5 14h6l-1 7 8-11h-6z'],
  /** lista: tarjeta de cuestionarios jugados (T5) */
  lista: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
} as const;

export type NombreIcono = keyof typeof TRAZOS;

/** Todos los nombres del catálogo (para pruebas: ninguno se queda sin probar). */
export const ICONOS = Object.keys(TRAZOS) as NombreIcono[];

/**
 * Crea el icono: `boton.append(icono('flecha'))`.
 * `clase` añade clases extra (p. ej. `icono--grande`), sin perder `icono`.
 */
export function icono(nombre: NombreIcono, clase = ''): SVGSVGElement {
  const svg = document.createElementNS(ESPACIO_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', clase ? `icono ${clase}` : 'icono');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  for (const d of TRAZOS[nombre]) {
    const trazo = document.createElementNS(ESPACIO_SVG, 'path');
    trazo.setAttribute('d', d);
    svg.append(trazo);
  }
  return svg;
}
