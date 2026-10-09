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
import { estadoVacio } from './estados';
import { icono, type NombreIcono } from './iconos';

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
    vista.append(encabezado, estadoVacio('libro', T.inicio.sinContenido));
    return;
  }

  // La tarjeta de continuidad va ENTRE el título y los cursos: compacta, no
  // desplaza el selector más de lo que ocupa ella misma (y solo aparece si
  // hay historial de verdad, ver `pintarContinuar`).
  const continuar = pintarContinuar(ctx);
  vista.append(encabezado, ...(continuar ? [continuar] : []), ...cursos.map((curso, i) => pintarCurso(ctx, curso, i === 0)));
}

/**
 * Tarjeta «Continuar repasando»: atajo al último cuestionario terminado.
 *
 * **Fuente de datos:** `ctx.temaResultado`, el MISMO dato que ya usa la
 * pantalla de resultados (selección + curso + tema). **No hay persistencia
 * nueva**: `Progreso` guarda notas, contadores y racha, pero no el último
 * tema jugado, así que la tarjeta solo existe mientras dura la sesión —
 * preferible a inventar un «último cuestionario» que los datos no respaldan.
 *
 * **Acción:** `repetir(false)`, exactamente el botón «Repetir todas» de
 * resultados → reutiliza la navegación y la lógica de `iniciar` tal cual.
 */
function pintarContinuar(ctx: Contexto): HTMLElement | null {
  const ultimo = ctx.temaResultado;
  if (!ultimo) return null;

  const contexto = T.comunes.contexto(ultimo.cursoTitulo, ultimo.temaTitulo);
  return h(
    'section',
    { class: 'continuar', 'aria-labelledby': 'continuar-titulo' },
    h('h2', { class: 'tarjeta-titulo', id: 'continuar-titulo' }, T.inicio.continuar),
    h(
      'div',
      { class: 'continuar-fila' },
      h('p', { class: 'contexto' }, contexto),
      // Texto visible corto + contexto oculto al frente: el nombre accesible
      // lo dice TODO (y sigue conteniendo lo visible, sin `aria-label`).
      h(
        'button',
        { type: 'button', class: 'boton boton--primario', onclick: () => ctx.acciones.repetir(false) },
        h('span', { class: 'visualmente-oculto' }, `(${contexto}) `),
        T.inicio.continuarBoton,
      ),
    ),
  );
}

function pintarCurso(ctx: Contexto, curso: Curso, abiertoPorDefecto: boolean): HTMLElement {
  const detalle = h('details', { class: 'curso', ...(abiertoPorDefecto ? { open: true } : {}) });
  const temas = temasDelCurso(curso);
  // El título del curso va en un `h2` (dentro del `summary`, que admite UN
  // encabezado): así el esquema de encabezados queda h1 → h2 (curso) → h3 (asignatura).
  const resumen = h(
    'summary',
    { class: 'curso-resumen' },
    // El h2 se queda SOLO con el título del curso: el encabezado no se rellena
    // con el contador, que va como chip hermano, visible y accesible (sin
    // aria-hidden) → el nombre accesible del summary suma ambos textos.
    h('h2', { class: 'curso-titulo' }, curso.titulo),
    h('span', { class: 'curso-numero' }, T.inicio.temas(temas.length)),
  );
  detalle.append(resumen);

  if (temas.length === 0) {
    detalle.append(estadoVacio('libro', T.inicio.sinTemas));
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
  // Primero, la fila «Repaso global de {asignatura}» (§13.1)
  lista.append(pintarConjunto(ctx, curso, asignatura));
  for (const tema of temas) {
    lista.append(pintarTema(ctx, curso, asignatura, tema));
  }
  bloque.append(lista);
  return bloque;
}

/**
 * Fila «Repaso global de {asignatura}» (§13.1): juega con el banco de TODOS
 * los temas de esa asignatura. Clave de progreso propia (`claveConjunto`), así
 * que convive con las notas de cada tema suelto.
 *
 * Se distingue de un tema concreto por **tres** señales —icono, descripción
 * visible y color—, nunca solo por el borde discontinuo.
 */
function pintarConjunto(ctx: Contexto, curso: Curso, asignatura: Asignatura): HTMLElement {
  const temas = temasDeAsignatura(asignatura);
  const preguntas = preguntasDeConjunto(ctx.preguntasPorTema, curso, asignatura.id);
  const minimo = minimoDeConjunto(temas);
  const jugable = preguntas.length >= minimo;
  const titulo = T.inicio.repasoGlobal(asignatura.titulo);
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
    h('span', { class: 'tema-nombre' }, icono('lista', 'tema-icono-global'), titulo),
    // La descripción es lo que explica QUÉ hace esta fila: visible de serie,
    // así que también forma parte del nombre accesible del botón.
    h('span', { class: 'tema-detalle' }, T.inicio.repasoGlobalDetalle),
    h('span', { class: 'tema-meta' }, T.inicio.preguntas(preguntas.length)),
    nota === undefined
      ? h('span', { class: 'insignia insignia--neutro' }, T.inicio.sinNota)
      : insigniaNota(nota, T.inicio.mejorNota(nota)),
    // Icono de flecha (decorativo, T2): el significado ya lo da el propio
    // botón, así que va con aria-hidden y sin texto.
    jugable
      ? icono('flecha', 'tema-ir')
      : h('span', { class: 'tema-no-disponible' }, icono('aviso'), T.inicio.minimo(minimo)),
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
      : insigniaNota(nota, T.inicio.mejorNota(nota)),
    jugable
      ? icono('flecha', 'tema-ir')
      : h('span', { class: 'tema-no-disponible' }, icono('aviso'), T.inicio.minimo(tema.minPreguntas)),
  );

  return h('li', {}, boton);
}

/** Color de la insignia de nota: siempre acompañado de texto, nunca solo color. */
export function claseInsignia(nota: number): string {
  if (nota >= 90) return 'insignia--alta';
  if (nota >= 60) return 'insignia--media';
  return 'insignia--baja';
}

/**
 * Icono de la banda: cuenta LO MISMO que el color (✓ ≥ 6, ⚠ por debajo), para
 * que «bueno/malo» no dependa solo de distinguir verde de rojo (1.4.1 y §14.1).
 */
function iconoDeNota(nota: number): NombreIcono {
  return nota >= 60 ? 'check' : 'aviso';
}

/**
 * Insignia de una nota guardada: color por bandas + icono + texto con su
 * escala. `texto` es SIEMPRE visible (`Mejor nota: 85/100`, `85`…), así que
 * el color queda como refuerzo y nunca como único indicador.
 */
export function insigniaNota(nota: number, texto: string): HTMLElement {
  return h('span', { class: `insignia ${claseInsignia(nota)}` }, icono(iconoDeNota(nota)), texto);
}
