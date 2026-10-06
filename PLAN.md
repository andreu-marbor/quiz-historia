# PLAN.md — quiz-historia

Plan de implementación de la aplicación de repaso de Historia para ESO y Bachiller.

> **Estado:** plan aprobado y decisiones cerradas (§9), pendiente de ejecución por fases.
> **Última actualización:** 2026-10-06

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
      "id": "eso2",
      "titulo": "2º ESO",
      "orden": 2,
      "temas": [
        {
          "id": "revolucion-industrial",
          "titulo": "La Revolución Industrial",
          "orden": 3,
          "minPreguntas": 10
        }
      ]
    }
  ]
}
```

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

---

## 4. Pantallas de la app

1. **Inicio** → elegir curso (1º–4º ESO, 1º–2º Bachiller) → elegir tema (con badge de mejor nota).
2. **Cuestionario** → pregunta, respuesta, *feedback* inmediato + explicación, barra de progreso, botón "siguiente".
3. **Resultados** → nota, aciertos/errores, lista de falladas con su explicación, botón "repetir falladas".
4. **Progreso** → récords por tema y racha, guardados en `localStorage` (borrables desde Ajustes).
5. **Ajustes** → modo oscuro, nº de preguntas por cuestionario, barajar opciones, borrar progreso.

### Criterios de UI

- Estilos solo con **variables CSS** (colores y espaciados).
- Responsive (móvil primero: los alumnos lo usarán desde el teléfono).
- Accesible: contraste AA, foco visible, navegación por teclado, ARIA en los componentes de quiz.
- Modo oscuro respetando `prefers-color-scheme`, con override manual.
- Sin fuentes externas en tiempo de ejecución (offline).

---

## 5. Fases de implementación

### Fase 1 — Cimiento (repo, datos, lógica)

- [ ] `git init -b main` en `quiz-historia/` + `.gitignore` + commit inicial.
- [ ] Scaffold Vite + TypeScript (`npm.cmd create vite` manual o a mano, sin extras).
- [ ] `package.json` con scripts: `dev`, `build` (`tsc --noEmit && vite build`), `prueba`, `prueba:logica`, `prueba:datos`.
- [ ] `datos/temas.json` con 3–4 cursos/temas de ejemplo.
- [ ] `scripts/validar-preguntas.mjs` con todas las reglas de §3.
- [ ] ~40 preguntas de muestra repartidas en 3–4 temas.
- [ ] `src/logica/`: corrección, barajado, selección de preguntas.
- [ ] `pruebas/logica.ts` + `pruebas/datos.ts` (bundled con esbuild, patrón de `tres-en-raya`).

**Resultado: `npm.cmd run prueba` y `npm.cmd run build` en verde.**

### Fase 2 — Interfaz completa

- [ ] Las 5 pantallas de §4 con enrutado ligero (hash o vista única con estados).
- [ ] `src/persistencia.ts` (mejor nota por tema, racha, ajustes).
- [ ] Modo oscuro, responsive, accesibilidad.
- [ ] Tests de la lógica de selección de preguntas (sin repetir, respetar `minPreguntas`).

### Fase 3 — PWA

- [ ] `manifest.webmanifest`: `name`: **"Repaso de Historia"**, `short_name`: "Repaso Historia", `start_url`, `display: standalone`, theme colors.
- [ ] `scripts/generar-iconos.mjs` con `sharp` (misma estética que `tres-en-raya`).
- [ ] Service worker *cache-first* para uso sin conexión en el aula.
- [ ] Auditoría Lighthouse: PWA instalable + offline ≥ 90.

### Fase 4 — Despliegue web

- [ ] `vite.config.ts` con `base: '/quiz-historia/'`.
- [ ] `.github/workflows/despliegue.yml`: `prueba` → `build` → Pages en push a `main` (y check en PRs).
- [ ] Activar GitHub Pages con fuente "GitHub Actions".
- [ ] Enlace añadido a `andreu-marbor.github.io` (portfolio).
- [ ] README con capturas y enlace en vivo.

### Fase 5 — Android (TWA)

- [ ] `twa-manifest.json` + `bubblewrap.cmd init` / `bubblewrap.cmd build` (**usar `bubblewrap.cmd`**: la política de PowerShell bloquea los `.ps1`).
  - `packageId`: **`com.andreumarbor.quizophistoria`**
  - `name` / `launcherName`: **"Repaso de Historia"**
  - `host`: `andreu-marbor.github.io` · `startUrl` / `fullScopeUrl`: `/quiz-historia/`
- [ ] **Keystore nuevo propio** (decisión §9.1):
  - Generar con `keytool` (JDK): `quiz-historia/android.keystore`, alias `android`, RSA-2048, validez larga, DN `CN=andreu-marbor, OU=Portfolio, O=GitHub, C=ES` (coherente con el del otro proyecto).
  - **Contraseña**: aleatoria de 36 hex, guardada en `%USERPROFILE%\.bubblewrap\keystore-pass-quizhistoria.txt` (fuera del repo y de OneDrive; **nombre distinto** al de `tres-en-raya` para no colisionar). Nunca en ficheros versionados (lección aprendida en `tres-en-raya/MEMORY.md`, incidencia 2026-10-05).
  - **`.keystore` en `.gitignore`** desde el primer commit; nunca se versiona.
  - Build con `BUBBLEWRAP_KEYSTORE_PASSWORD` / `BUBBLEWRAP_KEY_PASSWORD` en el entorno (evita prompts en `build.js`).
  - Extraer huella SHA-256 con `keytool -list -v` y verificarla en el APK final con `apksigner verify --print-certs`.
  - Antes de cada push: `git grep -niIF -e 'password' -e 'passwd' -e 'secret' -e 'token'` como red de seguridad.
  - **Respaldo**: copia del keystore generado en el otro PC (misma convención que el de `tres-en-raya`), antes de subir nada a Play Console.
- [ ] Añadir una **segunda sentencia** en `andreu-marbor.github.io/.well-known/assetlinks.json` para `com.andreumarbor.quizophistoria` con la huella nueva (el fichero admite varias). Si falta, la app Android muestra la barra de URL en vez de abrirse a pantalla completa. Recordar: `.nojekyll` debe mantenerse para que Pages sirva `.well-known`.
- [ ] Probar en dispositivo real: instalación, pantalla completa, offline.
- [ ] **Distribución en dos vías** (decisión §9.2):
  1. **Tramo cerrado de Play Console** con el colegio como verificadores → requisito de Google: **12 verificadores × 14 días continuos** por package nuevo (cuentas personales creadas tras el 13/11/2023) → solicitud de acceso a Producción.
  2. **Mientras tanto, APK firmado directo al colegio** (`bubblewrap.cmd build` → `app-release-bundle`/APK) para no esperar a los 14 días.
- [ ] Fichas de Play Store: nombre "Repaso de Historia", icono, capturas, descripción en español, categoría Educación, *privacy policy* (estática: sin datos personales ni recolección).

### Fase 6 — Contenido real y documentación

- [ ] Cargar preguntas del temario real: 1º–4º ESO y 1º–2º Bachiller, por unidad.
- [ ] Revisión pedagógica (que un profesor valide enunciados y explicaciones).
- [ ] `AGENTS.md` del proyecto: flujo "editar JSON → validador → push → despliegue", convenciones, ubicación del keystore.
- [ ] `MEMORY.md` con el registro de cambios (solo aditivo, como en `tres-en-raya`).

---

## 6. Scripts npm

| Script | Qué hace |
|---|---|
| `npm.cmd run dev` | Servidor de desarrollo Vite |
| `npm.cmd run build` | `tsc --noEmit && vite build` |
| `npm.cmd run prueba` | Ejecuta todos los tests (lógica + datos) |
| `npm.cmd run prueba:logica` | Tests de corrección/barajado/selección |
| `npm.cmd run prueba:datos` | Validador de `datos/` (§3) |
| `npm.cmd run iconos` | Genera iconos PWA con `sharp` |

> **Importante:** en PowerShell usar siempre `npm.cmd` / `npx.cmd` / `bubblewrap.cmd` (los shims `.ps1` están bloqueados por la política de ejecución).

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Bundle gigante si entran cientos de preguntas | Preguntas en JSON importado (texto, ligero); imágenes en `public/` con carga diferida. Si explota, pasar a import dinámico por tema |
| Play Store rechaza el TWA | Requisitos: HTTPS + manifest + `start_url` + Digital Asset Links correctos. Validar en tramo cerrado antes de nada público |
| Rama `master`/`main` desalineada (problema de los otros 4 repos) | Repo nuevo nacido en `main`, con upstream configurado desde el primer push (`git push -u origin main`) |
| Keystore perdido ⇒ imposible actualizar la app | Documentar en `AGENTS.md` dónde vive y cómo regenerar `assetlinks.json` |
| Preguntas mal formadas rompiendo la app | Validador en tests **y** en CI: sin verde, no hay despliegue |
| PowerShell bloquea los `.ps1` | Usar `npm.cmd`, `npx.cmd`, `bubblewrap.cmd` en todos los comandos |
| Sin backend ⇒ un profesor no técnico no puede editar | El JSON es simple y el validador da errores claros; si hace falta más, fase futura: editor web embebido (`/admin`) que exporta JSON |

---

## 8. Criterios de "hecho"

- [ ] Web en Pages funcionando offline y apta en Lighthouse (PWA instalable).
- [ ] App Android instalada en un dispositivo real, a pantalla completa, sin barra de URL.
- [ ] Añadir una pregunta lleva < 2 minutos sin tocar código de la app.
- [ ] `npm.cmd run prueba` cubre: lógica de corrección, validación de datos e integridad del catálogo.
- [ ] CI en verde en cada push a `main` y despliegue automático.
- [ ] README con enlace en vivo, capturas y flujo de edición de preguntas.

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
