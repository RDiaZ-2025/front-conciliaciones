# Reglas de Proyecto - VOC Front Conciliaciones

## Reglas de Versionamiento Semántico (SemVer)

Este repositorio sigue el estándar **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH` (por ejemplo: `1.7.4`).

### Protocolo Obligatorio de Decisión Autónoma de la IA:
La IA tiene la responsabilidad y autonomía de **evaluar y actualizar directamente la versión** en cada tarea o intervención que realice en el código (sin requerir ni esperar comandos de `git commit` o `git push`):

1. **Ante un Cambio Menor:**
   - La IA debe incrementar el **último dígito (`PATCH`)**:
     * Ejemplo: `1.7.3` $\rightarrow$ `1.7.4`.
   - Aplica para: corrección de errores (bug fixes), ajustes visuales/UI, textos, limpiezas de código, micro-ajustes y modificaciones secundarias.

2. **Ante un Cambio Mayor:**
   - La IA debe incrementar el **segundo dígito (`MINOR`)** y reiniciar el `PATCH` a 0:
     * Ejemplo: `1.7.4` $\rightarrow$ `1.8.0`.
   - Aplica para: desarrollo de nuevas funcionalidades completas, pantallas o módulos nuevos, cambios sustanciales en la lógica de negocio o requerimientos de gran alcance.

3. **Ante una Reingeniería Completa:**
   - La IA debe incrementar el **primer dígito (`MAJOR`)** y reiniciar `MINOR` y `PATCH` a 0:
     * Ejemplo: `1.8.0` $\rightarrow$ `2.0.0`.
   - Aplica para: reestructuración arquitectónica radical, migración total de frameworks/bases de datos o rediseño estructural de todo el sistema.

4. **Registro Obligatorio de la Fecha de Versión:**
   - **En cada actualización de versión, debe quedar registrada la fecha en que se subió o actualizó dicha versión** en formato `YYYY-MM-DD` (ejemplo: `2026-09-19`).
   - La fecha debe reflejarse en las variables y fallbacks de salud del sistema (`APP_VERSION_DATE` / `versionDate`) y en las vistas de telemetría/salud.

5. **Consulta ante Incertidumbre:**
   - Si la IA no está 100% segura de si el alcance de una tarea corresponde a un cambio menor (PATCH) o mayor (MINOR), debe consultar explícitamente al usuario antes de modificarla para confirmar la posición a incrementar.

### Archivos a Sincronizar en cada cambio de versión:
- `backend/src/app.ts` (`const APP_VERSION = 'X.Y.Z'`, `const APP_VERSION_DATE = 'YYYY-MM-DD'`)
- `frontend/voc/src/app/services/system-health.service.ts` (`version: 'X.Y.Z'`, `versionDate: 'YYYY-MM-DD'`)
- `frontend/voc/src/app/components/layout/layout.component.html` (badge de versión)
- `frontend/voc/src/app/components/system-health-modal/system-health-modal.component.html` (versión y fecha de versión)
- `frontend/voc/src/app/pages/system-health/system-health.component.html` (versión y fecha de versión)
- `package.json` raíz (`"version": "X.Y.Z"`)
- `backend/package.json` (`"version": "X.Y.Z"`)
- `frontend/package.json` (`"version": "X.Y.Z"`)

---

## Directivas de Buenas Prácticas y SOLID
- Seguir principios SOLID y mantener código modular, testeable y mantenible.
- Mantener la lógica de negocio en el backend/servicios y la presentación limpia en el frontend.
- No ejecutar `git add`, `git commit` ni `git push` sin autorización explícita del usuario.
