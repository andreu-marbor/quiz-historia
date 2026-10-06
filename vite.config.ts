import { defineConfig } from 'vite';

// Configuración de Vite de "Repaso de Historia".
// En la Fase 4 se fija `base: '/quiz-historia/'` para GitHub Pages.
export default defineConfig({
  server: {
    host: true, // accesible desde el móvil en la misma red local
    port: 5173,
  },
});
