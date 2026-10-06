# MEMORY.md — Memoria del proyecto

Registro de **cambios relevantes**, **problemas encontrados y sus soluciones** y **estado de las fases**.

> Este archivo se actualiza con cada cambio relevante. Las entradas son **aditivas**: lo más reciente al final de cada sección. **Nunca borrar ni reescribir entradas anteriores.**

---

## 📍 Estado actual de las fases

| Fase | Descripción | Estado |
|---|---|---|
| — | Documentación inicial (`PLAN.md`, `AGENTS.md`, `MEMORY.md`) | ✅ Completada |
| 1 | Cimiento (repo `main`, scaffold Vite+TS, validador, lógica, ~40 preguntas, tests) | ⏳ Pendiente |
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

---

## 🐛 Incidencias y soluciones

*(Sin incidencias todavía — este bloque es para problemas concretos: qué falló, causa y cómo se resolvió.)*
