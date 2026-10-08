/**
 * Tipos del dominio (catálogo + preguntas).
 * Son la fuente de verdad de las formas que también valida `scripts/validar-preguntas.mjs`.
 */

export type TipoPregunta = 'opcion-multiple' | 'verdadero-falso' | 'fecha' | 'imagen';

export type Dificultad = 1 | 2 | 3;

export interface Pregunta {
  /** Único en todo el proyecto. Convención: `<curso>-<tema>-<nnn>` */
  id: string;
  enunciado: string;
  tipo: TipoPregunta;
  /** 2–6 opciones; en `verdadero-falso` exactamente ["Verdadero", "Falso"] */
  opciones: string[];
  /** Índice (0-based) de la opción correcta dentro de `opciones` */
  respuesta: number;
  /** Se muestra tras responder: imprescindible para el valor pedagógico */
  explicacion: string;
  dificultad: Dificultad;
  /** Ruta relativa a `public/` (obligatoria si `tipo === "imagen"`) */
  imagen?: string;
  /** Etiquetas para filtrado futuro */
  tags?: string[];
}

export interface Tema {
  id: string;
  titulo: string;
  orden: number;
  minPreguntas: number;
}

/**
 * Asignatura de un curso (§13.2): obligatoria en todos los cursos.
 * Ej.: "Historia" en 2º ESO; "Historia" + "Historia del Arte" en 2º Bachillerato.
 */
export interface Asignatura {
  id: string;
  titulo: string;
  orden: number;
  temas: Tema[];
}

export interface Curso {
  id: string;
  titulo: string;
  orden: number;
  /** ≥1 (obligatorio): los temas viven AQUÍ, no sueltos en el curso */
  asignaturas: Asignatura[];
}

export interface Catalogo {
  cursos: Curso[];
}

/**
 * Qué se va a jugar (§13.1): un tema concreto o la fila virtual
 * «Todos los temas de {asignatura}».
 * `temaId` solo existe en `tipo: "tema"`; en el conjunto, la clave de progreso
 * se construye con `claveConjunto(cursoId, asignaturaId)`.
 */
export type Seleccion =
  | { tipo: 'tema'; cursoId: string; temaId: string }
  | { tipo: 'conjunto'; cursoId: string; asignaturaId: string };
