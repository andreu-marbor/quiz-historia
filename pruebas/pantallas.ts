/**
 * Pruebas de las 5 pantallas con DOM real (jsdom): render, eventos y ARIA.
 * jsdom solo se usa en pruebas: la app sigue sin dependencias de runtime.
 * Se ejecuta con `npm.cmd run prueba:pantallas` (esbuild + node).
 */

import { JSDOM, VirtualConsole } from 'jsdom';

// --- Entorno de navegador falso (los módulos de UI solo tocan el DOM al pintar) ---
const consolaVirtual = new VirtualConsole();
consolaVirtual.on('jsdomError', (error: Error & { detail?: { stack?: string } }) =>
  console.error('  ❌ Excepción no capturada dentro de jsdom:', error.message, error.detail?.stack ?? ''),
);

const dom = new JSDOM('<!doctype html><html lang="es"><body></body></html>', {
  url: 'https://example.test/',
  virtualConsole: consolaVirtual,
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
  HTMLButtonElement: dom.window.HTMLButtonElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLSelectElement: dom.window.HTMLSelectElement,
  Event: dom.window.Event,
});

// jsdom no implementa el `<dialog>` modal (`showModal`/`close`): se emula aquí
// el comportamiento mínimo que necesita la app (atributo `open` + evento
// `close`). El cierre con `Esc` (evento `cancel`) se dispara a mano donde interesa.
if (typeof dom.window.HTMLDialogElement.prototype.showModal !== 'function') {
  dom.window.HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
    this.removeAttribute('open');
    this.dispatchEvent(new dom.window.Event('close'));
  };
}

import { pintarAjustes } from '../src/ui/ajustes';
import { montarAplicacion } from '../src/aplicacion';
import { aplicarRespuesta, pintarCuestionario } from '../src/ui/cuestionario';
import { h } from '../src/ui/dom';
import { icono, ICONOS } from '../src/ui/iconos';
import { pintarInicio } from '../src/ui/inicio';
import { pintarProgreso } from '../src/ui/progreso';
import { pintarResultados } from '../src/ui/resultados';
import { presentarPregunta } from '../src/logica/barajado';
import { resumir } from '../src/logica/correccion';
import type { Catalogo, Pregunta } from '../src/logica/tipos';
import {
  ajustesPorDefecto,
  guardarAjustes,
  leerAjustes,
  leerProgreso,
  progresoVacio,
  registrarCuestionario,
  type Ajustes,
  type Almacen,
  type Progreso,
} from '../src/persistencia';
import type { Acciones, Contexto, Sesion, TemaDelResultado } from '../src/ui/contexto';
import { comprobar, finalizar, seccion } from './ayudante';

// ---------------------------------------------------------------------------
// Dobles de prueba
// ---------------------------------------------------------------------------

let llamadas: Array<[string, ...unknown[]]> = [];

function accionesFalsas(): Acciones {
  const anotar = (nombre: string) => (...argumentos: unknown[]): void => void llamadas.push([nombre, ...argumentos]);
  return {
    elegirTema: anotar('elegirTema') as Acciones['elegirTema'],
    elegirConjunto: anotar('elegirConjunto') as Acciones['elegirConjunto'],
    responder: anotar('responder') as Acciones['responder'],
    siguiente: anotar('siguiente') as Acciones['siguiente'],
    repetir: anotar('repetir') as Acciones['repetir'],
    cambiarAjustes: anotar('cambiarAjustes') as Acciones['cambiarAjustes'],
    borrarProgreso: anotar('borrarProgreso') as Acciones['borrarProgreso'],
    abandonar: anotar('abandonar') as Acciones['abandonar'],
    ir: anotar('ir') as Acciones['ir'],
  };
}

function pregunta(id: string, enunciado = `¿Enunciado de ${id}?`): Pregunta {
  return {
    id,
    enunciado,
    tipo: 'opcion-multiple',
    opciones: ['Opción A', 'Opción B', 'Opción C'],
    respuesta: 1,
    explicacion: `Explicación de ${id}.`,
    dificultad: 1,
  };
}

const catalogo: Catalogo = {
  cursos: [
    {
      id: 'eso2',
      titulo: '2º ESO',
      orden: 1,
      asignaturas: [
        {
          id: 'historia',
          titulo: 'Historia',
          orden: 1,
          temas: [
            { id: 'restauracion', titulo: 'Restauración borbónica', orden: 1, minPreguntas: 2 },
            { id: 'industrial', titulo: 'Revolución Industrial', orden: 2, minPreguntas: 4 },
          ],
        },
      ],
    },
    {
      id: 'eso4',
      titulo: '4º ESO',
      orden: 2,
      asignaturas: [
        {
          id: 'historia',
          titulo: 'Historia',
          orden: 1,
          temas: [{ id: 'contemporanea', titulo: 'El mundo contemporáneo', orden: 1, minPreguntas: 2 }],
        },
      ],
    },
  ],
};

const preguntasPorTema = new Map<string, readonly Pregunta[]>([
  [
    'eso2/restauracion',
    [pregunta('eso2-restauracion-001'), pregunta('eso2-restauracion-002'), pregunta('eso2-restauracion-003')],
  ],
  ['eso2/industrial', [pregunta('eso2-industrial-001')]], // por debajo de minPreguntas
  ['eso4/contemporanea', [pregunta('eso4-contemporanea-001'), pregunta('eso4-contemporanea-002')]],
]);

function contexto(parcial: Partial<Contexto> = {}): Contexto {
  return {
    catalogo,
    preguntasPorTema,
    ajustes: ajustesPorDefecto(),
    progreso: progresoVacio(),
    sesion: null,
    resultado: null,
    temaResultado: null,
    nuevaMejor: false,
    almacenDisponible: true,
    acciones: accionesFalsas(),
    ...parcial,
  };
}

function nuevaVista(): HTMLElement {
  const vista = document.createElement('div');
  document.body.append(vista);
  return vista;
}

function texto(elemento: Element | null): string {
  return elemento?.textContent ?? '';
}

function botones(raiz: ParentNode, selector: string): HTMLButtonElement[] {
  return [...raiz.querySelectorAll(selector)] as HTMLButtonElement[];
}

function existe(raiz: ParentNode, selector: string): boolean {
  return raiz.querySelector(selector) !== null;
}

/** Almacén en memoria con la misma interfaz que `localStorage`. */
function almacenFalso(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
  };
}

function dormir(ms = 0): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/** Espera a que se cumpla una condición (jsdom navega por hash de forma asíncrona). */
async function esperar(condicion: () => boolean, limiteMs = 500): Promise<void> {
  for (let transcurrido = 0; transcurrido < limiteMs; transcurrido += 5) {
    if (condicion()) return;
    await dormir(5);
  }
}

function cambio(elemento: HTMLInputElement | HTMLSelectElement, valor?: string): void {
  if (valor !== undefined) elemento.value = valor;
  elemento.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

// ---------------------------------------------------------------------------
seccion('DOM: helper h()');
{
  const div = h('div', { id: 'caja', class: 'a b', 'data-valor': 3 }, 'hola', 42, null, undefined, false);
  comprobar(div.id === 'caja' && div.className === 'a b' && div.dataset.valor === '3', 'pinta atributos y los normaliza');
  comprobar(div.textContent === 'hola42', 'concatena texto y números; descarta null/undefined/false');

  const sin = h('button', { disabled: undefined, hidden: true, checked: false });
  comprobar(!sin.hasAttribute('disabled') && !sin.hasAttribute('checked'), 'los atributos false/undefined no se pintan');
  comprobar(sin.hasAttribute('hidden'), 'los true se pintan vacíos');

  let tocado = 0;
  const boton = h('button', { type: 'button', onclick: () => (tocado += 1) }, 'púlsame');
  boton.click();
  boton.click();
  comprobar(tocado === 2, 'onclick registra un listener real (setAttribute NO serviría)');

  const conEnter = h('input', { oninput: () => (tocado += 10) });
  conEnter.dispatchEvent(new dom.window.Event('input'));
  comprobar(tocado === 12, 'cualquier atributo on* se registra como listener');
}

// ---------------------------------------------------------------------------
seccion('Pantalla de inicio');
{
  llamadas = [];
  const vista = nuevaVista();
  pintarInicio(vista, contexto());

  comprobar(texto(vista.querySelector('h1')) === 'Elige curso y tema', 'muestra el encabezado principal');
  comprobar(vista.querySelectorAll('details.curso').length === 2, 'pinta los 2 cursos');
  comprobar(vista.querySelectorAll('details[open]').length === 1, 'el primer curso arranca desplegado');
  comprobar(vista.querySelectorAll('summary').length === 2, 'cada curso tiene su summary accesible');
  // §13.2: esquema de encabezados h1 → h2 (curso) → h3 (asignatura)
  comprobar(
    vista.querySelectorAll('summary h2').length === 2,
    'el título del curso es un h2 dentro de su summary',
  );
  comprobar(
    vista.querySelectorAll('.asignatura-titulo').length === 2 &&
      [...vista.querySelectorAll('.asignatura-titulo')].every((e) => e.tagName === 'H3'),
    'cada asignatura se anuncia con un subtítulo real (h3)',
  );
  comprobar(
    [...vista.querySelectorAll('.asignatura-titulo')].map((e) => e.textContent).join() === 'Historia,Historia',
    'el subtítulo muestra el nombre de la asignatura',
  );

  const conjuntos = botones(vista, '.tema--todos');
  comprobar(conjuntos.length === 2, 'una fila «Todos los temas» por asignatura (§13.1)');
  comprobar(
    texto(conjuntos[0]).includes('Todos los temas de Historia'),
    'el rótulo de la fila conjunta lleva el nombre de la asignatura',
  );
  comprobar(
    texto(conjuntos[0]).includes('4 preguntas'),
    'suma las preguntas de todos los temas de la asignatura (3 + 1)',
  );

  const temas = botones(vista, '.tema:not(.tema--todos)');
  comprobar(temas.length === 3, `pinta los 3 temas (salieron ${temas.length})`);

  const industrial = temas[1];
  comprobar(industrial.disabled, 'un tema con menos de minPreguntas queda deshabilitado');
  comprobar(texto(industrial).includes('Necesitas al menos 4 preguntas'), 'explica por qué no se puede jugar');
  comprobar(
    !industrial.hasAttribute('aria-label'),
    'no usa aria-label: no se pisa el texto visible con el nombre accesible',
  );
  comprobar(
    texto(industrial).includes('2º ESO') && texto(industrial).includes('Necesitas al menos 4 preguntas'),
    'el nombre accesible suma el curso con texto oculto',
  );

  conjuntos[0].click();
  comprobar(
    llamadas.length === 1 &&
      llamadas[0][0] === 'elegirConjunto' &&
      llamadas[0][1] === 'eso2' &&
      llamadas[0][2] === 'historia',
    'pulsar la fila «Todos los temas» arranca el cuestionario del conjunto',
  );

  llamadas = [];
  temas[0].click();
  comprobar(
    llamadas.length === 1 && llamadas[0][0] === 'elegirTema' && llamadas[0][1] === 'eso2' && llamadas[0][2] === 'restauracion',
    'pulsar un tema arranca el cuestionario con curso y tema correctos',
  );

  // Con progreso guardado aparece la mejor nota
  let progreso = progresoVacio();
  progreso = registrarCuestionario(progreso, 'eso2/restauracion', 85, '2026-10-06');
  const vista2 = nuevaVista();
  pintarInicio(vista2, contexto({ progreso }));
  comprobar(texto(vista2).includes('Mejor nota: 85'), 'muestra la mejor nota del tema');
  comprobar(texto(vista2).includes('Sin jugar todavía'), 'los temas sin jugar lo indican');
  comprobar(
    existe(vista2, '.insignia--neutro'),
    'con la clase que hoy sí tiene estilo propio (era clase muerta, §14.1)',
  );

  // Catálogo vacío
  const vista3 = nuevaVista();
  pintarInicio(vista3, contexto({ catalogo: { cursos: [] } }));
  comprobar(texto(vista3).includes('Todavía no hay ningún curso'), 'catálogo vacío: mensaje en lugar de pantalla en blanco');

  // Un curso con DOS asignaturas → dos filas «Todos los temas», cada una con la suya (§13.1)
  const dosAsignaturas: Catalogo = {
    cursos: [
      {
        id: '2bach',
        titulo: '2º Bachillerato',
        orden: 1,
        asignaturas: [
          {
            id: 'historia',
            titulo: 'Historia',
            orden: 1,
            temas: [{ id: 'restauracion', titulo: 'La Restauración', orden: 1, minPreguntas: 2 }],
          },
          {
            id: 'historia-del-arte',
            titulo: 'Historia del Arte',
            orden: 2,
            temas: [{ id: 'renacimiento', titulo: 'El Renacimiento', orden: 1, minPreguntas: 2 }],
          },
        ],
      },
    ],
  };
  const vista4 = nuevaVista();
  pintarInicio(vista4, contexto({ catalogo: dosAsignaturas }));
  const filasDoble = botones(vista4, '.tema--todos');
  comprobar(filasDoble.length === 2, 'hay una fila «Todos los temas» por asignatura, no una por curso');
  comprobar(
    texto(filasDoble[0]).includes('Todos los temas de Historia') &&
      texto(filasDoble[1]).includes('Todos los temas de Historia del Arte'),
    'cada una lleva su asignatura en el rótulo',
  );
  comprobar(vista4.querySelectorAll('.asignatura-titulo').length === 2, 'y cada bloque, su subtítulo (h3)');
}

// ---------------------------------------------------------------------------
seccion('Pantalla de cuestionario');
{
  llamadas = [];
  const presentadas = [pregunta('eso2-restauracion-001'), pregunta('eso2-restauracion-002')].map((p) =>
    presentarPregunta(p, { barajar: false }),
  );
  const sesion: Sesion = {
    cursoId: 'eso2',
    seleccion: { tipo: 'tema', cursoId: 'eso2', temaId: 'restauracion' },
    claveTema: 'eso2/restauracion',
    cursoTitulo: '2º ESO',
    temaTitulo: 'Restauración borbónica',
    preguntas: presentadas,
    respuestas: [null, null],
    actual: 0,
    soloFalladas: false,
  };
  const ctx = contexto({ sesion });
  const vista = nuevaVista();

  pintarCuestionario(vista, ctx);
  comprobar(texto(vista.querySelector('.contador')) === 'Pregunta 1 de 2', 'contador de pregunta');
  comprobar(
    texto(vista.querySelector('.contexto')) === '2º ESO · Restauración borbónica',
    'sitúa el curso y el tema en juego',
  );
  comprobar(texto(vista.querySelector('.enunciado')) === '¿Enunciado de eso2-restauracion-001?', 'enunciado de la pregunta');

  const barra = vista.querySelector('.barra')!;
  comprobar(barra.getAttribute('role') === 'progressbar', 'la barra es un progressbar');
  comprobar(barra.getAttribute('aria-valuenow') === '0' && barra.getAttribute('aria-valuemax') === '2', 'valores ARIA de la barra');
  comprobar(barra.getAttribute('aria-valuetext') === 'Pregunta 1 de 2', 'aria-valuetext legible en vez de solo un número');

  let opciones = botones(vista, '.opcion');
  comprobar(opciones.length === 3, 'pinta las 3 opciones');
  comprobar(opciones.every((o) => !o.disabled), 'ninguna opción está bloqueada antes de responder');
  comprobar(!existe(vista, '.feedback--ok') && !existe(vista, '.feedback--mal'), 'sin feedback antes de responder');
  comprobar(botones(vista, '#siguiente')[0].disabled, 'el botón siguiente está bloqueado hasta responder');
  comprobar(existe(vista, '.feedback[role="status"][aria-live="polite"]'), 'la región de feedback es aria-live desde el principio');
  comprobar(texto(vista.querySelector('.pista')).includes('Elige una respuesta'), 'pista antes de responder');

  // --- responder: la opción elegida se manda tal cual al backend de la app ---
  opciones[2].click();
  comprobar(
    llamadas.length === 1 && llamadas[0][0] === 'responder' && llamadas[0][1] === 2,
    'pulsar una opción llama a responder con el índice mostrado',
  );

  // El navegador (main.ts) guarda la respuesta en el orden original y repinta en el sitio
  sesion.respuestas[0] = presentadas[0].originales[2]; // incorrecta (la correcta es la 1)
  aplicarRespuesta(vista, ctx);

  opciones = botones(vista, '.opcion');
  comprobar(opciones.every((o) => o.disabled), 'tras responder ya no se puede cambiar la respuesta');
  comprobar(opciones[1].classList.contains('opcion--correcta'), 'se marca la respuesta correcta');
  comprobar(opciones[2].classList.contains('opcion--incorrecta'), 'se marca la respuesta elegida');
  comprobar(opciones[0].classList.contains('opcion--descartada'), 'las demás quedan de fondo');
  comprobar(texto(opciones[1]) === '✓Opción B', 'el icono ✓ acompaña al color (no solo color)');
  comprobar(opciones[1].getAttribute('aria-label') === 'Opción B — Respuesta correcta', 'el estado llega por aria-label');
  comprobar(opciones[2].getAttribute('aria-label') === 'Opción C — Tu respuesta', 'y la elegida también');

  const feedback = vista.querySelector('.feedback')!;
  comprobar(feedback.className.includes('feedback--mal'), 'feedback de fallo');
  comprobar(texto(feedback.querySelector('.feedback-titulo')) === 'Incorrecto', 'dice si ha sido correcto');
  comprobar(texto(feedback).includes('Tu respuesta: Opción C'), 'lista la respuesta del alumno');
  comprobar(texto(feedback).includes('Respuesta correcta: Opción B'), 'lista la respuesta correcta');
  comprobar(texto(feedback).includes('Explicación de eso2-restauracion-001.'), 'muestra la explicación (R/02)');
  comprobar(!existe(vista, '.pista'), 'la pista desaparece al haber respuesta');
  comprobar(!botones(vista, '#siguiente')[0].disabled, 'el botón siguiente se habilita al responder');
  comprobar(vista.querySelector('.barra')!.getAttribute('aria-valuenow') === '1', 'la barra avanza al responder');

  // --- segunda pregunta: acierto y último paso ---
  sesion.actual = 1;
  pintarCuestionario(vista, ctx);
  opciones = botones(vista, '.opcion');
  opciones[1].click(); // la correcta
  sesion.respuestas[1] = presentadas[1].originales[1];
  aplicarRespuesta(vista, ctx);

  const ok = vista.querySelector('.feedback')!;
  comprobar(ok.className.includes('feedback--ok'), 'feedback de acierto');
  comprobar(texto(ok.querySelector('.feedback-titulo')) === '¡Correcto!', 'felicita el acierto');
  comprobar(!texto(ok).includes('Tu respuesta:'), 'en un acierto no hace falta repetir la respuesta');
  comprobar(texto(ok).includes('Explicación de eso2-restauracion-002.'), 'también explica el acierto');
  comprobar(texto(botones(vista, '#siguiente')[0]) === 'Ver resultados', 'en la última pregunta el botón cambia a "Ver resultados"');

  // --- salir del cuestionario (INC-02: diálogo propio, no el confirm nativo) ---
  llamadas = [];
  botones(vista, '.boton--fantasma')[0].click();

  const dialogoSalida = document.querySelector('dialog.dialogo');
  comprobar(dialogoSalida !== null, 'INC-02: salir abre un diálogo propio en vez del confirm del navegador');
  comprobar(llamadas.length === 0, 'INC-02: no se abandona hasta que se confirma');
  comprobar(
    dialogoSalida!.getAttribute('aria-labelledby') === dialogoSalida!.querySelector('h2')!.id &&
      Boolean(dialogoSalida!.getAttribute('aria-labelledby')),
    'INC-02: el diálogo expone su título como nombre accesible',
  );
  comprobar(texto(dialogoSalida!.querySelector('.dialogo-titulo')) === 'Salir del cuestionario', 'INC-02: el diálogo lleva el título de la acción');
  comprobar(
    texto(dialogoSalida!).includes('Perderás las respuestas de esta partida'),
    'INC-02: explica qué se pierde al salir',
  );
  comprobar(
    botones(dialogoSalida!, '.boton').map((b) => texto(b)).join(' · ') === 'Seguir · Salir',
    'INC-02: el botón seguro va primero y el destructivo después',
  );

  botones(dialogoSalida!, '.boton--primario')[0].click(); // "Salir"
  comprobar(llamadas.length === 1 && llamadas[0][0] === 'abandonar', 'el botón de salir (tras confirmar en el diálogo) abandona la partida');
  comprobar(document.querySelector('dialog.dialogo') === null, 'INC-02: el diálogo se retira del documento al cerrarse');

  llamadas = [];
  botones(vista, '.boton--fantasma')[0].click();
  botones(document.querySelector('dialog.dialogo')!, '.boton')[0].click(); // "Seguir"
  comprobar(llamadas.length === 0, 'si cancela en el diálogo, no se abandona');
  comprobar(document.querySelector('dialog.dialogo') === null, 'y el diálogo también se retira');

  llamadas = [];
  botones(vista, '.boton--fantasma')[0].click();
  const dialogoEsc = document.querySelector('dialog.dialogo')!;
  dialogoEsc.dispatchEvent(new Event('cancel', { cancelable: true }));
  comprobar(llamadas.length === 0, 'Esc (evento cancel) cierra sin abandonar');
  comprobar(document.querySelector('dialog.dialogo') === null, 'y el diálogo desaparece');
}

// ---------------------------------------------------------------------------
seccion('Corrección con las opciones barajadas (INC-01)');
{
  // Fisher-Yates con r = 0 sobre ["Opción A","Opción B","Opción C"]:
  //   i=2 → j=0 → [C,B,A]  y  i=1 → j=0 → [B,C,A]
  // Se muestran ["Opción B","Opción C","Opción A"] → originales [1,2,0], y la
  // correcta (índice original 1) aparece en la posición MOSTRADA 0.
  // ahí es donde el feedback original comparaba dos sistemas de índices distintos.
  const presentada = presentarPregunta(pregunta('eso2-restauracion-001'), {
    barajar: true,
    aleatorio: () => 0,
  });
  comprobar(presentada.originales.join(',') === '1,2,0', 'el barajado de la prueba mueve la correcta de sitio');
  comprobar(presentada.respuesta === 0, 'la correcta queda en la posición mostrada 0 (no en la original 1)');

  const sesionBase: Sesion = {
    cursoId: 'eso2',
    seleccion: { tipo: 'tema', cursoId: 'eso2', temaId: 'restauracion' },
    claveTema: 'eso2/restauracion',
    cursoTitulo: '2º ESO',
    temaTitulo: 'Restauración borbónica',
    preguntas: [presentada],
    respuestas: [null],
    actual: 0,
    soloFalladas: false,
  };

  // 1) Se pulsa la correcta (posición mostrada 0) → se guarda el índice original 1
  const sesionAcierto: Sesion = { ...sesionBase, respuestas: [null] };
  const ctxAcierto = contexto({ sesion: sesionAcierto });
  const vistaAcierto = nuevaVista();
  pintarCuestionario(vistaAcierto, ctxAcierto);
  sesionAcierto.respuestas[0] = presentada.originales[0]; // 1 = la correcta
  aplicarRespuesta(vistaAcierto, ctxAcierto);

  const ok = vistaAcierto.querySelector('.feedback')!;
  comprobar(ok.className.includes('feedback--ok'), 'INC-01: un acierto con opciones barajadas se corrige como acierto');
  comprobar(texto(ok.querySelector('.feedback-titulo')) === '¡Correcto!', 'INC-01: felicita el acierto');
  comprobar(!texto(ok).includes('Tu respuesta:'), 'INC-01: en un acierto no se listan las dos respuestas');
  comprobar(
    botones(vistaAcierto, '.opcion')[0].classList.contains('opcion--correcta') &&
      texto(botones(vistaAcierto, '.opcion')[0]).includes('✓'),
    'INC-01: el botón de la correcta se resalta en su posición mostrada',
  );

  // 2) Se pulsa "Opción A" (posición mostrada 2, índice original 0) → sigue siendo fallo
  const sesionFallo: Sesion = { ...sesionBase, respuestas: [null] };
  const ctxFallo = contexto({ sesion: sesionFallo });
  const vistaFallo = nuevaVista();
  pintarCuestionario(vistaFallo, ctxFallo);
  sesionFallo.respuestas[0] = presentada.originales[2]; // 0 = "Opción A", incorrecta
  aplicarRespuesta(vistaFallo, ctxFallo);

  const mal = vistaFallo.querySelector('.feedback')!;
  comprobar(mal.className.includes('feedback--mal'), 'INC-01: un fallo con opciones barajadas sigue siendo fallo');
  comprobar(
    texto(mal).includes('Tu respuesta: Opción A') && texto(mal).includes('Respuesta correcta: Opción B'),
    'INC-01: "Tu respuesta" y "Respuesta correcta" ya no son el mismo texto',
  );
}

// ---------------------------------------------------------------------------
seccion('Pantalla de resultados');
{
  const base = ['r-001', 'r-002', 'r-003', 'r-004'].map((id) => presentarPregunta(pregunta(id), { barajar: false }));
  const resultado = resumir(
    base.map((p) => p.pregunta),
    [1, 0, null, 2],
  );
  const temaResultado: TemaDelResultado = {
    seleccion: { tipo: 'tema', cursoId: 'eso2', temaId: 'restauracion' },
    cursoTitulo: '2º ESO',
    temaTitulo: 'Restauración borbónica',
  };

  llamadas = [];
  const vista = nuevaVista();
  pintarResultados(vista, contexto({ resultado, temaResultado, nuevaMejor: true }));

  comprobar(texto(vista.querySelector('h1')) === 'Resultados', 'encabezado');
  comprobar(texto(vista.querySelector('.contexto')) === '2º ESO · Restauración borbónica', 'sitúa la partida');
  comprobar(texto(vista.querySelector('.nota')).startsWith('25'), 'nota 25 sobre 100');
  comprobar(texto(vista.querySelector('.aciertos')) === '1 de 4 correctas', 'aciertos y total');
  comprobar(texto(vista.querySelector('.veredicto')).includes('practicando'), 'veredicto acorde a la nota');
  comprobar(existe(vista, '.insignia--nueva'), 'avisa de la nueva mejor nota');
  comprobar(vista.querySelectorAll('.falladas li').length === 3, 'lista las 3 falladas (aciertos y sin falladas fuera)');

  const primeraFallada = vista.querySelector('.falladas li')!;
  comprobar(texto(primeraFallada).includes('Respuesta correcta: Opción B'), 'en cada fallada muestra la correcta');
  const sinResponder = [...vista.querySelectorAll('.falladas li')].find((li) => texto(li).includes('Sin responder'));
  comprobar(Boolean(sinResponder), 'una pregunta sin responder aparece como tal');
  comprobar(texto(primeraFallada).includes('Explicación de r-002.'), 'y su explicación');

  const enlaces = botones(vista, '.boton');
  comprobar(enlaces.some((b) => texto(b) === 'Repetir solo las falladas'), 'ofrece repetir solo las falladas (R/03)');
  comprobar(enlaces.some((b) => texto(b) === 'Repetir todas') && enlaces.some((b) => texto(b) === 'Elegir otro tema'), 'y las otras dos salidas');

  enlaces.find((b) => texto(b) === 'Repetir solo las falladas')!.click();
  comprobar(llamadas.length === 1 && llamadas[0][0] === 'repetir' && llamadas[0][1] === true, 'repetir falladas llama a repetir(true)');

  // Cuestionario perfecto: sin lista de falladas y sin botón de repetir falladas
  const perfecto = resumir(
    base.map((p) => p.pregunta),
    [1, 1, 1, 1],
  );
  const vista2 = nuevaVista();
  pintarResultados(vista2, contexto({ resultado: perfecto, temaResultado }));
  comprobar(!existe(vista2, '.falladas'), 'con nota 100 no hay bloque de falladas');
  comprobar(texto(vista2).includes('No has fallado ninguna pregunta'), 'y lo dice con texto');
  comprobar(
    !botones(vista2, '.boton').some((b) => texto(b) === 'Repetir solo las falladas'),
    'tampoco se ofrece repetir las falladas',
  );
}

// ---------------------------------------------------------------------------
seccion('Pantalla de progreso');
{
  let progreso = registrarCuestionario(progresoVacio(), 'eso2/restauracion', 85, '2026-10-06');
  progreso = registrarCuestionario(progreso, 'eso2/restauracion', 40, '2026-10-06');
  progreso = registrarCuestionario(progreso, 'eso4/contemporanea', 60, '2026-10-07');
  progreso = registrarCuestionario(progreso, 'eso2/__todos__/historia', 75, '2026-10-07');

  const vista = nuevaVista();
  pintarProgreso(vista, contexto({ progreso }));

  comprobar(texto(vista.querySelector('h1')) === 'Tu progreso', 'encabezado');
  const tarjetas = [...vista.querySelectorAll('.tarjeta')];
  comprobar(tarjetas.length === 2, 'dos tarjetas: racha y cuestionarios');
  comprobar(tarjetas[0].querySelector('.tarjeta-valor')!.textContent === '2', 'racha de 2 días');
  comprobar(texto(tarjetas[0]).includes('2 días seguidos'), 'la racha se explica en palabras');
  comprobar(tarjetas[1].querySelector('.tarjeta-valor')!.textContent === '4', '4 cuestionarios jugados');

  const filas = [...vista.querySelectorAll('tbody tr')];
  comprobar(filas.length === 3, 'una fila por clave con datos');
  comprobar(
    filas[0].querySelector('th')!.textContent === 'Todos los temas de Historia',
    'la fila del conjunto convive con las de los temas (§13.1)',
  );
  comprobar(filas[0].querySelectorAll('td')[1]!.textContent === 'Historia', 'y también lleva su asignatura');
  comprobar(filas[0].querySelector('.insignia')!.textContent === '75', 'con su propia mejor nota');
  comprobar(filas[1].querySelector('th')!.textContent === 'Restauración borbónica', 'fila del tema');
  comprobar(filas[1].querySelectorAll('td')[1]!.textContent === 'Historia', 'columna de asignatura (§13.2)');
  comprobar(filas[1].querySelector('.insignia')!.textContent === '85', 'mejor nota (no la última)');
  comprobar(existe(vista, '.insignia--media'), 'la insignia colorea la nota (85 está en la banda media)');
  comprobar(
    filas[1].querySelectorAll('td')[3]!.textContent === '2',
    'veces jugado en ese tema',
  );
  comprobar(vista.querySelectorAll('th[scope="col"]').length === 5, 'cabeceras de tabla con scope');
  comprobar(vista.querySelector('.tabla-contenedor')!.getAttribute('tabindex') === '0', 'la tabla es enfocable con teclado para desplazarla');

  const vacia = nuevaVista();
  pintarProgreso(vacia, contexto());
  comprobar(texto(vacia).includes('Aún no has completado ningún cuestionario'), 'sin progreso: mensaje de ánimo');
}

// ---------------------------------------------------------------------------
seccion('Pantalla de ajustes');
{
  llamadas = [];
  const vista = nuevaVista();
  pintarAjustes(vista, contexto());

  comprobar(texto(vista.querySelector('h1')) === 'Ajustes', 'encabezado');
  comprobar(vista.querySelectorAll('legend').length === 1, 'el grupo de modo de color usa fieldset+legend');
  const radios = [...vista.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  comprobar(radios.length === 3, 'tres modos de color');
  comprobar(radios[0].checked && radios[0].value === 'auto', 'por defecto: según el sistema');
  comprobar(radios.every((r) => r.name === 'modo-tema'), 'los radios comparten nombre (grupo real)');

  radios[2].checked = true;
  cambio(radios[2]);
  comprobar(
    llamadas.length === 1 && llamadas[0][0] === 'cambiarAjustes',
    'cambiar el modo llama a cambiarAjustes',
  );
  comprobar(
    JSON.stringify(llamadas[0][1]) === JSON.stringify({ modoTema: 'oscuro' }),
    'con el cambio concreto ({modoTema: "oscuro"})',
  );
  comprobar(texto(vista.querySelector('.aviso-estado')) === 'Ajuste guardado.', 'confirma el guardado en pantalla');
  comprobar(
    vista.querySelector('.aviso-estado')!.getAttribute('aria-live') === 'polite',
    'la confirmación se anuncia sin interrumpir',
  );

  const select = vista.querySelector('select') as HTMLSelectElement;
  comprobar(select.id === 'preguntas-por-cuestionario', 'el selector tiene id y su etiqueta lo referencia');
  comprobar((vista.querySelector(`label[for="${select.id}"]`)?.textContent ?? '') === 'Preguntas por cuestionario', 'etiqueta asociada al selector');
  comprobar(select.options.length === 5 && [...select.options].some((o) => o.textContent === 'Todas las del tema'), '5 opciones incluida "todas"');
  comprobar(select.value === '10', 'viene con 10 por defecto');

  cambio(select, '15');
  comprobar(JSON.stringify(llamadas.at(-1)![1]) === JSON.stringify({ preguntas: 15 }), 'guarda el nº de preguntas');
  cambio(select, '0');
  comprobar(JSON.stringify(llamadas.at(-1)![1]) === JSON.stringify({ preguntas: 0 }), 'admite 0 = todas');

  const casilla = vista.querySelector('input[type="checkbox"]') as HTMLInputElement;
  comprobar(casilla.checked, 'barajar opciones viene activado');
  casilla.checked = false;
  cambio(casilla);
  comprobar(JSON.stringify(llamadas.at(-1)![1]) === JSON.stringify({ barajarOpciones: false }), 'guarda el barajado');
  comprobar(Boolean(casilla.getAttribute('aria-describedby')), 'la casilla explica sus consecuencias con aria-describedby');

  llamadas = [];
  botones(vista, '.boton--peligro')[0].click();
  const dialogoBorrar = document.querySelector('dialog.dialogo');
  comprobar(dialogoBorrar !== null, 'INC-02: borrar progreso pide confirmación en un diálogo propio');
  comprobar(
    texto(dialogoBorrar!.querySelector('.dialogo-titulo')) === '¿Borrar todo tu progreso?',
    'INC-02: con el título de la acción, no con el dominio',
  );
  comprobar(llamadas.length === 0, 'sin confirmar todavía no se borra nada');
  botones(dialogoBorrar!, '.boton--primario')[0].click(); // "Borrar"
  comprobar(llamadas.length === 1 && llamadas[0][0] === 'borrarProgreso', 'borrar progreso (tras confirmar) llama a la acción');
  comprobar(texto(vista.querySelector('.aviso-estado')) === 'Progreso borrado.', 'confirma el borrado');
  comprobar(document.querySelector('dialog.dialogo') === null, 'INC-02: el diálogo se retira al cerrarse');

  llamadas = [];
  botones(vista, '.boton--peligro')[0].click();
  botones(document.querySelector('dialog.dialogo')!, '.boton')[0].click(); // "Cancelar"
  comprobar(llamadas.length === 0, 'cancelar en el diálogo no borra el progreso');

  const sinAlmacen = nuevaVista();
  pintarAjustes(sinAlmacen, contexto({ almacenDisponible: false }));
  comprobar(
    texto(sinAlmacen).includes('Este navegador no permite guardar datos'),
    'avisa si no hay almacenamiento disponible',
  );

  const conAjustes: Partial<Contexto> = { ajustes: { modoTema: 'oscuro', preguntas: 20, barajarOpciones: false } satisfies Ajustes };
  const vista2 = nuevaVista();
  pintarAjustes(vista2, contexto(conAjustes));
  const radios2 = [...vista2.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  comprobar(radios2[2].checked, 'repinta con el modo oscuro marcado');
  comprobar((vista2.querySelector('select') as HTMLSelectElement).value === '20', 'y con las preguntas guardadas');
  comprobar(!(vista2.querySelector('input[type="checkbox"]') as HTMLInputElement).checked, 'y con el barajado guardado');
}

// ---------------------------------------------------------------------------
seccion('Iconos SVG inline (Fase 9 · T1)');
{
  // Todo el catálogo cumple las mismas reglas: decorativos y heredando color.
  for (const nombre of ICONOS) {
    const svg = icono(nombre);
    comprobar(
      svg.tagName === 'svg' &&
        svg.getAttribute('viewBox') === '0 0 24 24' &&
        svg.getAttribute('aria-hidden') === 'true' &&
        svg.getAttribute('focusable') === 'false' &&
        svg.getAttribute('stroke') === 'currentColor' &&
        svg.classList.contains('icono') &&
        svg.querySelectorAll('path').length > 0,
      `icono «${nombre}»: SVG con viewBox, decorativo (aria-hidden), currentColor y trazo`,
    );
  }
  comprobar(ICONOS.includes('jugar') && ICONOS.includes('check'), 'el catálogo cubre nav, ✓ y ✗ (§14.2 idea 2)');

  const conClase = icono('check', 'icono--grande');
  comprobar(
    conClase.classList.contains('icono') && conClase.classList.contains('icono--grande'),
    'admite clases extra sin perder .icono',
  );

  // El icono no aporta texto: el nombre accesible sigue siendo el texto visible
  const caja = h('a', { href: '#' }, icono('jugar'), 'Jugar');
  comprobar(texto(caja) === 'Jugar', 'el icono no contamina el texto visible del enlace');
}

// ---------------------------------------------------------------------------
await (async () => {
  seccion('Flujo completo: montar, jugar, guardar y navegar');
  // Empezamos de cero: una única app montada en el documento
  document.body.innerHTML = '';

  const almacen = almacenFalso();
  guardarAjustes({ modoTema: 'auto', preguntas: 10, barajarOpciones: false }, almacen);

  const raiz = document.createElement('div');
  document.body.append(raiz);
  montarAplicacion(raiz, { catalogo, preguntasPorTema }, almacen);

  comprobar(texto(document.querySelector('.marca')) === 'Repaso de Historia', 'arranca con su cabecera');
  comprobar(document.querySelectorAll('.navegacion a').length === 3, 'tres destinos en la navegación');
  comprobar(
    [...document.querySelectorAll('.navegacion a')].every((a) => a.querySelectorAll('svg.icono').length === 1),
    'cada destino lleva su icono decorativo (T1)',
  );
  comprobar(
    [...document.querySelectorAll('.navegacion a')].map((a) => texto(a)).join('|') === 'Jugar|Progreso|Ajustes',
    'y el texto visible sigue mandando en el nombre accesible',
  );
  comprobar(
    document.querySelector('.navegacion a[data-ruta="/"]')!.getAttribute('aria-current') === 'page',
    'marca la pestaña activa',
  );
  comprobar(texto(document.querySelector('#vista h1')) === 'Elige curso y tema', 'y arranca en el inicio');

  // --- jugar un cuestionario completo (2 aciertos, 1 fallo) ---
  botones(document, '.tema:not(.tema--todos)')[0].click();
  comprobar(window.location.hash === '#/cuestionario', 'elegir tema lleva a #/cuestionario');
  comprobar(texto(document.querySelector('.contador')) === 'Pregunta 1 de 3', '3 preguntas (todas las disponibles)');

  botones(document, '.opcion')[1].click(); // barajar apagado: la 1 es la correcta
  comprobar(
    document.querySelector('.feedback')!.className.includes('feedback--ok'),
    'acierto con respuesta inmediata',
  );
  comprobar(
    (document.activeElement as HTMLElement | null)?.id === 'siguiente',
    'el foco salta al botón siguiente (no lector de pantalla perdido)',
  );
  botones(document, '#siguiente')[0].click();
  comprobar(texto(document.querySelector('.contador')) === 'Pregunta 2 de 3', 'pasa a la siguiente pregunta');

  botones(document, '.opcion')[0].click(); // fallo
  comprobar(document.querySelector('.feedback')!.className.includes('feedback--mal'), 'y detecta el fallo');
  botones(document, '#siguiente')[0].click();

  botones(document, '.opcion')[1].click(); // acierto
  botones(document, '#siguiente')[0].click(); // "Ver resultados"

  comprobar(window.location.hash === '#/resultados', 'la última pregunta lleva a #/resultados');
  comprobar(texto(document.querySelector('.nota')).startsWith('67'), 'nota 67 (2 de 3 aciertos)');
  comprobar(document.querySelectorAll('.falladas li').length === 1, 'lista la única fallada');
  comprobar(existe(document, '.insignia--nueva'), 'avisa de la nueva mejor nota');

  const guardado = leerProgreso(almacen);
  comprobar(guardado.temas['eso2/restauracion']?.mejorNota === 67, 'la mejor nota queda en localStorage');
  comprobar(
    guardado.temas['eso2/restauracion']?.jugados === 1 && guardado.cuestionarios === 1,
    'y también los contadores',
  );
  comprobar(guardado.racha === 1 && guardado.ultimoDia !== null, 'y abre la racha de días');

  // --- repetir solo las falladas (R/03) ---
  const enunciadoFallada = texto(document.querySelector('.falladas li .enunciado'));
  botones(document, '.boton')
    .find((b) => texto(b) === 'Repetir solo las falladas')!
    .click();
  comprobar(window.location.hash === '#/cuestionario', 'vuelve al cuestionario');
  comprobar(texto(document.querySelector('.contador')) === 'Pregunta 1 de 1', 'solo repite la pregunta fallada');
  comprobar(
    texto(document.querySelector('.enunciado')) === enunciadoFallada,
    'justamente la que se falló',
  );

  botones(document, '.boton--fantasma')[0].click();
  comprobar(window.location.hash === '#/cuestionario', 'INC-02: al salir primero se abre el diálogo');
  botones(document.querySelector('dialog.dialogo')!, '.boton--primario')[0].click();
  comprobar(window.location.hash === '#/', 'salir del cuestionario regresa al inicio');
  comprobar(texto(document.querySelector('#vista')).includes('Mejor nota: 67'), 'el inicio refleja la nota guardada');

  // --- «Todos los temas de {asignatura}»: fila conjunta (§13.1) ---
  const filasConjunto = botones(document, '.tema--todos');
  comprobar(filasConjunto.length === 2, 'hay una fila «Todos los temas» por asignatura');
  comprobar(
    texto(filasConjunto[0]).includes('Todos los temas de Historia'),
    'con el rótulo de su asignatura',
  );
  filasConjunto[0].click();
  comprobar(window.location.hash === '#/cuestionario', 'la fila conjunta arranca su cuestionario');
  comprobar(
    texto(document.querySelector('.contexto')) === '2º ESO · Todos los temas de Historia',
    'el contexto de juego lleva el rótulo del conjunto',
  );
  comprobar(texto(document.querySelector('.contador')) === 'Pregunta 1 de 4', 'el banco es la unión de sus temas (3 + 1)');

  botones(document, '.opcion')[0].click(); // fallo
  botones(document, '#siguiente')[0].click();
  for (let i = 0; i < 3; i++) {
    botones(document, '.opcion')[1].click(); // aciertos (sin barajar)
    botones(document, '#siguiente')[0].click();
  }

  comprobar(window.location.hash === '#/resultados', 'y también termina en resultados');
  comprobar(texto(document.querySelector('.nota')).startsWith('75'), 'nota 75 (3 de 4 aciertos)');
  const guardadoConjunto = leerProgreso(almacen);
  comprobar(
    guardadoConjunto.temas['eso2/__todos__/historia']?.mejorNota === 75,
    'la nota queda en la clave virtual del conjunto',
  );
  comprobar(
    guardadoConjunto.temas['eso2/restauracion']?.mejorNota === 67,
    'sin mezclarse con la del tema suelto',
  );

  botones(document, '.boton')
    .find((b) => texto(b) === 'Repetir solo las falladas')!
    .click();
  comprobar(window.location.hash === '#/cuestionario', 'se pueden repetir las falladas del conjunto');
  comprobar(texto(document.querySelector('.contador')) === 'Pregunta 1 de 1', 'tomadas del banco del conjunto');

  botones(document, '.boton--fantasma')[0].click();
  botones(document.querySelector('dialog.dialogo')!, '.boton--primario')[0].click();
  comprobar(window.location.hash === '#/', 'y se puede salir al inicio');

  // --- navegar con los enlaces de la cabecera ---
  (document.querySelector('a[href="#/progreso"]') as HTMLAnchorElement).click();
  await esperar(() => texto(document.querySelector('#vista h1')) === 'Tu progreso');
  comprobar(texto(document.querySelector('#vista h1')) === 'Tu progreso', 'el enlace a Progreso cambia de pantalla');
  comprobar(window.location.hash === '#/progreso', 'y deja la URL en #/progreso');
  comprobar(
    document.querySelector('.navegacion a[data-ruta="/progreso"]')!.getAttribute('aria-current') === 'page',
    'y actualiza la pestaña activa',
  );
  comprobar(
    document.querySelectorAll('tbody tr').length === 2,
    'dos filas: el tema suelto y la fila del conjunto (§13.1)',
  );
  comprobar(
    texto(document.querySelector('tbody tr th')) === 'Todos los temas de Historia',
    'y la del conjunto va primero, con su clave propia',
  );
  comprobar(texto(document.querySelector('.tarjeta-valor')) === '1', 'racha de 1 día');

  (document.querySelector('a[href="#/ajustes"]') as HTMLAnchorElement).click();
  await esperar(() => texto(document.querySelector('#vista h1')) === 'Ajustes');
  comprobar(texto(document.querySelector('#vista h1')) === 'Ajustes', 'el enlace a Ajustes cambia de pantalla');

  const select = document.querySelector('select') as HTMLSelectElement;
  cambio(select, '5');
  comprobar(leerAjustes(almacen).preguntas === 5, 'el nº de preguntas se guarda en localStorage');

  const radioOscuro = [...document.querySelectorAll('input[type="radio"]')][2] as HTMLInputElement;
  radioOscuro.checked = true;
  cambio(radioOscuro);
  comprobar(document.documentElement.getAttribute('data-tema') === 'oscuro', 'aplica el modo oscuro al documento');
  comprobar(leerAjustes(almacen).modoTema === 'oscuro', 'y lo persiste');

  botones(document, '.boton--peligro')[0].click();
  comprobar(
    JSON.stringify(leerProgreso(almacen)) !== JSON.stringify(progresoVacio()),
    'INC-02: mientras no se confirme, el progreso sigue intacto',
  );
  botones(document.querySelector('dialog.dialogo')!, '.boton--primario')[0].click();
  comprobar(
    JSON.stringify(leerProgreso(almacen)) === JSON.stringify(progresoVacio()),
    'borrar progreso vacía localStorage tras confirmar en el diálogo',
  );

  (document.querySelector('a[href="#/progreso"]') as HTMLAnchorElement).click();
  await esperar(() => texto(document.querySelector('#vista h1')) === 'Tu progreso');
  comprobar(
    texto(document.querySelector('#vista')).includes('Aún no has completado'),
    'y la pantalla de progreso queda vacía',
  );

  // --- guardas del enrutado ---
  window.location.hash = '#/cuestionario';
  await esperar(() => window.location.hash === '#/');
  comprobar(
    texto(document.querySelector('#vista h1')) === 'Elige curso y tema',
    'sin sesión activa, #/cuestionario vuelve al inicio',
  );

  window.location.hash = '#/ruta-que-no-existe';
  await esperar(() => window.location.hash === '#/');
  comprobar(
    texto(document.querySelector('#vista h1')) === 'Elige curso y tema',
    'una ruta desconocida también vuelve al inicio',
  );
})();

finalizar();
