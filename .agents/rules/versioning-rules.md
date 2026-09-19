---
trigger: always_on
---

# Reglas de Versionamiento Semántico (SemVer)

Esta regla define el protocolo estricto y obligatorio de incremento y control de versiones del proyecto para la IA y cualquier agente que opere en este repositorio.

## Formato de Versión
El proyecto sigue el estándar **Semantic Versioning (SemVer)** con tres niveles:
`MAJOR.MINOR.PATCH` (por ejemplo: `1.7.3`)

* **MAJOR (Primer número - X.0.0):** Reestructuraciones muy grandes, cambios estructurales profundos o incompatibilidades arquitectónicas.
* **MINOR (Segundo número - 1.Y.0):** Nuevas funcionalidades completas, releases o preparaciones previas a enviar cambios al remoto (`git push`).
* **PATCH (Tercer número - 1.7.Z):** Correcciones de errores (bug fixes), ajustes visuales, modificaciones puntuales y cada commit individual.

---

## Protocolo Obligatorio de Incremento

1. **Por cada Commit (`git commit`):**
   * Cada vez que se prepare o solicite un commit, la IA debe incrementar el **último número (`PATCH`)**.
   * Ejemplo: `1.7.3` $\rightarrow$ `1.7.4`.

2. **Por cada Push (`git push`):**
   * Cuando se vaya a realizar o solicitar un `git push` hacia el repositorio remoto, la IA debe incrementar el **segundo número (`MINOR`)** y reiniciar el `PATCH` en 0.
   * Ejemplo: `1.7.4` $\rightarrow$ `1.8.0`.

3. **Por Reestructuración Mayor:**
   * Solamente cuando se realice una reestructuración muy grande o breaking change arquitectónico, se debe incrementar el **primer número (`MAJOR`)** y reiniciar `MINOR` y `PATCH` en 0.
   * Ejemplo: `1.8.0` $\rightarrow$ `2.0.0`.

4. **Autonomía y Pregunta Obligatoria ante Dudas:**
   * La IA tiene la facultad de actualizar automáticamente la versión en el código y configuración del proyecto.
   * **REGLA DE CONSULTA:** Si en algún escenario la IA no está completamente segura de qué posición de la versión corresponde cambiar (por ejemplo, si el alcance de una tarea amerita considerarse PATCH, MINOR o MAJOR), **la IA debe preguntar explícitamente al usuario** antes de modificarla para confirmar qué posición debe actualizar.

---

## Archivos que deben mantenerse sincronizados con la versión
Al actualizar la versión, la IA debe reflejar el cambio en:
1. `backend/src/app.ts` (`const APP_VERSION = 'X.Y.Z';` para la ruta `/health`).
2. `frontend/voc/src/app/services/system-health.service.ts` (campo `version: 'X.Y.Z'` en el fallback del health).
3. `frontend/voc/src/app/components/layout/layout.component.html` (badge de versión en el botón de estado del sistema).
4. `package.json` (raíz): `"version": "X.Y.Z"`.
5. `backend/package.json`: `"version": "X.Y.Z"`.
6. `frontend/package.json`: `"version": "X.Y.Z"`.
