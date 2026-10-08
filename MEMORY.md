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
| 5 | Android TWA (keystore nuevo, assetlinks, APK + tramo cerrado Play) | 🔄 En curso (2026-10-08): keystore + APK/AAB firmados + assetlinks ✅ · prueba en dispositivo ✅ · respaldo en el otro PC ✅ · pendiente: Play Console y fichas de la tienda |
| 6 | Contenido real (temario ESO/Bachiller) y documentación | ⏳ Pendiente |
| 7 | Escalado (miles de preguntas, cientos de temas, imágenes): disparadores, chunks, cachés y pipeline `sharp` | ⏳ Planificada (2026-10-07) · plan en `PLAN.md` §12 |
| 8 | Mejoras de uso: «Todos los temas» por asignatura, estructura `cursos > asignaturas > temas` y widget de racha | 🔄 En curso (2026-10-08): §13.2 ✅ · §13.1 ✅ · pendiente §13.3 (widget) |
| 9 | Pulido de interfaz (las 5 pantallas, manual): tipografía, iconos, microinteracciones, vacíos, ficha de examen y ajustes agrupados | 🔄 En curso (2026-10-08) · plan en `PLAN.md` §14 · T0–T5 ✅ · pendiente T6–T8 |

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

### 2026-10-07 — Fase 5 en marcha: entorno Android, keystore propio, APK/AAB firmados y assetlinks

- **Entorno** (no había nada de Android instalado en este PC): `npm.cmd install -g @bubblewrap/cli` → **`bubblewrap.cmd`**; Bubblewrap instaló su **JDK 17** en `%USERPROFILE%\.bubblewrap\jdk\jdk-17.0.11+9`; el **SDK** de Android Studio (`%LOCALAPPDATA%\Android\Sdk`, build-tools 36.1.0, platforms 34/36/36.1) se reutiliza.
- **`twa-manifest.json` escrito a mano** en vez de `bubblewrap.cmd init`: el `init` encadena ~25 preguntas interactivas que no se pueden responder de forma fiable por pipe en PowerShell. Plantilla: `tres-en-raya/twa-manifest.json`, con `packageId com.andreumarbor.quizophistoria`, `host andreu-marbor.github.io`, `startUrl`/`fullScopeUrl` `/quiz-historia/`, `webManifestUrl .../manifest.webmanifest`, iconos vivos (`icono-512.png`, `maskable-512.png`), `fallbackType: customtabs`, `minSdkVersion 21`, `enableNotifications: false` y `signingKey ./android.keystore` (alias `android`).
- **Desvío controlado del PLAN §5:** `name` = "Repaso de Historia" pero **`launcherName` = "Repaso Historia"** (15 chars): la etiqueta de 18 se trunca en los launchers y coincide con el `short_name` del manifest (§9.4).
- **Proyecto Android generado** con `bubblewrap.cmd update --skipVersionUpgrade` (comando no interactivo) → `app/`, `gradle/`, `build.gradle`, `settings.gradle`, `gradle.properties`, `gradlew*`, `manifest-checksum.txt` (versionados, como en `tres-en-raya`; no editarlos a mano) y `store_icon.png`, que Bubblewrap crea en la raíz.
- **Keystore propio** (§9.1): `keytool -genkeypair` (JDK de Bubblewrap) → `android.keystore`, alias `android`, RSA-2048, validez **10.000 días**, DN `CN=andreu-marbor, OU=Portfolio, O=GitHub, C=ES`; contraseña aleatoria de 36 hex en `%USERPROFILE%\.bubblewrap\keystore-pass-quizhistoria.txt` (fuera del repo). Confirmado que `.gitignore:18:*.keystore` lo ignora. **Huella SHA-256: `b7666ba3b6dedfc2ae1f36e8025f364f242199f01d35a0fb4dcb0e0ad66b54cf`.**
- **`local.properties`** (gitignored, creado a mano) con `sdk.dir=C:/Users/andre/AppData/Local/Android/Sdk`: sin él Gradle no encuentra el SDK. Hay que recrearlo si un `bubblewrap update` regenera el proyecto.
- **Build:** `BUBBLEWRAP_KEYSTORE_PASSWORD` y `BUBBLEWRAP_KEY_PASSWORD` en el entorno (leídos del fichero de contraseña, nunca impresos) → `bubblewrap.cmd build` → `app-release-signed.apk` (1,04 MB) y `app-release-bundle.aab` (1,15 MB).
- **Firma verificada** con `apksigner verify --print-certs`: `SHA-256 digest: b7666ba3…b54cf` = el del keystore ✓. Los `WARNING: META-INF/… not protected by signature` que imprime son informativos de Android Gradle Plugin, no errores.
- **Segunda sentencia de `assetlinks.json`** añadida en `andreu-marbor.github.io/.well-known/` (commit `dd58933`, rama `main`) y **verificada ya publicada** en `https://andreu-marbor.github.io/.well-known/assetlinks.json`; sin ella la app Android mostraría la barra de URL en vez de abrirse a pantalla completa.
- **Respaldo del keystore:** generado el paquete `C:\Users\andre\Downloads\respaldo-keystore-quiz-historia.zip` (`android.keystore` + contraseña + `LEEME-respaldo.txt` con huella, restauración y notas de Play App Signing), **fuera del repo y de OneDrive**. **Pendiente: copiarlo al otro PC y borrarlo de Descargas.**
- **Pendiente de la Fase 5:** prueba en dispositivo real (APK también copiado a `Descargas\RepasoHistoria-1.apk`), tramo cerrado de Play Console (12 verificadores × 14 días) y fichas de la tienda.

### 2026-10-08 — Plan de tres mejoras nuevas (`PLAN.md` §13 + Fase 8)

- **Alcance de la iteración:** solo documentación (`PLAN.md` y este fichero). **Cero cambios de código.**
- **§13.1 · «Todos los temas» en la lista de un curso:** fila **primera** que arma un cuestionario con el pool de todos los temas del curso, mezclado. Decisión: **clave virtual de runtime `__todos__`** (`eso2/__todos__`) en lugar de un tema falso en `temas.json` (el validador exige un fichero por tema y Progreso iteraría un tema inexistente). Toca `logica/catalogo.ts` (`preguntasDeConjunto` + `minimoDeConjunto`) y `aplicacion.ts` (`iniciar()` generalizado a *selección*, guardada en `estado.temaResultado` para que «Repetir solo las falladas» funcione desde el pool). **Mezclar no exige lógica nueva**: `seleccionarPreguntas` ya baraja y ya reparte 1·2·3.
- **§13.2 · Asignaturas por curso** (2º Bachillerato con Historia **y** Historia del Arte): campos **opcionales** `Curso.asignaturas[]` y `Tema.asignatura` en `tipos.ts`; los temas **siguen planos** en `Curso.temas` (moverlos habría roto catálogo, `datos.ts`, UI, validador y tests por un campo más). Los JSON van en los **mismos** `datos/preguntas/2bach/` con la convención actual de ids. La UI agrupa en Inicio/Progreso solo si un curso tiene >1 asignatura; el validador, que hoy rechaza campos desconocidos, pasa a aceptarlos con reglas de coherencia (`orden` único por grupo).
- **§13.3 · Widget de racha en la pantalla de inicio:** Android **no** soporta widgets para PWAs (el miembro `widgets` del manifest no está en Chrome/Android) y la racha vive en `localStorage` → **widget nativo** en el APK + **puente `intent://`** desde la web (`src/ui/widget.ts`, llamado al arrancar, en `finalizar()` y en `borrarProgreso()`), con `WidgetBridgeActivity` (valida extras → `SharedPreferences`) y `WidgetRachaProvider` con `PendingIntent` a la `MainActivity`. El widget aplica la regla de `avanzarRacha()`: si `ultimoDia` queda atrás muestra «—», nunca un número viejo. **Despliegue en dos pasos** (APK con el receptor primero, activación del envío en la web después) + sondeo de soporte con auto-desactivación, para no mostrar «No se encontró ninguna aplicación» con APKs antiguos. **Sin impacto en la firma ni en `assetlinks.json`**.
- **Riesgo principal anotado:** `bubblewrap update` regenera `app/` y podría borrar el widget → fuentes en `android/widget/` + `scripts/aplicar-widget.mjs` para reaplicar, y `update` solo cuando cambie `twa-manifest.json`.
- **Alternativas descartadas** (documentadas en §13.3): badge con `navigator.setAppBadge()` (cero nativo, pero no es widget) y esperar a los widgets PWA de Android.
- **Nota sobre la iteración anterior (2026-10-07):** el plan de escalado (`PLAN.md` §12 + Fase 7) se redactó bajo la instrucción de no tocar más ficheros, por eso no figura aquí; queda recogido en la tabla de fases de más arriba.
- **Estado:** ⏳ sin empezar; orden recomendado **§13.1 → §13.2 → §13.3** (Fase 8 en `PLAN.md` §5). Las tareas de §12.6 (Fase 7) siguen pendientes igual.

### 2026-10-08 — Decisión: «Todos los temas» es **por asignatura** (precisa la entrada anterior)

- **Decisión del usuario:** la opción «Todos los temas» se ofrece **por agrupación**, no por curso completo. En 2º Bachillerato con Historia y Historia del Arte el resultado es **«Todos los temas de Historia» + «Todos los temas de Historia del Arte»**, y **no hay fila «Todo el curso»** que mezcle materias distintas (se retira del plan §13.2).
- **Rótulo según el curso:** si el curso no declara asignaturas (todos los actuales), la fila conserva el literal **«Todos los temas»** que se pidió al principio; en cuanto un curso declare varias asignaturas, cada fila lleva el nombre de la suya.
- **Consecuencia técnica** (`PLAN.md` §13.1 actualizado): ya no basta una clave virtual por curso → hace falta **una clave virtual por fila**, centralizada en `claveConjunto(cursoId, asignaturaId | null)` → `eso2/__todos__` (sin agrupación) / `2bach/__todos__/historia` y `2bach/__todos__/historia-del-arte` (con agrupación). Inicio, Progreso, Resultados y `sesion.claveTema` deben usar esa misma función, o la nota guardada no coincidiría con la fila pintada. Desaparece la cadena `inicio.todoElCurso` (que sí figuraba en la entrada anterior) y los tests de `pruebas/pantallas.ts` pasan a comprobar **dos filas con claves distintas** cuando un curso tiene dos agrupaciones.
- **Alcance de esta iteración:** solo `PLAN.md` (§4, §5 Fase 8, §13.1, §13.2) y esta entrada; **cero cambios de código**.
- **Estado:** ⏳ decisión cerrada; la Fase 8 sigue sin empezar.

### 2026-10-08 — Decisión (la que manda sobre las dos anteriores): la asignatura es **obligatoria** → estructura `cursos > asignaturas > temas`

- **Decisión del usuario:** en vez de campos opcionales, se cambia la **arquitectura** del catálogo a **`cursos > asignaturas > temas`**, con el nombre de la asignatura **obligatorio en todos los cursos**. Los cursos de hoy quedarían envueltos en una única asignatura «Historia» (dejando la puerta abierta a más materias del currículo) y 2º Bachillerato llevaría Historia + Historia del Arte.
- **Supersede:** lo que decían las dos entradas anteriores de hoy — «campos opcionales, sin mover estructuras» y «rótulo genérico *Todos los temas* si el curso no declara asignaturas». Con asignatura obligatoria el rótulo es **siempre «Todos los temas de {asignatura}»**: ya no queda un «Todos los temas» a secas, ni caso «sin agrupación».
- **Consecuencias anotadas en `PLAN.md`:**
  - §13.2 reescrito: `Asignatura = { id, titulo, orden, temas }`, **`Curso.asignaturas` obligatorio** y **`Curso.temas` desaparece**; `asignaturasDeCurso()` + `temasDeAsignatura()` en `logica/catalogo.ts`; Inicio y Progreso pintan **curso → subtítulo de asignatura → temas** (subtítulo accesible, no espaciado).
  - §13.1: `claveConjunto(cursoId, asignaturaId)` **sin el caso `null`** → `eso2/__todos__/historia`, `2bach/__todos__/historia`, `2bach/__todos__/historia-del-arte`; cadena única `inicio.todosDe(asignatura)` (fuera `inicio.todosLosTemas`).
  - §3 y §4: el ejemplo de `temas.json` de §3 sigue documentando **la forma actual** y queda la tarea de actualizarlo al migrar; el puntero de §4 ya describe la agrupación obligatoria.
- **Migración de datos (commit atómico):** reescribir `datos/temas.json` envolviendo cada curso en «Historia» **junto con** tipos + `datos.ts` + UI + validador + tests, todo en verde. **Los JSON de preguntas no se mueven** y **las claves de progreso `<curso>/<tema>` no cambian** → no se pierden notas ni rachas.
- **Validador más estricto:** todo curso con `asignaturas` (≥ 1) y toda asignatura con ≥ 1 tema; **se rechaza `temas` a nivel de curso**; `id` de asignatura único en el curso; **`id` de tema único dentro del curso** (chocarían `<curso>/<tema>` y `<curso>-<tema>-<nnn>`); `orden` único por asignatura.
- **Orden de ejecución (Fase 8):** ahora es **§13.2 → §13.1 → §13.3** — sin la estructura obligatoria no hay bloques de asignatura donde pintar las filas del §13.1 (ambas tareas conviene hacerlas juntas).
- **Alcance de esta iteración:** solo `PLAN.md` (§3, §4, §5 Fase 8, §13.1, §13.2) y esta entrada; **cero cambios de código**.
- **Estado:** ⏳ decisión cerrada; la Fase 8 sigue sin empezar.

### 2026-10-08 — Plan de pulido de interfaz (`PLAN.md` §14 + Fase 9) y descarte de la skill de diseño Sleek

- **Contexto:** el usuario pidió «mejorar la interfaz con la skill `design-mobile-apps`» (instalada con `npx skills add designed-by-ai/skills` → `.agents/skills/`). Tras leerla, la propuesta obligaba a un flujo con **API externa (Sleek.design)** y su rama de implementación asume React Native/Expo o HTML+Tailwind, incompatible con nuestro **DOM + CSS con variables** (§9). **El usuario la descartó: «No quiero usar sleek»** → se anula todo el flujo de API/clave/coste y se hace el pulido **a mano**.
- **Alcance decidido (D.1 + D.2):** **las 5 pantallas** y **las 6 ideas** de la lista propuesta (tipografía en títulos · iconos SVG inline propios · microinteracciones · estados vacíos diseñados · resultados como «ficha de examen» · ajustes agrupados). **Decisión:** pulido, **no rediseño** — misma identidad crema + granate, mismas reglas duras (variables CSS, `cadenas.ts`, AA, `reduced-motion`, tests verdes).
- **Auditoría previa (solo lectura, hallazgos en `PLAN.md` §14.1):** clases muertas `insignia--neutro` y `curso-nombre`; `summary` sin `list-style:none` (flecha del navegador); espaciado sin escala (`var(--espacio)` junto a `0.35…0.9rem` sueltos); **sin `:active`** en botones/temas/opciones/nav (en móvil no se «hunde» al tocar); el «→» de `.tema-ir` es un carácter literal; los 5 estados vacíos son el mismo `.aviso` punteado; Ajustes con 4 bloques planos y la destructiva mezclada.
- **Se conserva tal cual** (auditoría positiva): `:focus-visible`, `reduced-motion`/`prefers-contrast`, `aria-live` + foco del quiz, `<dialog>` de INC-02, insignias nunca solo-color, targets ≥44 px, sin fuentes externas (offline).
- **T0 ejecutado:** `.agents/` y `skills-lock.json` añadidos al **`.gitignore`** (recurso local, no versionado; no se borró nada).
- **Plan escrito en `PLAN.md`:** §14 (14.1 auditoría · 14.2 las 6 ideas · 14.3 orden T0–T8 · 14.4 riesgos) + **Fase 9** en §5 + puntero en §4 «Criterios de UI». Ejecución **T1 → T2…T7 (una pantalla por tarea, commit+push con CI verde) → T8**; `pruebas/pantallas.ts` (167 selectores) se actualiza en la misma tarea que cambie el DOM.
- **Relación con otras fases:** no toca **Fase 7** (§12) ni **Fase 8** (§13); al final, T8 deja capturas que sirven para el **README** y las **fichas de Play Store** (dos pendientes de una).
- **Alcance de esta iteración:** `.gitignore`, `PLAN.md` (§4, §5, §14) y esta entrada; **cero cambios de código**.
- **Estado:** ⏳ Fase 9 planificada; **T0 ✅**, T1–T8 sin empezar.

### 2026-10-08 — Fase 5: cerradas las dos tareas manuales (F5-a y F5-b)

- **F5-a · Prueba en dispositivo real ✅:** el usuario instala la APK en su móvil y confirma instalación correcta, **pantalla completa** (la segunda sentencia de `assetlinks.json` funciona: no aparece barra de URL) y **funcionamiento sin conexión** en modo avión.
- **F5-b · Respaldo del keystore ✅:** `respaldo-keystore-quiz-historia.zip` (keystore + contraseña + `LEEME-respaldo.txt`) **copiado al otro PC**. Queda una copia en `Downloads` (ya no es imprescindible; se puede borrar).
- **Actualizado `PLAN.md` Fase 5:** las dos casillas pasan a `[x]`. **Siguen abiertas de la Fase 5:** tramo cerrado de Play Console (12 verificadores × 14 días) y fichas de la tienda (§5).
- **Estado de la fase:** 🔄 la parte técnica y manual ya está; sólo queda la publicación en Play (que irá agrupada con la reconstrucción de APK de §13.3 para no firmar dos veces).
- **Alcance:** solo `PLAN.md` (Fase 5) y esta entrada en `MEMORY.md`.

### 2026-10-08 — Fase 8 · §13.2 COMPLETADA: estructura obligatoria `cursos > asignaturas > temas`

- **Qué cambia:** el catálogo pasa de `cursos[].temas[]` a **`cursos[].asignaturas[].temas[]`**, con la asignatura **obligatoria** en todos los cursos. `datos/temas.json` migrado: los 3 cursos quedan envueltos en su asignatura «Historia». **Los JSON de preguntas NO se mueven** y **las claves de progreso `<curso>/<tema>` no cambian** → ninguna nota ni racha se pierde (las pruebas de persistencia siguen verdes con las mismas claves).
- **Tipos** (`src/logica/tipos.ts`): nuevo `Asignatura = { id, titulo, orden, temas }`; `Curso.asignaturas` obligatorio; **`Curso.temas` eliminado**.
- **Catálogo** (`src/logica/catalogo.ts`): `asignaturasDeCurso()` + `temasDeAsignatura()` + **`temasDelCurso()`** (aplanado, sustituye a `temasOrdenados`). `buscarTema(curso, temaId)` **conserva la firma de 2 argumentos** porque el validador garantiza que el id de tema es único **dentro del curso** → `src/aplicacion.ts` y `src/datos.ts` **no necesitaron ningún cambio** (índice `<curso>/<tema>` intacto).
- **UI:** `inicio.ts` pinta curso → **`h3.asignatura-titulo`** → temas, con el esquema de encabezados **h1 → h2 (curso, dentro del `summary`, que admite un encabezado) → h3 (asignatura)**; el número del chip de curso ahora cuenta **todos** los temas del curso; el nombre accesible de cada botón de tema suma `(Curso · Asignatura)`. `progreso.ts` gana la **columna «Asignatura»** (nueva cadena `T.progreso.tabla.asignatura`). CSS nuevo: `.curso-titulo`, `.asignatura`, `.asignatura-titulo` (con separador entre bloques) — todo por variables, con el `--texto-tenue` actual.
- **Validador** (`scripts/validar-preguntas.mjs`), ahora con **campos desconocidos también en el catálogo**: `asignaturas` ≥ 1 por curso (**se rechaza la forma antigua `temas` a nivel de curso** con mensaje «ya no va en el curso: la estructura es cursos > asignaturas > temas»), asignatura con ≥1 tema, `id` de asignatura único en el curso, **`id` de tema único DENTRO DEL CURSO** (chocarían `<curso>/<tema>` y `<curso>-<tema>-<nnn>`), `orden` de tema único **dentro de su asignatura**; `resumenDatos`/recorridos aplanados.
- **Tests: 300 → 315 comprobaciones**, todas verdes (`58 lógica + 41 persistencia + 171 pantallas + 45 datos`) + `build` en verde. Nuevas: curso sin asignaturas, forma antigua, campo desconocido, id de tema repetido entre asignaturas, `orden` repetido, subtítulos `h3` y columna de asignatura; el fixture de `logica.ts` ahora incluye **dos asignaturas** (Historia + Historia del Arte) para probar el aplanado.
- **Incidencia durante el desarrollo (rápida):** al reescribir `pintarCurso()` se olvidó `detalle.append(resumen)` en la rama con temas → el `<summary>` desaparecía y 2 tests de `pantallas.ts` fallaron; corregido al momento (los tests hicieron su función).
- **Docs:** `PLAN.md` — §3 muestra ya el ejemplo **nuevo** de `temas.json`, Fase 8 §13.2 marcada `[x]` y tareas de §13.2 completadas (queda la de contenido de Historia del Arte y la §13.1).
- **Siguiente:** **§13.1** — filas «Todos los temas de {asignatura}» con `claveConjunto(cursoId, asignaturaId)`.
- **Alcance:** `datos/temas.json`, `src/logica/{tipos,catalogo}.ts`, `src/ui/{inicio,progreso,cadenas}.ts`, `src/estilos/app.css`, `scripts/validar-preguntas.mjs`, `pruebas/{datos,logica,pantallas}.ts` y `PLAN.md`.

### 2026-10-08 — Fase 8 · §13.1 COMPLETADA: filas «Todos los temas de {asignatura}»

- **Qué es:** cada bloque de asignatura de Inicio lleva ahora **primera** una fila **«Todos los temas de {asignatura}»** que arma un cuestionario con preguntas **mezcladas de todos los temas de esa asignatura y ese curso**. Rótulo **siempre con la asignatura** (nunca un «Todos los temas» a secas ni «Todo el curso»), en coherencia con la decisión de §13.2.
- **Clave virtual:** `claveConjunto(cursoId, asignaturaId)` → `<curso>/__todos__/<asignatura>` (centralizada en `src/logica/catalogo.ts`; `__todos__` no puede ser un id válido porque el validador exige kebab-case ⇒ **no choca con ninguna clave real**). **Las claves existentes `<curso>/<tema>` no cambian** y el nuevo tipo `Seleccion` de `src/logica/tipos.ts` convive con ellas en `localStorage`.
- **Lógica pura nueva** (`catalogo.ts`): `preguntasDeConjunto(indice, curso, asignaturaId)` (unión en orden, **colapsando ids repetidos**), `minimoDeConjunto(temas)` = `max(minPreguntas)` y `asignaturaDeCurso(curso, asignaturaId)`.
- **Flujo:** nuevo `Acciones.elegirConjunto(cursoId, asignaturaId)`; `iniciar()` en `src/aplicacion.ts` pasa a recibir la **selección** (`tipo: 'tema' | 'conjunto'`) y deriva de ella banco, rótulo (`T.inicio.todosDe`) y clave. **`sesion.temaId` desaparece** en favor de `sesion.seleccion`; `estado.temaResultado` guarda la selección, así que **«Repetir solo las falladas» funciona también desde el pool**. `sesion.temaTitulo` = el rótulo → la cabecera del cuestionario y Resultados lo muestran **sin cambios**.
- **UI:** `pintarConjunto()` en `inicio.ts` (misma retícula que un tema, clase `.tema--todos` con **borde discontinuo granate** y nombre en `--accent`, deshabilitada con el motivo si el pool < mínimo); `progreso.ts` pinta **una fila por clave virtual** (la del conjunto, primero) con su propia mejor nota e insignia. Nueva cadena **`T.inicio.todosDe`**; ninguna cadena genérica (§13.1: ni `todosLosTemas` ni `todoElCurso`).
- **Tests: 315 → 350 comprobaciones**, todas verdes (`68 lógica + 43 persistencia + 194 pantallas + 45 datos`) y `build` en verde. Destacan: fila conjunta → clic → `elegirConjunto`; **flujo completo jugando el pool** (4 preguntas = 3 + 1 → nota 75 → clave `eso2/__todos__/historia` guardada **sin pisar** la del tema suelto → repetir falladas desde el pool → fila en Progreso); curso con **dos asignaturas → dos filas** con sus dos subtítulos; pool con ids repetidos colapsados; sorteo del conjunto con dificultades 2·2·1; clave virtual conviviendo con las de tema en `persistencia.ts`.
- **Sin cambios de contenido ni migración:** sólo `datos/temas.json` ya estaba migrado en §13.2; ningún JSON de preguntas se tocó.
- **Docs:** `PLAN.md` — §13.1 y sus 6 tareas `[x]`, la extensión de §13.2 `[x]`, la Fase 8 marca §13.1 `[x]` y el diseño documenta el tipo `Seleccion` implementado.
- **Siguiente de la Fase 8:** **§13.3** (widget de la racha en Android vía `intent://`), y después Fase 9 (pulido de interfaz T1–T8) o Fase 6 (contenido).
- **Alcance:** `src/logica/{tipos,catalogo}.ts`, `src/aplicacion.ts`, `src/ui/{contexto,inicio,progreso,cadenas}.ts`, `src/estilos/app.css`, `pruebas/{logica,persistencia,pantallas}.ts` y `PLAN.md`.

### 2026-10-08 — Fase 9 · T1 COMPLETADA: base común (escalas, iconos, `:active`, clases muertas)

- **Escala tipográfica** (`base.css`): nuevos `--texto-xs/s/base/m` + `--texto-marca/h1/enunciado/nota/cifra` (los `clamp()` de antes ahora son variables). **Cero `font-size` suelto** en los CSS (comprobado con grep). Nuevos `--font-cuerpo` (system-ui, el de siempre) y **`--font-titulo`** = serif de sistema (`Iowan Old Style / Palatino Linotype / Palatino / Book Antiqua / Georgia`) aplicado a `h1, h2, h3`, `.marca` y `.nota` → **idea 1 sin descargar ninguna fuente** (sigue funcionando offline). `.asignatura-titulo` se queda en `--font-cuerpo` por ser una etiqueta versalita.
- **Escala de espaciado:** `--espacio-2xs (0.25) / xs (0.35) / s (0.5) / m (0.75) / base (1) / l (1.5)` → todos los `margin/padding/gap` en variables. **Quedan 3 `rem` sueltos a propósito**: los micro-ajustes ópticos de píldoras (`0.1/0.15rem` en `.insignia`, `.curso-numero`, `padding-top` del `h3`), comentado en `base.css`. Desviaciones máximas al normalizar: ±0.15rem (≤2,4 px) en paddings de bloques.
- **Iconos:** nuevo `src/ui/iconos.ts` con el catálogo de la idea 2 (**jugar, progreso, ajustes, flecha, check, cruz, aviso**), SVG de 24×24 con `stroke="currentColor"`, **`aria-hidden="true"` + `focusable="false"`** (el texto visible sigue mandando en el nombre accesible → sin riesgo de `label-content-name-mismatch`) y clase `.icono` (tamaño en `em`). **Úsalo ya la navegación** (`aplicacion.ts`); `flecha/check/cruz/aviso` están listas para T2/T3/T7. No se reutiliza `h()` porque un SVG necesita `createElementNS`.
- **Microinteracciones (idea 3):** transiciones de 0.12 s en `.navegacion a`, `.boton`, `.tema`, `.opcion`, `.curso-resumen` (color/borde/fondo/transform) y estados **`:active`** en los cinco → en móvil «se hunde» al tocar. El `translateY(1px)` vive dentro de `@media (prefers-reduced-motion: no-preference)`; `.boton--primario:active` usa `filter: brightness(0.92)`.
- **Clases muertas / `summary` (§14.1):** `.insignia--neutro` **ahora existe** (borde discontinuo + fondo `--bg-secundario`, distinto de las de nota); **`curso-nombre` eliminado** de `inicio.ts` (no tenía ninguna regla y el `h2` ya es flex); el `summary` pasa de `list-style-position: inside` (disco del navegador, doble en Safari) a **`list-style: none` + `::-webkit-details-marker` oculto + chevron propio** que gira con `details[open]` — para eso `.curso-resumen` es `flex` y `.curso-titulo` gana `flex: 1; min-width: 0`.
- **Tests: 350 → 363 comprobaciones** (`68 lógica + 43 persistencia + 207 pantallas + 45 datos`) y `npm.cmd run build` en verde. Nuevas: sección «Iconos SVG inline» (el catálogo entero cumple viewBox/aria-hidden/currentColor/clases, + que no contamina el texto), icono en cada enlace de la nav con el texto visible intacto, y `.insignia--neutro` presente en Inicio.
- **Docs:** `PLAN.md` — T1 `[x]` con detalle, cifras obsoletas de §14 fuera («167 selectores», «300 comprobaciones») y **Fase 6: `AGENTS.md`/`MEMORY.md` marcadas `[x]`** (ya existían desde Fase 1; era doc pendiente detectada al revisar).
- **Siguiente de la Fase 9:** **T2 · Inicio** (jerarquía de la tarjeta, chip de contador accesible, «→» → icono, densidad de `lista-temas`).
- **Alcance:** `src/estilos/{base,app}.css`, `src/ui/iconos.ts` (nuevo), `src/ui/inicio.ts`, `src/aplicacion.ts`, `pruebas/pantallas.ts`, `PLAN.md` y esta entrada.

### 2026-10-08 — Fase 9 · T2 COMPLETADA: jerarquía de Inicio, chip accesible, flecha y densidad

- **Jerarquía de la tarjeta:** el `h2` del curso se queda **solo con el título** («2º ESO») y crece a `--texto-m`; con el curso desplegado su cabecera **se enciende en granate** (`.curso[open] .curso-titulo`). El `summary` queda `[h2] [chip] [chevron]`, con el chip de fondo `--bg` para que destaque sobre la tarjeta blanca.
- **Chip de contador accesible:** el contador **sale del `h2`** (antes el encabezado leía «2º ESO4» y el número iba con `aria-hidden`) y ahora es chip hermano con texto visible **«N temas»** (nueva cadena `T.inicio.temas(n)`, con plural) y **sin `aria-hidden`** → el nombre accesible del curso suma los dos textos visibles (sin riesgo de `label-content-name-mismatch`).
- **Fila de tema:** el `«→»` literal pasa a **`icono('flecha', 'tema-ir')`** en las dos filas (tema y «Todos los temas»), 1.5em, `currentColor`, decorativo. Idea 3: al pasar o pulsar la flecha **avanza 2px** (`translateX`), dentro de `@media (prefers-reduced-motion: no-preference)`. Las filas **bloqueadas** no la llevan: siguen mostrando «Necesitas al menos N preguntas».
- **Densidad de `lista-temas`:** `gap` 0.5 → `--espacio-xs` (0.35), `padding` de `.tema` 0.75 → `--espacio-s`/`--espacio-m` (8/12 px) y `padding-bottom` de la lista a `--espacio-s`; `min-height: 44px` intacto ⇒ objetivos táctiles sin tocar.
- **Tests: 363 → 368 comprobaciones** (`68 lógica + 43 persistencia + 212 pantallas + 45 datos`) y `build` en verde. Nuevas: chip sin `aria-hidden` y con «N temas», `h2` despojado del contador, filas jugables con `svg.tema-ir` y sin «→» en el texto, fila bloqueada sin flecha. **Autocorregido durante el desarrollo:** la primera versión del test de flechas exigía el icono también en la fila bloqueada (contradecía el diseño) → el test falló y se corrigió el test, no la app.
- **Docs:** `PLAN.md` — T2 `[x]` con detalle; fila de estado de Fase 9 en `MEMORY.md`.
- **Siguiente de la Fase 9:** **T3 · Cuestionario** (feedback con ✓/✗ + entrada animada, barra más expresiva, opciones con marca gráfica).
- **Alcance:** `src/ui/{cadenas,inicio}.ts`, `src/estilos/app.css`, `pruebas/pantallas.ts`, `PLAN.md` y esta entrada.

### 2026-10-08 — Fase 9 · T3 COMPLETADA: letra + iconos en las opciones, feedback animado y barra «hoja de examen»

- **Marca de opción = letra + icono gráfico (T3):** `.opcion-marca` estaba **vacío** antes de responder (solo reservaba `min-width`); ahora muestra la **letra A/B/C…** (serif `--font-titulo`, color `--texto-tenue`, ancho fijo de `1.4em` para que el texto no salte) y, tras responder, **la letra se sustituye por `icono('check')`/`icono('cruz')`** en la correcta/elegida (las descartadas conservan la letra). El estado ya **no es solo color**: lleva icono + texto + `aria-label`.
- **Accesibilidad (cuidado con `label-content-name-mismatch`):** la letra va **sin `aria-hidden`** → antes de responder el nombre accesible sale del contenido y **contiene** lo visible; tras responder, el icono decorativo **no aporta texto visible** y el `aria-label` («Opción B — Respuesta correcta») sigue conteniendo todo lo visible. `icono()` ya pone `aria-hidden` de fábrica. **Tests de `aria-label` sin cambios** (la letra no contamina el nombre de estado).
- **Feedback con icono + entrada animada:** `feedback-titulo` pasa a `flex` con `icono('check')`/`icono('cruz')` antes del texto (los tests de texto «¡Correcto!»/«Incorrecto» siguen verdes porque el icono no tiene texto) y el bloque **entra con un fundido** (`@keyframes feedback-entra`: opacidad + `translateY(-6px)`, 0.22 s) aplicado al aparecer `feedback--ok/mal`. Va **fuera de `prefers-reduced-motion`** y **no retrasa** el anuncio del `aria-live`.
- **Barra más expresiva:** de 10 px plana a **12 px** con carril `--bg` + borde y **muescas** (`repeating-linear-gradient`, casillas de examen), relleno con **brillo** (`linear-gradient` blanco sobre `--accent`, vale en ambos temas) y avance con **rebote** (`cubic-bezier(0.34,1.4,0.64,1)`); el `reduced-motion` global lo deja instantáneo. **Ningún ARIA tocado** (`role`, `aria-valuenow/text` intactos).
- **Tests: 368 → 372 comprobaciones** (`68 lógica + 43 persistencia + 216 pantallas + 45 datos`) y `build` en verde. Nuevas: letras antes de responder, descartada conserva letra, icono en el feedback (acierto y fallo); adaptadas: «✓Opción B» → icono SVG en `.opcion-marca` (el ✓ ya no es texto).
- **Docs:** `PLAN.md` — T3 `[x]` con detalle; fila de estado de Fase 9 en `MEMORY.md`.
- **Siguiente de la Fase 9:** **T4 · Resultados** («ficha de examen»: resumen arriba + revisión jerarquizada).
- **Alcance:** `src/ui/cuestionario.ts`, `src/estilos/app.css`, `pruebas/pantallas.ts`, `PLAN.md` y esta entrada.

### 2026-10-08 — Fase 9 · T4 COMPLETADA: «ficha de examen» en Resultados

- **Mejor nota en la ficha:** `TemaDelResultado` gana el campo **`claveTema`**, que `finalizar()` rellena con la MISMA clave que usó para guardar el progreso → `pintarResultados` lee `ctx.progreso.temas[claveTema].mejorNota` **sin duplicar** la lógica de claves (`<curso>/<tema>` o `<curso>/__todos__/<asignatura>`). Nueva cadena reutilizada: `T.inicio.mejorNota(n)` («Mejor nota: N»), ya que `resultados.ts` ya usaba cadenas de `cuestionario` — misma práctica.
- **Estructura del resumen:** `.nota-bloque` pasa a `.nota-cabecera` = **nota grande a la izquierda + `.nota-datos`** (aciertos · veredicto · mejor nota, en `text-align: left` y `gap` de rejilla) a la derecha; `flex-wrap` ⇒ en móvil se apila y sigue centrado. La insignia «¡Nueva mejor nota!» queda debajo de todo. **Todos los selectores de test** (`.nota`, `.aciertos`, `.veredicto`, `.insignia--nueva`) siguen intactos.
- **Revisión jerarquizada:** el `h2` gana la clase `.falladas-titulo` con una **insignia contador** («Preguntas falladas [3]»); cada `li` lleva ahora iconos — **✗** en «Tu respuesta», **✓** en «Respuesta correcta» (esta línea en `font-weight: 600`, es la que hay que recordar) y **aviso** en «Sin responder» (`.linea--tenue`); `.linea` pasa a `flex` con `gap: --espacio-xs`. La **explicación se apaga**: caja con `background: --bg`, `--texto-s` y `--texto-tenue` sobre el borde izquierdo → ya no compite con las respuestas.
- **Nota 100:** el mensaje «No has fallado ninguna pregunta» lleva su **icono ✓**; `.aviso` pasa a `flex` (sus otros usos son texto suelto, sin cambio visual).
- **Tests: 372 → 376 comprobaciones** (`68 lógica + 43 persistencia + 220 pantallas + 45 datos`) y `build` en verde. Nuevas: `.nota-datos` con sus 3 párrafos + «Mejor nota: 25» (el fixture ahora lleva progreso), contador en el título de la revisión, iconos en la primera fallada y en el «sin falladas».
- **Docs:** `PLAN.md` — T4 `[x]` con detalle; fila de estado de Fase 9 en `MEMORY.md`.
- **Siguiente de la Fase 9:** **T5 · Progreso** (tarjetas de racha/contador con icono, tabla legible en móvil).
- **Alcance:** `src/ui/{contexto,resultados}.ts`, `src/aplicacion.ts`, `src/estilos/app.css`, `pruebas/pantallas.ts`, `PLAN.md` y esta entrada.

### 2026-10-08 — Fase 9 · T5 COMPLETADA: iconos en Progreso y tabla legible en móvil

- **Iconos nuevos** en `src/ui/iconos.ts`: **`rayo`** (tarjeta de racha) y **`lista`** (tarjeta de cuestionarios jugados); el bucle de tests del catálogo los cubre automáticamente.
- **Tarjetas con icono:** `.tarjeta-valor` pasa a `flex` con `gap: --espacio-xs` y el icono a `0.8em` con `opacity: 0.85` — acompaña a la cifra sin robarle peso. Sigue siendo **decorativo** (sin texto ⇒ `textContent` de la cifra intacto, y el título/pie de la tarjeta lo explican).
- **Tabla legible en móvil (bajo `34rem`):** las filas se **apilan** en vez de desplazarse en horizontal — el `th` del tema pasa a ser el titular de la fila (`--texto-m`) y los `td` quedan en línea (`inline-block`) con su **rótulo hecho en CSS**: `content: attr(data-encabezado)`. La cabecera visual se oculta con la técnica de `clip-path` (visible solo para el ojo), **no** con `display: none`, para no perderla del árbol de accesibilidad.
- **⚠️ Semántica ARIA explícita (lo importante):** cambiar el `display` de `table/thead/tbody/tr/td` a `block` hace que los navegadores **descarten la semántica implícita** de tabla en el árbol de accesibilidad. Por eso `tabla()` declara ahora `role="table"`, `role="rowgroup"`, `role="row"`, `role="rowheader"`, `role="columnheader"` y `role="cell"`, y cada `td` lleva `data-encabezado` (`Curso` · `Asignatura` · `Mejor nota` · `Jugados`). En escritorio el comportamiento es idéntico al de antes.
- **Tests: 376 → 381 comprobaciones** (`68 lógica + 43 persistencia + 225 pantallas + 45 datos`) y `build` en verde. Nuevas: icono en las 2 tarjetas (+2 por el bucle del catálogo), roles ARIA y `data-encabezado` de las celdas.
- **Docs:** `PLAN.md` — T5 `[x]` con detalle y el resumen de Fase 9 (T1–T5 `[x]`); fila de estado en `MEMORY.md`.
- **Siguiente de la Fase 9:** **T6 · Ajustes** (tres `fieldset/legend`: Apariencia · Juego · Datos + «Borrar progreso» como zona de peligro).
- **Alcance:** `src/ui/{iconos,progreso}.ts`, `src/estilos/app.css`, `pruebas/pantallas.ts`, `PLAN.md` y esta entrada.

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

### 2026-10-07 — `bubblewrap doctor` rechazaba el SDK de Android Studio (fase 5)

- **Qué falló:** `bubblewrap.cmd doctor` y `bubblewrap build` devolvían *"The androidSdkPath isn't correct …"* (y el propio texto del error hablaba de una carpeta `build` que en realidad no es lo que se comprueba).
- **Causa:** `AndroidSdkTools.validatePath()` de `@bubblewrap/core` exige que la **raíz** del SDK contenga `tools/` o `bin/` — layout de los SDK antiguos. El SDK actual de Android Studio solo trae `cmdline-tools/` (con `bin` dentro), así que la validación rechaza una instalación perfectamente válida.
- **Intentos descartados:** apuntar `androidSdkPath` a `cmdline-tools/latest` (pasa el chequeo, pero después `build-tools` y `platform-tools` se buscarían dentro de esa subcarpeta y fallaría el build); responder `n` y dar la ruta por pipe (inquirer recibe EOF tras la primera respuesta y aborta el prompt, `EXIT=1`); dejar que Bubblewrap instale su propio SDK (mismo problema de pipe en la pregunta de términos y condiciones, ~1 GB extra).
- **Solución:** **junction** `%LOCALAPPDATA%\Android\Sdk\bin` → `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin` con `New-Item -ItemType Junction` (no requiere administrador; junction, no symlink). Así `validatePath` ve `bin`, `sdkmanager` sigue resolviendo en su sitio real y se usan `build-tools/36.1.0` y `platforms/android-36` tal cual → `bubblewrap.cmd doctor`: *"Your jdkpath and androidSdkPath are valid"*.
- **Alcance:** ajuste **solo de esta máquina** (fuera de los repos); si Bubblewrap corrige la validación, basta con borrar el junction. También documentado en `AGENTS.md`.

### 2026-10-07 — Google rechazaba las huellas de `assetlinks.json` por formato (fase 5)

- **Qué se detectó:** consultar `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://andreu-marbor.github.io` devolvía `ERROR_CODE_MALFORMED_CONTENT`: *"Invalid android app asset descriptor (malformed cert fingerprint)"* para **las dos** huellas.
- **Causa:** Digital Asset Links exige la huella SHA-256 con **dos puntos entre bytes y hex en mayúsculas** (`B7:66:…:CF`); el fichero la traía en **hex plano** (`b7666ba3…b54cf`) — error heredado de la sentencia de `tres-en-raya`, escrita así desde antes. El JSON era válido, así que ningún chequeo local lo veía.
- **Impacto:** con el fichero sin parsear, Chrome en Android **no puede verificar** la relación → la TWA se abriría con la barra de URL en vez de a pantalla completa, que es justo lo que busca evitar este paso. **La app de `tres-en-raya` tenía la misma sentencia inválida.**
- **Solución:** ambas huellas a `AA:BB:…` (mayúsculas) en `andreu-marbor.github.io/.well-known/assetlinks.json` (commits `dd58933` → `cdb3b29`). Verificado con la API de Google: devuelve `statements` con las dos apps y **cero errores**.
- **Lección:** validar `assetlinks.json` contra `statements:list`, no solo con `ConvertFrom-Json`: JSON válido ≠ contenido aceptado por Google.

### 2026-10-07 — INC-01 (⏳ abierta) · Con las opciones barajadas, un acierto se corrige como fallo

- **Qué ocurre:** en una pregunta de opción múltiple, al elegir **la respuesta correcta** el feedback de la pantalla de cuestionario pone **"Incorrecto"**, y las líneas *"Tu respuesta:"* y *"Respuesta correcta:"* muestran **el mismo texto**. Puede darse el caso contrario: un fallo felicitado como acierto.
- **Causa:** `pintarFeedback` en `src/ui/cuestionario.ts` compara `elegida` (guardada en `sesion.respuestas` en el **orden original** de la pregunta, ver `aplicacion.ts` → `responder`) contra `presentada.respuesta`, que está en el **orden mostrado** (tras el barajado de `logica/barajado.ts`). Dos sistemas de índices distintos: el que coincide, coincide por suerte; el que no, tumba el acierto.
- **Por qué no lo detectó la CI:** `pruebas/pantallas.ts` llamaba a `presentarPregunta(p, { barajar: false })`, con lo que ambos índices son idénticos y el fallo no se manifiesta. Tampoco aparece en Verdadero/Falso (nunca se baraja) ni en la pantalla de resultados (trabaja en orden original).
- **Estado:** ⏳ en corrección → `PLAN.md` §11 INC-01.

### 2026-10-07 — INC-02 (⏳ abierta) · El diálogo de salida dice "andreu-marbor.github.io dice"

- **Qué ocurre:** al pulsar *"Salir del cuestionario"* el aviso sale con el **diálogo nativo** del navegador, cuyo título es "andreu-marbor.github.io dice" (en local, "localhost dice"): textos y estilos del sistema, fuera de la identidad de la app. Lo mismo en Ajustes → *Borrar progreso*.
- **Causa:** `globalThis.confirm(...)` en `src/ui/cuestionario.ts` (`abandonarConfirm`) y en `src/ui/ajustes.ts` (`borrarConfirm`).
- **Corrección prevista:** diálogo propio con el elemento nativo `<dialog>` (accesible: foco, `Esc`, `aria-labelledby`), sin dependencias; botones y textos con las cadenas de `src/ui/cadenas.ts` y colores vía variables CSS; foco devuelto al botón que lo abrió. También cubrirlo en `pruebas/pantallas.ts`.
- **Estado:** ⏳ pendiente → `PLAN.md` §11 INC-02.

### 2026-10-07 — INC-01 resuelta: el feedback comparaba índices de dos sistemas distintos

- **Solución:** en `pintarFeedback` (`src/ui/cuestionario.ts`) la comprobación pasa a hacerse en el **orden original** (`elegida === presentada.pregunta.respuesta`), que es el mismo eje en que `aplicacion.ts` guarda `sesion.respuestas`. La línea lleva un comentario con los dos ejes para que no vuelva a mezclarse.
- **Test de regresión:** nueva sección `seccion('Corrección con las opciones barajadas (INC-01)')` en `pruebas/pantallas.ts` con presentación barajada determinista (`aleatorio: () => 0` → mostradas `[B,C,A]`, `originales [1,2,0]`): un caso de acierto y otro de fallo.
- **Verificación de la verificación:** con el código antiguo el test **falla en 5 de 6 comprobaciones** (se comprobó revertido el arreglo), así que el test sí atrapa la incidencia; con el arreglo pasa todo.
- **Cobertura:** pruebas de 275 → **283 comprobaciones** (53 + 41 + 150 + 39); `npm.cmd run prueba` y `npm.cmd run build` en verde.
- **Sigue abierta INC-02** (diálogo nativo "…dice"): ver `PLAN.md` §11.

### 2026-10-07 — INC-02 resuelta: diálogo propio con `<dialog>` en vez del `confirm()` nativo

- **Solución:** nuevo módulo `src/ui/dialogo.ts` con `pedirConfirmacion({ titulo, mensaje, confirmar, cancelar }, alConfirmar)`: monta un `<dialog>` en el `body`, lo abre con `showModal()` y, al confirmar/cancelar/`Esc`, hace `close()` + `remove()` y devuelve el resultado por **callback síncrono** (encaja con las funciones de pintado, que son síncronas; no hizo falta promesa ni `async`). Cero dependencias.
- **Accesibilidad:** `aria-labelledby` apuntando al `h2` del título; el botón seguro va **primero** y con `autofocus` (que `Enter` no ejecute la acción destructiva); `Esc` llega como evento `cancel`, que se intercepta con `preventDefault()` para cerrarlo con el valor correcto; el retorno del foco al botón que lo abrió lo hace el propio navegador al cerrar.
- **Textos** (`src/ui/cadenas.ts`): cuestionario → título "Salir del cuestionario", botones *Seguir* / **Salir**; ajustes → título "¿Borrar todo tu progreso?", mensaje "Se borrarán las mejores notas… No se puede deshacer." y botones *Cancelar* / **Borrar**. Nuevo grupo `dialogo.cancelar` como valor por defecto.
- **Estilo** (`src/estilos/app.css`): `.dialogo`, `.dialogo::backdrop`, `.dialogo-titulo`, `.dialogo-mensaje` — todo con variables CSS (`--bg-secundario`, `--borde`, `--texto-tenue`, `--radio-grande`, `--sombra`), así que **respeta el modo oscuro**.
- **Ya no queda ningún `globalThis.confirm(...)` en `src/`** (estaban en `cuestionario.ts` y `ajustes.ts`).
- **Pruebas:** jsdom 30 **no implementa** `showModal`/`close` → *polyfill* mínimo y documentado en la cabecera de `pruebas/pantallas.ts` (atributo `open` + evento `close`); el `Esc` se simula despachando `cancel`. Se adaptaron los tests de "salir", "borrar progreso" y los dos del flujo completo (ahora confirman dentro del diálogo). **+12 comprobaciones → 300** (53 + 41 + 167 + 39); `prueba` y `build` en verde.
- **Estado:** ✅ cerrada → `PLAN.md` §11.

### 2026-10-07 — Incidencia: `scripts/comprobar-offline.mjs` moría sin decir por qué

- **Síntoma:** `npm.cmd run comprobar-offline` terminaba con `TypeError: Cannot read properties of null (reading 'close')` en la línea del `finally`, sin llegar a mostrar el problema real.
- **Causa 1 (la que rompía el test):** el perfil de Chrome (`%TEMP%\perfil-comprobar-offline`) se borraba con `rmSync` **después** de hacer `spawn`, es decir, mientras Chrome lo estaba creando → arranque roto y puerto de depuración que nunca se abría. **Solución:** limpiar el perfil **antes** de lanzar Chrome.
- **Causa 2 (la que ocultaba el error):** el bloque `finally { ws.close(); ... }` lanzaba su propia excepción cuando `ws` seguía siendo `null` (fallo anterior a conectar) y eso **reemplazaba** al error original. **Solución:** `ws?.close()` y matar Chrome solo si sigue vivo (`chrome.exitCode === null`).
- **Mejoras añadidas:** 120 intentos de espera (30 s en vez de 15) y un error explícito si Chrome termina antes de abrir el puerto (`exitCode`), en vez del genérico "no abrió el puerto".
- **Verificación** contra la producción desplegada hoy: `swControlador: true`, `appMontada: true`, caché `repaso-historia-v2` con 9 entradas (incluye el bundle `index-qKnA2ORL.js` con INC-01 + INC-02) → **✅ la app arranca sin conexión**.
- **Contexto del offline:** el JS lleva dentro las preguntas (`import.meta.glob`) y el progreso vive en `localStorage`; no hay fuentes externas y todavía no hay imágenes (`public/imagenes/` no existe → Fase 6). Si en el futuro se añaden, se guardan en la caché la primera vez que se ven online (el SW cachéa todo lo mismo-origen); sin haberlas visto nunca, aparecerían rotas offline.
