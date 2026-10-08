# AGENTS.md — Información del proyecto

## ¿Qué es este proyecto?

**"Repaso de Historia"** — aplicación web (PWA) y Android (TWA) de cuestionarios de Historia para estudiantes de **ESO y Bachiller en España**. Doble objetivo: **pieza de portfolio** y **herramienta de repaso real para alumnos de un colegio**.

- **Objetivo:** app publicada (web en GitHub Pages + APK/AAB en Play Store) con un flujo de edición de preguntas ágil y sin backend.
- **Público:** alumnos de ESO/Bachiller + revisores de portfolio.
- **Idioma del código, la documentación y la interfaz:** español (sin capa i18n; decisión cerrada en `PLAN.md` §2).
- **Plan completo:** **[PLAN.md](./PLAN.md)** — leérselo antes de tocar nada (fases, alcance, decisiones §9, criterios de hecho §8).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Build | Vite |
| Render | DOM + CSS (sin frameworks: nada de React/Vue) |
| Estilo | CSS con variables (arquitectura de temas, modo oscuro) |
| Contenido | **JSON versionado en `datos/`** + script validador |
| Persistencia | `localStorage` (centralizado) |
| Tests | Scripts propios con esbuild (sin frameworks de test); `jsdom` solo como DOM en los tests de pantallas |
| PWA | manifest + service worker *cache-first* (offline para el aula) |
| Empaquetado Android | PWA + Bubblewrap (sin Android Studio) |
| CI/CD | GitHub Actions → GitHub Pages (`prueba` → `build` → deploy) |
| Entorno | VSCode; PowerShell con **`.cmd`** (ver ⚠️ abajo) |

**Sin backend, sin cuentas, sin base de datos, sin datos personales** (RGPD por diseño).

## Estructura de directorios

> 📌 Árbol **previsto** (PLAN.md §3). Se completa en las Fases 1-5; si el árbol real acaba difiriendo, **actualizar este fichero**.

```
quiz-historia/
├── PLAN.md                   # Plan completo (fases, decisiones, riesgos)
├── MEMORY.md                 # Memoria de cambios e incidencias (aditiva)
├── AGENTS.md                 # Este fichero
├── README.md                 # README del portfolio
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts            # base: '/quiz-historia/'
├── .github/
│   └── workflows/despliegue.yml  # CI: prueba → build → deploy Pages
├── datos/                    # ★ EL CONTENIDO VIVE AQUÍ (nunca en src/)
│   ├── temas.json            # catálogo: cursos, temas, orden, minPreguntas
│   └── preguntas/
│       └── <curso>/<tema>.json   # un fichero por tema
├── src/
│   ├── main.ts               # arranque: bundle de datos + estilos + monta la app
│   ├── aplicacion.ts         # shell, enrutado por hash y sesión del cuestionario
│   ├── datos.ts              # integra datos/ en el bundle (import.meta.glob)
│   ├── vite-env.d.ts
│   ├── persistencia.ts       # acceso centralizado a localStorage
│   ├── logica/               # corrección, barajado, selección, catálogo (sin DOM)
│   ├── ui/                   # pantallas (inicio, cuestionario, resultados, progreso, ajustes) + cadenas + dom
│   └── estilos/              # base.css (variables) + app.css (componentes)
├── pruebas/
│   ├── ayudante.ts            # mini-ayudante de aserciones (sin frameworks)
│   ├── logica.ts             # pruebas de la lógica del quiz y del catálogo
│   ├── persistencia.ts       # pruebas de ajustes, progreso y racha
│   ├── pantallas.ts          # pruebas de las 5 pantallas + flujo completo (jsdom)
│   └── datos.ts              # validación de datos/ (reglas de §3 del PLAN)
├── scripts/
│   ├── validar-preguntas.mjs # validador del contenido
│   ├── generar-iconos.mjs    # iconos PWA con sharp (npm.cmd run iconos)
│   ├── comprobar-offline.mjs # verifica el offline real vía CDP (requiere Chrome)
│   ├── comprobar-contraste.mjs  # contraste WCAG AA de base.css, claro y oscuro
│   ├── comprobar-movil.mjs   # reflow + objetivos táctiles a 320 CSS px (CDP)
│   └── aplicar-widget.mjs    # (re)aplica el widget a app/ (npm.cmd run widget)
├── android/                  # ★ fuentes del widget (§13.3); `app/`, gradle… son generados
│   └── widget/               # todas las fuentes viven aquí
│       ├── java/…/widget/    # WidgetBridgeActivity.kt + WidgetRachaProvider.kt
│       ├── res/              # strings, colores día/noche, drawable, layout, appwidget-provider
│       └── parche/manifiesto.xml # fragmento que inyecta aplicar-widget.mjs
├── public/
│   ├── manifest.webmanifest  # PWA: name "Repaso de Historia"
│   ├── sw.js                 # service worker
│   ├── icons/                # SVG fuentes + PNG generados
│   └── imagenes/             # imágenes de preguntas (carga diferida)
└── docs/capturas/            # imágenes y GIFs para el README
```

> 📌 **Empaquetado Android (Fase 5):** `twa-manifest.json`, `manifest-checksum.txt`, `build.gradle`, `settings.gradle`, `gradle.properties`, `gradlew*`, `gradle/`, `app/` son **generados** por `bubblewrap build` a partir de `twa-manifest.json`. **No editarlos a mano.** `build/`, `.gradle/`, `local.properties`, `*.apk/aab` y `*.keystore` van en `.gitignore`.

> 📌 **Widget (Fase 8 · §13.3):** las fuentes viven en **`android/widget/`** y `npm.cmd run widget` (`scripts/aplicar-widget.mjs`) las copia a `app/src/main/` y añade los parches (bloques del manifiesto + plugin de Kotlin en los dos `build.gradle`). Es **idempotente**, **propaga los cambios** que hagas en `android/widget/parche/manifiesto.xml` (si el bloque ya aplicado difiere de la fuente, lo sustituye), **valida el contenido** del fragmento (sin `<intent-filter>` con `APPWIDGET_UPDATE` Android ni enseña el widget: INC-04) y **falla si un ancla no está donde se espera**. **Hay que volver a ejecutarlo tras cada `bubblewrap update`** (regenera `app/` y `build.gradle` y borra los parches).

## El contenido: cómo se añaden preguntas (funcionalidad clave)

1. Editar o crear `datos/preguntas/<curso>/<tema>.json` (formato en `PLAN.md` §3).
2. `npm.cmd run prueba` → el validador revisa **todo** el contenido.
3. `git push origin main` → CI valida, construye y despliega.

**Reglas duras (las comprueba el validador):**

- `id` **único** en todo el proyecto, convención `<curso>-<tema>-<nnn>`.
- `respuesta` = índice (0-based) **dentro** de `opciones`.
- `tipo` ∈ `opcion-multiple` | `verdadero-falso` | `fecha` | `imagen` (2–6 opciones; `verdadero-falso` exactamente 2).
- `dificultad` ∈ 1 | 2 | 3. `enunciado` y `explicacion` **no vacíos**.
- Todo tema de `temas.json` ≥ `minPreguntas`; sin ficheros huérfanos ni temas vacíos.

> ⚠️ **Nunca** escribir preguntas dentro de `src/` ni cadenas de contenido hardcodeadas: el contenido SOLO vive en `datos/`.

## Convenciones del proyecto

- **Código, comentarios y documentación en español.**
- **Colores y tipografía SIEMPRE vía variables CSS** (`--bg`, `--accent`...), nunca valores fijos.
- **Textos de la interfaz** centralizados (objeto de cadenas en un único módulo de `src/ui/`), nunca dispersos por el DOM — sin i18n, pero preparado para poder añadirla.
- **Persistencia (`localStorage`) centralizada** en `src/persistencia.ts`; ninguna llamada suelta.
- **Lógica pura separada de la UI**: `src/logica/` no toca el DOM (así se testea sin navegador).
- Nombres de archivos en minúscula/sin espacios; claves de `temas.json` en inglés-kebab (`revolucion-industrial`), títulos visibles en español.
- Nada compartido con otros proyectos de `C:\Users\andre\Documents\Repositorios` (keystore, dependencias, configuración): **cada cambio se queda en este directorio**.

## Comandos útiles

> ⚠️ En PowerShell la política de ejecución bloquea los `.ps1`; usar siempre las variantes **`npm.cmd`**, **`npx.cmd`** y **`bubblewrap.cmd`** (contexto en `MEMORY.md`).

```bash
npm.cmd install        # instalar dependencias
npm.cmd run dev        # servidor de desarrollo
npm.cmd run build      # build de producción (tsc --noEmit + vite)
npm.cmd run preview    # previsualizar build
npm.cmd run prueba     # TODO: lógica + persistencia + pantallas + datos + contraste AA
npm.cmd run prueba:logica   # lógica del quiz y catálogo
npm.cmd run prueba:persistencia  # ajustes, progreso y racha (almacén falso)
npm.cmd run prueba:pantallas     # 5 pantallas + flujo completo + estructura de accesibilidad (jsdom)
npm.cmd run prueba:datos    # solo validador de preguntas/temas
node scripts/validar-preguntas.mjs   # el validador solo, sin pasar por esbuild
npm.cmd run comprobar-contraste  # contraste WCAG AA de la paleta (claro y oscuro)
npm.cmd run comprobar-movil      # reflow y objetivos táctiles a 320 px (Chrome)
npm.cmd run comprobar-offline    # el offline real vía service worker (Chrome)
npm.cmd run iconos     # regenerar iconos PNG del PWA desde SVG
npm.cmd run widget     # (re)aplica el widget a app/ tras un bubblewrap update
```

### Git / despliegue

> **Convención del usuario:** cuando pide **«haz un commit»** quiere decir **commit + push** (`git push origin main`) — no dejar nada solo local.

```bash
git push origin HEAD:main     # la CI y Pages solo se disparan en `main`
gh run list                   # estado del último despliegue
gh workflow run despliegue.yml
```

> El repo se creó directamente en **`main`** (a diferencia de los proyectos antiguos con `master` local): push normal con upstream, sin `HEAD:main`.

### Publicación Android (Fase 5)

```bash
bubblewrap.cmd doctor                        # valida JDK + Android SDK (~/.bubblewrap/config.json)
bubblewrap.cmd update --skipVersionUpgrade   # regenera el proyecto Android desde twa-manifest.json
npm.cmd run widget                           # ★ reaplica el widget (¡`update` borra los parches!)
bubblewrap.cmd build                         # genera APK + AAB — requiere BUBBLEWRAP_KEYSTORE_PASSWORD /
                                             # BUBBLEWRAP_KEY_PASSWORD (fuera del repo, ver PLAN.md §9.1)
%LOCALAPPDATA%\Android\Sdk\build-tools\36.1.0\apksigner.bat verify --print-certs app-release-signed.apk
```

- **Package:** `com.andreumarbor.quizophistoria` · **Nombre:** "Repaso de Historia" (en el escritorio: "Repaso Historia").
- **`twa-manifest.json` se edita a mano** (el `init` interactivo no es automatizable por pipe) y `bubblewrap.cmd update` regenera `app/`, `gradle/`, `build.gradle`, `settings.gradle`, `gradle.properties`, `gradlew*`, `manifest-checksum.txt`: **están versionados pero no se editan a mano**. **Sin `--skipVersionUpgrade` pregunta la `versionName` por consola y autoincrementa** el `versionCode` (si el stdin no es interactivo, pásala por pipe: `"(echo 1.1 & echo 2) | bubblewrap.cmd update"`); con la flag, se queda con lo que haya en `twa-manifest.json`.
- **`local.properties`** (gitignored) con `sdk.dir=…` es imprescindible para que Gradle encuentre el SDK; recrearlo si `update` regenera el proyecto.
- **Entorno (JDK): hace falta un JDK 17 de 64 bits** — el que descarga Bubblewrap era **x86** y el plugin de Kotlin se cae con *«Unknown hardware platform: x86»* (incidencia en `MEMORY.md`, 2026-10-08). Instalado **Temurin JDK 17 x64** en `%USERPROFILE%\.bubblewrap\jdk\jdk-17.0.20.1+1` y apuntado con `bubblewrap.cmd updateConfig --jdkPath …` (la flag es **`--jdkPath`**); `doctor` exige **exactamente la 17** (rechaza el 21 del JBR de Android Studio). El SDK es el de Android Studio y `doctor` exige `bin`/`tools` en su raíz → existe el junction `%LOCALAPPDATA%\Android\Sdk\bin` → `cmdline-tools\latest\bin` (incidencia en `MEMORY.md`, 2026-10-07).
- **Keystore:** `./android.keystore` propio, **GITIGNORED**; contraseña en `%USERPROFILE%\.bubblewrap\keystore-pass-quizhistoria.txt` (fuera del repo y de OneDrive) + **copia de respaldo en el otro PC**. Huella SHA-256: `b7666ba3b6dedfc2ae1f36e8025f364f242199f01d35a0fb4dcb0e0ad66b54cf`.
- `assetlinks.json` vive en el repo `andreu-marbor.github.io/.well-known/` → añadir/bloque nuevo de este paquete (admite varios); `.nojekyll` debe seguir existiendo. **Ya publicada** (ambas sentencias) y verificada con la API de Google: la huella **obligatoriamente** en formato `AA:BB:…` mayúsculas (hex plano → `ERROR_CODE_MALFORMED_CONTENT`).

**URLs:** web → `https://andreu-marbor.github.io/quiz-historia/` · repo → `https://github.com/andreu-marbor/quiz-historia`

## ⚠️ Memoria del proyecto

Existe un archivo **[MEMORY.md](./MEMORY.md)** que registra:

- Cambios relevantes realizados.
- Problemas encontrados y sus soluciones.
- Estado actual de las fases del plan.

**Instrucción para agentes:** tras cada cambio relevante o incidencia, **actualizar `MEMORY.md`** añadiendo una entrada con fecha, descripción del cambio/problema y solución aplicada. **No borrar entradas anteriores; solo añadir.** Si el árbol de directorios o los comandos cambian, actualizar también este `AGENTS.md`.

## Plan

El plan completo (fases, alcance, decisiones, riesgos, criterios de "hecho") está en **[PLAN.md](./PLAN.md)**. Fases: 1 Cimiento · 2 Interfaz · 3 PWA · 4 Despliegue web · 5 Android · 6 Contenido real.
