/**
 * Pantalla de inicio: elegir curso (R/01) y tema, con la mejor nota de cada uno.
 */

import { cursosOrdenados, preguntasDeTema, temasOrdenados, temaJugable } from '../logica/catalogo';
import type { Curso, Tema } from '../logica/tipos';
import { T } from './cadenas';
import type { Contexto } from './contexto';
import { h, vaciar } from './dom';

export function pintarInicio(vista: HTMLElement, ctx: Contexto): void {
  vaciar(vista);

  const cursos = cursosOrdenados(ctx.catalogo);
  const encabezado = h(
    'header',
    { class: 'pantalla-cabecera' },
    h('h1', { id: 'titulo-pantalla', tabindex: '-1' }, T.inicio.titulo),
    h('p', { class: 'subtitulo' }, T.lema),
  );

  if (cursos.length === 0) {
    vista.append(encabezado, h('p', { class: 'aviso' }, T.inicio.sinContenido));
    return;
  }

  vista.append(encabezado, ...cursos.map((curso, i) => pintarCurso(ctx, curso, i === 0)));
}

function pintarCurso(ctx: Contexto, curso: Curso, abiertoPorDefecto: boolean): HTMLElement {
  const detalle = h('details', { class: 'curso', ...(abiertoPorDefecto ? { open: true } : {}) });
  const resumen = h(
    'summary',
    { class: 'curso-resumen' },
    h('span', { class: 'curso-nombre' }, curso.titulo),
    h('span', { class: 'curso-numero', 'aria-hidden': 'true' }, String(curso.temas.length)),
  );

  const temas = temasOrdenados(curso);
  if (temas.length === 0) {
    detalle.append(resumen, h('p', { class: 'aviso' }, T.inicio.sinTemas));
    return detalle;
  }

  const lista = h('ul', { class: 'lista-temas' });
  for (const tema of temas) {
    lista.append(pintarTema(ctx, curso, tema));
  }

  detalle.append(resumen, lista);
  return detalle;
}

function pintarTema(ctx: Contexto, curso: Curso, tema: Tema): HTMLElement {
  const preguntas = preguntasDeTema(ctx.preguntasPorTema, curso.id, tema.id);
  const jugable = temaJugable(preguntas, tema);
  const nota = ctx.progreso.temas[`${curso.id}/${tema.id}`]?.mejorNota;

  const boton = h(
    'button',
    {
      type: 'button',
      class: 'tema',
      'aria-label': jugable
        ? `${T.inicio.jugar} ${tema.titulo} (${curso.titulo})`
        : `${tema.titulo}: ${T.inicio.minimo(tema.minPreguntas)}`,
      disabled: jugable ? undefined : true,
      title: jugable ? undefined : T.inicio.minimo(tema.minPreguntas),
      onclick: jugable ? () => ctx.acciones.elegirTema(curso.id, tema.id) : undefined,
    },
    h('span', { class: 'tema-nombre' }, tema.titulo),
    h('span', { class: 'tema-meta' }, T.inicio.preguntas(preguntas.length)),
    nota === undefined
      ? h('span', { class: 'insignia insignia--neutro' }, T.inicio.sinNota)
      : h('span', { class: `insignia ${claseInsignia(nota)}` }, T.inicio.mejorNota(nota)),
    jugable
      ? h('span', { class: 'tema-ir', 'aria-hidden': 'true' }, '→')
      : h('span', { class: 'tema-no-disponible' }, T.inicio.minimo(tema.minPreguntas)),
  );

  return h('li', {}, boton);
}

/** Color de la insignia de nota: siempre acompañado de texto, nunca solo color. */
export function claseInsignia(nota: number): string {
  if (nota >= 90) return 'insignia--alta';
  if (nota >= 60) return 'insignia--media';
  return 'insignia--baja';
}
