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
   - La fecha debe reflejarse en la variable `APP_VERSION_DATE` en `backend/src/app.ts` (expuesta a través del endpoint `/health` y consumida dinámicamente en el frontend).

5. **Consulta ante Incertidumbre:**
   - Si la IA no está 100% segura de si el alcance de una tarea corresponde a un cambio menor (PATCH) o mayor (MINOR), debe consultar explícitamente al usuario antes de modificarla para confirmar la posición a incrementar.

### Archivos a Sincronizar en cada cambio de versión:
Al actualizar la versión, la modificación se realiza en **un único lugar en el código**, más los archivos de configuración `.json`:
1. **En Código Fuente (Única Fuente de Verdad):**
   - `backend/src/app.ts` (`const APP_VERSION = 'X.Y.Z'`, `const APP_VERSION_DATE = 'YYYY-MM-DD'`)
   *(Nota: El frontend consume la versión y fecha dinámicamente a través de `SystemHealthService` desde `/health`. NO deben existir versiones hardcodeadas ni fallbacks en archivos `.ts` o `.html` del frontend).*
2. **En Archivos de Configuración de Paquetes (`.json`):**
   - `package.json` raíz (`"version": "X.Y.Z"`)
   - `backend/package.json` (`"version": "X.Y.Z"`)
   - `frontend/package.json` (`"version": "X.Y.Z"`)

---

## Directivas de Buenas Prácticas y SOLID
- Seguir principios SOLID y mantener código modular, testeable y mantenible.
- Mantener la lógica de negocio en el backend/servicios y la presentación limpia en el frontend.
- No ejecutar `git add`, `git commit` ni `git push` sin autorización explícita del usuario.
