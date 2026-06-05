# Arquitectura del Sistema
El proyecto Red+ es un sistema integral de gestión de análisis de datos y contenido estructurado en un backend de Python (FastAPI), un frontend en Angular, y procesos de ETL asíncronos que interactúan con una base de datos central en Azure SQL.

## Componentes Principales

1. **Frontend (Angular)**
   - Directorio: `/frontend`
   - Interfaz de usuario para la visualización del Dashboard, control de presupuesto, ingresos y mensajería.
   - Construido con componentes modulares y se comunica con el backend mediante peticiones REST (HTTP).

2. **Backend (FastAPI)**
   - Directorio: `/backend`
   - Expone la API RESTful.
   - Cuenta con un sistema de rutas modulares (auth, dashboard, mensajería, ingresos, presupuesto).
   - Usa `SQLAlchemy` como ORM para la interacción con la base de datos.
   - `JWT` para la autenticación y control de permisos granulares a los módulos.

3. **Base de Datos (Azure SQL)**
   - Repositorio central de información.
   - Las conexiones se realizan mediante `pymssql` y `SQLAlchemy`.

4. **Pipelines ETL**
   - Directorio: `/functions`
   - Scripts modulares diseñados para extraer, transformar y cargar (ETL) datos a la base de datos central de Azure.
   - Funcionan de manera agnóstica al ciclo de vida de FastAPI, importando directamente el módulo de base de datos (`backend/database.py`).
   - Ideales para ser ejecutados por CronJobs (Azure Functions o CRON locales).

## Flujo de Datos
1. Las ETLs (`functions/`) se conectan a fuentes externas (Google Analytics, Ad Manager, Archivos Excel locales, y OpenAI) para poblar y estructurar la información en la Base de Datos.
Algunas de estas credenciales son de cuentas o usuarios propios como lo son GA4 y Ad manager.
2. El Backend expone estos datos a través de endpoints REST eficientes, sin realizar procesamiento pesado de extracción en tiempo de respuesta.
3. El Frontend consume la API REST, permitiendo a los usuarios visualizar las métricas y tomar decisiones editoriales y financieras.