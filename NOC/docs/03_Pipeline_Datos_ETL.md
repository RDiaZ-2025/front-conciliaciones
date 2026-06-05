# Pipeline de Datos (ETL y Funciones)

La carpeta `/functions` consolida todos los procesos de Extracción, Transformación y Carga (ETL). Esta arquitectura aísla el trabajo pesado del Backend REST (FastAPI), previniendo bloqueos y caídas del servidor por falta de memoria durante procesos complejos (como Scraping o llamados a OpenAI).

## Diseño General

Cada script dentro de `/functions` está diseñado para correr independientemente, pero está perfectamente conectado a la base de datos de producción porque importa la configuración directamente desde el backend.

```python
# Así se conectan los scripts a la BD de Azure:
import os, sys
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
sys.path.append(backend_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_root, '.env')) # Carga el .env del backend

from database import SessionLocal
```

## Módulos ETL

### 1. Entidades (Dashboard) - `dashboard_etl.py`
Se encarga de procesar los datos de tráfico e identificar sobre qué tratan los artículos periodísticos:
- **Scraping:** Visita las URLs para descargar el texto plano.
- **OpenAI (GPT-4o-mini):** Analiza semánticamente el texto del artículo para extraer:
  - `main_entity` (1 entidad principal).
  - `related_entities` (3 entidades vinculadas).
  - Puntajes semánticos y sintácticos de relevancia.
- **Población:** Carga la tabla de `dashboard_data` y genera la red de `entities`.

### 2. Ingresos - `ingresos_etl.py`
Sincroniza y consolida la información financiera y de tráfico pagado:
- **Google AdManager API:** Se autentica mediante `googleads.yaml` e interactúa con la versión `v202602` de la API para descargar reportes programáticos históricos.
- **Redes Sociales:** Importa archivos estáticos `.xlsx` procesando YouTube, Facebook, y las conversiones al valor del dólar diario.

## Despliegue de ETLs
Estos scripts no son ejecutados por llamadas HTTP estándar. La intención de diseño para producción es utilizar **CRON Jobs** (en un servidor Linux) o desplegarlos como **Azure Functions** con Trigger por Tiempo (Time Trigger) para que se ejecuten todas las madrugadas automáticamente.
