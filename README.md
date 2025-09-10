# VOC - Sistema de Conciliaciones

Sistema integral de gestión de conciliaciones y documentos desarrollado con tecnologías modernas para el manejo eficiente de procesos administrativos y financieros.

## Descripción General

VOC es una aplicación web completa que permite la gestión de usuarios, carga de documentos, visualización de dashboards y administración de permisos. El sistema está diseñado para facilitar los procesos de conciliación y seguimiento de documentos con un enfoque en la seguridad y escalabilidad.

## Arquitectura del Sistema

### Frontend
- **Tecnología**: React 19.1.0 con Vite
- **UI Framework**: Material-UI (MUI)
- **Gestión de Estado**: Context API
- **Ubicación**: `/frontend`

### Backend
- **Tecnología**: Node.js con TypeScript
- **Framework**: Express.js
- **Base de Datos**: Microsoft SQL Server
- **Autenticación**: JWT con bcrypt
- **Ubicación**: `/backend`

### Despliegue
- **Plataforma**: Azure Static Web Apps
- **CI/CD**: GitHub Actions
- **Configuración**: Workflow automatizado

## Características Principales

### Gestión de Usuarios
- Sistema de autenticación seguro
- Manejo de permisos granular
- Roles diferenciados (Admin, Usuario, Gerencia)

### Carga de Documentos
- Subida de archivos PDF
- Validación de firmas digitales
- Seguimiento de estado de documentos
- Integración con Azure Blob Storage

### Dashboard y Reportes
- Visualización de datos financieros
- Gráficos interactivos
- Filtros por categorías y períodos
- Exportación de datos a Excel

### Panel de Administración
- Gestión de usuarios
- Asignación de permisos
- Monitoreo de actividad
- Configuración del sistema

## Tecnologías Utilizadas

### Frontend
- React 19.1.0
- Material-UI 7.2.0
- Vite 7.0.4
- PDF.js 5.3.93
- React Icons
- XLSX para exportación

### Backend
- Node.js con TypeScript
- Express.js 4.21.2
- SQL Server (mssql)
- JWT para autenticación
- Helmet para seguridad
- Morgan para logging
- Rate limiting
- Compression

### Herramientas de Desarrollo
- ESLint para linting
- Nodemon para desarrollo
- TypeScript para tipado
- Git para control de versiones

## Estructura del Proyecto

```
VOC/
├── frontend/          # Aplicación React
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # API Node.js/TypeScript
│   ├── src/
│   ├── database-setup.sql
│   └── package.json
├── .github/
│   └── workflows/     # CI/CD con GitHub Actions
└── README.md
```

## Casos de Uso Principales

1. **Autenticación de Usuarios**: Login seguro con validación de credenciales
2. **Carga de Documentos**: Subida y validación de archivos PDF
3. **Visualización de Datos**: Dashboard con métricas y gráficos
4. **Administración**: Gestión de usuarios y permisos
5. **Reportes**: Generación y exportación de reportes

## Seguridad

- Autenticación JWT
- Encriptación de contraseñas con bcrypt
- Validación de entrada con express-validator
- Headers de seguridad con Helmet
- Rate limiting para prevenir ataques
- CORS configurado

## Rendimiento

- Compresión de respuestas
- Optimización de consultas SQL
- Lazy loading de componentes
- Caching de datos
- Paginación de resultados

## Buenas Prácticas Implementadas

- Separación de responsabilidades
- Manejo centralizado de errores
- Logging estructurado
- Validación de datos
- Código tipado con TypeScript
- Componentes reutilizables
- Gestión de estado eficiente

## Áreas de Mejora

- Implementación de tests unitarios y de integración
- Documentación de API con Swagger
- Monitoreo y métricas de aplicación
- Optimización de rendimiento frontend
- Implementación de cache Redis
- Mejora en el manejo de errores
- Internacionalización (i18n)

## Requisitos del Sistema

- Node.js 20.x o superior
- SQL Server
- Azure Blob Storage (para archivos)
- Navegador moderno con soporte ES6+

## Instalación y Configuración

Para instrucciones detalladas de instalación y configuración, consulte los README específicos en las carpetas `frontend/` y `backend/`.

## Contribución

Para contribuir al proyecto, siga las buenas prácticas de desarrollo y asegúrese de que el código pase todas las validaciones de linting y compilación.

## Licencia

Proyecto interno - Todos los derechos reservados.