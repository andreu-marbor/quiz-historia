/**
 * Pantalla de cuestionario: enunciado, opciones, respuesta inmediata (R/02),
 * explicación, barra de progreso y botón "siguiente".
 *
 * Al responder NO se vuelve a pintar toda la pantalla: se actualiza el DOM en el
 * sitio, para que la región `aria-live` exista antes del cambio y un lector de
 * pantalla anuncie el resultado.
 */

import { T } from './cadenas';
import type { Contexto, Sesion } from './contexto';
import { pedirConfirmacion } from './dialogo';
import { h, vaciar } from './dom';

export function pintarCuestionario(vista: HTMLElement, ctx: Contexto): void {
  vaciar(vista);
  const sesion = ctx.sesion;
  if (!sesion || sesion.preguntas.length === 0) return;

  const presentada = sesion.preguntas[sesion.actual];
  const respondida = sesion.respuestas[sesion.actual] !== null;

  const barra = pintarBarra(sesion);
  const cabecera = h(
    'header',
    { class: 'cuestionario-cabecera' },
    h('p', { class: 'contador' }, T.cuestionario.preguntaDe(sesion.actual + 1, sesion.preguntas.length)),
    barra,
    h('p', { class: 'contexto' }, `${sesion.cursoTitulo} · ${sesion.temaTitulo}`),
  );

  const enunciado = h(
    'h1',
    { id: 'enunciado', class: 'enunciado', tabindex: '-1' },
    presentada.pregunta.enunciado,
  );

  const lista = h('ul', { class: 'opciones' });
  presentada.opciones.forEach((texto, indice) => {
    lista.append(
      h(
        'li',
        {},
        h(
          'button',
          {
            type: 'button',
            class: 'opcion',
            'data-indice': indice,
            disabled: respondida ? true : undefined,
            onclick: () => ctx.acciones.responder(indice),
          },
          h('span', { class: 'opcion-marca', 'aria-hidden': 'true' }),
          h('span', { class: 'opcion-texto' }, texto),
        ),
      ),
    );
  });

  const bloque = h(
    'section',
    { class: 'bloque-pregunta', role: 'group', 'aria-labelledby': 'enunciado' },
    enunciado,
    lista,
  );

  const feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

  const ultimo = sesion.actual === sesion.preguntas.length - 1;
  const acciones = h(
    'div',
    { class: 'acciones' },
    h(
      'button',
      {
        type: 'button',
        id: 'siguiente',
        class: 'boton boton--primario',
        disabled: respondida ? undefined : true,
        onclick: () => ctx.acciones.siguiente(),
      },
      ultimo ? T.cuestionario.finalizar : T.cuestionario.siguiente,
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'boton boton--fantasma',
        onclick: () =>
          pedirConfirmacion(
            {
              titulo: T.cuestionario.abandonar,
              mensaje: T.cuestionario.abandonarConfirm,
              confirmar: T.cuestionario.abandonarSi,
              cancelar: T.cuestionario.abandonarNo,
            },
            (confirmado) => {
              if (confirmado) ctx.acciones.abandonar();
            },
          ),
      },
      T.cuestionario.abandonar,
    ),
  );

  vista.append(cabecera, bloque, feedback, acciones);

  actualizarBarra(vista, sesion);
  actualizarOpciones(vista, sesion);
  pintarFeedback(vista, sesion);
}

/**
 * Actualiza el DOM existente tras una respuesta (sin re-pintar la pantalla).
 * Deja de aceptar clics y marca cada opción con texto + icono, no solo color.
 */
export function aplicarRespuesta(vista: HTMLElement, ctx: Contexto): void {
  const sesion = ctx.sesion;
  if (!sesion) return;
  actualizarBarra(vista, sesion);
  actualizarOpciones(vista, sesion);
  pintarFeedback(vista, sesion);
  const siguiente = vista.querySelector<HTMLButtonElement>('#siguiente');
  if (siguiente) siguiente.disabled = false;
}

// ---------------------------------------------------------------------------

function pintarBarra(sesion: Sesion): HTMLElement {
  const respondidas = sesion.respuestas.filter((r) => r !== null).length;
  return h(
    'div',
    {
      class: 'barra',
      role: 'progressbar',
      'aria-label': T.cuestionario.barraProgreso,
      'aria-valuemin': 0,
      'aria-valuemax': sesion.preguntas.length,
      'aria-valuenow': respondidas,
      'aria-valuetext': T.cuestionario.preguntaDe(sesion.actual + 1, sesion.preguntas.length),
    },
    h('span', { class: 'barra-relleno' }),
  );
}

function actualizarBarra(vista: HTMLElement, sesion: Sesion): void {
  const barra = vista.querySelector<HTMLElement>('.barra');
  if (!barra) return;
  const respondidas = sesion.respuestas.filter((r) => r !== null).length;
  const total = sesion.preguntas.length;
  barra.setAttribute('aria-valuenow', String(respondidas));
  barra.setAttribute(
    'aria-valuetext',
    T.cuestionario.preguntaDe(sesion.actual + 1, total),
  );
  const relleno = barra.querySelector<HTMLElement>('.barra-relleno');
  if (relleno) relleno.style.width = `${(respondidas / total) * 100}%`;
}

function actualizarOpciones(vista: HTMLElement, sesion: Sesion): void {
  const presentada = sesion.preguntas[sesion.actual];
  const elegida = sesion.respuestas[sesion.actual];
  const respondida = elegida !== null;

  const botones = vista.querySelectorAll<HTMLButtonElement>('.opcion');
  botones.forEach((boton, indice) => {
    const texto = presentada.opciones[indice] ?? '';
    const esCorrecta = indice === presentada.respuesta;
    const esElegida = presentada.originales[indice] === elegida;

    boton.disabled = respondida;
    boton.classList.toggle('opcion--respuesta', respondida);
    boton.classList.toggle('opcion--correcta', respondida && esCorrecta);
    boton.classList.toggle('opcion--incorrecta', respondida && esElegida && !esCorrecta);
    boton.classList.toggle('opcion--descartada', respondida && !esCorrecta && !esElegida);

    const marca = boton.querySelector<HTMLElement>('.opcion-marca');
    if (marca) marca.textContent = respondida && esCorrecta ? '✓' : respondida && esElegida ? '✗' : '';

    if (respondida && esCorrecta) {
      boton.setAttribute('aria-label', `${texto} — ${T.cuestionario.respuestaCorrecta}`);
    } else if (respondida && esElegida) {
      boton.setAttribute('aria-label', `${texto} — ${T.cuestionario.tuRespuesta}`);
    } else {
      boton.removeAttribute('aria-label');
    }
  });
}

function pintarFeedback(vista: HTMLElement, sesion: Sesion): void {
  const caja = vista.querySelector<HTMLElement>('.feedback');
  if (!caja) return;

  const presentada = sesion.preguntas[sesion.actual];
  const elegida = sesion.respuestas[sesion.actual];
  vaciar(caja);

  if (elegida === null) {
    caja.className = 'feedback';
    caja.append(h('p', { class: 'pista' }, T.cuestionario.elegir));
    return;
  }

  // `elegida` está en el orden ORIGINAL de la pregunta (así se guarda en
  // `sesion.respuestas`, ver `aplicacion.ts` → `responder`), mientras que
  // `presentada.respuesta` está en el orden MOSTRADO tras el barajado.
  // Se comparan en el mismo eje (el original): si no, con las opciones barajadas
  // un acierto se tumba como fallo (y un fallo puede pasar por acierto).
  const acertada = elegida === presentada.pregunta.respuesta;
  caja.className = `feedback ${acertada ? 'feedback--ok' : 'feedback--mal'}`;
  caja.append(h('p', { class: 'feedback-titulo' }, acertada ? T.cuestionario.correcto : T.cuestionario.incorrecto));

  if (!acertada) {
    const indiceMostrado = presentada.originales.indexOf(elegida);
    caja.append(
      h(
        'p',
        { class: 'feedback-linea' },
        h('strong', {}, `${T.cuestionario.tuRespuesta}: `),
        presentada.opciones[indiceMostrado] ?? '',
      ),
      h(
        'p',
        { class: 'feedback-linea feedback-linea--correcta' },
        h('strong', {}, `${T.cuestionario.respuestaCorrecta}: `),
        presentada.opciones[presentada.respuesta] ?? '',
      ),
    );
  }

  caja.append(h('p', { class: 'explicacion' }, presentada.pregunta.explicacion));
}
