/**
 * §13.3 · Puente web → widget nativo de Android.
 *
 * La racha vive en `localStorage` (dentro de Chrome) y el widget en
 * `SharedPreferences` (dentro de la app): Android no deja leer una cosa desde
 * la otra, así que la web avisa disparando un `intent://`.
 *
 * Tres exigencias de Chrome hay que tenerlas presentes (documentación oficial
 * de «Android Intents with Chrome»):
 *
 *  1. **Exige gesto de usuario**: un `intent://` lanzado por un temporizador no
 *     abre nada → sin gesto, el envío se pone en cola y sale con el primer
 *     toque (por eso «enviar al arrancar» funciona: encola y espera).
 *  2. Solo puede abrir actividades con la categoría **`BROWSABLE`** (está en el
 *     filtro del `AndroidManifest.xml`).
 *  3. Sin receptor, Chrome enseña «No se encontró ninguna aplicación» → por eso
 *     el despliegue es en dos pasos (constante `PUENTE_WIDGET_ACTIVADO`), solo
 *     se intenta **dentro de la app instalada** (nunca desde un enlace normal
 *     del README) y hay un **sondeo** que apaga el puente si la página nunca
 *     llega a irse a segundo plano (APK viejo).
 *
 * Nada de esto toca `location` de verdad en las pruebas: todo es inyectable.
 */

import type { Almacen } from '../persistencia';

/**
 * Paso 2 del despliegue en dos pasos: se pone a `true` **cuando el APK con el
 * receptor ya esté instalado**. Con `false` no se manda nada (así el APK viejo
 * no enseña ningún diálogo de Chrome).
 */
export const PUENTE_WIDGET_ACTIVADO = false;

/** Clave del almacén: estado del puente (`ok` o `sin-soporte:<marca de tiempo>`). */
export const CLAVE_WIDGET = 'repaso-historia:widget:v1';

/** El «sin soporte» caduca para volver a probar tras actualizar el APK. */
export const CADUCIDAD_SIN_SOPORTE = 7 * 24 * 60 * 60 * 1000;

/** Único paquete que escucha el intent (de `twa-manifest.json`). */
const PAQUETE = 'com.andreumarbor.quizophistoria';
const ESQUEMA = 'quizhistoria';
const ACCION = `${PAQUETE}.widget.RACHA`;
const MS_SONDEO = 1200;

/**
 * URL `intent://` que lanza el puente nativo con la racha como extras.
 * `S.` = extra de tipo texto en el formato de URI de intención de Android.
 */
export function construirIntent(racha: number, ultimoDia: string | null): string {
  return (
    `intent://racha#Intent;scheme=${ESQUEMA};package=${PAQUETE};action=${ACCION};` +
    `S.racha=${racha};S.ultimoDia=${ultimoDia ?? ''};end`
  );
}

export interface OpcionesPuente {
  /** ¿Se está enviando? Por defecto, `PUENTE_WIDGET_ACTIVADO`. */
  activo?: boolean;
  /** ¿Este navegador sabe abrir `intent://`? Por defecto, Android + Chrome. */
  esAndroidChrome?: () => boolean;
  /** ¿Estamos dentro de la app instalada (TWA o PWA)? */
  enApp?: () => boolean;
  /** ¿Hay gesto de usuario ahora mismo? Por defecto, `navigator.userActivation`. */
  hayGesto?: () => boolean;
  /** Dónde se manda la URL. Por defecto, `location.assign`. */
  navegar?: (url: string) => void;
  /** Temporizador del sondeo. Por defecto, `setTimeout`. */
  esperar?: (fn: () => void, ms: number) => void;
  /** ¿Está la página en segundo plano? */
  estaOculta?: () => boolean;
  /** Suscripción a la pérdida de visibilidad; devuelve el cancelador. */
  alPerderVisibilidad?: (fn: () => void) => () => void;
  /** Reloj (para la caducidad del «sin soporte»). */
  ahora?: () => number;
}

export interface Puente {
  /** Manda la racha al widget, o la deja en cola hasta el próximo gesto. */
  enviar(racha: number, ultimoDia: string | null): void;
  /** ¿Hay un envío esperando gesto? (para las pruebas) */
  pendiente(): boolean;
}

/** Android con Chrome: el único sitio donde un `intent://` puede abrir la app. */
function detectarAndroidChrome(): boolean {
  const agente = window.navigator.userAgent;
  return /Android/i.test(agente) && /(Chrome|CriOS|Edg|OPR)\//.test(agente);
}

/**
 * ¿Estamos dentro de la app instalada? En la TWA (y en la PWA instalada)
 * Chrome informa del modo de visualización del manifiesto; quien llegue desde
 * un enlace abierto en el navegador, no. Ese es el filtro que evita que un
 * visitante del README se lleve un diálogo de Chrome al terminar un quiz.
 */
function detectarApp(): boolean {
  const media = (consulta: string): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia(consulta).matches;
  return (
    media('(display-mode: standalone)') ||
    media('(display-mode: fullscreen)') ||
    document.referrer.startsWith('android-app://')
  );
}

/** El gesto de usuario que exige Chrome para lanzar un `intent://`. */
function detectarGesto(): boolean {
  const navegador = window.navigator as Navigator & { userActivation?: { isActive?: boolean } };
  return navegador.userActivation ? navegador.userActivation.isActive !== false : true;
}

function suscribirVisibilidad(alCambiar: () => void): () => void {
  document.addEventListener('visibilitychange', alCambiar);
  return () => document.removeEventListener('visibilitychange', alCambiar);
}

/**
 * Crea el puente. `almacen` es el mismo de siempre (el de `persistencia.ts`),
 * donde se recuerda si el receptor existe; `opciones` solo lo tocan las
 * pruebas.
 */
export function crearPuenteWidget(
  almacen: Almacen | null,
  opciones: OpcionesPuente = {},
): Puente {
  const activo = opciones.activo ?? PUENTE_WIDGET_ACTIVADO;
  const esAndroidChrome = opciones.esAndroidChrome ?? detectarAndroidChrome;
  const enApp = opciones.enApp ?? detectarApp;
  const hayGesto = opciones.hayGesto ?? detectarGesto;
  const navegar = opciones.navegar ?? ((url: string) => void window.location.assign(url));
  const esperar = opciones.esperar ?? ((fn: () => void, ms: number) => void window.setTimeout(fn, ms));
  const estaOculta = opciones.estaOculta ?? (() => document.visibilityState === 'hidden');
  const alPerderVisibilidad = opciones.alPerderVisibilidad ?? suscribirVisibilidad;
  const ahora = opciones.ahora ?? Date.now;

  /** Valor a enviar, a la espera de gesto. */
  let valor: [number, string | null] | null = null;
  let manejadorGesto: (() => void) | null = null;
  let cancelarVisibilidad: (() => void) | null = null;
  let sondeando = false;

  /** ¿El puente se ha apagado por no encontrar receptor (y no ha caducado)? */
  function sinSoporte(): boolean {
    const bruto = almacen?.getItem(CLAVE_WIDGET);
    if (!bruto?.startsWith('sin-soporte:')) return false;
    const marca = Number(bruto.slice('sin-soporte:'.length));
    if (Number.isFinite(marca) && ahora() - marca <= CADUCIDAD_SIN_SOPORTE) return true;
    almacen?.removeItem(CLAVE_WIDGET); // ha pasado la semana: volvemos a probar
    return false;
  }

  function escucharGesto(): void {
    if (manejadorGesto) return;
    manejadorGesto = () => {
      dejarDeEscucharGesto();
      intentar();
    };
    document.addEventListener('pointerdown', manejadorGesto, true);
    document.addEventListener('keydown', manejadorGesto, true);
  }

  function dejarDeEscucharGesto(): void {
    if (!manejadorGesto) return;
    document.removeEventListener('pointerdown', manejadorGesto, true);
    document.removeEventListener('keydown', manejadorGesto, true);
    manejadorGesto = null;
  }

  /**
   * ¿Ha salido realmente la página a segundo plano? Si no, es que Chrome no ha
   * abierto nada (APK sin receptor o sin gesto): se apaga el puente para no
   * repetir el diálogo. Si la página sí se va, el receptor existe y no hace
   * falta volver a mirar.
   */
  function sondear(): void {
    if (sondeando || almacen === null) return;
    sondeando = true;
    let ocultada = false;
    cancelarVisibilidad = alPerderVisibilidad(() => {
      ocultada = true;
    });
    esperar(() => {
      cancelarVisibilidad?.();
      cancelarVisibilidad = null;
      sondeando = false;
      almacen.setItem(CLAVE_WIDGET, ocultada || estaOculta() ? 'ok' : `sin-soporte:${ahora()}`);
    }, MS_SONDEO);
  }

  function intentar(): void {
    if (!valor) return;
    if (!hayGesto()) {
      escucharGesto();
      return;
    }
    const [racha, ultimoDia] = valor;
    valor = null;
    try {
      navegar(construirIntent(racha, ultimoDia));
    } catch {
      // Sin navegador que lo soporte: que lo diga el sondeo, sin romper nada.
    }
    if (almacen?.getItem(CLAVE_WIDGET) !== 'ok') sondear();
  }

  function enviar(racha: number, ultimoDia: string | null): void {
    if (!activo || sinSoporte()) return;
    // Fuera de Android/Chrome o fuera de la app instalada no se intenta siquiera.
    if (!esAndroidChrome() || !enApp()) return;
    valor = [racha, ultimoDia];
    intentar();
  }

  return { enviar, pendiente: () => valor !== null };
}
