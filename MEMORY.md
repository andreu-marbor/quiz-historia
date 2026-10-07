# MEMORY.md — Memoria del proyecto

Registro de **cambios relevantes**, **problemas encontrados y sus soluciones** y **estado de las fases**.

> Este archivo se actualiza con cada cambio relevante. Las entradas son **aditivas**: lo más reciente al final de cada sección. **Nunca borrar ni reescribir entradas anteriores.**

---

## 📍 Estado actual de las fases

| Fase | Descripción | Estado |
|---|---|---|
| — | Documentación inicial (`PLAN.md`, `AGENTS.md`, `MEMORY.md`) | ✅ Completada |
| 1 | Cimiento (repo `main`, scaffold Vite+TS, validador, lógica, ~40 preguntas, tests) | ✅ Completada (2026-10-06) |
| 2 | Interfaz completa (5 pantallas, persistencia, oscuro, responsive) | ✅ Completada (2026-10-06) |
| 3 | PWA (manifest, iconos, service worker offline, Lighthouse) | ✅ Completada (2026-10-07) |
| 4 | Despliegue web (GitHub Actions → Pages, `base: /quiz-historia/`) | ✅ Completada (2026-10-07) |
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

### 2026-10-06 — Fase 2 completada (interfaz completa)

- **`src/ui/` — las 5 pantallas de §4**, todas construidas con un helper propio (`h()`, sin frameworks) y con los textos centralizados en `src/ui/cadenas.ts` (objeto `T`; sin i18n pero preparado para añadirla):
  - **Inicio** (`inicio.ts`): cursos en `<details>` desplegables, temas como botones con nº de preguntas, insignia de mejor nota y **tema bloqueado + explicación cuando no llega a `minPreguntas`**.
  - **Cuestionario** (`cuestionario.ts`): contador, barra `role="progressbar"` con `aria-valuetext`, opciones como botones (nunca `disabled` hasta responder), feedback inmediato dentro de una región `aria-live="polite"` **que ya existe antes de responder** (para que el lector de pantalla lo anuncie), iconos ✓/✗ + `aria-label` (el color nunca es el único indicador), foco automático en "Siguiente". Se actualiza el DOM en el sitio en vez de repintar al responder.
  - **Resultados** (`resultados.ts`): nota grande, aciertos, veredicto, insignia de nueva mejor nota, lista de falladas con "Tu respuesta / Respuesta correcta / Explicación" y los 3 botones (repetir falladas, repetir todas, elegir otro tema).
  - **Progreso** (`progreso.ts`): tarjetas de racha y cuestionarios + tabla real con `caption`/`scope`, envuelta en una región enfocable (`tabindex="0"`) para poder desplazarla con teclado en móvil.
  - **Ajustes** (`ajustes.ts`): `fieldset`+`legend` para el modo de color, selector de nº de preguntas (5·10·15·20·todas), casilla de barajado con `aria-describedby`, "Borrar progreso" con confirmación y aviso `role="status"`. Los cambios se guardan solos.
- **`src/aplicacion.ts`** (nuevo): shell (cabecera + navegación con `aria-current`), **enrutado por hash** (`#/`, `#/cuestionario`, `#/resultados`, `#/progreso`, `#/ajustes`; rutas desconocidas o acceso sin sesión vuelven a `#/`), estado de la sesión, gestión del foco al cambiar de pantalla y todas las acciones. `src/main.ts` queda como arranque puro (bundle de datos + CSS + montaje) → **el núcleo se puede probar en jsdom**.
- **`src/datos.ts`** (nuevo): integra `datos/` en el bundle con `import.meta.glob` (R/06: funciona sin internet). Fuera de `logica/` porque `import.meta.glob` es una API de Vite y las pruebas no deben importarlo.
- **`src/logica/catalogo.ts`** (nuevo, puro): orden de cursos/temas, búsquedas, clave `<curso>/<tema>`, `preguntasDeTema` y `temaJugable` (respetar `minPreguntas`).
- **`src/persistencia.ts`**: único punto que toca `localStorage`. Claves versionadas (`repaso-historia:ajustes:v1`, `...:progreso:v1`), **lectura defensiva** (JSON corrupto o valores fuera de catálogo → defectos), `Almacen` inyectable para testear sin navegador, `borrarProgreso`, y lógica pura `avanzarRacha`/`registrarCuestionario`/`fechaLocal`/`diasEntre`.
  - **Racha = días consecutivos con actividad** (estilo Duolingo): primer día → 1, mismo día no suma, día siguiente +1, un día perdido reinicia a 1, fecha anterior (reloj atrasado) no castiga. Decisión propia: el PLAN solo decía "racha" sin definirla.
- **Estilos**: `base.css` ampliado (variables de tema completo, `--ok`/`--error`/`--aviso` con contraste AA en ambos modos, `prefers-contrast`, `prefers-reduced-motion`) y `app.css` con todos los componentes (móvil primero, objetivos táctiles ≥44px, foco visible heredado). `index.html` con `lang="es"`, meta descripción y `color-scheme`.
- **Pruebas nuevas** (patrón esbuild existente):
  - `pruebas/logica.ts` ampliado con el catálogo y `minPreguntas` (53 comprobaciones).
  - `pruebas/persistencia.ts` (41): ajustes por defecto/defensivos, racha completa, mejor nota, acotado a 100, saneado de datos sucios, borrado.
  - `pruebas/pantallas.ts` (141) con **`jsdom` como dependencia de desarrollo única nueva** (la app sigue con **cero dependencias de runtime**): helper `h()`, las 5 pantallas por separado (render, eventos, ARIA) y un **recorrido E2E** montar → elegir tema → responder 3 preguntas → resultados → repetir falladas → salir → navegar por enlaces → ajustes → borrar progreso → guardas de rutas.
  - `pruebas/ayudante.ts` ahora informa del **número de comprobaciones** en el resumen final.
- **Verificado en verde:** `npm.cmd run prueba` (**274 comprobaciones**: 53 lógica + 41 persistencia + 141 pantallas + 39 datos) y `npm.cmd run build` (24 módulos, 42.98 kB JS / 14.37 kB gzip + 11 kB CSS).
- **Documentación:** `PLAN.md` (checklist Fase 2 marcado ✅ y tabla §6 con los scripts nuevos), `AGENTS.md` (árbol `src/` y `pruebas/`, stack de tests, comandos).
- **Siguiente:** Fase 3 (PWA) o revisión visual con el usuario en `npm.cmd run dev`.

### 2026-10-07 — Fase 4 completada (despliegue web) — antes que la Fase 3

- **Cambio de orden acordado con el usuario:** se ejecuta la **Fase 4 antes que la Fase 3** para poder probar y validar la app directamente en la URL pública de GitHub Pages (y porque la PWA se audita con Lighthouse sobre HTTPS real, no en local).
- **`vite.config.ts`:** `base: '/quiz-historia/'` (GitHub Pages publica en subcarpeta). Verificado en `dist/index.html`: los assets se sirven como `/quiz-historia/assets/...`.
- **`.github/workflows/despliegue.yml`** (nuevo): `prueba` → `build` → Pages en push a `main` y en `workflow_dispatch`, y **solo `prueba` + `build` en PRs** (los pasos de Pages van con `if: github.event_name != 'pull_request'`). Node **22** (misma versión que el PC, decisión pendiente de la incidencia de Node). Patrón copiado del flujo de `tres-en-raya`, adaptado a los 4 scripts de pruebas de este proyecto.
- **GitHub Pages activado** vía API (`gh api -X POST .../pages -f build_type=workflow`) → fuente **GitHub Actions**; antes devolvía 404 (estaba desactivado).
- **`README.md`** (nuevo): enlace en vivo, badges, características, tabla tecnológica, comandos (`npm.cmd`), tabla de pruebas, flujo de edición de preguntas, estructura y estado de fases. Tabla de capturas **pendiente** (falta `docs/capturas/`).
- **Primer despliegue en verde:** run `37639197045` (`build` + `deploy` OK). **URL pública: https://andreu-marbor.github.io/quiz-historia/** → 200, título "Repaso de Historia", JS (42,5 kB) y CSS (11 kB) responden 200.
- **Portfolio `andreu-marbor.github.io`:** enlace **"Jugar"/"Play"** añadido al artículo `#quiz-historia` (es y en) y nota de estado actualizada a "Fases 1, 2 y 4 completas". Commit `e09b8c1` → `main` (push con `HEAD:main`: la rama local allí sigue siendo `master`).
- **Aviso no bloqueante en la CI:** `actions/checkout@v4`, `setup-node@v4`, `configure-pages@v5` y `upload-artifact@v4` apuntan a Node 20 (deprecado); subir a v5 cuando salgan. También aviso de migración de `ubuntu-latest` a Ubuntu 26 (19/10/2026).
- **Pendiente:** capturas del README y, sobre todo, **Fase 3 (PWA)**, ahora sí la siguiente.

### 2026-10-07 — Fase 3 completada (PWA), con dos fallos de offline destapados por las pruebas

- **`public/manifest.webmanifest`**: `name` "Repaso de Historia", `short_name` "Repaso Historia", `start_url`/`scope` `./`, `display: standalone`, `theme_color` `#8c2f2f`, `background_color` `#f7f5f0`, `categories: ["education"]` y 5 iconos (192/512 `any`, 192/512 `maskable` y SVG).
- **Iconos propios** (`public/icons/icono.svg` e `icono-maskable.svg`): cuadrado granate con un signo de interrogación **dibujado con trazos** (sin fuentes, se renderiza igual en todas las plataformas); el maskable va a sangre con el glifo dentro de la zona segura. `npm.cmd run iconos` (`scripts/generar-iconos.mjs` + **`sharp` como dependencia de desarrollo única nueva**) genera los PNG y el `favicon.svg`.
- **`index.html`**: `<link rel="manifest">`, favicon SVG, `apple-touch-icon`, dos `theme-color` (claro/oscuro) y las metas `apple-mobile-web-app-*`; rutas con `%BASE_URL%` para que Vite aplique `base: '/quiz-historia/'`.
- **Registro del SW** en `src/main.ts` solo con `import.meta.env.PROD` y rutas relativas (`./sw.js`) → funciona igual en raíz y en subcarpeta.
- **`public/sw.js`** (estrategia documentada en su cabecera): red primero para navegaciones (HTML fresco) y **caché primero con revalidación en segundo plano** para el resto; carcasa precacheada en `install`.
- **🐛 Fallo 1 — sin precachear los assets no había offline real.** El SW solo cacheaba la carcasa; los JS/CSS con hash se cacheaban si alguien los pedía con red, y en la primera visita el SW aún no controlaba → sin internet quedaba un `index.html` vacío. **Solución:** en `install` se extraen del HTML cacheado (`src`/`href`) y se guardan (`precachear()`).
- **🐛 Fallo 2 — `Vary: Origin` impedía encontrar los assets cacheados.** Los servidores responden con `Vary: Origin` (y `Vary: Accept-Encoding`); la request guardada con `cache.add(url)` no lleva esas cabeceras, mientras que la del `<script crossorigin>` sí → `caches.match` devolvía `undefined` y el SW respondía `Response.error()` (`net::ERR_FAILED`). **Solución:** `caches.match(..., { ignoreVary: true })` en todas las comparaciones.
- **Cómo se verificó offline** (Lighthouse ya no incluye esas auditorías): `scripts/comprobar-offline.mjs` (**`npm.cmd run comprobar-offline`**, con Chrome headless + CDP) que (1) carga online, (2) corta la red con `Network.emulateNetworkConditions` **en la página y en el service worker** y desactiva la caché HTTP, (3) vuelve a navegar. Resultado en local y en producción: Document/CSS/JS **200 desde CacheStorage** y la app monta con contenido (`Repaso de Historia Jugar Progreso Ajustes…`). Descubierto además que el flag `--offline` de Chrome **no surte efecto** en headless: el control con perfil limpio también "montaba" la app, o sea que esa comprobación habría sido falaz. No entra en `npm.cmd run prueba` porque necesita Chrome.
- **Auditorías:** **PWA 100/100** con Lighthouse 11 (`installable-manifest`, `splash-screen`, `themed-omnibox`, `content-width`, `viewport`, `maskable-icon` todos OK). ⚠️ **Lighthouse 13.5 ya no tiene la categoría `pwa`** (se retiró), así que `--only-categories=pwa` exige `lighthouse@11`. Con la versión actual: performance 96 · accessibility 100 · best-practices 100 · seo 100.
- **🐛 A11y — `label-content-name-mismatch`.** El `aria-label` de los botones de tema (`"Jugar a La Revolución Industrial (2º ESO)"`) **reemplazaba** el texto visible, que axe exige ver dentro del nombre accesible. **Solución:** sin `aria-label`; el contexto va en un `span.visualmente-oculto` **al frente** del botón (`src/estilos/base.css` + `src/ui/inicio.ts`), y el test correspondiente pasa a comprobar que no hay `aria-label` y que el nombre accesible sí suma el curso. Sin esto, la auditoría seguía en rojo.
- **Verificado en verde:** `npm.cmd run prueba` (**275 comprobaciones**: 53 + 41 + 142 + 39) y `npm.cmd run build`; despliegues `56e28e7`, `e40d544` y `5a184ff` en CI verde.
- **Aviso:** una vez salí a auditar contra un build recién publicado y **Lighthouse midió la versión anterior** (CDN/cache): comprobar siempre el hash de `assets/` servido antes de dar por buena una auditoría.

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

### 2026-10-06 — `setAttribute('onclick', fn)` no registra el listener (fase 2)

- **Qué implica:** mi helper `h('button', { onclick: () => ... })` hacía `elemento.setAttribute('onclick', String(fn))`. Eso **no ejecuta nada**: el navegador evalúa el atributo como *cuerpo* de una función, así que `() => acciones.x()` solo define una flecha y la descarta. Toda la UI habría quedado sin reacción (clásico fallo silencioso, el build en verde no lo detecta).
- **Solución:** en `src/ui/dom.ts`, cualquier atributo que empiece por `on` **y** cuyo valor sea función se registra con `addEventListener(clave.slice(2).toLowerCase(), fn)`. Cubierto por un test explícito en `pruebas/pantallas.ts` ("onclick registra un listener real").
- **Lección:** con DOM manual, los tests de DOM no son lujo: el type-checker no puede ver que un listener no está conectado.

### 2026-10-06 — jsdom: `document.textContent` es `null` y la navegación por hash es asíncrona (fase 2)

- **Qué falló:** en el flujo E2E, `texto(document)` devolvía `''` (en jsdom `Document.textContent` es `null`, hay que usar `#vista` o `body`) y el clic en un enlace de la navegación "no funcionaba".
- **Causa real:** jsdom **sí** sigue el enlace, pero en dos pasos: primero cambia `location.hash` y **después** dispara `hashchange` en otra tarea. Mi espera comprobaba solo `hash === '#/progreso'` y corría antes de que la app repintara.
- **Solución:** helper `esperar(condicion)` que sondea cada 5 ms (hasta 500 ms) **la condición que importa** (el `h1` de la pantalla destino), no el hash. La app pinta además de forma síncrona en `navegar()` para no depender del evento.
- **Relacionado:** el error silencioso de jsdom ("excepción dentro de un listener") solo aparece si se instala un `VirtualConsole`; se ha añadido en el test para que un fallo dentro de un listener no se trague.

### 2026-10-06 — 5 fallos que eran del test, no de la app (fase 2)

- **Qué falló:** 3 aserciones en `pruebas/pantallas.ts` al marcar opciones y 2 en la tabla de progreso.
- **Causas:** (1) `elemento.querySelector('.opcion--correcta')` busca en los **descendientes**, no en el propio elemento → había que usar `classList.contains`; (2) esperaba `.insignia--alta` con una nota de 85, pero 85 cae en la banda **media** (≥60 y <90); (3) `querySelectorAll('td')` no incluye el `<th scope="row">` del tema, así que el índice de "jugados" era `[2]`, no `[1]`.
- **Solución:** corregir las aserciones; **la app estaba bien** (lo confirmaban por otro lado el icono ✓, los `aria-label` y el texto de la insignia).
- **Nota:** contar ✅ con `Select-String`/`regex` desde PowerShell **se corrompe** (el emoji no llega igual); se hace el recuento en el propio `ayudante.ts` (`TODO OK (N comprobaciones)`).
