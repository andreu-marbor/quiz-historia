/**
 * Contexto que recibe cada pantalla: datos + estado de la sesión + acciones.
 * Las pantallas solo pintan y avisan de la acción; la lógica vive en `logica/`
 * y en `main.ts` (router + sesión).
 */

import type { PreguntaPresentada } from '../logica/barajado';
import type { Resultado } from '../logica/correccion';
import type { Catalogo, Pregunta, Seleccion } from '../logica/tipos';
import type { Ajustes, Progreso } from '../persistencia';

/** Partida en curso. */
export interface Sesion {
  cursoId: string;
  /** Tema concreto o «Todos los temas de {asignatura}» (§13.1) */
  seleccion: Seleccion;
  /** Clave en `progreso.temas`: `<curso>/<tema>` o `<curso>/__todos__/<asignatura>` */
  claveTema: string;
  cursoTitulo: string;
  temaTitulo: string;
  /** Preguntas ya barajadas para mostrarlas */
  preguntas: PreguntaPresentada[];
  /** Índice (en el orden ORIGINAL de la pregunta) elegido, o `null` sin responder */
  respuestas: (number | null)[];
  /** Pregunta en pantalla */
  actual: number;
  /** La partida nació repitiendo solo las falladas */
  soloFalladas: boolean;
}

/** Datos del tema del último resultado (para repetir). */
export interface TemaDelResultado {
  /** Cómo se llegó a jugar: tema suelto o fila «Todos los temas» (§13.1) */
  seleccion: Seleccion;
  cursoTitulo: string;
  temaTitulo: string;
}

export interface Acciones {
  /** Empieza un cuestionario del tema elegido */
  elegirTema(cursoId: string, temaId: string): void;
  /** Empieza un cuestionario con «Todos los temas de {asignatura}» (§13.1) */
  elegirConjunto(cursoId: string, asignaturaId: string): void;
  /** Responde la pregunta en pantalla (índice en el orden mostrado) */
  responder(indice: number): void;
  /** Pasa a la siguiente pregunta o cierra el cuestionario */
  siguiente(): void;
  /** Repite el último cuestionario (todas o solo las falladas) */
  repetir(soloFalladas: boolean): void;
  /** Guarda cambios de ajustes */
  cambiarAjustes(cambios: Partial<Ajustes>): void;
  /** Borra el progreso guardado */
  borrarProgreso(): void;
  /** Sale del cuestionario actual */
  abandonar(): void;
  /** Cambia de pantalla (`/`, `/cuestionario`, `/resultados`, `/progreso`, `/ajustes`) */
  ir(ruta: string): void;
}

export interface Contexto {
  catalogo: Catalogo;
  preguntasPorTema: ReadonlyMap<string, readonly Pregunta[]>;
  ajustes: Ajustes;
  progreso: Progreso;
  sesion: Sesion | null;
  resultado: Resultado | null;
  temaResultado: TemaDelResultado | null;
  /** El último cuestionario ha batido la mejor nota del tema */
  nuevaMejor: boolean;
  /** `false` si el navegador no permite almacenar (modo privado) */
  almacenDisponible: boolean;
  acciones: Acciones;
}
