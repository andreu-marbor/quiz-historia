# MEMORY.md — Memoria del proyecto

Registro de **cambios relevantes**, **problemas encontrados y sus soluciones** y **estado de las fases**.

> Este archivo se actualiza con cada cambio relevante. Las entradas son **aditivas**: lo más reciente al final de cada sección. **Nunca borrar ni reescribir entradas anteriores.**

---

## 📍 Estado actual de las fases

| Fase | Descripción | Estado |
|---|---|---|
| — | Documentación inicial (`PLAN.md`, `AGENTS.md`, `MEMORY.md`) | ✅ Completada |
| 1 | Cimiento (repo `main`, scaffold Vite+TS, validador, lógica, ~40 preguntas, tests) | ✅ Completada (2026-10-06) |
| 2 | Interfaz completa (5 pantallas, persistencia, oscuro, responsive) | ⏳ Pendiente |
| 3 | PWA (manifest, iconos, service worker offline, Lighthouse) | ⏳ Pendiente |
| 4 | Despliegue web (GitHub Actions → Pages, `base: /quiz-historia/`) | ⏳ Pendiente |
| 5 | Android TWA (keystore nuevo, assetlinks, APK + tramo cerrado Play) | ⏳ Pendiente |
| 6 | Contenido real (temario ESO/Bachiller) y documentación | ⏳ Pendiente |

---

## 🔑 Decisiones clave (resumen; detalle en PLAN.md §9)

| Decisión | Valor |
|---|---|
| Stack | TypeScript + Vite **sin frameworks**, DOM manual, cero dependencias de runtime |
| Contenido | JSON en `datos/` + validador en tests y CI; **nunca** en `src/` |
| Android | PWA + TWA con Bubblewrap |
| Package | `com.andreumarbor.quizophistoria` |
| Nombre visible | **"Repaso de Historia"** (`short_name`: "Repaso Historia") |
| Distribución | Play Store (tramo cerrado: 12 verificadores × 14 días → Producción) + APK directo al colegio en paralelo |
| Keystore | **Nuevo propio** (`./android.keystore`, gitignored), alias `android`, contraseña en `%USERPROFILE%\.bubblewrap\keystore-pass-quizhistoria.txt` + respaldo en el otro PC |
| i18n | **Sin capa i18n**: interfaz y contenido en castellano |
| Ramas | Repo nacido en **`main`** (evita el desfase `master`/`main` de los otros proyectos) |
| Progreso | `localStorage` (sin cuentas ni backend; RGPD por diseño) |

---

## 📝 Registro de cambios

### 2026-10-06 — Creación de la documentación inicial

- Creado `PLAN.md` con el plan completo (10 secciones): objetivo y requisitos R/01–R/08, decisiones tecnológicas, modelo de datos con reglas del validador, 5 pantallas, 6 fases de implementación con checklist, scripts npm, riesgos, criterios de "hecho", decisiones cerradas (§9) y trabajo futuro (§10).
- Creado `AGENTS.md`: qué es el proyecto, stack, árbol de directorios previsto, **flujo de edición de preguntas**, convenciones, comandos (`npm.cmd`), publicación Android y la regla de mantener `MEMORY.md` al día.
- Creado `MEMORY.md` (este archivo).
- **Decisiones cerradas con el usuario** (PLAN.md §9): keystore nuevo propio, distribución doble vía (Play cerrado + APK directo), package `com.andreumarbor.quizophistoria`, nombre "Repaso de Historia".
- **Hallazgo del entorno:** verificado que `tres-en-raya/android.keystore` y `%USERPROFILE%\.bubblewrap\` (contraseña) **no existen en esta máquina**. El usuario confirma que los conserva **en otro PC** → se adopta la convención de **respaldo siempre en el segundo PC** para el keystore de este proyecto. No afecta a este proyecto; sí al mantenimiento de `tres-en-raya` si se pierde.
- **Pendiente:** iniciar Fase 1 (`git init -b main`, scaffold, validador, lógica y preguntas de muestra).

### 2026-10-06 — Fase 1 completada (cimiento)

- **Repo:** `git init -b main` + `.gitignore` (incluye ya `*.keystore`/Android, PLAN §5 fase 5). Commit inicial `docs: plan, AGENTS.md, memoria inicial y .gitignore`.
- **Scaffold a mano:** `package.json` (scripts `dev`, `build` = `tsc --noEmit && vite build`, `preview`, `prueba`, `prueba:logica`, `prueba:datos`), `tsconfig.json` (estricto, `include: ["src"]`, como en `tres-en-raya`), `vite.config.ts` (sin `base` todavía: llega en la Fase 4), `index.html`, `src/vite-env.d.ts`, `src/estilos/base.css` (variables `--bg`, `--accent`, modo oscuro por `prefers-color-scheme` + override `[data-tema]`).
- **Contenido:** `datos/temas.json` con 3 cursos (`eso2`, `eso4`, `bachillerato1`) y 4 temas, y **40 preguntas** (10 por tema) en `datos/preguntas/<curso>/<tema>.json`. Mezcla de tipos: `opcion-multiple`, `verdadero-falso` y `fecha`.
- **Validador** `scripts/validar-preguntas.mjs` (sin dependencias): todas las reglas de §3 (ids únicos y con convención `<curso>-<tema>-<nnn>`, `respuesta` dentro de rango, textos no vacíos, tipos y coherencia de `opciones`/`verdadero-falso`, `dificultad` ∈ 1·2·3, `minPreguntas`, ficheros huérfanos, directorios que no son cursos del catálogo, temas sin fichero, JSON ilegible). **Reglas extra** más allá de §3: campos desconocidos (typos), opciones/etiquetas repetidas, existencia del fichero de `imagen` en `public/`. Es CLI (`node scripts/validar-preguntas.mjs`) y módulo (lo importa `pruebas/datos.ts`).
- **Lógica** `src/logica/`: `tipos.ts`, `correccion.ts` (`corregir`, `resumir` → nota 0–100, falladas, sin responder = fallo), `barajado.ts` (Fisher-Yates con generador inyectable + `presentarPregunta` que remapea la respuesta correcta; `verdadero-falso` nunca se baraja), `seleccion.ts` (`seleccionarPreguntas`: sin repetir, filtros por dificultad/tags/excluir y **reparto equilibrado 1·2·3**).
- **Pruebas** con el patrón de `tres-en-raya` (esbuild → `node_modules/.tmp/*.mjs` → node): `pruebas/ayudante.ts` (mini-ayudante sin frameworks), `pruebas/logica.ts` (38 comprobaciones), `pruebas/datos.ts` (39: contenido real + reglas con datos falsos y repositorios inventados en `node_modules/.tmp/validacion-falsa`).
- **`src/main.ts`** carga catálogo y preguntas con `import.meta.glob(..., { eager: true })` → **las 40 preguntas entran en el bundle** (21 kB): la app funciona offline desde el primer build (R/06). Pinta una vista de comprovación de cursos/temas (la UI real es la Fase 2).
- **Verificado en verde:** `npm.cmd run prueba` (77 comprobaciones: 38 de lógica + 39 de datos) y `npm.cmd run build` (`dist/` con las preguntas embebidas).

### 2026-10-06 — Infraestructura: Node 22, GitHub CLI y remoto en GitHub

- **Node actualizado** de 20.18.0 a **22.23.2** con `winget install --id OpenJS.NodeJS.22` → desaparece el aviso de Vite 7. Re-verificado en verde bajo el runtime nuevo: `npm.cmd run build` y `npm.cmd run prueba` (77 comprobaciones).
- **GitHub CLI 2.102.0** instalado (`winget install --id GitHub.cli`) y autenticado como `andreu-marbor` mediante device flow (scopes `repo`, `gist`, `read:org`). Instalado en `C:\Program Files\GitHub CLI\gh.exe`; las sesiones de terminal abiertas antes de instalar no lo ven en el PATH, hay que usar la ruta completa o abrir terminal nueva.
- **Remoto creado y push hecho:** `gh repo create quiz-historia --public --source . --remote origin --push` → **https://github.com/andreu-marbor/quiz-historia** (público, rama por defecto `main`, descripción, *homepage* provisional hacia Pages y topics `pwa`, `quiz`, `history`, `typescript`, `vite`).
- `main` queda con upstream configurado desde el primer push (mitigación del riesgo de PLAN §7): basta `git push`, sin `HEAD:main`.
- `gh run list` seguirá vacío hasta la Fase 4 (aún no existe `.github/workflows/despliegue.yml`).

---

## 🐛 Incidencias y soluciones

### 2026-10-06 — `esbuild` con salida `.mjs` producía `require` (fase 1)

- **Qué falló:** `npm.cmd run prueba:datos` terminaba con `ReferenceError: require is not defined in ES module scope`.
- **Causa:** con `--platform=node` esbuild empaqueta en **CJS** (`require` de `node:fs`), pero el fichero de salida `node_modules/.tmp/datos.mjs` lo hace Node tratar como **ESM**. El otro test pasaba solo porque no importa builtins de Node.
- **Solución:** añadir `--format=esm` a los dos scripts `prueba:*` de `package.json`.

### 2026-10-06 — Test de Fisher-Yates con generador constante (fase 1)

- **Qué falló:** `barajar(base, () => 0.99)` devolvía el mismo orden: en Fisher-Yates `j = floor(r * (i+1))` con `r ≈ 0.99` da siempre `j = i`.
- **Solución:** usar un generador congruencial con semilla (`generadorSembrado`) en `pruebas/logica.ts` y comprobar reproducibilidad por semilla en lugar de comparar con un valor constante.

### 2026-10-06 — Node.js 20.18.0 por debajo de lo que pide Vite 7 ⚠️ pendiente

- **Qué ocurre:** cada ejecución de `vite` avisa: *"You are using Node.js 20.18.0. Vite requires Node.js version 20.19+ or 22.12+"*. **El build y el dev server funcionan** (verificado), pero es una advertencia de compatibilidad.
- **Causa:** Vite 7 exige Node `^20.19.0 || >=22.12.0`; este PC tiene 20.18.0.
- **Acción recomendada:** actualizar Node a la rama 22 LTS antes de la Fase 4/5 (CI usará su propia versión de Node, así que hay que fijarla también en el workflow de GitHub Actions).
- **Alternativa descartada:** bajar a Vite 6, que sí admite Node 20.0; se prefiere mantener Vite 7 (mismo stack que `tres-en-raya`).

### 2026-10-06 — Resolución: Node actualizado a 22.23.2 ✅ (cierra la incidencia anterior)

- Aplicado `winget install --id OpenJS.NodeJS.22` → **v22.23.2** en `C:\Program Files\nodejs\`.
- Sin avisos de Vite en `npm.cmd run build` ni en `vite`; pruebas y build en verde con el runtime nuevo.
- **Pendiente (Fase 4):** fijar `node-version: 22` en `.github/workflows/despliegue.yml` para que la CI use esta misma versión.
