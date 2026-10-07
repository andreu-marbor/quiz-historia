# Repaso de Historia

> Cuestionarios de Historia para estudiantes de **ESO y Bachiller (España)**, pensados para repaso real en el aula: sin backend, sin cuentas y sin datos personales (RGPD por diseño). El progreso vive en `localStorage`.

![Tipo](https://img.shields.io/badge/tipo-cuestionario-6a4c93)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2B%20Vite-457b9d)
![Idioma](https://img.shields.io/badge/idioma-espa%C3%B1ol-2a9d8f)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-f4a261)

> 🌐 **En vivo:** [https://andreu-marbor.github.io/quiz-historia/](https://andreu-marbor.github.io/quiz-historia/)
> 📦 **Código:** [github.com/andreu-marbor/quiz-historia](https://github.com/andreu-marbor/quiz-historia) — pruebas, build y despliegue automáticos con GitHub Actions en cada push a `main`.

## 📸 Capturas

> 📁 Las capturas se guardan en [`docs/capturas/`](docs/capturas/).

| Inicio | Cuestionario | Resultados |
| --- | --- | --- |
| _pendiente_ | _pendiente_ | _pendiente_ |

## ✨ Características

- **5 pantallas**: inicio (curso → tema), cuestionario con respuesta inmediata, resultados con repaso de falladas, progreso (mejor nota por tema y racha) y ajustes.
- **Contenido en JSON versionado** (`datos/`): añadir una pregunta lleva menos de 2 minutos sin tocar el código, y un validador propio comprueba ids, rangos, tipos y mínimo de preguntas por tema.
- **Respuesta inmediata + explicación** en cada pregunta (R/02) y opción de **repetir solo las falladas** (R/03).
- **Progreso persistente** en `localStorage`: mejor nota por tema y racha de días consecutivos.
- **Accesible**: contraste AA, foco visible, ARIA en el quiz (`aria-live` en el feedback), navegación por teclado, `prefers-reduced-motion`; el color nunca es el único indicador.
- **Responsive móvil-primero** y **modo oscuro** (respeta `prefers-color-scheme` con override manual).
- **PWA instalable y offline**: manifest, iconos *maskable* y service worker que precachea la carcasa y los assets del build → tras la primera visita funciona sin conexión en el aula.
- **Cero dependencias de runtime**: TypeScript estricto + Vite, DOM manual sin frameworks.

## 🛠️ Tecnologías

| Capa | Elección | Por qué |
| --- | --- | --- |
| Lenguaje | TypeScript (strict) | Seguridad de tipos, sin framework |
| Render | DOM + CSS | Cero dependencias de runtime, control total |
| Build | Vite | Arranque instantáneo, build mínimo (~43 KB JS) |
| Contenido | JSON en `datos/` + validador propio | Versionado en git, sin backend |
| Tests | Scripts con esbuild + jsdom | Sin frameworks de test (solo `jsdom` como DOM) |
| Despliegue | GitHub Actions → GitHub Pages | Sin verde, no hay despliegue |
| Android | PWA + Bubblewrap (TWA) | Un solo código para web y Play Store |

## ▶️ Ejecutar

```bash
npm.cmd install        # dependencias
npm.cmd run dev        # desarrollo → http://localhost:5173
npm.cmd run build      # build de producción (tsc + vite) → dist/
npm.cmd run preview    # previsualizar el build → http://localhost:4173
npm.cmd run prueba     # TODO: lógica + persistencia + pantallas + datos
npm.cmd run prueba:datos   # solo el validador de datos/
node scripts/validar-preguntas.mjs   # el validador sin pasar por esbuild
npm.cmd run iconos        # regenerar los PNG del PWA desde public/icons/*.svg
npm.cmd run comprobar-offline   # verifica que la app funciona sin conexión (Chrome)
```

> ⚠️ En Windows/PowerShell usar `npm.cmd` (la política de ejecución bloquea los `.ps1`).

## 🧪 Pruebas

```bash
npm.cmd run prueba
```

| Fichero | Qué cubre |
| --- | --- |
| `pruebas/logica.ts` | Corrección, barajado (Fisher-Yates), selección de preguntas y catálogo |
| `pruebas/persistencia.ts` | Ajustes, mejor nota, racha y lectura defensiva de `localStorage` |
| `pruebas/pantallas.ts` | Las 5 pantallas con DOM real (jsdom) + recorrido completo E2E |
| `pruebas/datos.ts` | Validación de `datos/` (reglas del PLAN §3) con datos falsos |

## 📝 Añadir preguntas

1. Editar o crear `datos/preguntas/<curso>/<tema>.json` (formato en `PLAN.md` §3).
2. `npm.cmd run prueba` → el validador revisa **todo** el contenido.
3. `git push` → la CI valida, construye y despliega.

**Reglas duras:** `id` único (`<curso>-<tema>-<nnn>`), `respuesta` = índice dentro de `opciones`, `tipo` ∈ `opcion-multiple` · `verdadero-falso` · `fecha` · `imagen`, `dificultad` ∈ 1·2·3 y todo tema ≥ `minPreguntas`.

## 🗂️ Estructura

```
datos/                  # EL CONTENIDO vive aquí (nunca en src/)
├── temas.json          # catálogo: cursos, temas, orden, minPreguntas
└── preguntas/<curso>/<tema>.json
src/
├── main.ts             # arranque: bundle de datos + estilos + monta la app
├── aplicacion.ts       # shell, enrutado por hash y sesión del quiz
├── datos.ts            # integra datos/ en el bundle (import.meta.glob)
├── persistencia.ts     # acceso centralizado a localStorage
├── logica/             # corrección, barajado, selección, catálogo (sin DOM)
├── ui/                 # pantallas + cadenas de texto + helper DOM
└── estilos/            # base.css (variables) + app.css (componentes)
pruebas/                # tests propios con esbuild (sin frameworks)
scripts/                # validar-preguntas.mjs, generar-iconos.mjs
```

## 🗺️ Fases

| Fase | Estado |
| --- | --- |
| 1 · Cimiento (repo, datos, lógica) | ✅ |
| 2 · Interfaz completa (5 pantallas) | ✅ |
| 3 · PWA (manifest, iconos, service worker) | ✅ |
| 4 · Despliegue web (GitHub Pages) | ✅ |
| 5 · Android (TWA + Play Store) | ⏳ |
| 6 · Contenido real y documentación | ⏳ |

El plan completo, los requisitos (R/01–R/08) y las decisiones están en [`PLAN.md`](./PLAN.md); el historial de cambios, en [`MEMORY.md`](./MEMORY.md).

## 📄 Licencia

MIT
