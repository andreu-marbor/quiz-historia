/**
 * Textos de la interfaz, centralizados en un único sitio.
 * Sin capa i18n (decisión §2 del PLAN), pero preparado para añadirla:
 * basta con mover este objeto a un diccionario por idioma.
 * Nada de cadenas sueltas en el DOM.
 */

export const T = {
  nombre: 'Repaso de Historia',
  lema: 'Cuestionarios de repaso para Historia de ESO y Bachiller',

  nav: {
    jugar: 'Jugar',
    progreso: 'Progreso',
    ajustes: 'Ajustes',
    principal: 'Navegación principal',
  },

  inicio: {
    titulo: 'Elige curso y tema',
    sinContenido: 'Todavía no hay ningún curso con preguntas.',
    sinTemas: 'Este curso todavía no tiene temas.',
    preguntas: (n: number) => `${n} pregunta${n === 1 ? '' : 's'}`,
    /** Chip del contador de temas del curso (visible y accesible, T2) */
    temas: (n: number) => `${n} tema${n === 1 ? '' : 's'}`,
    minimo: (n: number) => `Necesitas al menos ${n} preguntas para jugar`,
    mejorNota: (n: number) => `Mejor nota: ${n}`,
    sinNota: 'Sin jugar todavía',
    jugar: 'Jugar a',
    /** Fila «Todos los temas de {asignatura}» (§13.1) */
    todosDe: (asignatura: string) => `Todos los temas de ${asignatura}`,
  },

  cuestionario: {
    titulo: 'Cuestionario',
    preguntaDe: (i: number, total: number) => `Pregunta ${i} de ${total}`,
    barraProgreso: 'Progreso del cuestionario',
    correcto: '¡Correcto!',
    incorrecto: 'Incorrecto',
    tuRespuesta: 'Tu respuesta',
    respuestaCorrecta: 'Respuesta correcta',
    elegir: 'Elige una respuesta para ver la explicación',
    siguiente: 'Siguiente pregunta',
    finalizar: 'Ver resultados',
    abandonar: 'Salir del cuestionario',
    abandonarConfirm: '¿Seguro que quieres salir? Perderás las respuestas de esta partida.',
    abandonarSi: 'Salir',
    abandonarNo: 'Seguir',
    enunciado: (n: number) => `Pregunta ${n}`,
  },

  resultados: {
    titulo: 'Resultados',
    nota: 'Nota',
    aciertos: (a: number, t: number) => `${a} de ${t} correctas`,
    perfecto: '¡Perfecto! Sin ningún fallo.',
    bien: '¡Bien hecho!',
    aprobado: 'Aprobado.',
    suspendo: 'Sigue practicando: repite las falladas.',
    nuevaMejor: '¡Nueva mejor nota en este tema!',
    falladas: 'Preguntas falladas',
    sinFalladas: 'No has fallado ninguna pregunta. ¡Enhorabuena!',
    sinResponder: 'Sin responder',
    explicacion: 'Explicación',
    repetirFalladas: 'Repetir solo las falladas',
    repetirTodas: 'Repetir todas',
    otroTema: 'Elegir otro tema',
    contexto: (curso: string, tema: string) => `${curso} · ${tema}`,
  },

  progreso: {
    titulo: 'Tu progreso',
    racha: 'Racha',
    rachaDias: (n: number) => `${n} día${n === 1 ? '' : 's'} seguido${n === 1 ? '' : 's'}`,
    sinRacha: 'Juega un cuestionario hoy para empezar la racha.',
    cuestionarios: 'Cuestionarios jugados',
    temasJugados: (n: number) => `${n} tema${n === 1 ? '' : 's'} en juego`,
    mejorPorTema: 'Mejor nota por tema',
    tabla: {
      pie: 'Mejor nota conseguida en cada tema',
      curso: 'Curso',
      asignatura: 'Asignatura',
      tema: 'Tema',
      mejor: 'Mejor nota',
      jugados: 'Jugados',
    },
    vacio: 'Aún no has completado ningún cuestionario. ¡Anímate!',
    nota: (n: number) => `${n}`,
  },

  ajustes: {
    titulo: 'Ajustes',
    guardado: 'Ajuste guardado.',
    tema: 'Modo de color',
    temaAyuda: '«Según el sistema» respeta la configuración de tu dispositivo.',
    temaAuto: 'Según el sistema',
    temaClaro: 'Claro',
    temaOscuro: 'Oscuro',
    preguntas: 'Preguntas por cuestionario',
    preguntasAyuda: 'Si el tema tiene menos, se usarán todas las disponibles.',
    preguntasTodas: 'Todas las del tema',
    barajar: 'Barajar las opciones de cada pregunta',
    barajarAyuda: 'Las preguntas de Verdadero/Falso siempre mantienen su orden.',
    borrar: 'Borrar progreso',
    borrarAyuda: 'Elimina mejores notas, racha y estadísticas de este dispositivo.',
    borrarTitulo: '¿Borrar todo tu progreso?',
    borrarConfirm:
      'Se borrarán las mejores notas, la racha y las estadísticas de este dispositivo. No se puede deshacer.',
    borrarSeguro: 'Borrar',
    borrado: 'Progreso borrado.',
    sinAlmacen: 'Este navegador no permite guardar datos: el progreso no se conservará.',
  },

  dialogo: {
    cancelar: 'Cancelar',
  },

  comunes: {
    error: 'Algo ha salido mal. Vuelve a intentarlo.',
    atras: 'Volver',
    cargando: 'Cargando…',
  },
} as const;
