/**
 * Pantalla de ajustes: modo de color, nº de preguntas, barajar opciones
 * y borrar progreso. Los cambios se guardan solos.
 */

import { OPCIONES_PREGUNTAS, type ModoTema } from '../persistencia';
import { T } from './cadenas';
import type { Contexto } from './contexto';
import { h, vaciar } from './dom';

export function pintarAjustes(vista: HTMLElement, ctx: Contexto): void {
  vaciar(vista);

  const aviso = h('p', { class: 'aviso-estado', role: 'status', 'aria-live': 'polite' });
  const guardar = (): void => {
    aviso.textContent = T.ajustes.guardado;
  };

  const cabecera = h(
    'header',
    { class: 'pantalla-cabecera' },
    h('h1', { id: 'titulo-pantalla', tabindex: '-1' }, T.ajustes.titulo),
    aviso,
  );

  // --- Modo de color ---
  const campoTema = h(
    'fieldset',
    { class: 'ajuste' },
    h('legend', {}, T.ajustes.tema),
    h('p', { class: 'ayuda', id: 'ayuda-tema' }, T.ajustes.temaAyuda),
    ...(['auto', 'claro', 'oscuro'] as const).map((modo) =>
      controlRadio(
        'modo-tema',
        modo,
        etiquetaModo(modo),
        ctx.ajustes.modoTema === modo,
        () => {
          ctx.acciones.cambiarAjustes({ modoTema: modo as ModoTema });
          guardar();
        },
        'ayuda-tema',
      ),
    ),
  );

  // --- Preguntas por cuestionario ---
  const selector = h(
    'select',
    {
      id: 'preguntas-por-cuestionario',
      class: 'control-select',
      'aria-describedby': 'ayuda-preguntas',
      onchange: (evento: Event) => {
        const valor = Number((evento.target as HTMLSelectElement).value);
        ctx.acciones.cambiarAjustes({ preguntas: valor });
        guardar();
      },
    },
    ...OPCIONES_PREGUNTAS.map((n) =>
      h(
        'option',
        { value: String(n), selected: n === ctx.ajustes.preguntas },
        n === 0 ? T.ajustes.preguntasTodas : String(n),
      ),
    ),
  );

  const campoPreguntas = h(
    'div',
    { class: 'ajuste' },
    h('label', { for: 'preguntas-por-cuestionario' }, T.ajustes.preguntas),
    selector,
    h('p', { class: 'ayuda', id: 'ayuda-preguntas' }, T.ajustes.preguntasAyuda),
  );

  // --- Barajar opciones ---
  const campoBarajar = h(
    'div',
    { class: 'ajuste' },
    h(
      'label',
      { class: 'control control--casilla' },
      h('input', {
        type: 'checkbox',
        checked: ctx.ajustes.barajarOpciones,
        'aria-describedby': 'ayuda-barajar',
        onchange: (evento: Event) => {
          const marcado = (evento.target as HTMLInputElement).checked;
          ctx.acciones.cambiarAjustes({ barajarOpciones: marcado });
          guardar();
        },
      }),
      h('span', {}, T.ajustes.barajar),
    ),
    h('p', { class: 'ayuda', id: 'ayuda-barajar' }, T.ajustes.barajarAyuda),
  );

  // --- Borrar progreso ---
  const campoBorrar = h(
    'div',
    { class: 'ajuste' },
    h(
      'button',
      {
        type: 'button',
        class: 'boton boton--peligro',
        onclick: () => {
          if (!globalThis.confirm(T.ajustes.borrarConfirm)) return;
          ctx.acciones.borrarProgreso();
          aviso.textContent = T.ajustes.borrado;
        },
      },
      T.ajustes.borrar,
    ),
    h('p', { class: 'ayuda' }, T.ajustes.borrarAyuda),
  );

  vista.append(cabecera, campoTema, campoPreguntas, campoBarajar, campoBorrar);

  if (!ctx.almacenDisponible) {
    vista.append(h('p', { class: 'aviso' }, T.ajustes.sinAlmacen));
  }
}

function controlRadio(
  nombre: string,
  valor: string,
  texto: string,
  marcado: boolean,
  alCambiar: () => void,
  descritoPor?: string,
): HTMLElement {
  return h(
    'label',
    { class: 'control control--radio' },
    h('input', {
      type: 'radio',
      name: nombre,
      value: valor,
      checked: marcado,
      ...(descritoPor ? { 'aria-describedby': descritoPor } : {}),
      onchange: alCambiar,
    }),
    h('span', {}, texto),
  );
}

function etiquetaModo(modo: ModoTema): string {
  if (modo === 'claro') return T.ajustes.temaClaro;
  if (modo === 'oscuro') return T.ajustes.temaOscuro;
  return T.ajustes.temaAuto;
}
