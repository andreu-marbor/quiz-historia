import { defineConfig } from 'vite';

// Configuración de Vite de "Repaso de Historia".
//
// `base` obligatoria: GitHub Pages publica el proyecto en una subcarpeta
// (https://andreu-marbor.github.io/quiz-historia/), así que todos los assets
// deben resolverse relativos a ella. En `dev` sirve en la raíz para no
// complicar la revisión local.
export default defineConfig({
  base: '/quiz-historia/',
  server: {
    host: true, // accesible desde el móvil en la misma red local
    port: 5173,
  },
});
