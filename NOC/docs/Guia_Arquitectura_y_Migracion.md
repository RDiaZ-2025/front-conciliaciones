# Guía de Arquitectura del Sistema y Migración a Azure SQL (Red+)

Esta guía técnica describe en detalle la arquitectura de **Monolito Modular orientado a Dominios** de la plataforma Red+, la justificación del diseño de sus componentes, y el proceso detallado para migrar de SQLite a un entorno de base de datos relacional de producción en Azure SQL Server.

---

## 🏛️ 1. Arquitectura de Monolito Modular

La plataforma Red+ se ha estructurado siguiendo los principios de un **Monolito Modular**. En lugar de dividir el sistema de forma prematura en microservicios (lo que introduce complejidad de red, latencia y sobrecarga de infraestructura), el sistema se organiza internamente en módulos claramente delimitados (**Bounded Contexts**) que interactúan entre sí a través de contratos definidos.

### 📐 Organización de Carpetas y Dominios (Capas Limpias)

La estructura interna del backend separa los servicios transversales de la lógica de negocio específica de cada dominio:

- **Capa Core / Shared:** Contiene elementos transversales y utilidades genéricas de infraestructura que no pertenecen a ningún dominio en particular:
  - `database.py`: Define el motor de conexión (`engine`), el inicializador de sesiones (`SessionLocal`) y el objeto base de metadatos del ORM (`Base`).
  - `dependencies.py`: Contiene los proveedores de dependencias inyectables de FastAPI (sesión de base de datos `get_db`, verificación de JWT, y control de acceso basado en roles `check_permission` / `check_admin`).
  - `security.py`: Proveedor de encriptación (`bcrypt`) e inyección del limitador de tráfico (`SlowAPI`).

- **Capa de Módulos (Dominios Autónomos):** Cada subcarpeta dentro de `/backend/modules` representa un Bounded Context autónomo con su propio modelo de datos, lógica de negocio y enrutadores de API.
  - **`auth`**: Gestión de usuarios, autenticación mediante tokens JWT y asignación de permisos a módulos.
  - **`mensajeria`**: Segmentación de bases de datos y simulación de envío de mensajes de texto masivos con analítica.
  - **`portal`**: Es el dominio financiero y editorial principal del sistema, el cual encapsula cuatro submódulos:
    - **`dashboard`**: Visualización de estadísticas agregadas de tráfico de contenidos, fidelidad de audiencias e interacción por categorías.
    - **`ingresos`**: Gestión de ingresos diarios de Google Ad Manager e históricos mensuales de redes sociales (YouTube, Facebook).
    - **`presupuesto`**: Carga e interpretación de presupuestos asignados a secciones vs. su nivel de ejecución en tiempo real.
    - **`agent`**: Agente IA Financiero construido sobre **LangGraph** y **ChatGroq**. Este agente no representa un dominio de negocio independiente, sino una **capacidad analítica transversal del portal** que asiste a los submódulos de ingresos y presupuestos mediante la interpretación de consultas en lenguaje natural.

## ⚡ 3. Independencia de las Funciones ETL (`/functions`)

Las funcionalidades de extracción, transformación y carga (ETL) residen en la carpeta raíz `/functions` del proyecto y están **completamente desacopladas** del servidor web de FastAPI.

### Razón del Diseño
1. **Separación de Responsabilidades:** FastAPI se encarga exclusivamente de responder de forma ágil a las peticiones del frontend. No debe procesar operaciones que tomen minutos (como scraping masivo o descargas de APIs) en sus hilos de ejecución web, ya que esto podría saturar el servidor.
2. **Ciclo de Vida Independiente:** Las ETLs se ejecutan periódicamente (ej. una vez al día a las 2:00 AM) mediante disparadores de tiempo. En Azure, se despliegan de forma nativa en **Azure Functions con Timer Triggers**, evitando el costo de mantener un servidor web encendido para tareas de fondo.
3. **Reutilización de Infraestructura:** Aunque son independientes, las ETLs importan el módulo `database` del backend para asegurar que usan la misma configuración de base de datos relacional y las mismas estructuras ORM, evitando duplicar código de infraestructura.

---

## 🗄️ 4. Guía de Migración de SQLite a Azure SQL

En entornos locales y de pruebas automatizadas, se utiliza **SQLite** para agilidad y simplicidad. Sin embargo, para producción y control de calidad corporativo, se requiere la escalabilidad y seguridad de **Azure SQL Database**.

### Paso 1: Configurar Variables de Entorno
La URL de conexión a Azure SQL Server utiliza el controlador `pymssql`. En el archivo `.env` de producción o en la sección de Configuración de Azure App Service, configure la cadena de conexión de la siguiente manera:

```env
# Ejemplo de conexión con pymssql para Azure SQL Server
SQLALCHEMY_DATABASE_URL="mssql+pymssql://<usuario_db>:<contraseña_db>@<servidor_sql>.database.windows.net/<nombre_db>"
```

> [!CAUTION]
> Si la contraseña de su base de datos de Azure SQL contiene caracteres especiales (como `@`, `#`, `$`), estos **deben codificarse en formato URL** antes de colocarse en la cadena de conexión.
> - `@` se convierte en `%40`
> - `#` se convierte en `%23`
> - `$` se convierte en `%24`
>
> Ejemplo: `Contraseña@123` -> `Contraseña%40123`

### Paso 2: Configuración del Firewall de Azure
Por defecto, Azure SQL bloquea todo el tráfico entrante.
1. Ingrese al Portal de Azure y localice su recurso **SQL Server**.
2. Vaya a **Networking** (Seguridad de red).
3. Agregue la IP pública de su entorno de desarrollo local si necesita realizar pruebas o migraciones directas.
4. Active la opción **"Allow Azure services and resources to access this server"** para permitir que las instancias de Azure App Service y Azure Functions puedan conectarse sin necesidad de IPs estáticas fijas.

### Paso 3: Inicialización del Esquema mediante `init_db.py`
En lugar de crear las tablas de forma automática cada vez que se importa el código (lo que generaba bloqueos en pruebas locales), la base de datos se inicializa de forma explícita.

Una vez configurado el `.env` con las credenciales de Azure SQL y habilitado el firewall para su IP local, ejecute el siguiente comando para generar el esquema de tablas y sembrar el administrador base:

```bash
cd backend
python init_db.py
```

### Paso 4: Optimización de Índices en Azure SQL
Para garantizar que las consultas analíticas del Dashboard y del Agente IA se ejecuten en milisegundos, la base de datos implementa las siguientes reglas de indexación:

1. **Claves Primarias Clustered:** Generadas automáticamente en la columna `id` de cada tabla.
2. **Índice Compuesto en Ingresos del Portal (`IngresoPortal`):**
   - Columnas: `Fecha` e `ImpresionesTotales`.
   - Justificación: Optimiza las consultas de filtros del Dashboard y las búsquedas por rangos de fechas efectuadas por el Agente.
3. **Índice Compuesto en Ingresos de Redes (`IngresoRedes`):**
   - Columnas: `Plataforma` y `Mes`.
   - Justificación: Acelera los reportes mensuales de YouTube y Facebook agregados por plataforma.
4. **Índice de Rango de Fechas en Presupuestos (`Presupuesto`):**
   - Columnas: `Fecha` y `Seccion`.
   - Justificación: Permite un rápido contraste entre el presupuesto proyectado y la ejecución real.
