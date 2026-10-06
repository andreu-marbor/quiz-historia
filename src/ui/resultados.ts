/**
 * Pantalla de resultados (R/03): nota, aciertos, lista de falladas con su
 * explicación y opción de repetir solo las falladas.
 */

import { T } from './cadenas';
import type { Contexto } from './contexto';
import { h, vaciar } from './dom';

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

  const resumen = h(
    'section',
    { class: 'nota-bloque', 'aria-live': 'polite' },
    h(
      'p',
      { class: 'nota' },
      String(resultado.nota),
      h('span', { class: 'nota-maxima' }, '/100'),
    ),
    h('p', { class: 'aciertos' }, T.resultados.aciertos(resultado.aciertos, resultado.total)),
    h('p', { class: 'veredicto' }, veredicto(resultado.nota)),
    ctx.nuevaMejor ? h('p', { class: 'insignia insignia--alta insignia--nueva' }, T.resultados.nuevaMejor) : null,
  );

  const falladas = resultado.detalles.filter((detalle) => !detalle.acertada);
  const bloqueFalladas =
    falladas.length === 0
      ? h('p', { class: 'aviso aviso--positivo' }, T.resultados.sinFalladas)
      : h(
          'div',
          {},
          h('h2', {}, T.resultados.falladas),
          h(
            'ol',
            { class: 'falladas' },
            ...falladas.map((detalle) => {
              const pregunta = detalle.pregunta;
              const elegida = detalle.elegida;
              const textoElegido = elegida === null ? null : (pregunta.opciones[elegida] ?? null);
              return h(
                'li',
                {},
                h('p', { class: 'enunciado' }, pregunta.enunciado),
                textoElegido === null
                  ? h('p', { class: 'linea' }, T.resultados.sinResponder)
                  : h(
                      'p',
                      { class: 'linea linea--mal' },
                      h('strong', {}, `${T.cuestionario.tuRespuesta}: `),
                      textoElegido,
                    ),
                h(
                  'p',
                  { class: 'linea linea--ok' },
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
