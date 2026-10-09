# PLAN.md — quiz-historia

Plan de implementación de la aplicación de repaso de Historia para ESO y Bachiller.

> **Estado:** plan aprobado y decisiones cerradas (§9), pendiente de ejecución por fases.
> **Última actualización:** 2026-10-07

---

## 1. Qué construimos

Aplicación de repaso de Historia para estudiantes de ESO y Bachiller en España, desplegable en dos sitios desde **un único código**:

| Salida | Cómo se consigue |
|---|---|
| **Web** (portfolio + alumnos) | Build estático en GitHub Pages: `https://andreu-marbor.github.io/quiz-historia/` |
| **Android** (app instalable / Play Store) | PWA envuelta en TWA con `bubblewrap build`, patrón ya probado en `tres-en-raya` |

**Doble objetivo:** servir de pieza de portfolio y permitir que alumnos de un colegio repasen contenidos.

Sin backend, sin bases de datos, sin cuentas: el alumno entra y juega; su récord vive en `localStorage`. Eso elimina costes, mantenimiento y obligaciones RGPD (ni cookies ni datos personales).

### Requisitos funcionales

- R/01 — El alumno puede elegir curso (1º–4º ESO, 1º–2º Bachiller) y después tema.
- R/02 — Cuestionario con respuesta inmediata y explicación de cada pregunta.
- R/03 — Puntuación final, lista de preguntas falladas y opción de repetir solo las falladas.
- R/04 — Progreso (mejor nota por tema, racha) persistido en `localStorage`.
- R/05 — Las preguntas se añaden/quitan editando JSON, sin tocar el código de la app.
- R/06 — Funciona sin internet (preguntas empaquetadas + service worker).
- R/07 — App Android a pantalla completa, sin barra de URL (TWA + Digital Asset Links).
- R/08 — Interfaz responsive, accesible y con modo oscuro.

### Requisitos no funcionales

- Cero dependencias de runtime (TypeScript + Vite, DOM manual).
- Sin datos personales ni analítica → cumplimiento RGPD por diseño.
- Build y tests en CI: sin verde, no hay despliegue.
- Contenido e interfaz en castellano (sin capa i18n; ver §2).

---

## 2. Decisiones tecnológicas

| Área | Decisión | Justificación |
|---|---|---|
| Web | **TypeScript + Vite sin frameworks** | Coherente con `tres-en-raya`, cero dependencias de runtime, builds rápidos |
| Android | **PWA + TWA con Bubblewrap** | Un solo código para web y Android; patrón ya probado en `tres-en-raya` |
| Preguntas | **JSON en git + script validador** | Versionado, edición en cualquier editor, sin backend |
| Progreso | **`localStorage`** | Sin servidor ni cuentas; borrable por el usuario |
| i18n | **Sin capa i18n** | Público y contenido en castellano; una capa de traducción solo añadiría complejidad sin beneficio. Si más adelante se necesita valenciano/catalán, se añade |
| Ramas | **Repo nacido en `main`** | Evita el problema de ramas `master`/`main` desalineadas que arrastran los otros 4 repos |
| Tests | **Scripts propios con esbuild** | Mismo patrón que `pruebas/` en `tres-en-raya`: sin frameworks de test |
| CI/CD | **GitHub Actions → GitHub Pages** | Mismo flujo que `tres-en-raya/.github/workflows/despliegue.yml` |

---

## 3. Modelo de datos (el corazón del "fácil de configurar")

### Estructura del repositorio

```
quiz-historia/
├── PLAN.md                    ← este fichero
├── AGENTS.md                  ← instrucciones para agentes/contribuidores
├── MEMORY.md                  ← memoria de cambios e incidencias (aditiva)
├── README.md
├── datos/
│   ├── temas.json              ← catálogo: orden, títulos, cursos, nº mínimo de preguntas
│   └── preguntas/
│       ├── eso2/
│       │   ├── revolucion-industrial.json
│       │   └── primera-guerra-mundial.json
│       ├── bachillerato1/
│       │   └── ...
│       └── ...
├── src/
│   ├── main.ts
│   ├── logica/                 ← corrección, barajado, selección de preguntas
│   ├── ui/                     ← pantallas (DOM manual)
│   ├── persistencia.ts         ← localStorage
│   └── estilos/
├── pruebas/                    ← tests propios con esbuild, como en tres-en-raya
├── scripts/
│   ├── validar-preguntas.mjs   ← el validador de datos
│   └── generar-iconos.mjs      ← iconos PWA con sharp
├── public/                     ← manifest, icons, imágenes de preguntas
├── .github/workflows/despliegue.yml
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts              ← base: '/quiz-historia/'
├── twa-manifest.json           ← generado/actualizado por bubblewrap
└── manifest.webmanifest
```

### Ejemplo de pregunta

```json
{
  "id": "eso2-revind-014",
  "enunciado": "¿En qué año estalló la Primera Guerra Mundial?",
  "tipo": "opcion-multiple",
  "opciones": ["1912", "1914", "1916", "1918"],
  "respuesta": 1,
  "explicacion": "El asesinato de Francisco Fernando en Sarajevo desencadenó el conflicto en julio de 1914.",
  "dificultad": 1,
  "tags": ["guerras-mundiales"]
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | string | sí | Único en todo el proyecto. Convención: `<curso>-<tema>-<nnn>` |
| `enunciado` | string | sí | Texto de la pregunta, no vacío |
| `tipo` | enum | sí | `opcion-multiple` \| `verdadero-falso` \| `fecha` \| `imagen` |
| `opciones` | string[] | sí | 2–6 opciones; en `verdadero-falso` exactamente `["Verdadero","Falso"]` |
| `respuesta` | number | sí | Índice (0-based) de la opción correcta dentro de `opciones` |
| `explicacion` | string | sí | Se muestra tras responder; imprescindible para el valor pedagógico |
| `dificultad` | 1\|2\|3 | sí | 1 = fácil, 2 = media, 3 = difícil |
| `imagen` | string | no | Ruta relativa a `public/` (solo `tipo: "imagen"`) |
| `tags` | string[] | no | Etiquetas para filtrado futuro |

### Catálogo `datos/temas.json`

```json
{
  "cursos": [
    {
      "id": "2bach",
      "titulo": "2º Bachillerato",
      "orden": 12,
      "asignaturas": [
        {
          "id": "historia",
          "titulo": "Historia",
          "orden": 1,
          "temas": [
            {
              "id": "restauracion",
              "titulo": "La Restauración",
              "orden": 1,
              "minPreguntas": 10
            }
          ]
        },
        {
          "id": "historia-del-arte",
          "titulo": "Historia del Arte",
          "orden": 2,
          "temas": [
            {
              "id": "renacimiento",
              "titulo": "El Renacimiento",
              "orden": 1,
              "minPreguntas": 10
            }
          ]
        }
      ]
    }
  ]
}
```

> **Estructura obligatoria `cursos > asignaturas > temas`** (§13.2, implementada el 2026-10-08): **todo curso lleva ≥1 asignatura** (los de hoy, todos con una sola: «Historia») y los temas viven **dentro** de su asignatura. **Los ids de tema son únicos dentro del curso** (chocarían `<curso>/<tema>` y `<curso>-<tema>-<nnn>`). El detalle y las reglas del validador: **§13.2**.

### Flujo de edición de preguntas

1. Editar o crear el JSON del tema (o arrastrar un CSV exportado a mano; no hay conversor en v1).
2. `npm.cmd run prueba` → el validador comprueba todo.
3. `git push origin main` → CI repite validación, build y despliegue automático.

**Añadir una pregunta lleva < 2 minutos sin tocar código de la app.**

### El validador (`npm.cmd run prueba:datos`)

Sin dependencias externas, comprueba:

- ids únicos en todo `datos/preguntas/`;
- `respuesta` dentro del rango de `opciones`;
- textos no vacíos (`enunciado`, `explicacion`, cada opción);
- `tipo` válido y coherente con `opciones` (p. ej. `verdadero-false` con 2 opciones);
- `dificultad` ∈ {1,2,3};
- todo tema de `temas.json` tiene ≥ `minPreguntas` preguntas;
- no hay ficheros de pregunta cuyo tema no esté en el catálogo (temas huérfanos);
- nombres de directorio de `datos/preguntas/` = ids de curso del catálogo.

### Integración con el bundle

Las preguntas se importan con:

```ts
const preguntas = import.meta.glob('../datos/preguntas/**/*.json', { eager: true });
```

Así quedan **incluidas en el bundle y la app funciona sin internet de serie**.

> Esto aguanta bien hasta **~450 preguntas** (≈275 KB de bundle). Por encima se pasa a *carga diferida por tema* con chunks: ver **§12**.

---

## 4. Pantallas de la app

1. **Inicio** → elegir curso (1º–4º ESO, 1º–2º Bachiller) → elegir tema (con badge de mejor nota).
2. **Cuestionario** → pregunta, respuesta, *feedback* inmediato + explicación, barra de progreso, botón "siguiente".
3. **Resultados** → nota, aciertos/errores, lista de falladas con su explicación, botón "repetir falladas".
4. **Progreso** → récords por tema y racha, guardados en `localStorage` (borrables desde Ajustes).
5. **Ajustes** → modo oscuro, nº de preguntas por cuestionario, barajar opciones, borrar progreso.

> **Fase 8 (§13):** los cursos se agrupan **curso → asignatura → tema** y en Inicio aparece, **en cada bloque de asignatura**, la opción **«Todos los temas de {asignatura}»** con el pool de esa asignatura y curso mezclado (en 2º Bachillerato: «Todos los temas de Historia» + «Todos los temas de Historia del Arte»). **Fuera de estas cinco pantallas** entra el **widget nativo de Android** de la racha (§13.3).

### Criterios de UI

- Estilos solo con **variables CSS** (colores y espaciados).
- Responsive (móvil primero: los alumnos lo usarán desde el teléfono).
- Accesible: contraste AA, foco visible, navegación por teclado, ARIA en los componentes de quiz.
- Modo oscuro respetando `prefers-color-scheme`, con override manual.
- Sin fuentes externas en tiempo de ejecución (offline).

> **Fase 9 (§14):** pulido visual de las cinco pantallas **a mano** (sin herramientas externas: se probó una skill de diseño con API externa y el usuario la descartó). Mantiene todos los criterios de arriba y la identidad crema + granate.

---

## 5. Fases de implementación

### Fase 1 — Cimiento (repo, datos, lógica) ✅ (2026-10-06)

- [x] `git init -b main` en `quiz-historia/` + `.gitignore` + commit inicial.
- [x] Scaffold Vite + TypeScript (`npm.cmd create vite` manual o a mano, sin extras).
- [x] `package.json` con scripts: `dev`, `build` (`tsc --noEmit && vite build`), `prueba`, `prueba:logica`, `prueba:datos`.
- [x] `datos/temas.json` con 3–4 cursos/temas de ejemplo (3 cursos: `eso2`, `eso4`, `bachillerato1`; 4 temas).
- [x] `scripts/validar-preguntas.mjs` con todas las reglas de §3.
- [x] ~40 preguntas de muestra repartidas en 3–4 temas (4 × 10 = 40).
- [x] `src/logica/`: corrección, barajado, selección de preguntas.
- [x] `pruebas/logica.ts` + `pruebas/datos.ts` (bundled con esbuild, patrón de `tres-en-raya`).

**Resultado: `npm.cmd run prueba` y `npm.cmd run build` en verde.** ✅ (38 comprobaciones de lógica + 39 de datos = 77)

### Fase 2 — Interfaz completa ✅ (2026-10-06)

- [x] Las 5 pantallas de §4 con enrutado ligero por hash (`#/`, `#/cuestionario`, `#/resultados`, `#/progreso`, `#/ajustes`; rutas desconocidas o sin sesión vuelven a `#/`).
- [x] `src/persistencia.ts` (mejor nota por tema, racha de días consecutivos, ajustes) con lectura defensiva de datos corruptos y `Almacen` inyectable.
- [x] Modo oscuro (respetando `prefers-color-scheme` + override manual), responsive móvil-primero y accesibilidad (ARIA en el quiz, `aria-live` en el feedback, foco gestionado, contraste AA, colores nunca como único indicador).
- [x] Tests de la lógica de selección de preguntas (sin repetir, respetar `minPreguntas`) + tests de persistencia + tests de las 5 pantallas con DOM real (jsdom), incluido un recorrido completo montar → jugar → guardar → navegar.

**Resultado: `npm.cmd run prueba` y `npm.cmd run build` en verde.** ✅ (274 comprobaciones: 53 lógica + 41 persistencia + 141 pantallas + 39 datos)

### Fase 3 — PWA ✅ (2026-10-07)

> Ejecutada **después** de la Fase 4, para poder validarla sobre la URL pública (acuerdo con el usuario, 2026-10-07).

- [x] `manifest.webmanifest`: `name`: **"Repaso de Historia"**, `short_name`: "Repaso Historia", `start_url`, `display: standalone`, theme colors.
- [x] `scripts/generar-iconos.mjs` con `sharp` (misma estética que `tres-en-raya`).
- [x] Service worker *cache-first* para uso sin conexión en el aula.
- [x] Auditoría Lighthouse: PWA instalable + offline ≥ 90. ✅ **PWA 100/100** (Lighthouse 11, última versión con categoría `pwa`; en 13.5 esa categoría ya no existe) y **offline verificado** cortando la red por CDP.

**Resultado: `npm.cmd run prueba` y `npm.cmd run build` en verde.** ✅ (275 comprobaciones)

### Fase 4 — Despliegue web ✅ (2026-10-07)

- [x] `vite.config.ts` con `base: '/quiz-historia/'`.
- [x] `.github/workflows/despliegue.yml`: `prueba` → `build` → Pages en push a `main` (y check en PRs).
- [x] Activar GitHub Pages con fuente "GitHub Actions".
- [x] Enlace añadido a `andreu-marbor.github.io` (portfolio).
- [x] README con capturas y enlace en vivo.

### Fase 5 — Android (TWA)

- [x] `twa-manifest.json` + `bubblewrap.cmd init` / `bubblewrap.cmd build` (**usar `bubblewrap.cmd`**: la política de PowerShell bloquea los `.ps1`).
  - `packageId`: **`com.andreumarbor.quizophistoria`**
  - `name`: **"Repaso de Historia"** · `launcherName`: **"Repaso Historia"** (≥12 chars: la etiqueta del escritorio se trunca; coherente con el `short_name` del manifest, §9.4). *Hecho:* `twa-manifest.json` escrito a mano (el `init` interactivo de 25 preguntas no es automatizable por pipe en PowerShell) y proyecto regenerado con `bubblewrap.cmd update --skipVersionUpgrade`.
  - `host`: `andreu-marbor.github.io` · `startUrl` / `fullScopeUrl`: `/quiz-historia/`
- [x] **Keystore nuevo propio** (decisión §9.1): *hecho:* generado y verificado (`b7666ba3b6dedfc2ae1f36e8025f364f242199f01d35a0fb4dcb0e0ad66b54cf`).
  - Generar con `keytool` (JDK): `quiz-historia/android.keystore`, alias `android`, RSA-2048, validez larga, DN `CN=andreu-marbor, OU=Portfolio, O=GitHub, C=ES` (coherente con el del otro proyecto).
  - **Contraseña**: aleatoria de 36 hex, guardada en `%USERPROFILE%\.bubblewrap\keystore-pass-quizhistoria.txt` (fuera del repo y de OneDrive; **nombre distinto** al de `tres-en-raya` para no colisionar). Nunca en ficheros versionados (lección aprendida en `tres-en-raya/MEMORY.md`, incidencia 2026-10-05).
  - **`.keystore` en `.gitignore`** desde el primer commit; nunca se versiona.
  - Build con `BUBBLEWRAP_KEYSTORE_PASSWORD` / `BUBBLEWRAP_KEY_PASSWORD` en el entorno (evita prompts en `build.js`).
  - Extraer huella SHA-256 con `keytool -list -v` y verificarla en el APK final con `apksigner verify --print-certs`.
  - Antes de cada push: `git grep -niIF -e 'password' -e 'passwd' -e 'secret' -e 'token'` como red de seguridad.
  - **Respaldo** ✅ *(hecho 2026-10-08)*: paquete `%USERPROFILE%\Downloads\respaldo-keystore-quiz-historia.zip` (keystore + contraseña + `LEEME-respaldo.txt`) **copiado al otro PC**; queda una copia en Descargas (borrarla cuando se quiera, ya no es necesaria para nada). Misma convención que el de `tres-en-raya`.
- [x] Añadir una **segunda sentencia** en `andreu-marbor.github.io/.well-known/assetlinks.json` para `com.andreumarbor.quizophistoria` con la huella nueva (el fichero admite varias). Si falta, la app Android muestra la barra de URL en vez de abrirse a pantalla completa. Recordar: `.nojekyll` debe mantenerse para que Pages sirva `.well-known`. *Hecho:* añadida y verificada publicada en `https://andreu-marbor.github.io/.well-known/assetlinks.json` (commit `dd58933` del portfolio).
- [x] Probar en dispositivo real: instalación, pantalla completa, offline. ✅ *(2026-10-08: instalación correcta, se abre a pantalla completa — `assetlinks.json` verificado — y funciona sin conexión en modo avión.)*
- [ ] **Distribución en dos vías** (decisión §9.2):
  1. **Tramo cerrado de Play Console** con el colegio como verificadores → requisito de Google: **12 verificadores × 14 días continuos** por package nuevo (cuentas personales creadas tras el 13/11/2023) → solicitud de acceso a Producción.
  2. **Mientras tanto, APK firmado directo al colegio** (`bubblewrap.cmd build` → `app-release-bundle`/APK) para no esperar a los 14 días.
- [ ] Fichas de Play Store: nombre "Repaso de Historia", icono, capturas, descripción en español, categoría Educación, *privacy policy* (estática: sin datos personales ni recolección).

### Fase 6 — Contenido real y documentación

- [ ] Cargar preguntas del temario real: 1º–4º ESO y 1º–2º Bachiller, por unidad.
- [ ] Revisión pedagógica (que un profesor valide enunciados y explicaciones).
- [x] `AGENTS.md` del proyecto: flujo "editar JSON → validador → push → despliegue", convenciones, ubicación del keystore. ✅ *Hecho en Fase 1; revisado con la Asignatura (§13.2).*
- [x] `MEMORY.md` con el registro de cambios (solo aditivo, como en `tres-en-raya`). ✅ *Hecho; se lleva al día en cada cambio.*

### Fase 7 — Escalado de contenido e imágenes (por disparadores) ⏳

> Plan completo en **[§12](#12-plan-de-escalado-miles-de-preguntas-cientos-de-temas-imágenes)**. No tiene fecha: tiene **disparadores numéricos** (§12.2) que comprueba la CI. Escenario previsto: miles de preguntas en cientos de temas + preguntas con imágenes.

- [ ] Todo lo listado en §12.6, en este orden: presupuestos en CI → render/pipeline de imágenes → carga diferida de temas → manifest de contenido → cachés separadas → estados offline degradados → pantalla de almacenamiento → pruebas de escalado.

### Fase 8 — Mejoras de uso: «Todos los temas», asignaturas y widget de racha ✅ (2026-10-08)

> Plan detallado en **[§13](#13-mejoras-previstas-2026-10-08)**. Sin fecha; se ejecuta cuando toque. **Orden: 13.2 → 13.1 → 13.3** — primero la estructura obligatoria `cursos > asignaturas > temas` (sin ella no hay bloques de asignatura donde pintar las filas); §13.1 y §13.2 se tocan, así que conviene hacerlas juntas. §13.3 va independiente.

- [x] §13.2 · **Estructura obligatoria `cursos > asignaturas > temas`** en el catálogo: migrar `datos/temas.json` (todos los cursos envueltos en «Historia»), tipos, `datos.ts`, UI con subtítulos, validador con reglas obligatorias y tests — 2º Bachillerato llevará además Historia del Arte. ✅ *(2026-10-08; ver §13.2)*
- [x] §13.1 · Filas **«Todos los temas de {asignatura}»** en cada bloque de asignatura (pool mezclado de esa asignatura y curso, clave virtual por fila, *repetir falladas* incluido). ✅ *(2026-10-08; ver §13.1)*
- [x] §13.3 · **Widget nativo** de Android con la racha + puente `intent://` desde la web (despliegue en dos pasos). ✅ *(2026-10-08: web `c8d29c1` → APK 1.1 `ad3d863` → INC-03 `800e18d` → INC-04 `5bb35ce` → paso 2 `82d38de` → APK 1.4 `8a89f05` + **prueba en dispositivo** → ver §13.3)*
- [x] Verdes al terminar cada tarea: `npm.cmd run prueba` y `npm.cmd run build` (los tests actuales no deben cambiar de significado y **los progresos guardados no deben perderse**: sus claves `<curso>/<tema>` no cambian). ✅ *(**455** comprobaciones y build en verde en las tres tareas; ninguna clave de progreso cambió)*

### Fase 9 — Pulido de interfaz (5 pantallas, manual) ⏳

> Plan detallado en **[§14](#14-pulido-de-interfaz-2026-10-08)**. Sin fecha; se ejecuta cuando toque. **Orden: T0 → T1 → T2…T7 (una pantalla por tarea) → T8**. Cada tarea = commit + push con CI en verde, revisable por separado. **No toca** la Fase 7 (§12) ni la Fase 8 (§13).

- [x] **T0 · Limpieza:** `.agents/` y `skills-lock.json` (skill de Sleek, descartada) al `.gitignore`.
- [x] **T1 · Base común:** escala tipográfica, iconos SVG inline (`src/ui/iconos.ts`), estados `:active` + microtransiciones, escala de espaciado y clases muertas. ✅ *(2026-10-08; ver §14)*
- [x] **T2 · Inicio** · **T3 · Cuestionario** · **T4 · Resultados** («ficha de examen») · **T5 · Progreso** ✅ *(2026-10-08; ver §14)*
- [x] **T6 · Ajustes** (agrupados en tres `fieldset/legend`) ✅ *(2026-10-08; ver §14)*
- [x] **T7 · Estados vacíos** (con `cadenas.ts`). ✅ *(2026-10-08. Detalle: nuevo módulo **`src/ui/estados.ts`** → `estadoVacio(icono, texto, { positivo?, clase? })` devuelve SIEMPRE el mismo `p.estado-vacio` (icono `aria-hidden` + texto); reemplaza a los 5 `p.aviso` sueltos (**clase `.aviso` eliminada**; `.aviso-estado`, la región viva de Ajustes, es otra cosa y se queda). Iconos: **`libro`** (nuevo) para 0 cursos / 0 temas, **`jugar`** para progreso vacío (invita a jugar), **`aviso`** para sin almacenamiento y sin conexión, **`check`** + variante `--positivo` para nota 100. **Sin conexión: por fin existe ese estado** (no había) — `pintaAvisoConexion()` en el shell, dentro de la cabecera, con `role="status"`, `id="aviso-conexion"`, clase `--conexion` (borde/icono ámbar, fondo `--bg` para no fundirse con la cabecera) y listeners `online`/`offline` que lo muestran/ocultan; se lee **`window.navigator.onLine`** (el `navigator` global en jsdom es el de Node y no tiene `onLine`). **Mínimo no alcanzado:** no cabe en el recuadro (vive dentro del botón del tema) → mismo icono **en línea** en `.tema-no-disponible` (`flex`, `1em`), sin tocar el nombre accesible (icono `aria-hidden`). Textos: única cadena nueva `T.comunes.sinConexion`. +13 comprobaciones → **398**.)*
- [x] **T8 · Validación:** `prueba` (**434** comprobaciones) + `build` + `comprobar-offline` + revisión AA/teclado/lector de pantalla/móvil ✅ *(2026-10-08; detalle en §14. Incluye dos chequeos nuevos que quedan en el repo y en CI: `comprobar-contraste` (36 pares de colores en claro y oscuro) y `comprobar-movil` (5 pantallas a 320 CSS px).)*
- [ ] **T8 · Capturas en `docs/capturas/`** (README + fichas de Play Store) y revisión en dispositivo físico: **pendientes** — sin cuenta de desarrollador de Google.

---

## 6. Scripts npm

| Script | Qué hace |
|---|---|
| `npm.cmd run dev` | Servidor de desarrollo Vite |
| `npm.cmd run build` | `tsc --noEmit && vite build` |
| `npm.cmd run prueba` | Tests (lógica + persistencia + pantallas + datos) **+ contraste AA** |
| `npm.cmd run prueba:logica` | Tests de corrección/barajado/selección/catálogo |
| `npm.cmd run prueba:persistencia` | Tests de ajustes, progreso y racha (almacén falso) |
| `npm.cmd run prueba:pantallas` | Tests de las 5 pantallas, del flujo completo y de accesibilidad con jsdom |
| `npm.cmd run prueba:datos` | Validador de `datos/` (§3) |
| `npm.cmd run comprobar-contraste` | Contraste WCAG AA de la paleta (claro y oscuro) |
| `npm.cmd run comprobar-movil` | Reflow y objetivos táctiles a 320 CSS px (Chrome headless) |
| `npm.cmd run comprobar-offline` | La PWA funciona sin red, vía service worker (Chrome headless) |
| `npm.cmd run iconos` | Genera iconos PWA con `sharp` |

> **Importante:** en PowerShell usar siempre `npm.cmd` / `npx.cmd` / `bubblewrap.cmd` (los shims `.ps1` están bloqueados por la política de ejecución).

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Bundle gigante y corpus inmanejable al entrar cientos de temas y miles de preguntas | Preguntas en JSON importado (texto, ligero) e imágenes en `public/` con carga diferida. **Plan con disparadores numéricos en §12** (carga diferida por tema, pipeline `sharp`, tres cachés con vidas distintas, presupuestos que vigila la CI) |
| Play Store rechaza el TWA | Requisitos: HTTPS + manifest + `start_url` + Digital Asset Links correctos. Validar en tramo cerrado antes de nada público |
| Rama `master`/`main` desalineada (problema de los otros 4 repos) | Repo nuevo nacido en `main`, con upstream configurado desde el primer push (`git push -u origin main`) |
| Keystore perdido ⇒ imposible actualizar la app | Documentar en `AGENTS.md` dónde vive y cómo regenerar `assetlinks.json` |
| Preguntas mal formadas rompiendo la app | Validador en tests **y** en CI: sin verde, no hay despliegue |
| PowerShell bloquea los `.ps1` | Usar `npm.cmd`, `npx.cmd`, `bubblewrap.cmd` en todos los comandos |
| Sin backend ⇒ un profesor no técnico no puede editar | El JSON es simple y el validador da errores claros; si hace falta más, fase futura: editor web embebido (`/admin`) que exporta JSON |

---

## 8. Criterios de "hecho"

- [x] Web en Pages funcionando offline y apta en Lighthouse (PWA instalable).
- [x] App Android instalada en un dispositivo real, a pantalla completa, sin barra de URL. ✅ *(2026-10-08; `assetlinks.json` verificado publicado)*
- [x] Añadir una pregunta lleva < 2 minutos sin tocar código de la app. ✅ *(editar `datos/preguntas/<curso>/<tema>.json` → `npm.cmd run prueba` → push; el contenido vive solo en `datos/`)*
- [x] `npm.cmd run prueba` cubre: lógica de corrección, validación de datos e integridad del catálogo. ✅ *(**455** comprobaciones: lógica + persistencia + pantallas + datos)*
- [x] CI en verde en cada push a `main` y despliegue automático. ✅ *(cada tarea, desde la Fase 1)*
- [ ] README con enlace en vivo, capturas y flujo de edición de preguntas. *Pendiente de las capturas (`docs/capturas/`, T8): el enlace y el flujo ya están.*

---

## 9. Decisiones cerradas (2026-10-06)

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| 1 | **Keystore Android** | **Keystore nuevo propio** en `quiz-historia/android.keystore` (alias `android`) | Mantiene los proyectos independientes (nada compartido entre directorios, según la raíz `AGENTS.md`) y acota el impacto de una clave perdida a una sola app |
| 2 | **Distribución Android** | **Play Store (tramo cerrado → Producción) + APK directo al colegio mientras tanto** | Los alumnos usan la app ya vía APK; en paralelo se cumple el requisito de Google de 12 verificadores × 14 días para habilitar Producción. La ficha pública en Play da visibilidad al portfolio |
| 3 | **Package name** | **`com.andreumarbor.quizophistoria`** | Mismo patrón que `com.andreumarbor.tresenraya`; sin guiones (Android no los admite en `applicationId`) |
| 4 | **Nombre visible** | **"Repaso de Historia"** (`short_name`: "Repaso Historia") | Más descriptivo para el público del colegio (ESO/Bachiller) que «Quiz Historia» |

> ⚠️ La huella SHA-256 del keystore nuevo es la que debe entrar en `assetlinks.json`; si se regenera el keystore, hay que actualizarla (documentarlo en el `AGENTS.md` del proyecto).
>
> ℹ️ **Nota del entorno (2026-10-06):** el keystore de `tres-en-raya` y su contraseña **no están en esta máquina**; el usuario confirma que los conserva en **otro PC**. Convención adoptada para este proyecto: el keystore vive en el PC donde se firma y **siempre hay una copia en el segundo PC** (un keystore perdido = imposible actualizar la app). Esa misma regla aplica al keystore nuevo de `quiz-historia`.

---

## 10. Futuro (fuera del alcance de v1)

- Editor web embebido (`/admin`) para profesores no técnicos, que exporta JSON.
- Estadísticas de clase / login (requiere backend o servicio externo p. ej. Firebase).
- Modo examen cronometrado y preguntas tipo asociación.
- Multilenguaje (valenciano/catalán) añadiendo capa i18n.
- Importación desde CSV/Google Sheets.

---

## 11. Incidencias (2026-10-07 y 2026-10-08)

> Detectadas en uso real tras el despliegue de las fases 3–4 (INC-04 llegó después, al probar el widget de §13.3). Se registran aquí antes de corregirlas; la causa técnica y la solución quedan además en `MEMORY.md`. **Las cuatro de esta tanda están cerradas.**

- [x] **INC-01 · Con las opciones barajadas, un acierto se corrige como fallo.** ✅ *corregido 2026-10-07.* En una pregunta de opción múltiple, al elegir la **respuesta correcta** el cuestionario respondía *"Incorrecto"*, y en *"Tu respuesta"* y *"Respuesta correcta"* aparecía **el mismo texto**. Pasaba también lo contrario (un fallo felicitado como acierto).
  - **Causa:** `pintarFeedback` (`src/ui/cuestionario.ts`) compara `sesion.respuestas[...]`, guardado en el orden **ORIGINAL** (`aplicacion.ts` → `responder`), contra `presentada.respuesta`, que está en el orden **MOSTRADO** (`logica/barajado.ts`). Con el barajado activo (por defecto) los dos índices no son el mismo eje y el acierto se tumba.
  - **Por qué no lo pilló la CI:** `pruebas/pantallas.ts` presentaba las preguntas con `barajar: false` (índices idénticos → el fallo no se manifiesta). Verdadero/Falso nunca se baraja tampoco.
  - **Alcance:** solo el feedback en pantalla; la pantalla de resultados usa el orden original y es correcta.
  - **Corrección:** comparar ambos valores en el mismo sistema de índices (el original: `elegida === presentada.pregunta.respuesta` en `pintarFeedback`) + test de regresión `seccion('Corrección con las opciones barajadas (INC-01)')` en `pruebas/pantallas.ts`, que **falla en 5 de 6 comprobaciones con el código antiguo**. Verificado: 283 comprobaciones y build en verde.
- [x] **INC-02 · El diálogo de salida muestra "andreu-marbor.github.io dice".** ✅ *corregido 2026-10-07.* Al pulsar *"Salir del cuestionario"* (y también en Ajustes → *Borrar progreso*) aparecía el `confirm()` nativo del navegador: título con el dominio, textos del sistema y estilos ajenos a la app.
  - **Causa:** `globalThis.confirm(...)` en `src/ui/cuestionario.ts` y `src/ui/ajustes.ts`.
  - **Corrección:** nuevo módulo `src/ui/dialogo.ts` con `pedirConfirmacion()`, que monta un `<dialog>` **modal** nativo (foco atrapado, cierre con `Esc` vía el evento `cancel`, `aria-labelledby` hacia el título y foco devuelto al botón que lo abrió), sin ninguna dependencia. Títulos y botones salen de `src/ui/cadenas.ts` ("Salir del cuestionario" → *Seguir* / **Salir**; "¿Borrar todo tu progreso?" → *Cancelar* / **Borrar**, con el seguro **primero** para que `Enter` no ejecute lo destructivo) y el estilo va en `src/estilos/app.css` (`.dialogo`, `.dialogo::backdrop`) con variables CSS, incluido el modo oscuro.
  - **Nota de pruebas:** jsdom 30 no implementa `showModal`/`close`, así que `pruebas/pantallas.ts` añade un *polyfill* mínimo (atributo `open` + evento `close`) y dispara el `cancel` de `Esc` a mano. Cubierto con 12 comprobaciones nuevas (apertura, título, orden de botones, confirmar/cancelar/Esc, retira del DOM y que no se borra nada hasta confirmar).
- [x] **INC-03 · El aviso «sin conexión» se ve siempre, también en línea.** ✅ *corregido 2026-10-08.* Con la app completamente online (y también abriéndola desde el navegador) el recuadro *"Sin conexión: la app sigue funcionando con los datos guardados en este dispositivo"* estaba visible.
  - **Causa:** el aviso se oculta con el atributo `hidden` (`pintaAvisoConexion`, `src/aplicacion.ts`), pero `.estado-vacio { display: flex }` es una regla de la **hoja de usuario** y pisa a la del navegador (`[hidden] { display: none }`) → el atributo estaba puesto y los tests pasaban, pero en pantalla el recuadro salía siempre.
  - **Por qué no lo pilló la CI:** las comprobaciones de `pruebas/pantallas.ts` solo miraban el **atributo** (`hasAttribute('hidden')`), que sí estaba. Tampoco sirve mirarlo desde jsdom: da por oculto un `hidden` aunque falte la regla (comprobado empíricamente), así que un test de `getComputedStyle` ahí habría dado **falsa confianza**.
  - **Corrección:** normalización global en `src/estilos/base.css` → `[hidden] { display: none !important; }`, que cubre este caso y cualquier uso futuro (también contra estilos en línea).
  - **Guardas:** (1) en la CI, `pruebas/pantallas.ts` lee `base.css` y exige esa regla — **falla con el CSS antiguo** (1 de 299) y pasa con el arreglo; (2) `scripts/comprobar-offline.mjs` pasa a mirar el `display` **real en Chrome** en los dos estados (con red → `none`; sin red → visible): contra la producción anterior reproducía el fallo (`con red: VISIBLE ❌`) y contra el build corregido sale en verde.
- [x] **INC-04 · El widget de la racha no aparece en el selector de Android.** ✅ *corregido 2026-10-08.* Instalado el APK 1.1, al mantener pulsada la pantalla de inicio → *Widgets* no salía «Repaso de Historia» en ninguna de las formas de llegar al selector.
  - **Causa:** el `<receiver>` del widget declaraba solo el `meta-data android.appwidget.provider` y **ningún `<intent-filter>`**. Android descubre los widgets consultando los receivers que escuchan `android.appwidget.action.APPWIDGET_UPDATE` («el único broadcast que debes declarar explícitamente», según la documentación): sin ese filtro el receptor **ni se considera widget**, así que el selector no lo enseña aunque la clase, los recursos y la ficha estén perfectamente empaquetados.
  - **Por qué no lo pilló nada:** la verificación de la Fase 5 confirmaba que `WidgetRachaProvider` **estaba** en el manifiesto del APK (lo estaba) pero no miraba *qué* llevaba dentro; y `aplicar-widget.mjs` daba por bueno cualquier bloque que mencionara el nombre de la clase.
  - **Corrección:** `<intent-filter>` con `APPWIDGET_UPDATE` en `android/widget/parche/manifiesto.xml`. Se mantiene `exported="false"`: los envíos del sistema —los que disparan `onUpdate` al añadir el widget— sí llegan a receptores no exportados.
  - **Guardas:** `scripts/aplicar-widget.mjs` valida ahora el **contenido** del fragmento (acción + `meta-data` + `android:exported` explícito) y, si el bloque ya aplicado difiere de la fuente, lo **sustituye** en vez de darlo por bueno.
  - **Verificación:** `bubblewrap update --skipVersionUpgrade` → `npm.cmd run widget` → `bubblewrap build`; en el APK, `aapt dump xmltree` muestra `<receiver> → <intent-filter> → <action …APPWIDGET_UPDATE/> → <meta-data …>`, recursos `layout/widget_racha` y `string/widget_*` presentes, `versionCode='4' versionName='1.2'` y huella **`b7666ba3…b54cf` idéntica** → se actualiza encima sin perder datos.
  - **✅ Prueba en dispositivo (2026-10-08):** con el **APK 1.4** el alumno confirma que el widget **sí aparece** en el selector de Android y funciona — cierra la última comprobación que quedaba de esta incidencia.

---

## 12. Plan de escalado (miles de preguntas, cientos de temas, imágenes)

> **Escenario previsto:** miles de preguntas repartidas en cientos de temas (`datos/preguntas/<curso>/<tema>.json`) y **preguntas con imágenes**, que pesan órdenes de magnitud más que el texto. Esta sección fija **cómo se escala sin perder el online/offline actual** y **cuándo** hay que tocar cada cosa.
>
> Redactada el 2026-10-07 midiendo la app real. **No exige ningún cambio hasta que salte un disparador** (§12.2), salvo lo marcado como *"desde la primera imagen"*.
>
> **Invariante que hay que conservar en cualquier escalado:** la app se abre y se juega sin conexión (lo comprueba `scripts/comprobar-offline.mjs`); el flujo *editar JSON → `npm.cmd run prueba` → push* sigue sin tocar código de la app; sigue sin backend, sin cuentas y sin datos personales; y no se añaden dependencias nuevas (lo de imágenes usa `sharp`, que ya está para los iconos).

### 12.1 Punto de partida medido (2026-10-07)

| Magnitud | Valor hoy |
|---|---|
| Contenido | 3 cursos · 4 temas · **40 preguntas** → 22,6 KB de JSON (gzip 7,4 KB) |
| Coste por pregunta | **566 B** en bruto / **184 B** gzip |
| Bundle JS | 43 KB (14,8 KB gzip) = ~20 KB de código + las preguntas dentro |
| JSON en `dist/` | **0 ficheros**: van dentro del JS (`import.meta.glob`) |
| Caché del SW | **9 entradas**, independientemente de cuántos JSON haya |
| Imágenes | 0 (`public/imagenes/` no existe). El campo `imagen` existe en el modelo y en el validador, **pero la UI todavía no la pinta** |

Proyección lineal del corpus (el texto es lo de menos):

| Preguntas | JSON bruto | Gzip | Bundle total (texto + código) |
|---:|---:|---:|---:|
| 40 (hoy) | 23 KB | 7 KB | 43 KB / 14,8 KB gzip |
| 500 | 280 KB | 92 KB | 300 KB / 100 KB gzip |
| 6.000 (200 temas × 30) | 3,4 MB | **1,1 MB** | 3,4 MB / 1,1 MB gzip |
| 12.000 (300 temas × 40) | 6,8 MB | **2,2 MB** | 6,8 MB / 2,2 MB gzip |

Y las imágenes, que son el problema de verdad:

| Imágenes | Sin optimizar (~500 KB c/u) | Con pipeline (~80 KB c/u) |
|---:|---:|---:|
| 500 | 250 MB | 40 MB |
| 2.000 | 1 GB | **160 MB** |

**Conclusión de diseño:** el texto escala en *cientos de KB* → se resuelve con **carga diferida**; las imágenes escalan en *cientos de MB* → se resuelven con **compresión + descarga bajo demanda** y **jamás** entrando en la descarga inicial ni en una caché global única.

### 12.2 Disparadores: cuándo tocar qué

La app no se reescribe "por si acaso": cada acción tiene un umbral medible que comprueba la CI (§12.4).

| Señal | Disparador | Acción |
|---|---|---|
| Preguntas totales | **> 450** (≈255 KB de JSON → bundle ≈275 KB / 90 KB gzip) | §12.3 A: dejar `eager` y pasar a chunks por tema |
| Tamaño de un chunk | **> 150 KB** bruto | Subdividir (si se agrupó por curso, bajar a tema) |
| `datos/temas.json` | **> 60 KB** | Índice de cursos *eager* + temas de cada curso en su chunk |
| Imágenes en `public/imagenes/` | **> 0** | §12.3 C + render en la UI (**desde la primera imagen**, no hay disparador) |
| Peso servido de imágenes | **> 20 MB** | §12.3 E: packs por tema/curso + pantalla de almacenamiento |
| Descarga inicial (carcasa) | **> 90 KB gzip** (mismo límite que §12.4) | Reducir el alcance del precaché del `install` |
| Progreso en `localStorage` | **> 500 KB** | Podar: mejor nota y racha de todos, historial fino solo de los últimos N temas |
| Validador o `build` | **> 10 s** | Lectura/validación incremental (baja prioridad) |

### 12.3 Arquitectura objetivo

#### A. Datos: de un bundle único a chunks por tema

- `import.meta.glob('../datos/preguntas/**/*.json', { eager: true })` → **sin `eager`**: Vite genera un chunk con hash por fichero (≈17 KB por tema de 30 preguntas).
- Nuevo punto de entrada en `src/datos.ts`: `cargarTema(clave): Promise<Pregunta[]>` con caché en memoria. **`src/logica/` y las pantallas no cambian**: siguen recibiendo `Pregunta[]`; solo se vuelve asíncrono el paso de *elegir tema → jugar* (y hay que pintar estados *cargando* y *error*).
- La carga se dispara **al entrar en el curso** (*prefetch* en segundo plano), para que "Jugar" no espere y para dejar ese curso ya cacheado.
- `datos/temas.json` (índice que pinta Inicio) **sigue *eager* y entero**: es pequeño por definición (cientos de temas ≈ pocas decenas de KB).
- **Offline sin regresiones:** el SW ya cachea toda petición mismo-origen (`recurso()` en `public/sw.js`), así que un tema abierto queda cacheado. Para precachear **sin depender de que lo abran**, un post-build genera **`manifest-contenido.json`** (`{ "eso2": ["assets/datos-eso2-<hash>.js", …] }`) que consume el SW en `install`/`activate`. *(No confundir con `manifest.webmanifest`, que es el del PWA.)*
- **A cientos de chunks:** si `dist/assets` se dispara (> 300 ficheros), agrupar con `manualChunks` (uno por curso). La granularidad de descarga la marca el manifest, no Vite.

#### B. Tres cachés con vidas distintas (hoy hay una sola)

| Caché | Qué guarda | Vida |
|---|---|---|
| `repaso-historia-v<N>` | Carcasa: HTML, CSS, JS de la app, catálogo, iconos, manifest | **Una versión**: la nueva sustituye a la vieja en `activate` (comportamiento actual) |
| `repaso-historia-contenido` | Chunks de temas | **Sobrevive a los deploys**: las URLs llevan hash y en `activate` se borran las que ya no aparecen en `manifest-contenido.json` |
| `repaso-historia-media` | Imágenes | **Sobrevive a los deploys**; si no, cada publicación obligaría a volver a bajar todas las imágenes ya vistas. Limpieza por antigüedad + botón "liberar espacio" |

- Los packs descargados a mano (§12.3 E) se marcan como **fijos** dentro de `contenido`/`media`, para que la limpieza por antigüedad no los toque.
- **Por qué importa ya:** con una sola caché, cualquier deploy lo borra todo lo demás. Hoy no se nota (no hay imágenes ni chunks), pero al escalar sería la principal causa de «he perdido lo que había descargado».

#### C. Imágenes: pipeline con `sharp` (desde la primera imagen)

- Los originales **no** viven en `public/`: carpeta aparte `imagenes-origen/`, fuera del build. En el repo solo si el total de originales ≤ ~50 MB; si no, documentar su ubicación en `AGENTS.md`.
- **`npm.cmd run imagenes`** (usa `sharp`, ya instalado para los iconos): `imagenes-origen/` → `public/imagenes/<curso>/<tema>/<id>-<ancho>.webp`, variantes **480 / 800 / 1280**, calidad ~75, sin metadatos. **Presupuesto: ≤ 80 KB por variante**, que comprueba el validador.
- La UI pinta `<img srcset sizes width height loading="lazy" decoding="async">`: solo se descarga la variante que se mira y el alto va declarado (sin saltos de layout).
- **Offline:** la primera vez que se ve online queda en `repaso-historia-media` y después funciona sin red (eso ya lo hace `recurso()`).
- **Nunca en `install`:** precachear ~160 MB rompería la primera carga y la cuota.

#### D. Offline degradable (regla de oro)

Que falte contenido **no** puede dar pantalla rota:

| Falta | Comportamiento |
|---|---|
| Chunk del tema no descargado, sin red | Aviso dentro de la app: «Este tema no está descargado en este dispositivo» + botón «Descargar» (se reintenta solo al volver a haber red). Nunca pantalla en blanco |
| Imagen no cacheada, sin red, en pregunta normal | Hueco con texto alternativo; la pregunta sigue siendo jugable |
| Imagen no cacheada en `tipo: "imagen"` (la imagen **es** el enunciado) | La pregunta se **excluye del cuestionario** con aviso («N preguntas necesitan haberse visto una vez con conexión»); si el cuestionario queda vacío, se avisa **antes** de empezar |

#### E. Almacenamiento visible y bajo control

- **Ajustes → Almacenamiento**: `navigator.storage.estimate()` (MB usados/libres), desglose carcasa/contenido/media, «Liberar contenido no usado» y «Descargar curso X para sin conexión» mostrando **los MB que va a bajar antes de empezar**.
- `navigator.storage.persist()` en el primer uso, para que Android/Chrome no vacíe la caché sin avisar.
- Con ~160 MB de imágenes servidas la cuota deja de ser gratis: el aviso previo y el botón de liberar son obligatorios, no cosméticos.

### 12.4 Presupuestos que vigila la CI

`scripts/presupuesto.mjs` (nuevo, dentro de `npm.cmd run prueba` y del workflow) **hace fallar** el build si:

- la carcasa supera **250 KB bruto / 90 KB gzip** (coincide con el disparador de §12.2);
- algún chunk de datos supera **150 KB** bruto;
- alguna imagen de `public/imagenes/` supera **80 KB**;
- `dist/` tiene **> 300 ficheros** (señal de que toca agrupar chunks);
- falta `manifest-contenido.json` o apunta a rutas que no existen en `dist/`.

Así el plan se mantiene vivo sin depender de que alguien se acuerde de mirar §12.2.

### 12.5 Verificación de escalado

- `scripts/comprobar-offline.mjs` ampliado a **4 casos**: (1) carcasa offline; (2) tema ya abierto → se juega entero sin red; (3) tema no descargado → mensaje de «no descargado», no pantalla rota; (4) tras un deploy simulado → las imágenes vistas siguen en `repaso-historia-media` y la carcasa se actualiza.
- Prueba de carga con **corpus sintético en carpeta temporal** (6.000 preguntas, 200 temas, ~40 imágenes; **nunca commiteado**) que mide: `build` < 30 s, arranque < 200 ms, selección de preguntas < 50 ms, primera carga de un curso < 100 KB gzip.
- Los tests de `src/logica/` **no deben cambiar** (siguen recibiendo `Pregunta[]`): si se rompen, el escalado ha tocado donde no debía.

### 12.6 Orden de ejecución

Por disparadores (§12.2). Las tres primeras tareas **no esperan a ningún disparador**, porque aplican desde la primera imagen y porque son las que vigilan al resto:

- [ ] `scripts/presupuesto.mjs` + su sitio en `prueba` y en la CI (previo a todo: es lo que detecta los disparadores).
- [ ] Render de `tipo: "imagen"` en `src/ui/cuestionario.ts` (**hoy no se pinta**) + test en `pruebas/pantallas.ts`.
- [ ] Pipeline `imagenes-origen/` → `public/imagenes/` con `sharp` (`npm.cmd run imagenes`) + presupuesto de peso en el validador.
- [ ] Carga diferida de temas: `eager: false` + `cargarTema()` + estados *cargando*/*error* en la UI y *prefetch* al elegir curso.
- [ ] `manifest-contenido.json` en post-build y precaché por curso en el `install` del SW.
- [ ] Separar las tres cachés con su limpieza en `activate` (§12.3 B).
- [ ] Estados offline degradados de §12.3 D (chunk e imagen) con sus tests.
- [ ] Ajustes → Almacenamiento (`estimate`, `persist`, liberar, descargar curso).
- [ ] Ampliar `comprobar-offline.mjs` a los 4 casos de §12.5.
- [ ] Prueba de carga con corpus sintético.
- [ ] Documentar en `AGENTS.md` el flujo de imágenes: `imagenes-origen/` → `npm.cmd run imagenes` → `npm.cmd run prueba` → push.

> **Relación con el resto del PLAN:** la **Fase 6** (contenido) es la que dispara esto; la **Fase 7** queda declarada en §5 con este mismo listado. El riesgo «Bundle gigante» de §7 apunta a esta sección.

---

## 13. Mejoras previstas (2026-10-08)

> Tres mejoras pedidas, planificadas aquí **sin tocar código** (iteración de documentación). La ejecución queda en la **Fase 8** (§5). Ninguna afecta al offline actual ni al flujo *editar JSON → `npm.cmd run prueba` → push*, salvo lo que se indique expresamente en §13.3.

### 13.1 «Todos los temas» en la lista de un curso

**Objetivo.** En la lista de temas aparecer, **en cada bloque de asignatura**, una opción **«Todos los temas de {asignatura}»** que arma un cuestionario con preguntas **mezcladas** de todos los temas **de esa asignatura y ese curso**. Ejemplo en 2º Bachillerato: **«Todos los temas de Historia»** + **«Todos los temas de Historia del Arte»**. **Decisión cerrada el 2026-10-08:** es **siempre por asignatura** (nunca una fila que mezcle materias ni ninguna «Todo el curso») y, al ser `asignatura` obligatoria (§13.2), **el rótulo lleva siempre el nombre de la asignatura** — ya no queda un «Todos los temas» a secas.

**Decisión de diseño** (lo más barato y lo menos invasivo):

- **Sin crear temas «falsos» en el contenido**: no se mete un pseudo-tema en `temas.json` (el validador exige fichero por tema, y Progreso iteraría un tema inexistente). Cada fila tiene su **clave virtual de runtime**, centralizada en **una sola** función `claveConjunto(cursoId, asignaturaId)` — **siempre con asignatura**, porque es obligatoria (§13.2):
  - `eso2/__todos__/historia` (el único bloque de 2º ESO);
  - `2bach/__todos__/historia` y `2bach/__todos__/historia-del-arte`.

  Inicio, Progreso, Resultados y `sesion.claveTema` usan **esa misma función**, para que la nota guardada coincida con la fila que se pinta.
- `src/logica/catalogo.ts` gana tres funciones **puras**:
  - `preguntasDeConjunto(indice, curso, asignaturaId)` → concatenación de `preguntasDeTema` de los temas **de esa asignatura y curso**, **sin duplicados por `id`** y en orden;
  - `minimoDeConjunto(temas)` → `max(temas.minPreguntas)` (umbral de «jugable», igual que `temaJugable`).
- `src/aplicacion.ts` → `iniciar(cursoId, temaId, idsFalladas)` pasa a recibir la **selección**: el tipo `Seleccion` de `src/logica/tipos.ts` (`{ tipo: 'tema', cursoId, temaId }` o `{ tipo: 'conjunto', cursoId, asignaturaId }`), del que `iniciar()` deriva banco, rótulo (`T.inicio.todosDe`) y clave (`claveConjunto`). `Acciones` gana `elegirConjunto(cursoId, asignaturaId)` junto a `elegirTema`. El resto del flujo **no cambia**: `seleccionarPreguntas` ya baraja y ya reparte 1·2·3, y si `ajustes.preguntas` supera al pool devuelve el pool entero.
- `sesion.temaTitulo` = el rótulo de la fila (**«Todos los temas de Historia»**) → la cabecera `curso · tema` del cuestionario y la pantalla de Resultados lo muestran sin cambios.
- **Progreso**: una fila por clave virtual con su mejor nota (misma insignia `claseInsignia`).

**Tareas**

- [x] `claveConjunto`, `preguntasDeConjunto` y `minimoDeConjunto` en `src/logica/catalogo.ts` (las tres, puras). ✅
- [x] Generalizar `iniciar()` en `src/aplicacion.ts` (recibe la **selección**, tipo `Seleccion` de `src/logica/tipos.ts`) y **guardar la selección en `estado.temaResultado`**, para que «Repetir solo las falladas» funcione desde el pool (hoy `repetir()` rehace `iniciar(tema.cursoId, tema.temaId, ids)`). ✅
- [x] Fila «Todos los temas de {asignatura}» en `src/ui/inicio.ts` → `pintarCurso()`, **primera de cada bloque de asignatura**, clase propia `tema--todos`, deshabilitada con motivo si el pool < mínimo. ✅
- [x] Fila equivalente en `src/ui/progreso.ts`, una por clave virtual. ✅
- [x] Cadena nueva en `src/ui/cadenas.ts`: `inicio.todosDe(asignatura)` → «Todos los temas de {asignatura}». **No** se crean `inicio.todosLosTemas` (el genérico ya no aplica: el rótulo lleva siempre la asignatura) ni `inicio.todoElCurso` (mezclar materias queda fuera de alcance). ✅
- [x] Tests: `pruebas/logica.ts` (pool sin duplicados · mínimo · dificultades repartidas), `pruebas/pantallas.ts` (fila visible → se juega → resultados → *repetir falladas* desde el pool → fila en Progreso; y con dos asignaturas, **dos filas con claves distintas**), `pruebas/persistencia.ts` (las claves virtuales conviven con el progreso existente y se borran con él). ✅

**Riesgos**

- Una clave más **por fila** en `localStorage`: irrelevante (ya hay una por tema) y se limpia con «Borrar progreso».
- Curso con pool < `minimoDeConjunto`: la fila **se muestra deshabilitada con el motivo**, igual que hoy hace `pintarTema` (nunca desaparece sin explicación).

### 13.2 Asignaturas obligatorias: estructura `cursos > asignaturas > temas`

**Objetivo.** Que un mismo curso pueda llevar varias materias —**2º Bachillerato: Historia + Historia del Arte**— y que **todas** las asignaturas del currículo estén declaradas desde el principio: los cursos de hoy solo tendrán una («Historia»), pero la puerta queda abierta a más.

**Decisión de diseño (cerrada el 2026-10-08): estructura OBLIGATORIA `cursos > asignaturas > temas`**

> Sustituye a la opción de «campos opcionales sin mover estructuras» que se planteó antes. Con el nombre de asignatura **obligatorio**, el anidamiento es más simple de leer, de validar y de pintar que un campo suelto con agrupación en la UI, y no deja estados intermedios («¿este curso tiene o no asignaturas?»).

```json
{
  "cursos": [
    {
      "id": "2bach",
      "titulo": "2º Bachillerato",
      "orden": 12,
      "asignaturas": [
        {
          "id": "historia",
          "titulo": "Historia",
          "orden": 1,
          "temas": [
            { "id": "restauracion", "titulo": "La Restauración", "orden": 1, "minPreguntas": 10 }
          ]
        },
        {
          "id": "historia-del-arte",
          "titulo": "Historia del Arte",
          "orden": 2,
          "temas": [
            { "id": "renacimiento", "titulo": "El Renacimiento", "orden": 1, "minPreguntas": 10 }
          ]
        }
      ]
    }
  ]
}
```

- **Tipos** (`src/logica/tipos.ts`): `Asignatura = { id, titulo, orden, temas: Tema[] }`; **`Curso.asignaturas: Asignatura[]` es obligatorio** y **`Curso.temas` desaparece**. `Tema` no cambia.
- **Migración de datos:** se reescribe `datos/temas.json` envolviendo los `temas` de cada curso en su bloque `asignaturas` (`id: "historia"`, `titulo: "Historia"`). **Los ficheros de preguntas no se mueven** (siguen en `datos/preguntas/<curso>/<tema>.json`) y **las claves de progreso `<curso>/<tema>` no cambian** → **no se pierde ninguna nota ni racha** de lo que lleven los alumnos.
- **Catálogo / `src/datos.ts`:** `temasOrdenados(curso)` pasa a ser `asignaturasDeCurso(curso)` + `temasDeAsignatura(asignatura)` (ambas puras, en `logica/catalogo.ts`); el **índice de preguntas sigue igual** (`<curso>/<tema>`), porque el directorio sigue siendo el curso.
- **Contenido:** los temas de Historia del Arte van en los **mismos** `datos/preguntas/2bach/*.json` con la convención actual `2bach-<tema>-<nnn>`: el directorio es el **curso**, no la asignatura, así que **el flujo de edición no cambia** (editar → `prueba` → push).
- **UI:** Inicio y Progreso pintan **curso → subtítulo de asignatura → temas**, con el subtítulo como encabezado real (accesible, no un simple espaciado). Se ve igual de limpio con una sola asignatura.
- **Validador** (`scripts/validar-preguntas.mjs` + `pruebas/datos.ts`), que hoy rechaza campos desconocidos:
  - **todo curso debe tener `asignaturas` con al menos una**; toda asignatura, ≥ 1 tema;
  - **se rechaza `temas` a nivel de curso** (la forma antigua) y cualquier campo desconocido;
  - `id` de asignatura **único dentro del curso**;
  - **`id` de tema único dentro del curso**: dos asignaturas no pueden reusar el mismo slug, porque chocarían la clave `<curso>/<tema>` y la convención de ids `<curso>-<tema>-<nnn>`;
  - `orden` **único dentro de cada asignatura**; `minPreguntas` ≥ 1;
  - los directorios de `datos/preguntas/` siguen siendo ids de curso (**sin cambios**).
- **Se compone con §13.1 (decisión cerrada el 2026-10-08):** la opción «Todos los temas» se ofrece **una por asignatura** — «Todos los temas de Historia» + «Todos los temas de Historia del Arte» — y **no hay fila «Todo el curso»** que mezcle materias distintas.

**Tareas**

- [x] Tipos: `Asignatura` con `temas`, `Curso.asignaturas` obligatorio y `Curso.temas` fuera. ✅
- [x] Migrar `datos/temas.json` (todos los cursos envueltos en «Historia») y **actualizar el ejemplo de §3**. ✅
- [x] `asignaturasDeCurso` + `temasDeAsignatura` (+ `temasDelCurso`, que aplana) en `src/logica/catalogo.ts`; `buscarTema(curso, temaId)` **conserva su firma** porque el id de tema es único **dentro del curso**; `claveTema` **no cambia**. ✅
- [x] Adaptar `src/ui/inicio.ts` (curso → subtítulo de asignatura → temas) y `src/ui/progreso.ts` (+ columna «Asignatura»). `src/datos.ts` y `src/aplicacion.ts` **no necesitaron cambios**: el índice sigue siendo `<curso>/<tema>` y `buscarTema` no cambió de firma. ✅
- [x] Validador + `pruebas/datos.ts` con las reglas obligatorias de arriba (curso sin asignaturas, forma antigua con `temas`, campos desconocidos, id de tema repetido entre asignaturas, `orden` repetido dentro de una asignatura). ✅
- [x] Migrar los fixtures de catálogo de `pruebas/` y actualizar `pruebas/logica.ts` y `pruebas/pantallas.ts` (315 comprobaciones). ✅
- [x] Extensión de §13.1: las filas pasan a ser **una por asignatura**, cada una con su propia clave virtual. ✅
- [ ] Contenido: primeros temas de Historia del Arte de 2º Bachillerato (puede caer en la Fase 6).

**Riesgos**

| Riesgo | Mitigación |
|---|---|
| Romper `temas.json` y todo lo que lo lee a la vez | Un **commit atómico**: tipos + datos + UI + validador + tests **en verde juntos**; `npm.cmd run prueba` cubre el conjunto |
| **Pérdida del progreso** de los alumnos | Las claves `<curso>/<tema>` **no cambian** (ni el índice ni los directorios) → notas, racha y contadores sobreviven. Con test explícito |
| Dos asignaturas reusando el mismo `id` de tema | El validador exige ids de tema **únicos dentro del curso** (colisionarían `<curso>/<tema>` y `<curso>-<tema>-<nnn>`) |
| `orden` repetido | Único **dentro de cada asignatura** |
| Mezclar materias en un mismo cuestionario | **Fuera de alcance** (no hay fila «Todo el curso»); si algún día se pide, la escala 1·2·3 ya es común a ambas y no haría falta nada nuevo |

### 13.3 Widget de la racha en la pantalla de inicio (Android)

**Objetivo.** Un widget que el alumno deje en su pantalla de inicio y muestre **la racha actual de días**.

**Por qué no es solo web:** Android **no soporta widgets para PWAs** (el miembro `widgets` del manifest **no está implementado en Chrome/Android**; en iOS sí vía WidgetKit). Un widget de pantalla de inicio exige código **nativo** en el APK, y la racha vive en `localStorage['repaso-historia:progreso:v1']` (dentro de Chrome) → hace falta un **puente**.

**Decisión de diseño: widget nativo + puente `intent://`**

- **Puente web → APK:** nuevo módulo `src/ui/widget.ts` con `crearPuenteWidget(almacen, opciones)` y `enviar(racha, ultimoDia)`, que dispara
  `intent://racha#Intent;scheme=quizhistoria;package=com.andreumarbor.quizophistoria;action=…widget.RACHA;S.racha=5;S.ultimoDia=2026-10-08;end`.
  Se llama en tres puntos de `src/aplicacion.ts`: al **arrancar**, en **`finalizar()`** (único sitio donde cambia la racha, junto a `registrarCuestionario`) y en **`borrarProgreso()`** (envía `0`).
  ⚠️ **Chrome solo lanza un `intent://` con gesto de usuario** (documentación oficial de Android Intents): el envío «al arrancar» **se encola** y sale con el primer toque; los otros dos ocurren dentro de un clic, así que van directos. Además solo se intenta **dentro de la app instalada** (`display-mode: standalone` o referrer `android-app://`) y en Android+Chrome: quien llegue desde un enlace del README no se lleva ni diálogo ni Play Store.
- **Lado nativo** (proyecto generado por Bubblewrap):
  - `WidgetBridgeActivity` (transparente, `exported="true"`, `noHistory`, `excludeFromRecents`): valida los extras (entero 0–9999 y fecha `YYYY-MM-DD`), los guarda en `SharedPreferences` y notifica al widget.
  - `WidgetRachaProvider` (`AppWidgetProvider`) + `res/xml/*appwidget*.xml` (`updatePeriodMillis="1800000"`: **30 min, el mínimo de Android**, para que el sistema repita `onUpdate` y la cifra no se quede vieja al pasar la medianoche; `resizeMode`; `widgetCategory="home_screen"`) + `res/layout/*widget*.xml`: `TextView` con la racha y «días», y **`PendingIntent` a la `MainActivity`** del TWA (al tocarlo abre la app).
  - **El widget es un recordatorio diario, no una vitrina**: solo enseña la cifra si **la última actividad es de hoy** (`ultimoDia == hoy`). Si fue **ayer** —la racha sigue viva en la web— o hace más, muestra «—» + «Juega hoy», y **nunca un número viejo** (una semana sin jugar no puede enseñar «5 días»). La web (`Progreso`) sí muestra la racha mientras no pasen dos días: una pantalla es el récord, el widget es el empujón de hoy.
  - **Sin datos no se adivina:** si `SharedPreferences` está vacío (app recién instalada, o recién actualizada la primera vez que corre el puente) muestra «—» + **«Abre la app»** en vez de un «Juega hoy» falso. Se distingue con `prefs.contains(CLAVE_RACHA)` — solo escribe el puente, así que `contains` = «ha llegado algún envío».
  - Colores con recursos `daynight` (en la nativa, lo mismo que las variables CSS en la web: nada hardcodeado).
- **¿Y los APKs antiguos?** Un `intent://` sin receptor hace que Chrome muestre «No se encontró ninguna aplicación». Por eso el despliegue va en **dos pasos**:
  1. **APK con el receptor** repartido/actualizado primero (subiendo `versionCode`/`versionName` en `twa-manifest.json`);
  2. **activar el envío en la web** después (constante `PUENTE_WIDGET_ACTIVADO` en `src/ui/widget.ts`, en `false` hasta que el APK nuevo esté instalado). ✅ *Hecho el 2026-10-08, con el APK 1.2 en el móvil y el widget confirmado.*
  Red de seguridad: **sondeo de soporte** en el envío (si la página no llega a irse a segundo plano en ~1,2 s → se guarda `sin-soporte` en `localStorage` y deja de intentarlo; **caduca a la semana** por si el alumno después actualiza el APK). Confirmado el receptor se guarda `ok` y deja de sondear.

**Tareas**

- [x] `src/ui/widget.ts` (puente **inyectable**, sin tocar `location` real en las pruebas) + llamadas en arranque / `finalizar()` / `borrarProgreso()`.
- [x] Tests web con stub: envía al terminar un cuestionario, envía `0` al borrar progreso y **no** envía si el puente está desactivado.
- [x] Código nativo (Kotlin): `WidgetBridgeActivity`, `WidgetRachaProvider`, `appwidget-provider`, layout y bloques del `AndroidManifest.xml`. ✅ *(2026-10-08. Detalle: **8 ficheros** en `android/widget/` (fuentes + `parche/manifiesto.xml`). `WidgetBridgeActivity` es `exported="true"` + `noHistory`/`excludeFromRecents`, hereda el tema transparente de la `<application>` y **valida los extras** (entero 0–9999 y `YYYY-MM-DD`, si no, `finish()` sin guardar). `WidgetRachaProvider` aplica **la misma regla que `avanzarRacha()`**: hoy/ayer → cifra, ≥2 días → «—» + «Juega hoy»; `updatePeriodMillis="0"` (nada de refrescos de batería: lo repintamos nosotros) y clic → `getLaunchIntentForPackage`. Recursos en ficheros propios (`widget_strings/widget_colors` + `values-night`, `widget_fondo`, `layout`, `xml/widget_racha`) ⇒ el parche es idempotente y el widget respeta el modo oscuro del sistema. **Kotlin 2.1.21** enganchado a los dos `build.gradle` (decisión cumplida). **La regla y el refresco se afinaron en el APK 1.4** (ver tarea de más abajo): «solo si has jugado hoy», «Abre la app» sin datos y `updatePeriodMillis=1800000`.)*
- [x] `scripts/aplicar-widget.mjs` que (re)aplique el parche tras un `bubblewrap update` (ver riesgos). ✅ *(2026-10-08. Detalle: `npm.cmd run widget`. Copia `android/widget/{java,res}` → `app/src/main/`, inserta el fragmento de manifiesto antes del cierre de `<application>` y añade los parches de Gradle (`mavenCentral()` ×2, classpath de Kotlin, `apply plugin: 'kotlin-android'`, `kotlinOptions`). **Idempotente** (marcas «aplicado»/«ya estaba») y **falla en voz alta** si un ancla no está donde se esperaba. **Probado en caliente:** `bubblewrap update` borró todos los parches → el script los rehizo de un plumazo. **INC-04 (2026-10-08):** además valida hoy el *contenido* del fragmento (acción `APPWIDGET_UPDATE` + `meta-data` + `android:exported`) y **propaga** un cambio del fragmento sobre un bloque ya aplicado — antes un simple `includes('WidgetBridgeActivity')` lo daba por bueno y lo ignoraba.)*
- [x] `bubblewrap.cmd build` + `apksigner verify --print-certs` (**misma huella**) y APK nuevo a `Downloads`. ✅ *(2026-10-08. Detalle: **`appVersionCode` 1 → 3 y `appVersionName` → `1.1`** en `twa-manifest.json` + `bubblewrap update` (la orden sin `--skipVersionUpgrade` autoincrementa). APK+AAB firmados, huella **`b7666ba3…b54cf` idéntica** → el alumno que ya la tiene se la actualiza encima sin perder datos. `aapt dump badging` = `versionCode='3' versionName='1.1'`, `minSdk 21`, y en el manifiesto del APK están `WidgetBridgeActivity` (con `BROWSABLE`) y `WidgetRachaProvider`. Copiado a `Downloads/RepasoHistoria-1.1.apk`. **Incidencia resuelta abajo:** el JDK que descarga Bubblewrap era de **32 bits** y Kotlin se cae con él. **Rebuild por INC-04 (2026-10-08):** `appVersionCode` 3 → **4** y `appVersionName`/`appVersion` → **1.2** (el APK 1.1 no enseñaba el widget) → `Downloads/RepasoHistoria-1.2.apk`, **misma huella**, `versionCode='4' versionName='1.2'`.)*
- [x] **Paso 2 · activación del puente + APK 1.3 (widget a 2×1).** ✅ *(2026-10-08. Detalle: el widget ya se añadía (INC-04) pero se quedaba en «— / Juega hoy» con la racha de Progreso correcta — **no era un fallo**: `PUENTE_WIDGET_ACTIVADO` seguía en `false`, era el paso 2 pendiente. Antes de activarlo se revisó el contrato `intent://` ↔ `WidgetBridgeActivity` (`S.racha`/`S.ultimoDia` ↔ `getStringExtra`, misma acción, scheme y host, validación 0–9999 y `YYYY-MM-DD`) → `PUENTE_WIDGET_ACTIVADO = true`; los tests inyectan `activo`, así que **ningún test cambia de significado**. A petición del alumno, el tamaño pasa de **3×2 a 2×1** (`targetCellWidth/Height` en `xml/widget_racha.xml`; `minWidth 140dp`/`minHeight 64dp` siguen siendo el suelo de los lanzadores antiguos) y el layout baja el padding vertical **12 → 8dp** para que los ≈70dp de contenido quepan en una sola fila. `appVersionCode` 4 → **5**, `appVersionName`/`appVersion` → **1.3**; misma huella → `Downloads/RepasoHistoria-1.3.apk`. Verificado en el paquete: `versionCode='5' versionName='1.3'`, `<receiver>` con `APPWIDGET_UPDATE`, ficha con `targetCellWidth=0x2`/`targetCellHeight=0x1` y layout con `paddingTop/Bottom=8dp`, `paddingStart/End=12dp`. Pruebas 455 y build en verde.)*
- [x] **APK 1.4 · «solo si has jugado hoy» + refresco automático + «Abre la app».** ✅ *(2026-10-08. Detalle: el alumno reportó que, tras actualizar, el widget decía «Juega hoy» aunque hubiera jugado ese mismo día. Eran **dos cosas**: (1) el puente acababa de activarse y `SharedPreferences` **estaban vacías** — el widget no tenía ningún dato todavía, no es que ignorara la racha —, así que ahora, sin datos, enseña «— / **Abre la app**» en lugar de mentir; (2) la regla era `dias <= 1` (cifra también con la partida de *ayer*) → pasa a **`dias == 0`**, solo si la última actividad es de **hoy**. Para que «mañana a primera hora» diga «Juega hoy» **sin abrir la app**, `updatePeriodMillis` pasa de `0` a **`1800000`** (30 min, el mínimo de Android): el sistema repite `onUpdate` y `pintar()` recalcula contra la hora actual. `appVersionCode` 5 → **6**, `appVersionName`/`appVersion` → **1.4**; misma huella → `Downloads/RepasoHistoria-1.4.apk`. Verificado en el paquete: `versionCode='6' versionName='1.4'`, `string/widget_abre` en `resources.arsc` y `updatePeriodMillis=0x1b7740` (1800000) con `targetCellWidth=0x2`/`targetCellHeight=0x1` en la ficha compilada. **Detalle de la tabla de recursos:** `xml/widget_racha` tiene dos variantas — `default` (`res/Ot.xml`, sin `targetCell`/`previewLayout`) y `v22` (`res/D9.xml`, la nuestra) —; el móvil se queda con **`v22`** (Android ≥ 5.1), que es la que manda el `targetCell`: por eso salió 3×2 con la 1.2. Pruebas 455 y build en verde.)*
- [x] Prueba manual en dispositivo: añadir widget → jugar → se actualiza · borrar progreso → `—`/«Juega hoy» · tema oscuro · tocar → abre la app · **sin conexión** (lee `SharedPreferences`, no necesita red) · **sin datos → «Abre la app»** · **jugado hoy → cifra; ayer o antes → «Juega hoy» aunque no se abra la app (refresco de 30 min)**. ✅ *(2026-10-08: instalado `Downloads/RepasoHistoria-1.4.apk` como actualización, sin desinstalar, y probado por el alumno — «APK instalada y probada». **Cierra INC-04**: el widget sí aparece en el selector.)*

**Riesgos**

| Riesgo | Mitigación |
|---|---|
| **`bubblewrap update` regenera `app/`** y podría borrar el widget (hoy la regla es «no editar los generados a mano») | Fuentes del widget en `android/widget/` (fuera de `app/`) + `scripts/aplicar-widget.mjs` para reaplicar; y regla: `update` **solo** cuando cambie `twa-manifest.json` |
| Receiver `exported="true"`: cualquier app podría mandar una racha falsa | Validar extras (rango y formato) + acción/scheme propios; el impacto sería solo cosmético (número falso en el widget) |
| APK viejo + web nueva → diálogo «No se encontró ninguna aplicación» | Despliegue en dos pasos (APK primero) + sondeo con auto-desactivación |
| Widget desactualizado si el alumno no abre la app | Envío también al arrancar + `updatePeriodMillis=1800000` (el sistema repite `onUpdate` cada 30 min y el propio widget recalcula la regla contra la hora actual) + regla de racha rota en el propio widget |
| Firma y tienda | **Sin impacto**: mismo paquete y misma clave → `assetlinks.json` y huella **no cambian**; el widget no pide permisos |
| **Kotlin necesita un JDK de 64 bits** y el que descarga Bubblewrap era **x86** (crash *«Unknown hardware platform: x86»*) | Temurin **JDK 17 x64** en `~\.bubblewrap\jdk\` + `bubblewrap.cmd updateConfig --jdkPath …`; `bubblewrap.cmd doctor` en verde |

**Alternativas descartadas** (por si cambia el escenario):

- **`navigator.setAppBadge()`** (número sobre el icono del launcher): cero código nativo y ya hoy, pero **no es un widget** y depende del launcher. Sirve como versión mínima intermedia.
- **Widgets PWA** (miembro `widgets` del manifest): la solución limpia cuando Chrome/Android la soporte; entonces el puente sobra.

---

## 14. Pulido de interfaz (2026-10-08)

> Decisión del usuario: **todas las pantallas** y **todas las ideas** de la lista de abajo. Ejecución en la **Fase 9** (§5). Trabajo **manual**: primero se valoró una skill de diseño con API externa (Sleek) y el usuario la descartó — queda anotado por eso en `MEMORY.md` y `.gitignore`.

**Objetivo.** Un pulido, **no un rediseño**: misma identidad (crema `#f7f5f0` + granate `#8c2f2f`, «papel de archivo»), mismas reglas duras (variables CSS, cadenas centralizadas, AA, `reduced-motion`, las comprobaciones de `npm.cmd run prueba` en verde). **No toca** Fase 7 (§12) ni Fase 8 (§13).

### 14.1 Auditoría (hechos sobre el código, 2026-10-08)

**Clases muertas / incoherencias**

- `inicio.ts` usa `insignia--neutro` → **no existe** en `app.css` (solo apila el estilo base).
- `inicio.ts` usa `curso-nombre` → **sin regla CSS** (hereda de `.curso-resumen`).
- `summary` de curso con `list-style-position: inside` pero **sin `list-style: none`** → flecha del navegador por defecto (doble en Safari).
- Espaciado sin escala: conviven `var(--espacio)` y sueltos `0.35/0.5/0.6/0.75/0.9rem`.

**Acabado de interacción**

- **Sin estado `:active`** en `.boton`, `.tema`, `.opcion` ni la nav → en móvil no se «hunde» al tocar (solo hay `hover`).
- Transiciones: solo `.barra-relleno` las tiene.

**Sin iconos:** la nav es texto, el «→» de cada tema es un carácter literal (`.tema-ir`), el feedback distingue solo por color+borde, y los 5 estados vacíos comparten el mismo `.aviso` punteado.

**Tipografía:** una sola familia `system-ui`; los `clamp()` de los títulos están bien pero no hay personalidad.

**Ajustes:** 4 bloques planos, solo el primero es `fieldset` con `legend`, y «Borrar progreso» (destructiva) va en la misma lista que las preferencias.

**Lo que ya está bien y NO se toca:** contraste AA · `:focus-visible` global · `prefers-reduced-motion` y `prefers-contrast` globales · `aria-live` y gestión de foco del quiz · `<dialog>` propio (INC-02) · insignias nunca solo-color · `accent-color` · targets ≥44 px · `system-ui` sin fuentes externas (offline).

### 14.2 Las 6 ideas aprobadas (D.2)

| # | Idea | Dónde |
|---|---|---|
| 1 | **Tipografía con carácter** en títulos/`.nota` (cuerpo sigue con `system-ui`) | `base.css` + todas |
| 2 | **Iconos SVG inline propios** (sin dependencias): nav, «→», ✓/✗, avisos | `src/ui/iconos.ts` nuevo |
| 3 | **Microinteracciones**: feedback, barra, *press* de tarjetas (bajo `reduced-motion`) | `app.css` |
| 4 | **Estados vacíos diseñados** (0 cursos, 0 temas, progreso vacío, sin conexión, mínimo no alcanzado) | `T7` |
| 5 | **Resultados como «ficha de examen»**: resumen arriba + revisión jerarquizada | `T4` |
| 6 | **Ajustes agrupados** (`Apariencia` · `Juego` · `Datos`) con la destructiva separada | `T6` |

### 14.3 Orden de ejecución (T0–T10)

Cada tarea = **commit + push** con `prueba` y `build` en verde; los selectores de `pruebas/pantallas.ts` se actualizan **en la misma tarea** si cambia el DOM.

- [x] **T0 · Limpieza:** `.agents/` + `skills-lock.json` → `.gitignore` (skill de Sleek descartada, localmente conservable).
- [x] **T1 · Base común** (`base.css`, `app.css`, `src/ui/iconos.ts` nuevo): escala tipográfica por variables · iconos SVG inline (`aria-hidden` en los decorativos, cuidado con `label-content-name-mismatch`) · estados `:active` + transiciones cortas · escala de espaciado (`--espacio-s/m/l`) y fuera los sueltos · arreglar `insignia--neutro`, `curso-nombre` y el `summary`. ✅ *(2026-10-08. Detalle: `--texto-*` (9 tamaños, de `xs` al `clamp()` de la nota) y `--espacio-2xs…l` (0.25–1.5rem) ⇒ **cero** `font-size`/`rem` suelto salvo los micro-ajustes ópticos de píldoras (0.1/0.15rem, comentado en `base.css`). `--font-titulo` (serif de sistema) en `h1/h2/h3`, `.marca` y `.nota`; `.asignatura-titulo` se queda en `--font-cuerpo` por ser una etiqueta versalita. `iconos.ts` con el catálogo de la idea 2 (jugar, progreso, ajustes, flecha, check, cruz, aviso) y **la nav ya lo usa** (texto visible sigue mandando). `:active` en `.boton`/`.tema`/`.opcion`/`.curso-resumen`/nav + transiciones de 0.12s; el «hundirse» (`translateY(1px)`) va dentro de `@media (prefers-reduced-motion: no-preference)`. `insignia--neutro` ahora existe (borde discontinuo), `curso-nombre` se elimina (no tenía regla) y el `summary` pasa a `list-style: none` + chevron propio que gira con `[open]`. Selectores de `pruebas/pantallas.ts` actualizados y +13 comprobaciones → **363**.)*
- [x] **T2 · Inicio:** jerarquía de la tarjeta de curso, chip de contador accesible, fila de tema con icono en vez de «→», densidad de `lista-temas`. ✅ *(2026-10-08. Detalle: el contador **sale del `h2`** (el encabezado se queda solo con «2º ESO») y pasa a ser chip hermano del `summary` con texto visible **«N temas»** sin `aria-hidden` → nombre accesible del curso = título + chip. El `h2` gana `--texto-m` y, con el curso abierto, se enciende en granate; el chip de fondo `--bg` destaca sobre la tarjeta. Las dos filas (tema y «Todos los temas») sustituyen el `«→»` literal por `icono('flecha', 'tema-ir')` (1.5em, `currentColor`, `aria-hidden` de serie), con un `translateX(2px)` al pasar/pulsar bajo `reduced-motion`; las filas **bloqueadas** siguen explicando el mínimo y **no** prometen flecha. Densidad: `gap` de `lista-temas` 0.5 → `--espacio-xs`, `padding` de `.tema` 0.75 → `--espacio-s`/`--espacio-m` y `padding-bottom` de la lista a `--espacio-s` (objetivos ≥44px intactos por `min-height`). +5 comprobaciones → **368**.)*
- [x] **T3 · Cuestionario:** feedback con ✓/✗ + entrada animada, barra más expresiva, opciones con marca gráfica (además de la letra y del color). ✅ *(2026-10-08. Detalle: **marca de opción = letra** A/B/C… (serif, fijo en 1.4em para que el texto no salte) que, al responder, **se sustituye por el icono** `icono('check')`/`icono('cruz')` en la correcta/elegida; la letra va **sin `aria-hidden`** (antes de responder el nombre sale del contenido) y como tras responder el icono no tiene texto, el `aria-label` de estado sigue conteniendo todo lo visible → sin `label-content-name-mismatch`. `feedback-titulo` gana el icono ✓/✗ y `display: flex`; el bloque **entra con un fundido** (`@keyframes feedback-entra`, 0.22 s) aplicado al cambiar a `feedback--ok/mal`, fuera de `reduced-motion` y sin retrasar el `aria-live`. Barra «hoja de examen»: 12 px, carril con **muescas** (`repeating-linear-gradient`), relleno con **brillo** (`linear-gradient` blanco sobre `--accent`) y avance con **rebote** (`cubic-bezier(0.34,1.4,0.64,1)`). +4 comprobaciones → **372**.)*
- [x] **T4 · Resultados:** «ficha de examen» — resumen (nota + aciertos + veredicto + mejor nota) y falladas mejor jerarquizadas. ✅ *(2026-10-08. Detalle: `TemaDelResultado` gana **`claveTema`** (la misma que usó `finalizar` al guardar) → la ficha puede mostrar **`Mejor nota: N`** sin duplicar la lógica de claves. Estructura nueva `.nota-cabecera` = **nota grande | `.nota-datos`** (aciertos, veredicto, mejor nota en `text-align: left`), con `flex-wrap` para apilarse en móvil; la insignia «nueva mejor» sigue debajo. Revisión: título **«Preguntas falladas» + insignia con el contador**, y cada `li` lleva iconos — **✗** en «Tu respuesta», **✓** en «Respuesta correcta» (ahora en negrita) y **aviso** en «Sin responder» (`.linea--tenue`); la explicación pasa a **caja apagada** (fondo `--bg`, texto `--texto-s` `--texto-tenue`, borde izquierdo) para que no compita con las respuestas. El «sin falladas» de nota 100 lleva su ✓. +4 comprobaciones → **376**.)*
- [x] **T5 · Progreso:** tarjetas de racha/contador con icono, tabla legible en móvil. ✅ *(2026-10-08. Detalle: catálogo ampliado con **`rayo`** (racha) y **`lista`** (cuestionarios); el icono va junto a la **cifra** (`.tarjeta-valor` pasa a `flex`, icono de `0.8em` a `0.85` de opacidad ⇒ decorativo, sin texto) — `textContent` de la cifra sigue siendo exacto. **Tabla móvil:** bajo `34rem` cada fila se **apila** (tema como titular, resto en línea con su rótulo de `data-encabezado` «CURSO …») y la cabecera se oculta con `clip-path` **para el ojo pero no del árbol de accesibilidad** — por eso la tabla lleva ahora `role="table"/"rowgroup"/"row"/"rowheader"/"cell"/"columnheader"` explícitos (el `display: block` borra la semántica implícita) y cada `td` su `data-encabezado`. +5 comprobaciones → **381**.)*
- [x] **T6 · Ajustes:** tres grupos `fieldset/legend` (**Apariencia · Juego · Datos**) y «Borrar progreso» como zona de peligro aparte. ✅ *(2026-10-08. Detalle: la pantalla pasa de un `fieldset` suelto + tres `div` a **tres `fieldset.grupo`** con `legend` en serif `--font-titulo` (extensión de la regla T1 de títulos) y `--accent`, apoyados sobre el borde con el mismo fondo de la tarjeta. Dentro de un grupo los `.ajuste` **dejan de ser tarjeta** (sin borde/fondo) y se separan con `border-top: 1px dashed`; el subgrupo de radios ya no es otro `fieldset` sino **`div role="group" aria-labelledby="titulo-tema"`** con su `<p class="ajuste-titulo">Modo de color</p>`. «Datos» envuelve el botón en **`.ajuste--peligro`**: borde discontinuo `--error`, rótulo «Zona de peligro» y fondo `--bg` (a propósito **no** `--error-fondo`, para que el hover del botón —que usa ese color— siga notándose). Cadenas nuevas solo en `cadenas.ts`: `apariencia/juego/datos/peligro`. +4 comprobaciones → **385**.)*
- [x] **T7 · Estados vacíos:** componente propio con icono; copy **nuevo solo en `src/ui/cadenas.ts`**. ✅ *(2026-10-08. Detalle: nuevo **`src/ui/estados.ts`** → `estadoVacio(icono, texto, { positivo?, clase? })`, que SIEMPRE devuelve el mismo `p.estado-vacio` (icono `aria-hidden` + texto) y sustituye a los 5 `p.aviso` sueltos (**clase `.aviso` eliminada**; `.aviso-estado`, la región viva de Ajustes, es otra cosa y se queda). Iconos: `libro` (nuevo) para 0 cursos/0 temas, `jugar` para progreso vacío, `aviso` para sin almacenamiento y sin conexión, `check` + `--positivo` para nota 100. **Estado «sin conexión» nuevo** (no existía): `pintaAvisoConexion()` en el shell, dentro de la cabecera, con `role="status"`, `id="aviso-conexion"`, clase `--conexion` y listeners `online`/`offline`; se lee **`window.navigator.onLine`** (el `navigator` global en jsdom no tiene `onLine`). Como no cabe en el recuadro del tema, el icono va **en línea** en `.tema-no-disponible`. Única cadena nueva: `T.comunes.sinConexion`. +13 comprobaciones → **398**.)*
- [x] **T8 · Validación:** `npm.cmd run prueba` (**434** comprobaciones) + `build` + `comprobar-offline` · AA (incluido oscuro), teclado, lector de pantalla y móvil. ✅ *(2026-10-08. Detalle: **`comprobar-offline` contra producción** en verde (SW `repaso-historia-v2`, app servida desde caché y con el aviso «sin conexión» activado de paso). Dos chequeos nuevos, en el repo y dentro de CI: **`scripts/comprobar-contraste.mjs`** (lee la paleta de `base.css`, no la duplica; **36 pares** reales en claro y en oscuro; además exige que los dos bloques oscuros —sistema y elegido a mano— sigan idénticos) y **`scripts/comprobar-movil.mjs`** (Chrome headless a **320 CSS px**, 1.4.10: las 5 pantallas sin scroll horizontal y con objetivos ≥24 px, 2.5.8). **Correcciones salidas de la revisión:** (1) *1.4.11* — el `--borde` decorativo (1.3:1) no vale en controles → token **`--borde-control`** (`#8a857c` / `#77737f`, ≥3:1 contra `--bg` y `--bg-secundario`) aplicado a `.boton`, `.tema`, `.opcion` y `.control-select`, dejando `--borde` para separadores y tarjetas; (2) *`prefers-contrast: more`* **no llegaba en oscuro** (los bloques oscuros tienen más especificidad que `:root`) → dos bloques nuevos con la misma combinación de medios; (3) *2.4.2* — `document.title` = «`<h1>` · Repaso de Historia» en cada pantalla; (4) *2.5.5* — los enlaces de la navegación medían ~42 px → `min-height: 44px`. **Teclado y lector de pantalla:** nueva sección «Accesibilidad estructural» en `pruebas/pantallas.ts` (+35 → **278**): landmarks (`header`/`nav[aria-label]`/`main`), **un `h1` por pantalla y sin saltos de nivel** en las 5, etiqueta en todo campo, nombre accesible en todo botón/enlace, iconos `aria-hidden`, sin `tabindex` positivo y `aria-current`; el resto ya estaba (elementos nativos + `:focus-visible` global, foco entre pantallas, `aria-live` y `<dialog>` con foco atrapado, `Esc` y retorno).)*
- [ ] **T8 · Capturas en `docs/capturas/`** (README **y** fichas de Play Store) y revisión en dispositivo físico: **pendientes** — sin cuenta de desarrollador de Google.
- [x] **T9 · Evolución del inicio (UX/UI incremental, sin rediseño):** fila global autodescriptiva, nota con escala a la vista, tarjeta «Continuar repasando», cabecera más ligera y **filas legibles a 320px**. ✅ *(2026-10-09. Detalle:*
  - *Fila global:* `T.inicio.todosDe` → **`repasoGlobal`** («Repaso global de {asignatura}», la misma clave en Inicio, título del cuestionario y fila de Progreso) + **`repasoGlobalDetalle`** visible («Incluye preguntas de todos los temas») + icono `lista` en el rótulo ⇒ **tres señales** y el borde discontinuo queda solo como refuerzo.
  - *Notas:* **`Mejor nota: N/100`** (escala de `resumir()`, 0–100) y pie de tabla «Mejor nota **sobre 100** conseguida en cada tema»; nuevo componente **`insigniaNota(nota, texto)`** (`inicio.ts`, usado también en `progreso.ts`) = color por bandas + **icono ✓ (≥6) / ⚠ (<60)**, para que la banda no se comunique solo con color; `T.resultados.contexto` sube a **`T.comunes.contexto`** (se comparte con la tarjeta nueva).
  - *Continuidad:* **`pintarContinuar(ctx)`** pinta la tarjeta solo si hay **`ctx.temaResultado`** (el mismo dato que usa Resultados) y su botón llama a **`acciones.repetir(false)`** ⇒ **cero persistencia nueva y cero lógica nueva**. Sin historial no se pinta: `Progreso` guarda notas/racha pero **no** el último tema, así que **no sobrevive a recargar** (preferible a inventar un «último cuestionario»).
  - *Cabecera:* `.marca` con `padding-top` 1rem → 0.75rem **+ `min-height: 44px`** (con el recorte solo, el enlace caía a **42px** de objetivo táctil — descubierto con `comprobar-movil` local) y `.navegacion` con menos aire ⇒ **161 → 152px** a 320px, sin reducir fuentes ni tocar `aria-current`/el píldora de «Jugar».
  - *Móvil estrecho (hallazgo nuevo):* medida con CDP → a 320px el título medía **94px y se partía en 3-4 líneas** (5 con nota; fila global de **279px**): la insignia `nowrap` compartía columna con el rótulo (defecto **previo**, que T9 empeoraba). Solución: **bajo `30rem` las filas pasan de `grid` a `flex-wrap`**, con la flecha arriba a la derecha vía **`order`** (sin mover nada del DOM) y `flex: 1 1 calc(100% - 3rem)` en `.tema-nombre` (si la base fuera 0, «10 preguntas» se colaba en la primera línea) ⇒ título a **192px** (1-2 líneas), filas de **75-99px** (antes 123) y meta+insignia juntas cuando caben.
  - *Validación:* **455 → 476 comprobaciones** (21 nuevas: descripción e icono de la fila global, escala `/100`, icono de banda, tarjeta con y sin historial, esquema de encabezados con la tarjeta y `estructura('inicio')` con ella), `build` ✅, `comprobar-contraste` ✅ (AA claro y oscuro), `comprobar-movil` **local** a 320px ✅ (0 desbordes, ≥44px en las 5 pantallas) y **7 capturas** (claro/oscuro/320px) revisadas a mano.)*
- [x] **T10 · «Continuar repasando» entre sesiones:** la tarjeta **ya sobrevive a recargar** la página o volver al día siguiente. ✅ *(2026-10-09 — cierra la limitación de T9. Detalle:*
  - *Dato:* `Progreso` gana **`ultimoTema`** (`UltimoTema` = `Seleccion` + clave + títulos ya resueltos), que es **el mismo tipo** que `TemaDelResultado` (`contexto.ts` pasa a ser un alias) ⇒ **una sola representación** del dato, sin posibilidad de desincronizarse entre Resultados, «Repetir» y la tarjeta. Se rellena en **`finalizar()`** en el mismo gesto que el resto del progreso.
  - *Sin migración:* el campo es nuevo dentro de la clave `repaso-historia:progreso:v1`; `leerProgreso` lo lee **defensivamente** (cualquier forma rara → `null`) y los progresos escritos antes del T10 se interpretan como «sin último».
  - *Guarda 1:* al arrancar, **`seleccionResuelve()`** reusa los **mismos primitivos que `iniciar`** (curso + tema/asignatura + mínimo de preguntas). Si no pasa, se **purga** `ultimoTema` del almacén y no se pinta: mejor sin tarjeta que un atajo que `iniciar` rechazaría y que dejaría al alumno sin explicación.
  - *Guarda 2:* `registrarCuestionario` **conserva** `ultimoTema` (construye el `Progreso` a mano: era justo donde el campo podía perderse sin ruido); hay prueba explícita.
  - *Consistencia:* empezar una partida **no** borra el «último terminado» (si el alumno la abandona, la tarjeta sigue apuntando al último que sí terminó) y **borrar el progreso se lleva la tarjeta** (enseñarla después prometería un repaso que ya no está guardado).
  - *Validación:* **476 → 507 comprobaciones** (+17 en persistencia: ida y vuelta de tema suelto y de fila global, conservación en `registrarCuestionario`, datos antiguos sin el campo y **8 formas inválidas**; +14 en pantallas: montar una app nueva sobre un almacén con datos = recarga, el atajo real, cambio de último cuestionario, purga, JSON corrupto y borrar progreso) · `build` ✅ · **CDP en navegador real: 8/8** (incluido jugar un cuestionario entero, recargar y ver la tarjeta con la fila «Repaso global»).)*

### 14.4 Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper los tests de pantallas al cambiar el DOM | Selector nuevo + test en **la misma** tarea; `prueba` en verde antes de pushear |
| Iconos inline alterando nombres accesibles | `aria-hidden` en decorativos; el texto visible manda (patrón ya usado en `inicio.ts`) |
| Regresión del modo oscuro | Todo color nuevo **por variables**, con su pareja oscura en `base.css`; revisar a mano en cada tarea |
| Animación incómoda | Todo bajo el `prefers-reduced-motion` global de `base.css` |
| Alcance desbordado | Fases 7 y 8 intactas; una pantalla por tarea y un push por tarea |
