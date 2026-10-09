/**
 * Pantalla de progreso (R/04): racha, cuestionarios jugados y mejor nota por tema.
 */

import {
  asignaturasDeCurso,
  claveConjunto,
  claveTema,
  cursosOrdenados,
  temasDeAsignatura,
} from '../logica/catalogo';
import { T } from './cadenas';
import type { Contexto } from './contexto';
import { h, vaciar } from './dom';
import { estadoVacio } from './estados';
import { icono, type NombreIcono } from './iconos';
import { insigniaNota } from './inicio';

export function pintarProgreso(vista: HTMLElement, ctx: Contexto): void {
  vaciar(vista);

  const progreso = ctx.progreso;
  const temasJugados = Object.keys(progreso.temas).length;

  const cabecera = h(
    'header',
    { class: 'pantalla-cabecera' },
    h('h1', { id: 'titulo-pantalla', tabindex: '-1' }, T.progreso.titulo),
  );

  const tarjetas = h(
    'div',
    { class: 'tarjetas' },
    tarjeta(
      T.progreso.racha,
      progreso.racha > 0 ? String(progreso.racha) : '0',
      progreso.racha > 0 ? T.progreso.rachaDias(progreso.racha) : T.progreso.sinRacha,
      'rayo',
    ),
    tarjeta(
      T.progreso.cuestionarios,
      String(progreso.cuestionarios),
      T.progreso.temasJugados(temasJugados),
      'lista',
    ),
  );

  const filas: Fila[] = [];
  for (const curso of cursosOrdenados(ctx.catalogo)) {
    for (const asignatura of asignaturasDeCurso(curso)) {
      // Fila «Repaso global de {asignatura}»: clave virtual propia (§13.1)
      const conjunto = progreso.temas[claveConjunto(curso.id, asignatura.id)];
      if (conjunto) {
        filas.push({
          curso: curso.titulo,
          asignatura: asignatura.titulo,
          tema: T.inicio.repasoGlobal(asignatura.titulo),
          mejor: conjunto.mejorNota,
          jugados: conjunto.jugados,
        });
      }
      for (const tema of temasDeAsignatura(asignatura)) {
        const dato = progreso.temas[claveTema(curso.id, tema.id)];
        if (!dato) continue;
        filas.push({
          curso: curso.titulo,
          asignatura: asignatura.titulo,
          tema: tema.titulo,
          mejor: dato.mejorNota,
          jugados: dato.jugados,
        });
      }
    }
  }

  const contenido =
    filas.length === 0
      ? estadoVacio('jugar', T.progreso.vacio)
      : tabla(filas);

  const bloque = h(
    'section',
    { class: 'bloque' },
    h('h2', {}, T.progreso.mejorPorTema),
    contenido,
  );

  vista.append(cabecera, tarjetas, bloque);
}

interface Fila {
  curso: string;
  asignatura: string;
  tema: string;
  mejor: number;
  jugados: number;
}

function tarjeta(titulo: string, valor: string, pie: string, nombre: NombreIcono): HTMLElement {
  // El icono acompaña a la cifra; es decorativo (sin texto, sin `aria-label`)
  // porque el título y el pie de la tarjeta ya lo explican.
  return h(
    'section',
    { class: 'tarjeta' },
    h('h2', { class: 'tarjeta-titulo' }, titulo),
    h('p', { class: 'tarjeta-valor' }, icono(nombre), valor),
    h('p', { class: 'tarjeta-pie' }, pie),
  );
}

function tabla(filas: Fila[]): HTMLElement {
  // En pantallas pequeñas la tabla se apila con `display: block`, lo que hace
  // que los navegadores descarten la semántica implícita de tabla → se declara
  // con `role` ARIA (y las celdas llevan `data-encabezado` para que el rótulo
  // que antes daba la cabecera lo lleve cada celda en móvil, T5).
  return h(
    // región enfocable para poder desplazarla con teclado en pantallas pequeñas
    'div',
    { class: 'tabla-contenedor', tabindex: 0, role: 'region', 'aria-label': T.progreso.mejorPorTema },
    h(
      'table',
      { class: 'tabla', role: 'table' },
      h('caption', {}, T.progreso.tabla.pie),
      h(
        'thead',
        { role: 'rowgroup' },
        h(
          'tr',
          { role: 'row' },
          h('th', { scope: 'col', role: 'columnheader' }, T.progreso.tabla.curso),
          h('th', { scope: 'col', role: 'columnheader' }, T.progreso.tabla.asignatura),
          h('th', { scope: 'col', role: 'columnheader' }, T.progreso.tabla.tema),
          h('th', { scope: 'col', role: 'columnheader' }, T.progreso.tabla.mejor),
          h('th', { scope: 'col', role: 'columnheader' }, T.progreso.tabla.jugados),
        ),
      ),
      h(
        'tbody',
        { role: 'rowgroup' },
        ...filas.map((fila) =>
          h(
            'tr',
            { role: 'row' },
            h(
              'td',
              { class: 'celda-texto', role: 'cell', 'data-encabezado': T.progreso.tabla.curso },
              fila.curso,
            ),
            h(
              'td',
              { class: 'celda-texto', role: 'cell', 'data-encabezado': T.progreso.tabla.asignatura },
              fila.asignatura,
            ),
            h('th', { scope: 'row', role: 'rowheader' }, fila.tema),
            h(
              'td',
              { class: 'celda-nota', role: 'cell', 'data-encabezado': T.progreso.tabla.mejor },
              insigniaNota(fila.mejor, String(fila.mejor)),
            ),
            h(
              'td',
              { class: 'celda-numero', role: 'cell', 'data-encabezado': T.progreso.tabla.jugados },
              String(fila.jugados),
            ),
          ),
        ),
      ),
    ),
  );
}
