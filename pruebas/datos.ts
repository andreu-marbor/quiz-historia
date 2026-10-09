/**
 * Pruebas del validador de `datos/` (reglas de PLAN.md §3 y AGENTS.md).
 * Comprueba el contenido real Y que el validador detecta los errores típicos
 * (con ficheros falsos, para que un fallo del propio validador no pase desapercibido).
 * Se ejecuta con `npm.cmd run prueba:datos` (esbuild + node).
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  contarPreguntas,
  resumenDatos,
  validarCatalogo,
  validarDatos,
  validarPregunta,
} from '../scripts/validar-preguntas.mjs';
import { comprobar, finalizar, incluye, mostrarSiHay, seccion } from './ayudante';

const raiz = process.cwd();
const raizDatos = join(raiz, 'datos');

function preguntaFalsa(id: string, cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    enunciado: '¿Enunciado de prueba?',
    tipo: 'opcion-multiple',
    opciones: ['Opción A', 'Opción B'],
    respuesta: 0,
    explicacion: 'Explicación de prueba.',
    dificultad: 1,
    tags: ['prueba'],
    ...cambios,
  };
}

function catalogoDePrueba(): Record<string, unknown> {
  return {
    cursos: [
      {
        id: 'eso2',
        titulo: '2º ESO',
        orden: 2,
        asignaturas: [
          {
            id: 'historia',
            titulo: 'Historia',
            orden: 1,
            temas: [{ id: 'tema-a', titulo: 'Tema de prueba', orden: 1, minPreguntas: 2 }],
          },
        ],
      },
    ],
  };
}

/** El `tema[0]` del primer curso (primera asignatura). */
function primerTema(catalogo: Record<string, unknown>): Record<string, unknown> {
  const cursos = catalogo['cursos'] as Array<Record<string, unknown>>;
  const asignaturas = cursos[0]['asignaturas'] as Array<Record<string, unknown>>;
  const temas = asignaturas[0]['temas'] as Array<Record<string, unknown>>;
  return temas[0];
}

// ---------------------------------------------------------------------------
seccion('Contenido real del repositorio (datos/)');

const erroresReales = validarDatos(raizDatos, { raizPublic: join(raiz, 'public') });
comprobar(erroresReales.length === 0, 'datos/ pasa todas las reglas del validador');
mostrarSiHay(erroresReales);

const resumen = resumenDatos(raizDatos);
comprobar(resumen.cursos >= 3, `hay al menos 3 cursos de ejemplo (${resumen.cursos})`);
comprobar(resumen.temas >= 3 && resumen.temas <= 4, `hay 3–4 temas de ejemplo (${resumen.temas})`);
comprobar(resumen.preguntas >= 40, `hay al menos 40 preguntas de muestra (${resumen.preguntas})`);
comprobar(
  contarPreguntas(raizDatos) === resumen.preguntas,
  'contarPreguntas coincide con resumenDatos',
);

// ---------------------------------------------------------------------------
seccion('Reglas de una pregunta (datos falsos)');

const contexto = { curso: 'eso2', tema: 'tema-a' };
function erroresDe(pregunta: unknown, extra: Record<string, unknown> = {}): string[] {
  return validarPregunta(pregunta, { donde: 'prueba', ...contexto, ...extra });
}
function con(cambios: Record<string, unknown>): string[] {
  return erroresDe(preguntaFalsa('eso2-tema-a-001', cambios));
}

comprobar(erroresDe(preguntaFalsa('eso2-tema-a-001')).length === 0, 'una pregunta bien formada no tiene errores');
incluye(con({ id: 'tema-a-1' }), 'convención', 'rechaza un id que no empieza por <curso>-<tema>-');
incluye(con({ id: 'eso2-tema-a-12' }), '3 dígitos', 'exige 3 dígitos al final del id');
incluye(con({ enunciado: '' }), 'debe ser un texto no vacío', 'rechaza el enunciado vacío');
incluye(con({ explicacion: '   ' }), 'debe ser un texto no vacío', 'rechaza la explicación en blanco');
incluye(con({ opciones: ['A', ''] }), 'la opción 2', 'rechaza una opción vacía');
incluye(con({ opciones: ['Sí', 'Sí'] }), 'opciones repetidas', 'rechaza opciones repetidas');
incluye(con({ tipo: 'relacionar' }), '"tipo" inválido', 'rechaza un tipo desconocido');
incluye(
  con({ tipo: 'verdadero-falso', opciones: ['Verdadero', 'Falso', 'Otra'] }),
  'exactamente ["Verdadero", "Falso"]',
  'exige 2 opciones exactas en verdadero/falso',
);
incluye(con({ respuesta: 5 }), 'fuera del rango', 'rechaza una respuesta fuera del rango de opciones');
incluye(con({ respuesta: '1' }), 'número entero', 'rechaza una respuesta que no es entera');
incluye(con({ dificultad: 5 }), '"dificultad" debe ser 1, 2 o 3', 'rechaza una dificultad fuera de 1·2·3');
incluye(con({ campoRaro: 1 }), 'campo desconocido', 'avisa de campos desconocidos (typos)');
incluye(con({ tags: 'prueba' }), '"tags" debe ser una lista', 'rechaza tags que no son una lista');
incluye(con({ tipo: 'imagen' }), 'deben incluir el campo "imagen"', 'exige la imagen en el tipo imagen');
incluye(
  erroresDe(preguntaFalsa('eso2-tema-a-001', { tipo: 'imagen', imagen: 'imagenes/no-existe.svg' }), {
    raizPublic: raizDatos,
  }),
  'no existe el fichero',
  'comprueba que la imagen existe en public/',
);
incluye(erroresDe('esto no es una pregunta'), 'debe ser un objeto JSON', 'rechaza entradas que no son objetos');

const sinExplicacion = preguntaFalsa('eso2-tema-a-001');
delete sinExplicacion['explicacion'];
incluye(
  validarPregunta(sinExplicacion, { donde: 'prueba', ...contexto }),
  'falta el campo obligatorio "explicacion"',
  'rechaza una pregunta sin explicación',
);

// ---------------------------------------------------------------------------
seccion('Reglas del catálogo (temas.json)');

function catalogoCon(cambiosCurso: Record<string, unknown> = {}, cambiosTema: Record<string, unknown> = {}): Record<string, unknown> {
  const catalogo = catalogoDePrueba();
  Object.assign((catalogo['cursos'] as Array<Record<string, unknown>>)[0], cambiosCurso);
  Object.assign(primerTema(catalogo), cambiosTema);
  return catalogo;
}

comprobar(validarCatalogo(catalogoDePrueba()).length === 0, 'un catálogo bien formado no tiene errores');
incluye(validarCatalogo({ cursos: [] }), 'lista no vacía', 'rechaza un catálogo sin cursos');
incluye(validarCatalogo(catalogoCon({ id: 'Eso 2' })), 'kebab-case', 'exige ids en kebab-case');
incluye(validarCatalogo(catalogoCon({}, { minPreguntas: 0 })), 'minPreguntas', 'exige minPreguntas ≥ 1');
incluye(validarCatalogo(catalogoCon({}, { orden: 'primero' })), '"orden" debe ser un número entero', 'exige un orden numérico');
incluye(
  validarCatalogo({
    cursos: [
      (catalogoDePrueba() as { cursos: Array<Record<string, unknown>> }).cursos[0],
      (catalogoDePrueba() as { cursos: Array<Record<string, unknown>> }).cursos[0],
    ],
  }),
  'está duplicado',
  'detecta cursos duplicados',
);

// --- §13.2: estructura obligatoria cursos > asignaturas > temas ---
{
  const sinAsignaturas = catalogoDePrueba();
  delete (sinAsignaturas['cursos'] as Array<Record<string, unknown>>)[0]['asignaturas'];
  incluye(
    validarCatalogo(sinAsignaturas),
    '"asignaturas" debe ser una lista no vacía',
    'un curso sin asignaturas es un error (asignatura obligatoria)',
  );
}
{
  const formaVieja = catalogoDePrueba();
  const curso = (formaVieja['cursos'] as Array<Record<string, unknown>>)[0];
  curso['temas'] = [{ id: 'tema-viejo', titulo: 'Viejo', orden: 1, minPreguntas: 1 }];
  incluye(
    validarCatalogo(formaVieja),
    'ya no va en el curso',
    'rechaza la forma antigua con "temas" a nivel de curso',
  );
}
incluye(
  validarCatalogo(catalogoCon({ campoRaro: 1 })),
  'campo desconocido',
  'rechaza campos desconocidos en el curso (typos)',
);
{
  const asignaturasVacias = catalogoDePrueba();
  const asignaturas = ((asignaturasVacias['cursos'] as Array<Record<string, unknown>>)[0]['asignaturas'] as Array<Record<string, unknown>>);
  asignaturas[0]['temas'] = [];
  incluye(
    validarCatalogo(asignaturasVacias),
    '"temas" debe ser una lista no vacía',
    'una asignatura sin temas es un error',
  );
}
{
  // Dos asignaturas reusando el mismo id de tema: chocaría la clave `<curso>/<tema>`
  const dosAsignaturas = catalogoDePrueba();
  const curso = (dosAsignaturas['cursos'] as Array<Record<string, unknown>>)[0];
  (curso['asignaturas'] as Array<Record<string, unknown>>).push({
    id: 'historia-del-arte',
    titulo: 'Historia del Arte',
    orden: 2,
    temas: [{ id: 'tema-a', titulo: 'Repetido', orden: 1, minPreguntas: 2 }],
  });
  incluye(
    validarCatalogo(dosAsignaturas),
    'está duplicado en el curso',
    'un id de tema repetido entre asignaturas del mismo curso es un error',
  );
}
{
  // Dos temas con el mismo `orden` dentro de una asignatura
  const ordenRepetido = catalogoDePrueba();
  primerTema(ordenRepetido)['orden'] = 5;
  const asignaturas = ((ordenRepetido['cursos'] as Array<Record<string, unknown>>)[0]['asignaturas'] as Array<Record<string, unknown>>);
  (asignaturas[0]['temas'] as Array<Record<string, unknown>>).push({
    id: 'tema-b',
    titulo: 'Otro tema',
    orden: 5,
    minPreguntas: 1,
  });
  incluye(
    validarCatalogo(ordenRepetido),
    'repetido dentro de la asignatura',
    'el "orden" es único dentro de cada asignatura',
  );
}

// --- T11: el `orden` es lo que manda en pantalla, así que no admite ambigüedad ---
{
  const dosCursos = catalogoDePrueba();
  (dosCursos['cursos'] as Array<Record<string, unknown>>).push({
    id: 'eso4',
    titulo: '4º ESO',
    orden: 2, // repetido: ya lo lleva el primer curso del catálogo
    asignaturas: [
      { id: 'historia', titulo: 'Historia', orden: 1, temas: [{ id: 'tema-b', titulo: 'Tema B', orden: 1, minPreguntas: 2 }] },
    ],
  });
  incluye(
    validarCatalogo(dosCursos),
    'está repetido entre los cursos',
    'el "orden" es único entre los cursos (dos cursos, mismo orden = orden a merced del fichero)',
  );
}
{
  const dosAsignaturas = catalogoDePrueba();
  const asignaturas = ((dosAsignaturas['cursos'] as Array<Record<string, unknown>>)[0]['asignaturas'] as Array<Record<string, unknown>>);
  asignaturas.push({
    id: 'historia-del-arte',
    titulo: 'Historia del Arte',
    orden: 1, // repetida: ya lo lleva la primera asignatura del curso
    temas: [{ id: 'tema-b', titulo: 'Tema B', orden: 1, minPreguntas: 2 }],
  });
  incluye(
    validarCatalogo(dosAsignaturas),
    'está repetido dentro del curso',
    'el "orden" es único entre las asignaturas de un curso',
  );
}
incluye(validarCatalogo(catalogoCon({ orden: 0 })), 'entero ≥ 1', 'el orden de un curso debe ser ≥ 1 (el 0 no es «el primero»)');
incluye(validarCatalogo(catalogoCon({}, { orden: -3 })), 'entero ≥ 1', 'ni un orden negativo');
{
  const asignaturaSinOrden = catalogoDePrueba();
  ((asignaturaSinOrden['cursos'] as Array<Record<string, unknown>>)[0]['asignaturas'] as Array<Record<string, unknown>>)[0]['orden'] = 0;
  incluye(validarCatalogo(asignaturaSinOrden), 'entero ≥ 1', 'el orden de una asignatura debe ser ≥ 1');
}
incluye(validarCatalogo(catalogoCon({}, { orden: 0 })), 'entero ≥ 1', 'y el de un tema también');

// ---------------------------------------------------------------------------
seccion('Reglas del repositorio (ficheros falsos)');

const carpetaFalsa = join(raiz, 'node_modules', '.tmp', 'validacion-falsa');
let contador = 0;

function validarFicheros(ficheros: Record<string, unknown>): string[] {
  const dir = join(carpetaFalsa, `caso-${contador++}`);
  rmSync(dir, { recursive: true, force: true });
  for (const [ruta, contenido] of Object.entries(ficheros)) {
    const rutaCompleta = join(dir, ruta);
    mkdirSync(dirname(rutaCompleta), { recursive: true });
    const texto = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2);
    writeFileSync(rutaCompleta, texto, 'utf8');
  }
  return validarDatos(dir);
}

function baseValida(): Record<string, unknown> {
  return {
    'temas.json': catalogoDePrueba(),
    'preguntas/eso2/tema-a.json': [
      preguntaFalsa('eso2-tema-a-001'),
      preguntaFalsa('eso2-tema-a-002'),
    ],
  };
}

const correcto = validarFicheros(baseValida());
comprobar(correcto.length === 0, 'un repositorio falso bien formado pasa el validador');
mostrarSiHay(correcto);

{
  const f = baseValida();
  f['preguntas/eso2/tema-a.json'] = [preguntaFalsa('eso2-tema-a-001'), preguntaFalsa('eso2-tema-a-001')];
  incluye(validarFicheros(f), 'ya se usa en', 'detecta ids repetidos en el proyecto');
}
{
  const f = baseValida();
  f['preguntas/eso2/tema-x.json'] = [preguntaFalsa('eso2-tema-x-001')];
  incluye(validarFicheros(f), 'no es un tema del curso', 'detecta ficheros de temas huérfanos');
}
{
  const f = baseValida();
  f['preguntas/eso3/tema-a.json'] = [preguntaFalsa('eso3-tema-a-001')];
  incluye(validarFicheros(f), 'no es un curso del catálogo', 'detecta directorios de curso que no existen');
}
{
  const f = baseValida();
  const catalogo = f['temas.json'] as {
    cursos: Array<{ asignaturas: Array<{ temas: Array<Record<string, unknown>> }> }>;
  };
  catalogo.cursos[0].asignaturas[0].temas.push({ id: 'tema-b', titulo: 'Tema sin fichero', orden: 2, minPreguntas: 1 });
  incluye(validarFicheros(f), 'falta el fichero', 'detecta temas del catálogo sin fichero');
}
{
  const f = baseValida();
  f['preguntas/eso2/tema-a.json'] = [preguntaFalsa('eso2-tema-a-001')];
  incluye(validarFicheros(f), 'minPreguntas=2', 'exige alcanzar minPreguntas');
}
{
  const f = baseValida();
  f['preguntas/eso2/tema-a.json'] = '{esto no es json';
  incluye(validarFicheros(f), 'no es JSON válido', 'detecta JSON roto');
}
{
  const f = baseValida();
  f['preguntas/notas.txt'] = 'no debería estar aquí';
  incluye(validarFicheros(f), 'fichero suelto', 'detecta ficheros sueltos en datos/preguntas/');
}
{
  const f = baseValida();
  f['preguntas/eso2/tema-a.json'] = [preguntaFalsa('eso4-otro-tema-001')];
  incluye(validarFicheros(f), 'convención', 'detecta ids cuyo curso/tema no coincide con su fichero');
}
{
  const f = baseValida();
  f['temas.json'] = '{esto no es json';
  incluye(validarFicheros(f), 'temas.json no es JSON válido', 'detecta un catálogo ilegible');
}

rmSync(carpetaFalsa, { recursive: true, force: true });

finalizar();
