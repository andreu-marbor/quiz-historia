/**
 * Pantalla de resultados (R/03): nota, aciertos, lista de falladas con su
 * explicación y opción de repetir solo las falladas.
 */

import { T } from './cadenas';
import type { Contexto } from './contexto';
import { h, vaciar } from './dom';
import { estadoVacio } from './estados';
import { icono } from './iconos';

export function pintarResultados(vista: HTMLElement, ctx: Contexto): void {
  vaciar(vista);

  const resultado = ctx.resultado;
  const tema = ctx.temaResultado;
  if (!resultado || !tema) return;

  const cabecera = h(
    'header',
    { class: 'pantalla-cabecera' },
    h('h1', { id: 'titulo-pantalla', tabindex: '-1' }, T.resultados.titulo),
    h('p', { class: 'contexto' }, T.resultados.contexto(tema.cursoTitulo, tema.temaTitulo)),
  );

  // Ficha de examen (T4): la nota grande manda y los datos se agrupan a su
  // lado. La mejor nota sale del MISMO progreso que guardó `finalizar`
  // (clave `tema.claveTema`), así que ya refleja esta partida.
  const mejorNota = ctx.progreso.temas[tema.claveTema]?.mejorNota;
  const resumen = h(
    'section',
    { class: 'nota-bloque', 'aria-live': 'polite' },
    h(
      'div',
      { class: 'nota-cabecera' },
      h('p', { class: 'nota' }, String(resultado.nota), h('span', { class: 'nota-maxima' }, '/100')),
      h(
        'div',
        { class: 'nota-datos' },
        h('p', { class: 'aciertos' }, T.resultados.aciertos(resultado.aciertos, resultado.total)),
        h('p', { class: 'veredicto' }, veredicto(resultado.nota)),
        mejorNota === undefined ? null : h('p', { class: 'nota-mejor' }, T.inicio.mejorNota(mejorNota)),
      ),
    ),
    ctx.nuevaMejor ? h('p', { class: 'insignia insignia--alta insignia--nueva' }, T.resultados.nuevaMejor) : null,
  );

  const falladas = resultado.detalles.filter((detalle) => !detalle.acertada);
  const bloqueFalladas =
    falladas.length === 0
      ? estadoVacio('check', T.resultados.sinFalladas, { positivo: true })
      : h(
          'div',
          {},
          h(
            'h2',
            { class: 'falladas-titulo' },
            T.resultados.falladas,
            h('span', { class: 'insignia' }, String(falladas.length)),
          ),
          h(
            'ol',
            { class: 'falladas' },
            ...falladas.map((detalle) => {
              const pregunta = detalle.pregunta;
              const elegida = detalle.elegida;
              const textoElegido = elegida === null ? null : (pregunta.opciones[elegida] ?? null);
              // Jerarquía de la revisión (T4): enunciado → lo que pusiste (✗)
              // → la correcta (✓), que es lo que hay que recordar → explicación
              // en caja apagada al final.
              return h(
                'li',
                {},
                h('p', { class: 'enunciado' }, pregunta.enunciado),
                textoElegido === null
                  ? h('p', { class: 'linea linea--tenue' }, icono('aviso'), T.resultados.sinResponder)
                  : h(
                      'p',
                      { class: 'linea linea--mal' },
                      icono('cruz'),
                      h('strong', {}, `${T.cuestionario.tuRespuesta}: `),
                      textoElegido,
                    ),
                h(
                  'p',
                  { class: 'linea linea--ok' },
                  icono('check'),
                  h('strong', {}, `${T.cuestionario.respuestaCorrecta}: `),
                  pregunta.opciones[pregunta.respuesta],
                ),
                h('p', { class: 'explicacion' }, pregunta.explicacion),
              );
            }),
          ),
        );

  const acciones = h(
    'div',
    { class: 'acciones acciones--envoltura' },
    falladas.length > 0
      ? h(
          'button',
          { type: 'button', class: 'boton boton--primario', onclick: () => ctx.acciones.repetir(true) },
          T.resultados.repetirFalladas,
        )
      : null,
    h(
      'button',
      { type: 'button', class: 'boton', onclick: () => ctx.acciones.repetir(false) },
      T.resultados.repetirTodas,
    ),
    h(
      'button',
      { type: 'button', class: 'boton boton--fantasma', onclick: () => ctx.acciones.ir('/') },
      T.resultados.otroTema,
    ),
  );

  vista.append(cabecera, resumen, bloqueFalladas, acciones);
}

function veredicto(nota: number): string {
  if (nota === 100) return T.resultados.perfecto;
  if (nota >= 90) return T.resultados.bien;
  if (nota >= 60) return T.resultados.aprobado;
  return T.resultados.suspendo;
}
