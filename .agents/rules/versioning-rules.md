---
trigger: always_on
---

# Reglas de Versionamiento Semántico (SemVer)

Esta regla define el protocolo estricto y obligatorio de incremento y control de versiones del proyecto para la IA y cualquier agente que opere en este repositorio.

## Formato de Versión
El proyecto sigue el estándar **Semantic Versioning (SemVer)** con tres niveles:
`MAJOR.MINOR.PATCH` (por ejemplo: `1.7.4`)

* **MAJOR (Primer número - X.0.0):** Reingenierías completas, reestructuraciones estructurales profundas o incompatibilidades arquitectónicas masivas.
* **MINOR (Segundo número - 1.Y.0):** Cambios mayores, nuevas funcionalidades completas, adición de módulos o flujos de trabajo relevantes. Reinicia `PATCH` a 0.
* **PATCH (Tercer número / Último dígito - 1.7.Z):** Cambios menores, correcciones de errores (bug fixes), ajustes visuales, refinamientos y modificaciones puntuales.

---

## Protocolo Obligatorio de Decisión Autónoma de la IA

La IA tiene la responsabilidad y autonomía de **evaluar y actualizar directamente la versión** en cada tarea o intervención que realice en el código (sin requerir ni esperar comandos de `git commit` o `git push`):

1. **Ante un Cambio Menor:**
   * La IA debe incrementar el **último dígito (`PATCH`)**.
   * Aplica para: corrección de errores (bug fixes), ajustes visuales/UI, textos, limpiezas de código, micro-ajustes y modificaciones secundarias.
   * Ejemplo: `1.7.3` $\rightarrow$ `1.7.4`.

2. **Ante un Cambio Mayor:**
   * La IA debe incrementar el **segundo dígito (`MINOR`)** y reiniciar el `PATCH` en 0.
   * Aplica para: desarrollo de nuevas funcionalidades completas, pantallas o módulos nuevos, cambios sustanciales en la lógica de negocio o requerimientos de gran alcance.
   * Ejemplo: `1.7.4` $\rightarrow$ `1.8.0`.

3. **Ante una Reingeniería Completa:**
   * La IA debe incrementar el **primer dígito (`MAJOR`)** y reiniciar `MINOR` y `PATCH` en 0.
   * Aplica para: reestructuración arquitectónica radical, migración total de frameworks/bases de datos o rediseño estructural de todo el sistema.
   * Ejemplo: `1.8.0` $\rightarrow$ `2.0.0`.

4. **Registro Obligatorio de la Fecha de Versión:**
   * **En cada actualización de versión, debe quedar registrada la fecha en que se subió o actualizó dicha versión** en formato `YYYY-MM-DD` (ejemplo: `2026-09-19`).
   * La fecha debe reflejarse en las variables y fallbacks de salud del sistema (`APP_VERSION_DATE` / `versionDate`) y en las vistas de telemetría/salud.

5. **Consulta ante Incertidumbre:**
   * Si la IA no está 100% segura de si el alcance de una tarea corresponde a un cambio menor (PATCH) o mayor (MINOR), debe consultar explícitamente al usuario antes de modificarla para confirmar la posición a incrementar.

---

## Archivos a Sincronizar en cada cambio de versión
Al actualizar la versión, la IA debe sincronizar simultáneamente:
1. `backend/src/app.ts`:
   - `const APP_VERSION = 'X.Y.Z';`
   - `const APP_VERSION_DATE = 'YYYY-MM-DD';` (incluido en el payload de `/health`).
2. `frontend/voc/src/app/services/system-health.service.ts`:
   - `version: 'X.Y.Z'` y `versionDate: 'YYYY-MM-DD'` en el objeto de fallback.
3. `frontend/voc/src/app/components/layout/layout.component.html`:
   - Badge de versión (`vX.Y.Z`).
4. `frontend/voc/src/app/components/system-health-modal/system-health-modal.component.html`:
   - Versión y fecha de versión (`vX.Y.Z (YYYY-MM-DD)`).
5. `frontend/voc/src/app/pages/system-health/system-health.component.html`:
   - Versión y fecha de versión (`vX.Y.Z (YYYY-MM-DD)`).
6. `package.json` (raíz): `"version": "X.Y.Z"`.
7. `backend/package.json`: `"version": "X.Y.Z"`.
8. `frontend/package.json`: `"version": "X.Y.Z"`.
