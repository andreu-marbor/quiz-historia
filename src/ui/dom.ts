/**
 * Helpers mínimos de construcción del DOM.
 * Sin frameworks: el contenido de los datos (enunciados, opciones…)
 * se mete con `textContent`, nunca con HTML, para no inyectar marcado.
 *
 * Los atributos `on*` con valor función se registran como listeners reales
 * (`setAttribute` no serviría).
 */

export type Atributo = string | number | boolean | null | undefined | ((evento: Event) => void);

export type Atributos = Record<string, Atributo>;

export type Hijo = string | number | null | undefined | false | Node;

/**
 * Crea un elemento: `h('button', { class: 'x', disabled: true, onclick: f }, 'Texto')`.
 * Los atributos `false`/`null`/`undefined` no se pintan; los `true` van vacíos.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Atributos = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);

  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;

    if (typeof valor === 'function' && clave.toLowerCase().startsWith('on')) {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor as EventListener);
      continue;
    }
    if (valor === true) {
      elemento.setAttribute(clave, '');
      continue;
    }
    elemento.setAttribute(clave, String(valor));
  }

  for (const hijo of hijos) {
    if (typeof hijo === 'number') {
      elemento.append(String(hijo));
      continue;
    }
    if (hijo === null || hijo === undefined || hijo === false) continue;
    elemento.append(hijo);
  }

  return elemento;
}

/** Vacía un contenedor. */
export function vaciar(contenedor: Element): void {
  while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
}
