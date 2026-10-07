/**
 * Diálogo de confirmación propio (INC-02).
 *
 * El `confirm()` nativo muestra un título con el dominio
 * ("andreu-marbor.github.io dice") y textos/estilos del sistema, ajenos a la
 * app. Aquí se usa el elemento nativo `<dialog>` en modo modal: sin
 * dependencias, con foco atrapado, cierre con `Esc` (evento `cancel`),
 * `aria-labelledby` apuntando al título y retorno del foco al botón que lo abrió.
 *
 * Estilo: `.dialogo` en `src/estilos/app.css`. Textos: `src/ui/cadenas.ts`.
 */

import { T } from './cadenas';
import { h } from './dom';

export interface Confirmacion {
  /** Título: es además el nombre accesible del diálogo */
  titulo: string;
  /** Mensaje explicativo bajo el título */
  mensaje: string;
  /** Etiqueta del botón que ejecuta la acción */
  confirmar: string;
  /** Etiqueta del botón seguro; por defecto `Cancelar` */
  cancelar?: string;
}

/** Para que cada diálogo tenga un `id` distinto en el documento. */
let contadorDialogos = 0;

/**
 * Abre el diálogo y llama a `alConfirmar` (síncrono) cuando la persona
 * elige: `true` para confirmar, `false` para cancelar o pulsar `Esc`.
 * El diálogo se retira del DOM antes de llamar al callback.
 */
export function pedirConfirmacion(
  confirmacion: Confirmacion,
  alConfirmar: (confirmado: boolean) => void,
): HTMLDialogElement {
  const idTitulo = `dialogo-titulo-${++contadorDialogos}`;
  let resuelto = false;

  const cerrar = (confirmado: boolean): void => {
    if (resuelto) return;
    resuelto = true;
    dialogo.close();
    dialogo.remove();
    alConfirmar(confirmado);
  };

  const dialogo = h(
    'dialog',
    {
      class: 'dialogo',
      'aria-labelledby': idTitulo,
      // `Esc` dispara `cancel`; lo cancelamos para cerrarlo nosotros con
      // el valor que corresponde (false) y retirarlo del documento.
      oncancel: (evento: Event) => {
        evento.preventDefault();
        cerrar(false);
      },
    },
    h('h2', { class: 'dialogo-titulo', id: idTitulo }, confirmacion.titulo),
    h('p', { class: 'dialogo-mensaje' }, confirmacion.mensaje),
    h(
      'div',
      { class: 'acciones' },
      // El botón seguro va primero y con foco: `Enter` no debe ejecutar la
      // acción destructiva.
      h(
        'button',
        { type: 'button', class: 'boton', autofocus: true, onclick: () => cerrar(false) },
        confirmacion.cancelar ?? T.dialogo.cancelar,
      ),
      h(
        'button',
        { type: 'button', class: 'boton boton--primario', onclick: () => cerrar(true) },
        confirmacion.confirmar,
      ),
    ),
  );

  document.body.append(dialogo);
  dialogo.showModal();
  return dialogo;
}
