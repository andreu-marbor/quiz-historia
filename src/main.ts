/**
 * Arranque de la app (Fase 1: vista de comprobación del cimiento).
 * Las preguntas entran en el bundle mediante `import.meta.glob`,
 * de modo que la app funciona sin internet desde el primer build (R/06).
 */

import './estilos/base.css';
import catalogo from '../datos/temas.json';
import type { Catalogo, Curso, Pregunta } from './logica/tipos';

const archivosDePreguntas = import.meta.glob('../datos/preguntas/**/*.json', {
  eager: true,
  import: 'default',
});

const datos: Catalogo = catalogo;

/** Todas las preguntas del proyecto, aplanadas desde los ficheros JSON. */
const preguntas: Pregunta[] = Object.values(archivosDePreguntas).flatMap(
  (contenido) => contenido as Pregunta[],
);

function preguntasDeTema(curso: Curso, temaId: string): Pregunta[] {
  const prefijo = `${curso.id}-${temaId}-`;
  return preguntas.filter((p) => p.id.startsWith(prefijo));
}

function pintar(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('No se encontró el contenedor #app');

  const cursos = [...datos.cursos].sort((a, b) => a.orden - b.orden);

  app.innerHTML = `
    <header>
      <h1>Repaso de Historia</h1>
      <p>Cimiento (Fase 1): catálogo y preguntas cargados en el bundle.</p>
    </header>
    <main>
      <p><strong>${preguntas.length}</strong> preguntas en <strong>${cursos.length}</strong> cursos.</p>
      <ul>
        ${cursos
          .map(
            (curso) => `
          <li>
            <strong>${curso.titulo}</strong>
            <ul>
              ${[...curso.temas]
                .sort((a, b) => a.orden - b.orden)
                .map((tema) => {
                  const n = preguntasDeTema(curso, tema.id).length;
                  const cumple = n >= tema.minPreguntas;
                  return `<li>${tema.titulo} — ${n}/${tema.minPreguntas} preguntas ${cumple ? '✅' : '❌'}</li>`;
                })
                .join('')}
            </ul>
          </li>`,
          )
          .join('')}
      </ul>
    </main>
  `;
}

pintar();
