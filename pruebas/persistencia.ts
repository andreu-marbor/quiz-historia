/**
 * Pruebas de la lógica de persistencia: ajustes, progreso y racha.
 * Usa un almacén falso inyectado, así se prueban sin navegador.
 * Se ejecuta con `npm.cmd run prueba:persistencia` (esbuild + node).
 */

import {
  avanzarRacha,
  borrarProgreso,
  diasEntre,
  fechaLocal,
  guardarAjustes,
  guardarProgreso,
  leerAjustes,
  leerProgreso,
  progresoVacio,
  registrarCuestionario,
  ajustesPorDefecto,
  type Almacen,
} from '../src/persistencia';
import { comprobar, finalizar, seccion } from './ayudante';

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

// ---------------------------------------------------------------------------
seccion('Ajustes: valores por defecto y lectura defensiva');
{
  const vacio = almacenFalso();
  comprobar(
    JSON.stringify(leerAjustes(vacio)) === JSON.stringify(ajustesPorDefecto()),
    'sin datos guardados devuelve los ajustes por defecto',
  );
  comprobar(
    JSON.stringify(leerAjustes(null)) === JSON.stringify(ajustesPorDefecto()),
    'sin almacén disponible (null) también devuelve los defectos',
  );

  const corrupto = almacenFalso();
  corrupto.setItem('repaso-historia:ajustes:v1', '{esto no es json');
  comprobar(
    JSON.stringify(leerAjustes(corrupto)) === JSON.stringify(ajustesPorDefecto()),
    'JSON corrupto → ajustes por defecto, sin lanzar',
  );

  const sueltos = almacenFalso();
  sueltos.setItem('repaso-historia:ajustes:v1', JSON.stringify({ modoTema: 'neon', preguntas: 7, barajarOpciones: 'sí' }));
  comprobar(
    JSON.stringify(leerAjustes(sueltos)) === JSON.stringify(ajustesPorDefecto()),
    'valores fuera de catálogo → cada campo cae en su defecto',
  );

  const parcial = almacenFalso();
  parcial.setItem('repaso-historia:ajustes:v1', JSON.stringify({ modoTema: 'oscuro', preguntas: 0 }));
  const leido = leerAjustes(parcial);
  comprobar(leido.modoTema === 'oscuro', 'conserva el modo de color guardado');
  comprobar(leido.preguntas === 0, 'admite 0 = todas las del tema');
  comprobar(leido.barajarOpciones === true, 'el campo que faltaba usa su defecto');
}

seccion('Ajustes: guardado y recuperación');
{
  const al = almacenFalso();
  guardarAjustes({ modoTema: 'claro', preguntas: 15, barajarOpciones: false }, al);
  const leido = leerAjustes(al);
  comprobar(leido.modoTema === 'claro' && leido.preguntas === 15 && leido.barajarOpciones === false, 'guarda y recupera los tres ajustes');
  comprobar(al.datos.size === 1, 'todo el ajuste vive en una única clave de almacenamiento');

  guardarAjustes({ modoTema: 'oscuro', preguntas: 20, barajarOpciones: true }, al);
  comprobar(leerAjustes(al).preguntas === 20, 'sobrescribe el guardado anterior');

  guardarAjustes(ajustesPorDefecto(), null);
  comprobar(true, 'guardar sin almacén no lanza (modo privado)');
}

// ---------------------------------------------------------------------------
seccion('Racha de días consecutivos');
{
  comprobar(
    JSON.stringify(avanzarRacha(0, null, '2026-10-06')) === JSON.stringify({ racha: 1, ultimoDia: '2026-10-06' }),
    'primer día de actividad → racha 1',
  );

  const mismoDia = avanzarRacha(3, '2026-10-06', '2026-10-06');
  comprobar(mismoDia.racha === 3, 'varios cuestionarios el mismo día no incrementan la racha');

  const seguido = avanzarRacha(3, '2026-10-06', '2026-10-07');
  comprobar(seguido.racha === 4 && seguido.ultimoDia === '2026-10-07', 'día siguiente → +1 y actualiza el último día');

  const saltado = avanzarRacha(3, '2026-10-06', '2026-10-09');
  comprobar(saltado.racha === 1 && saltado.ultimoDia === '2026-10-09', 'un día perdido reinicia la racha a 1');

  const atrasado = avanzarRacha(3, '2026-10-06', '2026-10-05');
  comprobar(atrasado.racha === 3 && atrasado.ultimoDia === '2026-10-06', 'fecha anterior (reloj atrasado) no castiga');

  comprobar(
    diasEntre('2026-02-28', '2026-03-01') === 1,
    'diasEntre cruza el cambio de mes (y de horario de verano)',
  );
  comprobar(diasEntre('2026-01-01', '2026-01-01') === 0, 'la misma fecha son 0 días');
  comprobar(diasEntre('garbage', '2026-01-01') === 0, 'fechas ilegibles no lanzan');
}

seccion('Fecha local');
{
  comprobar(/^\d{4}-\d{2}-\d{2}$/.test(fechaLocal(new Date(2026, 0, 5))), 'fechaLocal devuelve AAAA-MM-DD');
  comprobar(fechaLocal(new Date(2026, 11, 31)) === '2026-12-31', 'mes y día van con dos dígitos');
}

// ---------------------------------------------------------------------------
seccion('Progreso: mejor nota, contadores y guardado');
{
  const vacio = progresoVacio();
  comprobar(vacio.cuestionarios === 0 && vacio.racha === 0 && vacio.ultimoDia === null, 'progreso vacío de fábrica');

  let p = registrarCuestionario(vacio, 'eso2/restauracion', 60, '2026-10-06');
  comprobar(p.temas['eso2/restauracion'].mejorNota === 60, 'guarda la primera nota del tema');
  comprobar(p.temas['eso2/restauracion'].jugados === 1 && p.cuestionarios === 1, 'suma un cuestionario jugado');
  comprobar(p.racha === 1 && p.ultimoDia === '2026-10-06', 'el primer cuestionario abre la racha');

  p = registrarCuestionario(p, 'eso2/restauracion', 40, '2026-10-06');
  comprobar(p.temas['eso2/restauracion'].mejorNota === 60, 'una nota peor NO degrada la mejor nota');
  comprobar(p.temas['eso2/restauracion'].jugados === 2, 'pero sí cuenta la partida jugada');
  comprobar(p.racha === 1, 'la racha sigue en 1 el mismo día');

  p = registrarCuestionario(p, 'eso2/restauracion', 85, '2026-10-07');
  comprobar(p.temas['eso2/restauracion'].mejorNota === 85, 'una nota mejor sí la supera');
  comprobar(p.racha === 2, 'día siguiente → racha 2');

  p = registrarCuestionario(p, 'eso4/contemporanea', 100, '2026-10-07');
  comprobar(
    Object.keys(p.temas).length === 2 && p.temas['eso4/contemporanea'].mejorNota === 100,
    'los temas se guardan por separado',
  );
  comprobar(p.racha === 2 && p.cuestionarios === 4, 'la racha es global, no por tema');

  const fuera = registrarCuestionario(p, 'eso2/restauracion', 130, '2026-10-07');
  comprobar(fuera.temas['eso2/restauracion'].mejorNota === 100, 'la nota se acota a 100');

  const al = almacenFalso();
  guardarProgreso(p, al);
  comprobar(
    JSON.stringify(leerProgreso(al)) === JSON.stringify(p),
    'guarda y recupera el progreso completo sin pérdidas',
  );

  const corrupto = almacenFalso();
  corrupto.setItem('repaso-historia:progreso:v1', 'no-es-json');
  comprobar(
    JSON.stringify(leerProgreso(corrupto)) === JSON.stringify(progresoVacio()),
    'progreso corrupto → progreso vacío, sin lanzar',
  );

  const sucio = almacenFalso();
  sucio.setItem(
    'repaso-historia:progreso:v1',
    JSON.stringify({
      temas: { 'eso2/x': { mejorNota: '90', jugados: 3 }, 'eso2/malo': { mejorNota: null, jugados: 'x' } },
      cuestionarios: -5,
      racha: 2.7,
      ultimoDia: 'ayer',
    }),
  );
  const saneado = leerProgreso(sucio);
  comprobar(
    saneado.temas['eso2/x'].mejorNota === 90 && saneado.temas['eso2/x'].jugados === 3,
    'los datos de tema se convierten a enteros',
  );
  comprobar(saneado.temas['eso2/malo'] === undefined, 'un registro de tema inválido se descarta');
  comprobar(saneado.cuestionarios === 0 && saneado.racha === 3, 'contadores negativos a 0 y racha redondeada');
  comprobar(saneado.ultimoDia === null, 'una fecha ilegible se trata como "sin actividad"');

  borrarProgreso(al);
  comprobar(JSON.stringify(leerProgreso(al)) === JSON.stringify(progresoVacio()), 'borrar progreso deja el almacén limpio');
  borrarProgreso(null);
  comprobar(true, 'borrar sin almacén no lanza');
}

finalizar();
