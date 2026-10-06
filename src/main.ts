/**
 * Arranque de la aplicación: carga el bundle de datos y los estilos,
 * y monta el núcleo (`src/aplicacion.ts`, que es el que se prueba en jsdom).
 */

import './estilos/base.css';
import './estilos/app.css';

import { montarAplicacion } from './aplicacion';
import { catalogo, preguntasPorTema } from './datos';
import { almacenPorDefecto } from './persistencia';

const raiz = document.querySelector<HTMLElement>('#app');
if (!raiz) throw new Error('No se encontró el contenedor #app');

montarAplicacion(raiz, { catalogo, preguntasPorTema }, almacenPorDefecto());
