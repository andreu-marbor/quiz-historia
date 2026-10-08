/**
 * Pruebas de la lógica del quiz: corrección, barajado y selección de preguntas.
 * Se ejecuta con `npm.cmd run prueba:logica` (esbuild + node).
 */

import { corregir, resumir } from '../src/logica/correccion';
import { barajar, presentarPregunta } from '../src/logica/barajado';
import {
  asignaturasDeCurso,
  buscarCurso,
  buscarTema,
  claveConjunto,
  claveTema,
  cursosOrdenados,
  minimoDeConjunto,
  preguntasDeConjunto,
  preguntasDeTema,
  temasDeAsignatura,
  temasDelCurso,
  temaJugable,
} from '../src/logica/catalogo';
import { seleccionarPreguntas } from '../src/logica/seleccion';
import type { Catalogo, Dificultad, Pregunta, Tema } from '../src/logica/tipos';
import { comprobar, finalizar, seccion } from './ayudante';

/** Generador determinista: mismas entradas, mismas salidas. */
const fijo = (): number => 0.42;

/** Generador congruencial reproducible a partir de una semilla (para pruebas). */
function generadorSembrado(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 2 ** 32;
  };
}

function crearPregunta(id: string, dificultad: Dificultad = 1, tags: string[] = []): Pregunta {
  return {
    id,
    enunciado: `¿Enunciado de ${id}?`,
    tipo: 'opcion-multiple',
    opciones: ['Opción A', 'Opción B', 'Opción C'],
    respuesta: 1,
    explicacion: `Explicación de ${id}.`,
    dificultad,
    tags,
  };
}

// ---------------------------------------------------------------------------
seccion('Corrección: una pregunta');
{
  const p = crearPregunta('eso2-tema-001');
  const acierto = corregir(p, 1);
  comprobar(acierto.acertada && acierto.correcta === 1, 'detecta un acierto');

  const fallo = corregir(p, 2);
  comprobar(!fallo.acertada && fallo.elegida === 2 && fallo.correcta === 1, 'detecta un fallo');

  let lanza = false;
  try {
    corregir(p, 3);
  } catch {
    lanza = true;
  }
  comprobar(lanza, 'lanza si el índice está fuera del rango de opciones');

  lanza = false;
  try {
    corregir(p, 1.5);
  } catch {
    lanza = true;
  }
  comprobar(lanza, 'lanza si el índice no es un entero');
}

seccion('Corrección: cuestionario completo');
{
  const preguntas = [crearPregunta('a-001'), crearPregunta('a-002'), crearPregunta('a-003'), crearPregunta('a-004')];
  const resultado = resumir(preguntas, [1, 0, null, 2]);
  comprobar(resultado.total === 4, 'cuenta el total de preguntas');
  comprobar(resultado.aciertos === 1 && resultado.errores === 3, 'aciertos = 1 y errores = 3');
  comprobar(resultado.nota === 25, `la nota es 25 (obtuvo ${resultado.nota})`);
  comprobar(resultado.falladas.length === 3, 'la lista de falladas tiene 3 preguntas');
  comprobar(
    resultado.detalles[2].elegida === null && !resultado.detalles[2].acertada,
    'una pregunta sin responder cuenta como fallo',
  );

  const perfecto = resumir(preguntas, [1, 1, 1, 1]);
  comprobar(perfecto.nota === 100 && perfecto.falladas.length === 0, 'cuestionario perfecto: nota 100 y sin falladas');

  const cero = resumir(preguntas, [0, 0, 0, 0]);
  comprobar(cero.nota === 0 && cero.aciertos === 0, 'cuestionario fallado del todo: nota 0');

  const vacio = resumir([], []);
  comprobar(vacio.nota === 0 && vacio.total === 0, 'un cuestionario vacío no divide por cero');

  let lanza = false;
  try {
    resumir(preguntas, [1, 1]);
  } catch {
    lanza = true;
  }
  comprobar(lanza, 'lanza si no coinciden preguntas y respuestas');
}

// ---------------------------------------------------------------------------
seccion('Barajado');
{
  const base = [1, 2, 3, 4, 5, 6, 7, 8];
  const barajada = barajar(base, fijo);
  comprobar(barajada.length === base.length, 'conserva la longitud');
  comprobar(
    [...barajada].sort((a, b) => a - b).join() === base.join(),
    'conserva exactamente los mismos elementos',
  );
  comprobar(base.join() === '1,2,3,4,5,6,7,8', 'no modifica el array original');
  comprobar(
    barajar(base, fijo).join() === barajada.join(),
    'con el mismo generador el resultado es reproducible',
  );

  const otra = barajar(base, generadorSembrado(7));
  comprobar(otra.join() !== base.join(), 'con otro generador el orden cambia');
  comprobar(
    barajar(base, generadorSembrado(7)).join() === otra.join(),
    'la misma semilla devuelve siempre el mismo orden',
  );
  comprobar(
    barajar(base, generadorSembrado(99)).join() !== otra.join(),
    'semillas distintas devuelven distinto orden',
  );

  const aleatorio = barajar([], fijo);
  comprobar(aleatorio.length === 0, 'barajar la nada devuelve la nada');
}

seccion('Presentación: opciones reordenadas');
{
  const p = crearPregunta('eso2-tema-010');
  let correctaSiempre = true;
  let algunaVezMovida = false;

  for (let i = 0; i < 200; i++) {
    const presentada = presentarPregunta(p);
    const opciones = presentada.opciones;
    if (opciones.length !== p.opciones.length) correctaSiempre = false;
    if (opciones[presentada.respuesta] !== p.opciones[p.respuesta]) correctaSiempre = false;
    if (opciones.join() !== p.opciones.join()) algunaVezMovida = true;
    if (new Set(opciones).size !== opciones.length) correctaSiempre = false;
  }

  comprobar(correctaSiempre, 'las 200 variantes mantienen la respuesta correcta en su nuevo índice');
  comprobar(algunaVezMovida, 'el orden de las opciones efectivamente cambia');

  const sinBarajar = presentarPregunta(p, { barajar: false });
  comprobar(
    sinBarajar.opciones.join() === p.opciones.join() && sinBarajar.respuesta === p.respuesta,
    'con barajar: false se respeta el orden original',
  );

  const vf: Pregunta = {
    id: 'eso2-tema-011',
    enunciado: 'Afirmación.',
    tipo: 'verdadero-falso',
    opciones: ['Verdadero', 'Falso'],
    respuesta: 1,
    explicacion: 'Explicación.',
    dificultad: 1,
  };
  const presentadoVf = presentarPregunta(vf);
  comprobar(
    presentadoVf.opciones.join() === 'Verdadero,Falso' && presentadoVf.respuesta === 1,
    'verdadero/falso nunca se baraja (Verdadero va primero)',
  );
}

// ---------------------------------------------------------------------------
seccion('Selección de preguntas');
{
  const banco: Pregunta[] = [
    ...[1, 2, 3].map((n) => crearPregunta(`c-t-${String(n).padStart(3, '0')}`, 1)),
    ...[4, 5, 6].map((n) => crearPregunta(`c-t-${String(n).padStart(3, '0')}`, 2)),
    ...[7, 8, 9].map((n) => crearPregunta(`c-t-${String(n).padStart(3, '0')}`, 3)),
  ];
  banco[0].tags = ['guerras'];
  banco[3].tags = ['guerras', 'europa'];
  banco[6].tags = ['industrializacion'];

  const elegidas = seleccionarPreguntas(banco, { cantidad: 5 }, fijo);
  comprobar(elegidas.length === 5, 'elige exactamente la cantidad pedida');
  comprobar(new Set(elegidas.map((p) => p.id)).size === 5, 'nunca repite preguntas');

  const ids = new Set(elegidas.map((p) => p.id));
  const nivel = (d: Dificultad): number => elegidas.filter((p) => p.dificultad === d).length;
  comprobar(
    nivel(1) === 2 && nivel(2) === 2 && nivel(3) === 1,
    `reparte la dificultad 2·2·1 (salió ${nivel(1)}·${nivel(2)}·${nivel(3)})`,
  );
  comprobar(ids.size === elegidas.length, 'sin ids repetidos en el resultado');

  const todas = seleccionarPreguntas(banco, { cantidad: 99 }, fijo);
  comprobar(todas.length === 9, 'si pides más que las disponibles, usa todas las que hay');
  comprobar(new Set(todas.map((p) => p.id)).size === 9, 'aun así sin repetir');

  const faciles = seleccionarPreguntas(banco, { cantidad: 4, dificultad: 1 }, fijo);
  comprobar(faciles.length === 3 && faciles.every((p) => p.dificultad === 1), 'filtra por dificultad y no excede el banco');

  const conTags = seleccionarPreguntas(banco, { cantidad: 10, tags: ['guerras'] }, fijo);
  comprobar(
    conTags.length === 2 && conTags.every((p) => p.tags?.includes('guerras')),
    'filtra por tags (2 preguntas con "guerras")',
  );

  const sinEseId = banco[0].id;
  const sinExcluida = seleccionarPreguntas(banco, { cantidad: 9, excluirIds: [sinEseId] }, fijo);
  comprobar(
    sinExcluida.length === 8 && !sinExcluida.some((p) => p.id === sinEseId),
    'excluye los ids indicados (repetir solo las falladas)',
  );

  const ninguna = seleccionarPreguntas(banco, { cantidad: 0 }, fijo);
  comprobar(ninguna.length === 0, 'cantidad 0 devuelve una lista vacía');

  const duplicadas = [...banco, banco[0]];
  const sinDuplicadas = seleccionarPreguntas(duplicadas, { cantidad: 99 }, fijo);
  comprobar(sinDuplicadas.length === 9, 'si el banco trae ids duplicados, los colapsa');

  let lanza = false;
  try {
    seleccionarPreguntas(banco, { cantidad: -1 }, fijo);
  } catch {
    lanza = true;
  }
  comprobar(lanza, 'lanza si la cantidad no es un entero ≥ 0');

  const vacio = seleccionarPreguntas([], { cantidad: 5 }, fijo);
  comprobar(vacio.length === 0, 'banco vacío → sin preguntas (el validador lo impide en datos/)');
}

// ---------------------------------------------------------------------------
seccion('Catálogo: orden, búsquedas y mínimo de preguntas');
{
  const catalogo: Catalogo = {
    cursos: [
      {
        id: 'bachillerato1',
        titulo: '1º Bachillerato',
        orden: 3,
        asignaturas: [
          {
            id: 'historia',
            titulo: 'Historia',
            orden: 1,
            temas: [{ id: 'guerras-frias', titulo: 'La Guerra Fría', orden: 2, minPreguntas: 4 }],
          },
          {
            // 2º Bachillerato con Historia + Historia del Arte es el caso real (§13.2)
            id: 'historia-del-arte',
            titulo: 'Historia del Arte',
            orden: 2,
            temas: [{ id: 'renacimiento', titulo: 'El Renacimiento', orden: 1, minPreguntas: 3 }],
          },
        ],
      },
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
              { id: 'revolucion-industrial', titulo: 'Revolución Industrial', orden: 2, minPreguntas: 4 },
              { id: 'restauracion', titulo: 'Restauración borbónica', orden: 1, minPreguntas: 6 },
            ],
          },
        ],
      },
      { id: 'eso4', titulo: '4º ESO', orden: 2, asignaturas: [] },
    ],
  };

  const ordenCursos = cursosOrdenados(catalogo).map((c) => c.id);
  comprobar(ordenCursos.join() === 'eso2,eso4,bachillerato1', 'ordena los cursos por su campo `orden`');

  const eso2 = buscarCurso(catalogo, 'eso2');
  comprobar(Boolean(eso2) && eso2?.titulo === '2º ESO', 'busca un curso por su id');
  comprobar(buscarCurso(catalogo, 'no-existe') === undefined, 'un curso inexistente devuelve undefined');

  const ordenTemas = eso2 ? temasDelCurso(eso2).map((t) => t.id) : [];
  comprobar(ordenTemas.join() === 'restauracion,revolucion-industrial', 'ordena los temas por su campo `orden`');
  comprobar(
    temasDelCurso(buscarCurso(catalogo, 'eso4')!).length === 0,
    'un curso sin asignaturas no falla (defensivo)',
  );

  // --- asignaturas: estructura obligatoria cursos > asignaturas > temas (§13.2) ---
  const bach = buscarCurso(catalogo, 'bachillerato1')!;
  comprobar(
    asignaturasDeCurso(bach).map((a) => a.id).join() === 'historia,historia-del-arte',
    'ordena las asignaturas por su campo `orden`',
  );
  comprobar(
    asignaturasDeCurso(buscarCurso(catalogo, 'eso4')!).length === 0,
    'las asignaturas vacías devuelven lista vacía',
  );
  comprobar(
    temasDeAsignatura(asignaturasDeCurso(bach)[1]).map((t) => t.id).join() === 'renacimiento',
    'los temas viven dentro de su asignatura',
  );
  comprobar(temasDelCurso(bach).length === 2, 'temasDelCurso aplana todas las asignaturas del curso');

  const tema = eso2 ? buscarTema(eso2, 'restauracion') : undefined;
  comprobar(Boolean(tema) && tema?.minPreguntas === 6, 'busca un tema por su id dentro del curso');
  comprobar(!eso2 || buscarTema(eso2, 'no-existe') === undefined, 'un tema inexistente devuelve undefined');
  comprobar(
    buscarTema(bach, 'renacimiento')?.titulo === 'El Renacimiento',
    'encuentra un tema que vive en la segunda asignatura',
  );

  comprobar(claveTema('eso2', 'restauracion') === 'eso2/restauracion', 'la clave de tema es `<curso>/<tema>`');

  const indice = new Map<string, readonly Pregunta[]>([
    ['eso2/restauracion', [crearPregunta('eso2-restauracion-001')]],
    ['eso2/vacia', []],
  ]);
  comprobar(
    preguntasDeTema(indice, 'eso2', 'restauracion').length === 1,
    'recupera las preguntas de un tema del índice',
  );
  comprobar(preguntasDeTema(indice, 'eso2', 'sin-archivo').length === 0, 'un tema sin archivo no lanza');

  // --- mínimas preguntas para poder jugar (§3 / R/05) ---
  const banco = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => crearPregunta(`eso2-restauracion-${n}`));
  const minimo: Tema = { id: 'restauracion', titulo: 'Restauración borbónica', orden: 1, minPreguntas: 6 };
  comprobar(temaJugable(banco, minimo), 'con ≥ minPreguntas el tema se puede jugar');
  comprobar(!temaJugable(banco.slice(0, 5), minimo), 'con minPreguntas − 1 el tema queda bloqueado');
  comprobar(!temaJugable([], minimo), 'un tema vacío nunca es jugable');
  comprobar(temaJugable(banco, { ...minimo, minPreguntas: 0 }), 'minPreguntas 0 siempre permite jugar');

  const dificiles = banco.map((p) => ({ ...p, dificultad: 3 as Dificultad }));
  const elegidas = seleccionarPreguntas(dificiles, { cantidad: 6 }, fijo);
  comprobar(
    elegidas.length === 6 && new Set(elegidas.map((p) => p.id)).size === 6,
    'un cuestionario completo de 6 nunca repite preguntas',
  );

  // --- §13.1: fila «Todos los temas de {asignatura}» ---
  comprobar(
    claveConjunto('2bach', 'historia') === '2bach/__todos__/historia',
    'la clave del conjunto es `<curso>/__todos__/<asignatura>`',
  );
  comprobar(
    claveConjunto('eso2', 'historia') !== claveTema('eso2', 'historia'),
    'y nunca choca con la clave de un tema real',
  );
  comprobar(
    claveConjunto('2bach', 'historia') !== claveConjunto('2bach', 'historia-del-arte'),
    'dos asignaturas del mismo curso tienen claves distintas',
  );

  const idxConjunto = new Map<string, readonly Pregunta[]>([
    ['eso2/restauracion', [crearPregunta('eso2-restauracion-001'), crearPregunta('eso2-restauracion-002')]],
    [
      'eso2/revolucion-industrial',
      [
        crearPregunta('eso2-restauracion-002'), // id repetido entre temas, a propósito
        crearPregunta('eso2-revolucion-industrial-001'),
      ],
    ],
  ]);
  const conjunto = preguntasDeConjunto(idxConjunto, eso2!, 'historia');
  comprobar(conjunto.length === 3, 'une los temas de la asignatura');
  comprobar(
    conjunto.map((p) => p.id).join() ===
      'eso2-restauracion-001,eso2-restauracion-002,eso2-revolucion-industrial-001',
    'en orden (temas ordenados) y colapsando los ids repetidos',
  );
  comprobar(
    preguntasDeConjunto(idxConjunto, eso2!, 'sin-asignatura').length === 0,
    'una asignatura inexistente devuelve banco vacío (sin lanzar)',
  );
  comprobar(
    preguntasDeConjunto(idxConjunto, buscarCurso(catalogo, 'eso4')!, 'historia').length === 0,
    'un curso sin asignaturas, igual',
  );

  comprobar(
    minimoDeConjunto(temasDeAsignatura(asignaturasDeCurso(eso2!)[0])) === 6,
    'el mínimo del conjunto es el MAYOR de sus temas (4 y 6 → 6)',
  );
  comprobar(minimoDeConjunto([]) === 0, 'un conjunto sin temas no exige nada');

  // El sorteo del conjunto reparte las dificultades igual que el de un tema
  const pool: Pregunta[] = [
    ...[1, 2, 3].map((n) => crearPregunta(`c-c-${String(n).padStart(3, '0')}`, 1)),
    ...[4, 5, 6].map((n) => crearPregunta(`c-c-${String(n).padStart(3, '0')}`, 2)),
    ...[7, 8, 9].map((n) => crearPregunta(`c-c-${String(n).padStart(3, '0')}`, 3)),
  ];
  const sorteo = seleccionarPreguntas(pool, { cantidad: 5 }, fijo);
  const nivel = (d: Dificultad): number => sorteo.filter((p) => p.dificultad === d).length;
  comprobar(
    sorteo.length === 5 && nivel(1) === 2 && nivel(2) === 2 && nivel(3) === 1,
    `el sorteo del conjunto reparte las dificultades 2·2·1 (salió ${nivel(1)}·${nivel(2)}·${nivel(3)})`,
  );
}

finalizar();
