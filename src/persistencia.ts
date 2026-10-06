/**
 * Acceso CENTRALIZADO a `localStorage`: ajustes y progreso.
 * Ningún otro módulo del proyecto debe tocar el almacenamiento (regla de AGENTS.md).
 *
 * Las funciones de negocio (racha, mejor nota) son puras y aceptan un almacén
 * inyectable, así se testean en Node sin navegador.
 */

export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export type ModoTema = 'auto' | 'claro' | 'oscuro';

export interface Ajustes {
  /** `auto` = respetar `prefers-color-scheme` */
  modoTema: ModoTema;
  /** Nº de preguntas por cuestionario; `0` = todas las del tema */
  preguntas: number;
  barajarOpciones: boolean;
}

export interface DatoTema {
  mejorNota: number;
  jugados: number;
}

export interface Progreso {
  /** Mejor nota y veces jugado, por clave `<curso>/<tema>` */
  temas: Record<string, DatoTema>;
  cuestionarios: number;
  /** Días consecutivos con actividad */
  racha: number;
  /** `YYYY-MM-DD` del último día con actividad (`null` = sin actividad) */
  ultimoDia: string | null;
}

const CLAVE_AJUSTES = 'repaso-historia:ajustes:v1';
const CLAVE_PROGRESO = 'repaso-historia:progreso:v1';

/** Opciones válidas de "preguntas por cuestionario" (0 = todas). */
export const OPCIONES_PREGUNTAS = [5, 10, 15, 20, 0] as const;

export function ajustesPorDefecto(): Ajustes {
  return { modoTema: 'auto', preguntas: 10, barajarOpciones: true };
}

export function progresoVacio(): Progreso {
  return { temas: {}, cuestionarios: 0, racha: 0, ultimoDia: null };
}

/** Almacén real si el navegador lo permite (modo privado, cuota…), o `null`. */
export function almacenPorDefecto(): Almacen | null {
  try {
    const almacen = globalThis.localStorage;
    if (!almacen) return null;
    const prueba = 'repaso-historia:prueba';
    almacen.setItem(prueba, '1');
    almacen.removeItem(prueba);
    return almacen;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lectura / escritura
// ---------------------------------------------------------------------------

function leerBruto(al: Almacen | null, clave: string): unknown {
  if (!al) return null;
  try {
    const texto = al.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null; // datos corruptos o JSON ilegible → valores por defecto
  }
}

function escribir(al: Almacen | null, clave: string, valor: unknown): void {
  if (!al) return;
  try {
    al.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin permisos o sin cuota: la app sigue funcionando, solo no persiste
  }
}

/** Lee los ajustes; cualquier valor inválido cae en el valor por defecto. */
export function leerAjustes(al: Almacen | null = almacenPorDefecto()): Ajustes {
  const porDefecto = ajustesPorDefecto();
  const bruto = leerBruto(al, CLAVE_AJUSTES) as Partial<Ajustes> | null;
  if (!bruto || typeof bruto !== 'object') return porDefecto;

  const modoTema: ModoTema =
    bruto.modoTema === 'claro' || bruto.modoTema === 'oscuro' ? bruto.modoTema : 'auto';
  const preguntas =
    typeof bruto.preguntas === 'number' && (OPCIONES_PREGUNTAS as readonly number[]).includes(bruto.preguntas)
      ? bruto.preguntas
      : porDefecto.preguntas;
  const barajarOpciones =
    typeof bruto.barajarOpciones === 'boolean' ? bruto.barajarOpciones : porDefecto.barajarOpciones;

  return { modoTema, preguntas, barajarOpciones };
}

export function guardarAjustes(ajustes: Ajustes, al: Almacen | null = almacenPorDefecto()): void {
  escribir(al, CLAVE_AJUSTES, ajustes);
}

export function leerProgreso(al: Almacen | null = almacenPorDefecto()): Progreso {
  const vacio = progresoVacio();
  const bruto = leerBruto(al, CLAVE_PROGRESO) as Partial<Progreso> | null;
  if (!bruto || typeof bruto !== 'object') return vacio;

  const temas: Record<string, DatoTema> = {};
  const brutoTemas = bruto.temas;
  if (brutoTemas && typeof brutoTemas === 'object') {
    for (const [clave, dato] of Object.entries(brutoTemas)) {
      if (!dato || typeof dato !== 'object') continue;
      const mejorNota = Number(dato.mejorNota);
      const jugados = Number(dato.jugados);
      if (!Number.isFinite(mejorNota) || !Number.isFinite(jugados)) continue;
      temas[clave] = {
        mejorNota: Math.min(Math.max(Math.round(mejorNota), 0), 100),
        jugados: Math.max(Math.round(jugados), 0),
      };
    }
  }

  return {
    temas,
    cuestionarios: Number.isFinite(bruto.cuestionarios) ? Math.max(Math.round(Number(bruto.cuestionarios)), 0) : 0,
    racha: Number.isFinite(bruto.racha) ? Math.max(Math.round(Number(bruto.racha)), 0) : 0,
    ultimoDia: typeof bruto.ultimoDia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bruto.ultimoDia)
      ? bruto.ultimoDia
      : null,
  };
}

export function guardarProgreso(progreso: Progreso, al: Almacen | null = almacenPorDefecto()): void {
  escribir(al, CLAVE_PROGRESO, progreso);
}

/** Borra el progreso (los ajustes se conservan). */
export function borrarProgreso(al: Almacen | null = almacenPorDefecto()): void {
  try {
    al?.removeItem(CLAVE_PROGRESO);
  } catch {
    // ignorar: no hay nada que hacer si el almacenamiento falla
  }
}

// ---------------------------------------------------------------------------
// Lógica de negocio (pura)
// ---------------------------------------------------------------------------

/** Fecha local en `YYYY-MM-DD` (la racha se mide por días del alumno, no UTC). */
export function fechaLocal(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Días naturales de diferencia entre dos fechas `YYYY-MM-DD` (redondea por el horario de verano). */
export function diasEntre(desde: string, hasta: string): number {
  const t1 = Date.parse(`${desde}T00:00:00Z`);
  const t2 = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.round((t2 - t1) / 86_400_000);
}

/**
 * Racha de días consecutivos:
 * - primer día → 1; - mismo día → no cambia; - día siguiente → +1;
 * - si se saltó uno o más días → vuelve a 1; - fecha anterior (reloj atrasado) → no cambia.
 */
export function avanzarRacha(
  racha: number,
  ultimoDia: string | null,
  hoy: string,
): { racha: number; ultimoDia: string } {
  if (ultimoDia === null) return { racha: Math.max(racha, 1), ultimoDia: hoy };
  if (hoy === ultimoDia) return { racha, ultimoDia };
  const diferencia = diasEntre(ultimoDia, hoy);
  if (diferencia < 0) return { racha, ultimoDia };
  if (diferencia === 1) return { racha: racha + 1, ultimoDia: hoy };
  return { racha: 1, ultimoDia: hoy };
}

/**
 * Registra la finalización de un cuestionario: mejor nota del tema, contador
 * del tema, total de cuestionarios y racha del día.
 */
export function registrarCuestionario(
  progreso: Progreso,
  claveTema: string,
  nota: number,
  hoy: string = fechaLocal(),
): Progreso {
  const anterior = progreso.temas[claveTema] ?? { mejorNota: 0, jugados: 0 };
  const racha = avanzarRacha(progreso.racha, progreso.ultimoDia, hoy);

  return {
    temas: {
      ...progreso.temas,
      [claveTema]: {
        mejorNota: Math.max(anterior.mejorNota, Math.min(Math.max(Math.round(nota), 0), 100)),
        jugados: anterior.jugados + 1,
      },
    },
    cuestionarios: progreso.cuestionarios + 1,
    racha: racha.racha,
    ultimoDia: racha.ultimoDia,
  };
}
