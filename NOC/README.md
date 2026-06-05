# Red+ — Plataforma Integral de Analítica y Gestión de Medios

Red+ es una solución digital de nivel empresarial diseñada para la consolidación, análisis y optimización de métricas de tráfico y rendimiento financiero en medios digitales. La plataforma permite la visualización integrada de ingresos (vía Google Ad Manager y redes sociales), el control presupuestal de secciones periodísticas y la generación de recomendaciones de contenido asistidas por Inteligencia Artificial de última generación.

---

## Arquitectura del Sistema

La plataforma sigue una arquitectura de **Monolito Modular orientado a Dominios**, lo que permite separar claramente los contextos de negocio (dominios) en el código sin añadir la sobrecarga operativa de los microservicios.

```
red+
├── frontend/           # Cliente Angular estructurado por características (features)
├── backend/            # API REST en FastAPI estructurada en módulos de dominio
│   ├── modules/        # Dominios autónomos (auth, mensajeria, portal)
│   │   └── portal/     # Bounded Context principal (dashboard, ingresos, presupuesto, agent)
│   └── tests/          # Pruebas unitarias automatizadas con SQLite en memoria
├── functions/          # Funciones ETL independientes (Serverless-ready)
└── docs/               # Manuales y guías de arquitectura y despliegue
```

---

## Stack Tecnológico

### Frontend
- **Framework principal:** Angular 18+ (arquitectura basada en componentes y servicios).
- **Estilos:** TailwindCSS (diseño responsivo y moderno) y Vanilla CSS.
- **Gráficas y visualizaciones:** Chart.js para paneles de análisis interactivos y cotizaciones financieras.
- **Cliente HTTP:** Angular HttpClient integrado con interceptores de seguridad para el manejo de JWT.

### Backend (API REST)
- **Framework principal:** FastAPI (Python 3.13) para alto rendimiento y documentación automática (Swagger/OpenAPI).
- **ORM y Acceso a BD:** SQLAlchemy con `pymssql` para comunicación eficiente con Azure SQL.
- **Seguridad:** JSON Web Tokens (JWT) para autenticación, algoritmos de hash seguros (`bcrypt`) y políticas granulares de autorización por permisos.
- **Rate Limiting:** SlowAPI para mitigación de ataques DDoS y de fuerza bruta en endpoints críticos.
- **Agente de Inteligencia Artificial:** LangGraph y ChatGroq (modelo Llama-3.3-70b-versatile) para consultas en lenguaje natural directamente a la base de datos.

### Base de Datos
- **Producción:** Azure SQL Server (Base de datos relacional de alto rendimiento, optimizada para conexión pooling y consultas concurrentes).
- **Desarrollo y Pruebas Locales:** SQLite (en memoria para pruebas automatizadas y en archivo `sql_app.db` para desarrollo local ágil sin dependencias de red).

### Componentes de ETL Independientes (`/functions`)
- Scripts independientes diseñados para ser orquestados mediante CronJobs o Azure Functions con Trigger de Tiempo:
  - **ETL de Ingresos:** Consumo de Google Ad Manager API (`googleads`) y procesamiento de archivos Excel financieros de YouTube y Facebook.
  - **ETL de Dashboard:** Extracción de texto periodístico vía Web Scraping y análisis de entidades mediante la API de OpenAI (GPT-4o-mini) con puntuación sintáctica y semántica.

---

## Requisitos del Entorno

Asegúrese de contar con los siguientes elementos instalados en su máquina de desarrollo:
- **Node.js** v18+ y **npm** v9+
- **Python** 3.11 a 3.13
- **Compilador C / Microsoft ODBC Driver 17/18** (necesario si compila `pymssql` para Azure SQL de forma local, aunque en desarrollo SQLite no lo requiere).

---

## Configuración y Puesta en Marcha (Desarrollo Local)

### 1. Preparación del Backend
1. Diríjase a la carpeta `/backend`:
   ```bash
   cd backend
   ```
2. Cree y active un entorno virtual de Python:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Instale las dependencias del sistema:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Configure el archivo de entorno creando un archivo `.env` basado en la plantilla actual. Para desarrollo local, active el modo SQLite comentando la URL de Azure SQL y descomentando la línea de SQLite:
   ```env
   # Desarrollo local con SQLite:
   SQLALCHEMY_DATABASE_URL="sqlite:///./sql_app.db"
   
   # API Keys para Agente y ETLs:
   SECRET_KEY="tu_clave_secreta_jwt"
   GROQ_API_KEY="tu_groq_api_key"
   OPENAI_API_KEY="tu_openai_api_key"
   ```
5. Inicialice la base de datos y siembre el usuario administrador de desarrollo (`QA`):
   ```bash
   python init_db.py
   ```
6. Inicie el servidor de desarrollo FastAPI:
   ```bash
   uvicorn main:app --reload
   ```
   El backend estará disponible en `http://localhost:8000`. Puede consultar la documentación interactiva en `http://localhost:8000/docs`.

### 2. Ejecución de Pruebas Automatizadas
Para ejecutar la suite completa de pruebas unitarias locales en una base de datos aislada en memoria:
```bash
cd backend
./venv/bin/pytest
```

### 3. Preparación del Frontend
1. Diríjase a la carpeta `/frontend`:
   ```bash
   cd frontend
   ```
2. Instale los paquetes necesarios:
   ```bash
   npm install
   ```
3. Inicie el servidor de desarrollo de Angular:
   ```bash
   ng serve
   ```
   Abra su navegador en `http://localhost:4200` para interactuar con la interfaz del portal.

---

## Entorno de Producción e Integración con Azure

En producción, la infraestructura está diseñada para operar de forma segura y escalable utilizando los siguientes recursos cloud:
1. **Frontend:** Desplegado en **Azure Static Web Apps** para una entrega rápida de archivos estáticos y caching global.
2. **Backend:** Desplegado en **Azure App Service (Linux)** en un contenedor o entorno de ejecución Python, configurando la variable de entorno `ALLOWED_ORIGINS` con la URL pública del frontend.
3. **Base de Datos:** **Azure SQL Database** con reglas de Firewall estrictas que solo permiten conexiones desde las IPs de salida de App Service y las funciones ETL.
4. **ETLs de Ingesta:** Desplegadas en **Azure Functions** con activadores por tiempo (Timer Triggers) para ejecutar procesos de sincronización automáticos a diario.
5. **Secretos:** Toda la información sensible (contraseñas de base de datos, API keys de OpenAI y Groq) se resguarda en **Azure Key Vault** y se inyecta como variables de entorno seguras en el App Service y las Functions.