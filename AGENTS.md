# Reglas de Proyecto - VOC Front Conciliaciones

## Reglas de Versionamiento Semántico (SemVer)

Este repositorio sigue el estándar **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH` (por ejemplo: `1.7.3`).

### Protocolo de Actualización de Versión:
1. **Por cada Commit (`git commit`):**
   - La IA debe incrementar el **tercer número (`PATCH`)**:
     * Ejemplo: `1.7.3` $\rightarrow$ `1.7.4`.
2. **Por cada Push (`git push`):**
   - Al realizar o solicitar un `git push` hacia el repositorio remoto, la IA debe incrementar el **segundo número (`MINOR`)** y reiniciar el `PATCH` a 0:
     * Ejemplo: `1.7.4` $\rightarrow$ `1.8.0`.
3. **Por Reestructuración Mayor:**
   - Únicamente ante reestructuraciones muy grandes o cambios radicales de arquitectura, se debe incrementar el **primer número (`MAJOR`)** y reiniciar `MINOR` y `PATCH` a 0:
     * Ejemplo: `1.8.0` $\rightarrow$ `2.0.0`.
4. **Consulta Obligatoria ante Incertidumbre:**
   - La IA tiene autorización para realizar el incremento de versión.
   - Si la IA no está 100% segura de qué número de la versión corresponde cambiar en una situación determinada, **debe preguntar explícitamente al usuario** antes de proceder para confirmar cuál posición debe actualizarse.

### Archivos a Sincronizar en cada cambio de versión:
- `backend/src/app.ts` (`const APP_VERSION = 'X.Y.Z'`)
- `frontend/voc/src/app/services/system-health.service.ts` (`version: 'X.Y.Z'`)
- `frontend/voc/src/app/components/layout/layout.component.html` (badge de versión)
- `package.json` raíz (`"version": "X.Y.Z"`)
- `backend/package.json` (`"version": "X.Y.Z"`)
- `frontend/package.json` (`"version": "X.Y.Z"`)

---

## Directivas de Buenas Prácticas y SOLID
- Seguir principios SOLID y mantener código modular, testeable y mantenible.
- Mantener la lógica de negocio en el backend/servicios y la presentación limpia en el frontend.
- No ejecutar `git add`, `git commit` ni `git push` sin autorización explícita del usuario.
