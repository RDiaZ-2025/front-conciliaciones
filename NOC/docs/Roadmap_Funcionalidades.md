# Catálogo Histórico de Funcionalidades y Roadmap (Red+)

Este documento recopila de manera detallada las funcionalidades que se han implementado con éxito en la plataforma Red+ hasta la fecha, estructuradas por módulos de negocio, así como los hitos futuros proyectados para la evolución del sistema.

---

## 🛠️ Funcionalidades Implementadas a la Fecha

### 1. Control de Acceso y Gestión de Usuarios (`auth`)
- **Autenticación Segura (JWT):** Implementación de flujos de inicio de sesión seguros que expiden tokens JWT firmados digitalmente y expirables.
- **Modelo de Permisos Granulares (RBAC):** Control de acceso basado en roles (`admin` y `user`) y permisos específicos para submódulos en la base de datos (ej. un usuario puede ver ingresos pero no presupuestos).
- **Protección de API y Rate Limiting:** Integración de la biblioteca `SlowAPI` para limitar el número de intentos fallidos de inicio de sesión a 5 peticiones por minuto, protegiendo el sistema de ataques de fuerza bruta.
- **Bloqueo por Inactividad:** Lógica para desactivar o bloquear usuarios que infrinjan políticas de acceso, impidiendo que inicien sesión de forma automática.

### 2. Gestión Global de Módulos (Panel Admin)
- **Toggles de Estado en Caliente:** Los administradores pueden desactivar o poner en mantenimiento cualquier submódulo del sistema en tiempo real.
- **Mensajería de Mantenimiento Personalizable:** Capacidad de definir textos específicos que ven los usuarios al intentar ingresar a un módulo en mantenimiento.
- **Protección de Rutas en Frontend (AuthGuard):** El sidebar de Angular se reconfigura dinámicamente según el estado de los módulos y los permisos del usuario, y la navegación a rutas restringidas está bloqueada a nivel de enrutador.

### 3. Dashboard Editorial y Tráfico de Contenidos (`portal/dashboard`)
- **Visualización de Métricas Clave:** Paneles gráficos interactivos que muestran el volumen de lecturas, tendencias de tráfico por categoría e interacción de usuarios.
- **Análisis de Fidelidad de Audiencia:** Desglose del comportamiento de los lectores recurrentes vs. nuevos por sección periodística.
- **Pipeline ETL de Scraping Automatizado (`dashboard_etl.py`):**
  - Script independiente que procesa URLs de artículos periodísticos (generalmente alimentadas por reportes de Google Analytics 4).
  - Extrae el texto completo del cuerpo de los artículos omitiendo elementos basura del DOM (anuncios, menús).
- **Análisis de Entidades con IA (OpenAI API):**
  - Integra la API de OpenAI (`gpt-4o-mini`) para analizar semánticamente el texto del artículo.
  - Extrae una entidad principal y hasta tres entidades secundarias relevantes.
  - Genera puntuaciones de relevancia sintáctica y semántica reales (eliminando códigos simulados antiguos) y almacena los resultados estructurados en la base de datos relacional.

### 4. Gestión de Ingresos y Monetización (`portal/ingresos`)
- **Consolidación de Fuentes de Ingresos:** Panel unificado para visualizar ingresos por publicidad web e ingresos por redes sociales.
- **Visualización Gráfica Interactiva:** Gráficas de rendimiento diario e histórico de cotizaciones de cambio de divisa (USD a COP).
- **Pipeline ETL de Ingresos (`ingresos_etl.py`):**
  - Conexión e interacción automatizada con la API de **Google Ad Manager** para descargar de forma diaria ingresos publicitarios, impresiones, clics y eCPM de los portales de RED+.
  - Mapeo y normalización automática de archivos Excel/CSV financieros de ingresos de **Facebook** e ingresos de **YouTube** de los canales oficiales: *RED+ TV, RED+ Noticias, 15 Minutos y RadiolaTV*.

### 5. Control de Presupuestos (`portal/presupuesto`)
- **Importador de Hojas de Excel:** Permite a los administradores subir archivos Excel directamente desde la interfaz web para registrar los presupuestos mensuales de cada departamento.
- **Análisis de Desviación Presupuestaria:** Compara el presupuesto asignado (Ppto) contra la ejecución real, marcando de forma automática y visual las secciones que están en estado "Normal", "En Riesgo" (>85% de ejecución) o "Sobre Presupuesto" (>100% de ejecución).

### 6. Asistente Analítico IA Financiero (`portal/agent`)
- **Diseño Autónomo en LangGraph:** Ciclo cerrado de toma de decisiones del agente (Mensaje del usuario -> Pensamiento -> Selección y Ejecución de Herramienta -> Evaluación de Resultado -> Respuesta final).
- **Motor Groq (Llama-3.3-70b-versatile):** Integración con Groq Cloud para proporcionar respuestas en lenguaje natural en menos de 2 segundos.
- **Caja de Herramientas Analíticas (`tools.py`):**
  - `get_admanager`: Consulta de ingresos de publicidad web diarios, impresiones y eCPMs.
  - `get_youtube`: Consulta de ingresos mensuales detallados por canal o acumulados.
  - `get_facebook`: Consulta de ingresos de redes sociales en Facebook.
  - `get_presupuesto`: Comprobación de presupuestos vs. ejecuciones reales y estados de alerta por departamento.
  - `get_resumen_diario`: Consolidado general de todas las fuentes de ingresos en un único informe rápido.

### 7. Mensajería y Segmentación de Audiencias (`mensajeria`)
- **Segmentación de Contactos:** Capacidad de consultar y agrupar bases de usuarios en segmentos de negocio clave (ej. Clientes VIP, Clientes Morosos).
- **Simulación de Envíos Masivos (SMS):** Endpoint interactivo para disparar campañas de mensajes masivos simuladas, entregando métricas de envíos exitosos, entregados y fallidos.

---

## 📈 Roadmap y Próximos Pasos (Futuro del Sistema)

### Hito 1: Integración de Notificaciones Reales (SMS/Email)
- Reemplazar el simulador de mensajería por una integración de API real con un proveedor de SMS (como Twilio o AWS SNS) para disparar campañas reales a las audiencias segmentadas.

### Hito 2: Automatización Completa en Azure
- Desplegar las ETLs (`/functions`) en Azure Functions con Timer Triggers configurados en formato Cron (`0 0 2 * * ?` para ejecutarse diariamente a las 2:00 AM).
- Configurar las alertas de Azure SQL Firewall para bloquear accesos y notificar accesos sospechosos o intentos de conexión fallidos.

### Hito 3: Ampliación de Herramientas del Agente IA
- Enseñar al agente a realizar comparaciones cruzadas avanzadas (ej. correlacionar el volumen de tráfico del dashboard con los ingresos diarios de Google Ad Manager para calcular el valor promedio por visualización de página).
- Guardar memoria de conversación del agente en la base de datos de Azure SQL para mantener hilos de conversación persistentes por usuario.
