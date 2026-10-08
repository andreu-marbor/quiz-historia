/**
 * Núcleo de la aplicación: shell (cabecera + navegación), enrutado por hash y
 * estado de la sesión (partida en curso y último resultado).
 *
 * Separa el arranque (`main.ts`, que carga el bundle de datos y los CSS) de la
 * lógica, para poder probar el flujo completo en jsdom.
 *
 * Las pantallas viven en `src/ui/`; la lógica en `src/logica/`;
 * el almacenamiento, SOLO en `src/persistencia.ts`.
 */

import { presentarPregunta } from './logica/barajado';
import {
  asignaturaDeCurso,
  buscarCurso,
  buscarTema,
  claveConjunto,
  claveTema,
  minimoDeConjunto,
  preguntasDeConjunto,
  preguntasDeTema,
  temasDeAsignatura,
  temaJugable,
} from './logica/catalogo';
import { resumir, type Resultado } from './logica/correccion';
import { seleccionarPreguntas } from './logica/seleccion';
import type { Catalogo, Pregunta, Seleccion } from './logica/tipos';
import {
  borrarProgreso as borrarProgresoAlmacen,
  guardarAjustes,
  guardarProgreso,
  leerAjustes,
  leerProgreso,
  progresoVacio,
  registrarCuestionario,
  type Ajustes,
  type Almacen,
  type Progreso,
} from './persistencia';
import { pintarAjustes } from './ui/ajustes';
import { T } from './ui/cadenas';
import { aplicarRespuesta, pintarCuestionario } from './ui/cuestionario';
import type { Acciones, Contexto, Sesion, TemaDelResultado } from './ui/contexto';
import { h, vaciar } from './ui/dom';
import { icono, type NombreIcono } from './ui/iconos';
import { pintarInicio } from './ui/inicio';
import { pintarProgreso } from './ui/progreso';
import { pintarResultados } from './ui/resultados';

/** Datos integrados que consume la app (en producción, el bundle de `datos/`). */
export interface Fuentes {
  catalogo: Catalogo;
  preguntasPorTema: ReadonlyMap<string, readonly Pregunta[]>;
}

interface Estado {
  sesion: Sesion | null;
  resultado: Resultado | null;
  temaResultado: TemaDelResultado | null;
  /** El último cuestionario ha superado la mejor nota anterior del tema */
  nuevaMejor: boolean;
}

/**
 * Monta la app dentro de `raiz`: dibuja el shell, instala el enrutado por hash
 * y pinta la pantalla inicial.
 */
export function montarAplicacion(raiz: HTMLElement, fuentes: Fuentes, almacen: Almacen | null): void {
  const estado: Estado = { sesion: null, resultado: null, temaResultado: null, nuevaMejor: false };
  let ajustes: Ajustes = leerAjustes(almacen);
  let progreso: Progreso = leerProgreso(almacen);
  let vista: HTMLElement;

  // ---------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------

  function montar(): void {
    vaciar(raiz);

    // Icono decorativo + texto visible: el nombre accesible sigue siendo el texto
    const enlaces: Array<[string, string, NombreIcono]> = [
      ['/', T.nav.jugar, 'jugar'],
      ['/progreso', T.nav.progreso, 'progreso'],
      ['/ajustes', T.nav.ajustes, 'ajustes'],
    ];

    const navegacion = h(
      'nav',
      { class: 'navegacion', 'aria-label': T.nav.principal },
      h(
        'ul',
        {},
        ...enlaces.map(([ruta, texto, nombre]) =>
          h('li', {}, h('a', { href: `#${ruta}`, 'data-ruta': ruta }, icono(nombre), texto)),
        ),
      ),
    );

    const cabecera = h(
      'header',
      { class: 'cabecera' },
      h('a', { class: 'marca', href: '#/' }, T.nombre),
      navegacion,
    );

    vista = h('main', { id: 'vista', tabindex: '-1' });
    raiz.append(cabecera, vista);
  }

  // ---------------------------------------------------------------------
  // Enrutado
  // ---------------------------------------------------------------------

  function rutaActual(): string {
    return window.location.hash.replace(/^#/, '') || '/';
  }

  function navegar(ruta: string): void {
    const destino = `#${ruta}`;
    if (window.location.hash !== destino) window.location.hash = destino;
    // Se pinta aquí mismo para no depender del (asíncrono) evento hashchange;
    // cuando llegue, se repinta de forma idempotente.
    pintar();
    enfocarTitulo();
  }

  function pintar(): void {
    vaciar(vista);
    const ruta = rutaActual();
    const ctx = contexto();
    actualizarNavegacion(ruta);

    switch (ruta) {
      case '/':
        pintarInicio(vista, ctx);
        break;
      case '/cuestionario':
        if (!estado.sesion) {
          navegar('/');
          return;
        }
        pintarCuestionario(vista, ctx);
        break;
      case '/resultados':
        if (!estado.resultado || !estado.temaResultado) {
          navegar('/');
          return;
        }
        pintarResultados(vista, ctx);
        break;
      case '/progreso':
        pintarProgreso(vista, ctx);
        break;
      case '/ajustes':
        pintarAjustes(vista, ctx);
        break;
      default:
        navegar('/');
    }
  }

  /** Mueve el foco al encabezado de la pantalla (aviso a lectores de pantalla). */
  function enfocarTitulo(): void {
    const titulo = vista.querySelector<HTMLElement>('h1') ?? vista;
    titulo.focus();
  }

  function actualizarNavegacion(ruta: string): void {
    const activa = ruta === '/progreso' ? '/progreso' : ruta === '/ajustes' ? '/ajustes' : '/';
    document.querySelectorAll<HTMLAnchorElement>('.navegacion a').forEach((enlace) => {
      if (enlace.dataset.ruta === activa) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    });
  }

  function contexto(): Contexto {
    return {
      catalogo: fuentes.catalogo,
      preguntasPorTema: fuentes.preguntasPorTema,
      ajustes,
      progreso,
      sesion: estado.sesion,
      resultado: estado.resultado,
      temaResultado: estado.temaResultado,
      nuevaMejor: estado.nuevaMejor,
      almacenDisponible: almacen !== null,
      acciones,
    };
  }

  // ---------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------

  const acciones: Acciones = {
    elegirTema(cursoId, temaId) {
      iniciar({ tipo: 'tema', cursoId, temaId }, null);
    },

    elegirConjunto(cursoId, asignaturaId) {
      iniciar({ tipo: 'conjunto', cursoId, asignaturaId }, null);
    },

    responder(indice) {
      const sesion = estado.sesion;
      if (!sesion || sesion.respuestas[sesion.actual] !== null) return;
      const presentada = sesion.preguntas[sesion.actual];
      // La respuesta se guarda en el orden ORIGINAL de la pregunta (para corregir)
      sesion.respuestas[sesion.actual] = presentada.originales[indice] ?? indice;
      aplicarRespuesta(vista, contexto());
      document.querySelector<HTMLButtonElement>('#siguiente')?.focus();
    },

    siguiente() {
      const sesion = estado.sesion;
      if (!sesion) return;
      if (sesion.actual < sesion.preguntas.length - 1) {
        sesion.actual++;
        pintar();
        enfocarTitulo();
        return;
      }
      finalizar(sesion);
    },

    repetir(soloFalladas) {
      const tema = estado.temaResultado;
      if (!tema) return;
      const ids = soloFalladas && estado.resultado ? estado.resultado.falladas.map((p) => p.id) : null;
      iniciar(tema.seleccion, ids);
    },

    cambiarAjustes(cambios) {
      ajustes = { ...ajustes, ...cambios };
      guardarAjustes(ajustes, almacen);
      aplicarTema(); // el resto de la pantalla no depende de estos ajustes: sin repintar
    },

    borrarProgreso() {
      borrarProgresoAlmacen(almacen);
      progreso = progresoVacio();
      estado.nuevaMejor = false;
    },

    abandonar() {
      estado.sesion = null;
      navegar('/');
    },

    ir(ruta) {
      navegar(ruta);
    },
  };

  // ---------------------------------------------------------------------
  // Partida
  // ---------------------------------------------------------------------

  /**
   * Monta la partida a partir de la **selección** (§13.1): un tema concreto o la
   * fila «Todos los temas de {asignatura}». `idsFalladas` restringe el banco a
   * esas preguntas (botón «Repetir solo las falladas»).
   */
  function iniciar(seleccion: Seleccion, idsFalladas: readonly string[] | null): void {
    const curso = buscarCurso(fuentes.catalogo, seleccion.cursoId);
    if (!curso) {
      navegar('/');
      return;
    }

    // Banco disponible, título visible y clave de progreso de lo elegido
    let disponibles: readonly Pregunta[];
    let titulo: string;
    let clave: string;

    if (seleccion.tipo === 'tema') {
      const tema = buscarTema(curso, seleccion.temaId);
      if (!tema) {
        navegar('/');
        return;
      }
      disponibles = preguntasDeTema(fuentes.preguntasPorTema, curso.id, tema.id);
      if (!temaJugable(disponibles, tema)) {
        navegar('/');
        return;
      }
      titulo = tema.titulo;
      clave = claveTema(curso.id, tema.id);
    } else {
      const asignatura = asignaturaDeCurso(curso, seleccion.asignaturaId);
      if (!asignatura) {
        navegar('/');
        return;
      }
      const temas = temasDeAsignatura(asignatura);
      disponibles = preguntasDeConjunto(fuentes.preguntasPorTema, curso, asignatura.id);
      if (disponibles.length < minimoDeConjunto(temas)) {
        navegar('/');
        return;
      }
      titulo = T.inicio.todosDe(asignatura.titulo);
      clave = claveConjunto(curso.id, asignatura.id);
    }

    const candidatas = idsFalladas
      ? disponibles.filter((p) => idsFalladas.includes(p.id))
      : [...disponibles];
    if (candidatas.length === 0) {
      navegar('/');
      return;
    }

    const cantidad =
      idsFalladas !== null || ajustes.preguntas === 0 ? candidatas.length : ajustes.preguntas;

    const elegidas = seleccionarPreguntas(candidatas, { cantidad });
    const preguntas = elegidas.map((p) => presentarPregunta(p, { barajar: ajustes.barajarOpciones }));

    estado.sesion = {
      cursoId: curso.id,
      seleccion,
      claveTema: clave,
      cursoTitulo: curso.titulo,
      temaTitulo: titulo,
      preguntas,
      respuestas: preguntas.map(() => null),
      actual: 0,
      soloFalladas: idsFalladas !== null,
    };
    estado.resultado = null;
    estado.temaResultado = null;
    estado.nuevaMejor = false;

    navegar('/cuestionario');
  }

  function finalizar(sesion: Sesion): void {
    const resultado = resumir(
      sesion.preguntas.map((p) => p.pregunta),
      sesion.respuestas,
    );
    const notaAnterior = progreso.temas[sesion.claveTema]?.mejorNota ?? 0;

    progreso = registrarCuestionario(progreso, sesion.claveTema, resultado.nota);
    guardarProgreso(progreso, almacen);

    estado.resultado = resultado;
    estado.temaResultado = {
      seleccion: sesion.seleccion,
      cursoTitulo: sesion.cursoTitulo,
      temaTitulo: sesion.temaTitulo,
    };
    estado.nuevaMejor = resultado.nota > notaAnterior;
    estado.sesion = null;

    navegar('/resultados');
  }

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------

  function aplicarTema(): void {
    const raizDocumento = document.documentElement;
    if (ajustes.modoTema === 'auto') raizDocumento.removeAttribute('data-tema');
    else raizDocumento.setAttribute('data-tema', ajustes.modoTema);
  }

  aplicarTema();
  montar();
  window.addEventListener('hashchange', () => {
    pintar();
    enfocarTitulo();
  });
  pintar();
}
