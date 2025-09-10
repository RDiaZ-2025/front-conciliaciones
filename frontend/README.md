# Frontend - VOC Sistema de Conciliaciones

Aplicación frontend desarrollada en React con Material-UI para el sistema de gestión de conciliaciones y documentos.

## Tecnologías Principales

- **React**: 19.1.0 - Biblioteca principal para la interfaz de usuario
- **Vite**: 7.0.4 - Herramienta de build y desarrollo
- **Material-UI**: 7.2.0 - Framework de componentes UI
- **PDF.js**: 5.3.93 - Visualización y manipulación de PDFs
- **XLSX**: 0.18.5 - Exportación de datos a Excel
- **React Icons**: 5.5.0 - Iconografía

## Estructura del Proyecto

```
src/
├── components/          # Componentes React reutilizables
│   ├── AdminPanel.jsx   # Panel de administración
│   ├── DashboardGeneral.jsx # Dashboard principal
│   ├── LoadDocumentsOCbyUserView.jsx # Vista de documentos
│   ├── Login.jsx        # Componente de autenticación
│   ├── UploadForm.jsx   # Formulario de carga
│   └── ProtectedRoute.jsx # Rutas protegidas
├── contexts/            # Contextos de React
│   └── AuthContext.jsx  # Contexto de autenticación
├── services/            # Servicios de API
│   └── apiService.js    # Cliente HTTP para backend
├── utils/               # Utilidades
│   └── validatePdfSignatures.js # Validación de PDFs
├── constants/           # Constantes de la aplicación
│   └── auth.js          # Constantes de autenticación
├── assets/              # Recursos estáticos
└── App.jsx              # Componente principal
```

## Características Principales

### Sistema de Autenticación
- Login con email y contraseña
- Gestión de tokens JWT
- Contexto global de autenticación
- Rutas protegidas por permisos
- Logout automático por expiración

### Gestión de Permisos
- Sistema granular de permisos
- Roles diferenciados:
  - `ADMIN_PANEL`: Acceso completo al panel de administración
  - `DOCUMENT_UPLOAD`: Permisos para cargar documentos
  - `MANAGEMENT_DASHBOARD`: Acceso al dashboard gerencial
  - `USER_MANAGEMENT`: Gestión de usuarios

### Dashboard Interactivo
- Visualización de datos financieros
- Gráficos de presupuesto vs ejecutado
- Filtros por año y categoría
- Drill-down en subcategorías
- Exportación a Excel
- Modo oscuro/claro

### Carga de Documentos
- Subida de archivos PDF
- Validación de firmas digitales
- Preview de documentos
- Seguimiento de estado
- Historial de cargas

### Panel de Administración
- Gestión de usuarios
- Asignación de permisos
- Visualización de actividad
- Configuración del sistema

## Componentes Principales

### App.jsx
Componente raíz que maneja:
- Enrutamiento basado en permisos
- Navegación entre vistas
- Gestión de estado global
- Modo oscuro/claro

### AuthContext.jsx
Contexto que proporciona:
- Estado de autenticación
- Funciones de login/logout
- Verificación de permisos
- Persistencia de sesión

### DashboardGeneral.jsx
Dashboard principal con:
- Gráficos interactivos
- Filtros dinámicos
- Exportación de datos
- Responsive design

### AdminPanel.jsx
Panel administrativo para:
- Gestión de usuarios
- Asignación de roles
- Monitoreo de sistema
- Configuraciones

## Servicios y APIs

### apiService.js
Cliente HTTP que maneja:
- Configuración de endpoints
- Autenticación automática
- Manejo de errores
- Interceptores de request/response

#### Endpoints Principales
- `POST /api/auth/login` - Autenticación
- `GET /api/users` - Listado de usuarios
- `POST /api/load-documents` - Carga de documentos
- `GET /api/load-documents` - Consulta de documentos

## Configuración de Desarrollo

### Variables de Entorno
```env
VITE_API_URL=http://localhost:22741/api
```

### Scripts Disponibles
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Linting con ESLint
```

### Configuración de Vite
- Proxy para desarrollo apuntando al backend
- Plugin de React con Fast Refresh
- Optimizaciones de build

## Patrones de Diseño Implementados

### Context Pattern
- AuthContext para estado global de autenticación
- Evita prop drilling
- Centraliza lógica de autenticación

### Protected Routes
- Componente ProtectedRoute para rutas seguras
- Verificación de permisos antes del renderizado
- Redirección automática si no autorizado

### Service Layer
- Separación de lógica de API
- Reutilización de configuraciones
- Manejo centralizado de errores

### Component Composition
- Componentes pequeños y reutilizables
- Props bien definidas
- Separación de responsabilidades

## Optimizaciones de Rendimiento

### Lazy Loading
- Carga diferida de componentes pesados
- Reducción del bundle inicial
- Mejor experiencia de usuario

### Memoización
- React.memo para componentes puros
- useMemo para cálculos costosos
- useCallback para funciones estables

### Paginación
- Tablas con paginación automática
- Reducción de datos en memoria
- Mejor rendimiento en listas grandes

## Buenas Prácticas Implementadas

### Código
- Componentes funcionales con hooks
- Naming conventions consistentes
- Separación de lógica y presentación
- Manejo de errores robusto

### UI/UX
- Design system con Material-UI
- Responsive design
- Accesibilidad básica
- Feedback visual para acciones

### Seguridad
- Validación de entrada
- Sanitización de datos
- Manejo seguro de tokens
- Protección contra XSS

## Áreas de Mejora

### Testing
- Implementar tests unitarios con Jest
- Tests de integración con React Testing Library
- Tests end-to-end con Cypress
- Coverage de código

### Performance
- Implementar React.Suspense
- Optimizar re-renders
- Bundle splitting más granular
- Service Workers para cache

### Accesibilidad
- Mejorar soporte para screen readers
- Navegación por teclado
- Contraste de colores
- ARIA labels

### Internacionalización
- Soporte multi-idioma con react-i18next
- Formateo de fechas y números
- Textos externalizados

### Estado Global
- Migrar a Redux Toolkit o Zustand
- Mejor gestión de estado complejo
- DevTools para debugging

## Instalación y Configuración

### Prerrequisitos
- Node.js 20.x o superior
- npm o yarn
- Backend ejecutándose en puerto 22741

### Instalación
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

### Build de Producción
```bash
# Generar build optimizado
npm run build

# Servir build localmente
npm run preview
```

## Troubleshooting

### Problemas Comunes
1. **Error de CORS**: Verificar configuración del backend
2. **Token expirado**: Limpiar localStorage y volver a loguearse
3. **Componentes no cargan**: Verificar imports y rutas
4. **Estilos no aplican**: Verificar orden de imports CSS

### Debug
- Usar React DevTools
- Console.log en desarrollo
- Network tab para APIs
- Vite DevTools

## Contribución

### Estándares de Código
- Seguir ESLint configuration
- Usar Prettier para formateo
- Commits descriptivos
- Pull requests con review

### Workflow
1. Fork del repositorio
2. Crear branch feature
3. Desarrollar y testear
4. Pull request con descripción
5. Code review
6. Merge a main
