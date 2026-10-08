/**
 * Pantalla de inicio: elegir curso (R/01) y tema, con la mejor nota de cada uno.
 */

import {
  asignaturasDeCurso,
  claveConjunto,
  cursosOrdenados,
  minimoDeConjunto,
  preguntasDeConjunto,
  preguntasDeTema,
  temasDeAsignatura,
  temasDelCurso,
  temaJugable,
} from '../logica/catalogo';
import type { Asignatura, Curso, Tema } from '../logica/tipos';
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
  const temas = temasDelCurso(curso);
  // El título del curso va en un `h2` (dentro del `summary`, que admite UN
  // encabezado): así el esquema de encabezados queda h1 → h2 (curso) → h3 (asignatura).
  const resumen = h(
    'summary',
    { class: 'curso-resumen' },
    h(
      'h2',
      { class: 'curso-titulo' },
      h('span', { class: 'curso-nombre' }, curso.titulo),
      h('span', { class: 'curso-numero', 'aria-hidden': 'true' }, String(temas.length)),
    ),
  );
  detalle.append(resumen);

  if (temas.length === 0) {
    detalle.append(h('p', { class: 'aviso' }, T.inicio.sinTemas));
    return detalle;
  }

  for (const asignatura of asignaturasDeCurso(curso)) {
    detalle.append(pintarAsignatura(ctx, curso, asignatura));
  }
  return detalle;
}

/** Bloque de una asignatura: subtítulo real (encabezado) + sus temas. */
function pintarAsignatura(ctx: Contexto, curso: Curso, asignatura: Asignatura): HTMLElement {
  const bloque = h(
    'section',
    { class: 'asignatura' },
    h('h3', { class: 'asignatura-titulo' }, asignatura.titulo),
  );

  const temas = temasDeAsignatura(asignatura);
  if (temas.length === 0) return bloque; // el validador exige ≥1 tema por asignatura

  const lista = h('ul', { class: 'lista-temas' });
  // Primero, la fila «Todos los temas de {asignatura}» (§13.1)
  lista.append(pintarConjunto(ctx, curso, asignatura));
  for (const tema of temas) {
    lista.append(pintarTema(ctx, curso, asignatura, tema));
  }
  bloque.append(lista);
  return bloque;
}

/**
 * Fila «Todos los temas de {asignatura}» (§13.1): juega con el banco de TODOS
 * los temas de esa asignatura. Clave de progreso propia (`claveConjunto`), así
 * que convive con las notas de cada tema suelto.
 */
function pintarConjunto(ctx: Contexto, curso: Curso, asignatura: Asignatura): HTMLElement {
  const temas = temasDeAsignatura(asignatura);
  const preguntas = preguntasDeConjunto(ctx.preguntasPorTema, curso, asignatura.id);
  const minimo = minimoDeConjunto(temas);
  const jugable = preguntas.length >= minimo;
  const titulo = T.inicio.todosDe(asignatura.titulo);
  const nota = ctx.progreso.temas[claveConjunto(curso.id, asignatura.id)]?.mejorNota;

  const boton = h(
    'button',
    {
      type: 'button',
      class: 'tema tema--todos',
      disabled: jugable ? undefined : true,
      title: jugable ? undefined : T.inicio.minimo(minimo),
      onclick: jugable ? () => ctx.acciones.elegirConjunto(curso.id, asignatura.id) : undefined,
    },
    h('span', { class: 'visualmente-oculto' }, `(${curso.titulo} · ${asignatura.titulo}) `),
    h('span', { class: 'tema-nombre' }, titulo),
    h('span', { class: 'tema-meta' }, T.inicio.preguntas(preguntas.length)),
    nota === undefined
      ? h('span', { class: 'insignia insignia--neutro' }, T.inicio.sinNota)
      : h('span', { class: `insignia ${claseInsignia(nota)}` }, T.inicio.mejorNota(nota)),
    jugable
      ? h('span', { class: 'tema-ir', 'aria-hidden': 'true' }, '→')
      : h('span', { class: 'tema-no-disponible' }, T.inicio.minimo(minimo)),
  );

  return h('li', {}, boton);
}

function pintarTema(ctx: Contexto, curso: Curso, asignatura: Asignatura, tema: Tema): HTMLElement {
  const preguntas = preguntasDeTema(ctx.preguntasPorTema, curso.id, tema.id);
  const jugable = temaJugable(preguntas, tema);
  const nota = ctx.progreso.temas[`${curso.id}/${tema.id}`]?.mejorNota;

  const boton = h(
    'button',
    {
      type: 'button',
      class: 'tema',
      disabled: jugable ? undefined : true,
      title: jugable ? undefined : T.inicio.minimo(tema.minPreguntas),
      onclick: jugable ? () => ctx.acciones.elegirTema(curso.id, tema.id) : undefined,
    },
    // Contexto que no se ve: va AL FRENTE para que el nombre accesible del
    // botón lo incluya sin pisar el texto visible. Nunca `aria-label`, que
    // reemplazaría el texto visible (Lighthouse: label-content-name-mismatch).
    h(
      'span',
      { class: 'visualmente-oculto' },
      `(${curso.titulo} · ${asignatura.titulo})${jugable ? ` ${T.inicio.jugar}` : ''} `,
    ),
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
