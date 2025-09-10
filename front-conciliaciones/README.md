# Front Conciliaciones - Claro Media

Aplicación web para la gestión y conciliación de documentos de valorización y órdenes de compra para Claro Media.

## Estructura del Proyecto

```
├── .github/workflows/      # Configuración de CI/CD para Azure Static Web Apps
├── public/                 # Archivos estáticos
│   ├── pdfjs/              # Biblioteca PDF.js para manejo de PDFs
│   └── staticwebapp.config.json  # Configuración de rutas para Azure Static Web Apps
├── src/
│   ├── assets/             # Imágenes y recursos estáticos
│   ├── components/         # Componentes React
│   │   ├── CustomDatePicker.jsx  # Componente personalizado para selección de fechas
│   │   ├── DarkModeToggle.jsx    # Componente para cambiar entre modo claro/oscuro
│   │   ├── DashboardGeneral.jsx  # Dashboard principal de la aplicación
│   │   ├── HamburgerMenu.jsx     # Menú de navegación hamburguesa
│   │   ├── Login.jsx             # Componente de autenticación
│   │   └── UploadForm.jsx        # Formulario para carga de archivos con selección de tipo de usuario
│   ├── utils/              # Utilidades y funciones auxiliares
│   │   └── validatePdfSignatures.js  # Validación de firmas en PDFs
│   ├── App.jsx             # Componente principal y enrutamiento
│   ├── main.jsx            # Punto de entrada de la aplicación
│   └── index.css           # Estilos globales
```

## Arquitectura

La aplicación sigue una arquitectura de componentes basada en React, con las siguientes características:

- **Arquitectura de componentes**: Organización modular con componentes reutilizables.
- **Gestión de estado**: Uso de React Hooks (useState) para el manejo del estado local de los componentes.
- **Flujo de navegación**: Implementación de un sistema de navegación basado en estados para cambiar entre vistas (upload, login, dashboard).
- **Integración con servicios cloud**: Conexión con Azure Blob Storage para almacenamiento de archivos.
- **Procesamiento de archivos**: Validación y procesamiento de archivos Excel y PDF.

## Tecnologías Utilizadas

- **Frontend**: React 19
- **Bundler/Build**: Vite 7
- **UI Framework**: Material-UI (MUI) 7
- **Procesamiento de archivos**:
  - XLSX (0.18.5) para manejo de archivos Excel
  - PDF.js (5.3.93) para procesamiento de archivos PDF
- **Cloud Storage**: Azure Storage Blob para almacenamiento de archivos
- **Despliegue**: Azure Static Web Apps
- **CI/CD**: GitHub Actions

## Funcionalidades Principales

1. **Selección de tipo de usuario**:
   - Paso inicial para seleccionar entre "Cliente" o "Agencia"
   - Interfaz intuitiva con tarjetas visuales horizontales
   - Validación requerida antes de continuar con el proceso

2. **Carga y validación de archivos**:
   - **Paso 1**: Validación de archivos Excel (Valorización) con verificación de estructura y campos requeridos
   - **Paso 2**: Validación de archivos PDF (Órdenes de Compra) con detección de firmas digitales
   - **Paso 3**: Carga opcional de archivos de materiales adicionales
   - Proceso guiado por pasos (stepper) con numeración clara

3. **Autenticación de usuarios**:
   - Sistema de login para acceso al dashboard

4. **Dashboard de gestión**:
   - Visualización de datos históricos por año
   - Análisis de presupuesto vs. ejecución
   - Categorización de datos por tipo de medio publicitario

5. **Experiencia de usuario**:
   - Soporte para modo oscuro/claro
   - Interfaz responsive y moderna
   - Proceso guiado por pasos con navegación intuitiva
   - Menú hamburguesa para navegación adicional
   - Resumen completo antes del envío incluyendo tipo de usuario seleccionado

## Flujo de Trabajo de la Aplicación

El flujo principal y alternativo de la aplicación se compone de los siguientes pasos y escenarios:

### Flujo Principal

1. **Selección de Tipo de Usuario**
   - El usuario elige entre "Cliente" o "Agencia" mediante tarjetas visuales.
   - Solo se puede avanzar si se realiza una selección válida.

2. **Carga de Excel de Valorización**
   - El usuario sube el archivo Excel.
   - El sistema valida la estructura y los campos requeridos.
   - Si hay errores, se muestra feedback y el usuario puede corregir y volver a subir.
   - Vista previa de los datos procesados.

3. **Carga de PDF de Orden de Compra**
   - El usuario sube el archivo PDF.
   - Se detectan firmas digitales automáticamente.
   - Si el PDF no cumple requisitos, se muestra mensaje de error y se permite volver a intentar.
   - Vista previa del documento.

4. **Carga de Materiales Adicionales (Opcional)**
   - El usuario puede subir archivos extra (imágenes, documentos).
   - Todos los archivos se resumen antes del envío final.

5. **Resumen y Confirmación**
   - Se muestra un resumen completo de la selección y archivos cargados.
   - El usuario confirma y envía la información.

6. **Autenticación y Dashboard**
   - Si el usuario no está autenticado, se le solicita login.
   - Acceso al dashboard para visualizar datos históricos y análisis.

### Flujos Alternos y Casos Especiales

- **Validación Fallida de Archivos**: Si algún archivo no cumple con los requisitos, el usuario recibe mensajes claros y puede corregir el error antes de continuar.
- **Carga Incompleta**: Si el usuario omite la carga de materiales adicionales, el sistema permite avanzar sin bloquear el flujo principal.
- **Sesión Expirada o No Autenticada**: Si la sesión expira o el usuario no está autenticado, se redirige automáticamente al login mediante `ProtectedRoute.jsx`.
- **Acceso a Panel de Administración**: Usuarios con permisos acceden al `AdminPanel.jsx` para gestionar roles y usuarios. Si no tienen permisos, se muestra mensaje de acceso denegado.
- **Error de Conexión con Backend**: Si ocurre un error al comunicarse con el backend (API), se muestra mensaje de error y se permite reintentar la operación.
- **Modo Oscuro/Claro**: El usuario puede alternar entre modos visuales en cualquier paso del flujo.

### Acceso y Permisos según Inicio de Sesión y Tipo de Usuario

- Tras el inicio de sesión, el sistema verifica el tipo de usuario y sus permisos.
- Solo los usuarios autenticados y con permisos adecuados pueden acceder al dashboard y funcionalidades avanzadas.
- Los usuarios con rol de administrador pueden ingresar al `AdminPanel.jsx` para gestionar usuarios y roles.
- Si el usuario no tiene permisos suficientes, el sistema muestra un mensaje de acceso denegado y restringe el acceso a ciertas rutas mediante `ProtectedRoute.jsx`.
- El flujo de navegación y las opciones disponibles se adaptan dinámicamente según el tipo de usuario y sus permisos.

Estos pasos y flujos alternos aseguran una experiencia guiada, robusta y flexible para distintos escenarios de uso.

## Buenas Prácticas Implementadas

1. **Estructura organizada**: Separación clara de componentes, utilidades y assets.
2. **Validación robusta**: Verificación exhaustiva de archivos antes de su procesamiento.
3. **Feedback al usuario**: Mensajes claros de error y éxito durante el proceso.
4. **Accesibilidad**: Implementación de modo oscuro para mejorar la accesibilidad visual.
5. **Seguridad**: Uso de SAS Tokens para acceso seguro a Azure Blob Storage.
6. **CI/CD**: Integración continua y despliegue automático mediante GitHub Actions.
7. **UX/UI mejorada**: Diseño intuitivo con proceso paso a paso y validaciones en tiempo real.
8. **Modularidad**: Componentes reutilizables y mantenibles.
9. **Gestión de estado eficiente**: Uso apropiado de React Hooks para el manejo del estado local.

## Posibles Mejoras

1. **Gestión de estado global**: Implementar Context API o Redux para un manejo más eficiente del estado.
2. **Optimización de rendimiento**:
   - Implementar lazy loading para componentes grandes
   - Optimizar el procesamiento de archivos PDF grandes
3. **Mejoras de UX/UI**:
   - Implementar animaciones más fluidas entre transiciones
   - Mejorar la experiencia en dispositivos móviles
4. **Testing**:
   - Añadir pruebas unitarias con Jest/React Testing Library
   - Implementar pruebas de integración
5. **Seguridad**:
   - Implementar autenticación más robusta (OAuth, JWT)
   - Mejorar la gestión de tokens y permisos
6. **Internacionalización**: Añadir soporte para múltiples idiomas.

## Configuración del Entorno de Desarrollo

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Iniciar servidor de desarrollo: `npm run dev`
4. Construir para producción: `npm run build`

## Despliegue

La aplicación se despliega automáticamente en Azure Static Web Apps mediante GitHub Actions cuando se realizan cambios en la rama principal (main).

```
npm run build
```

Esto generará los archivos estáticos en la carpeta `dist` que pueden ser desplegados en cualquier servicio de hosting estático.

## Changelog

### Versión Actual (2024)

#### ✨ **Nuevas Funcionalidades**
- **Selección de Tipo de Usuario**: Nuevo paso inicial para seleccionar entre "Cliente" o "Agencia"
  - Interfaz con tarjetas visuales horizontales
  - Iconos representativos para cada tipo de usuario
  - Validación requerida antes de continuar
  - Integración completa en el flujo de envío de datos
- **Panel de Administración**: Nuevo componente `AdminPanel.jsx` para gestión de usuarios, roles y permisos.
- **Ruta protegida**: Nuevo componente `ProtectedRoute.jsx` para proteger rutas según autenticación.
- **Gestión de autenticación**: Contexto `AuthContext.jsx` y constantes de autenticación en `src/constants/auth.js`.
- **Servicios API**: Nuevo archivo `apiService.js` en `src/services/` para comunicación con backend.

#### 🎨 **Mejoras de UI/UX**
- Rediseño del proceso de carga con numeración clara de pasos (0-3)
- Tarjetas de selección con diseño horizontal y efectos hover
- Botones "Siguiente" en lugar de "Continuar" para mejor consistencia
- Resumen completo que incluye el tipo de usuario seleccionado
- Interfaz responsive y moderna

#### 🧹 **Limpieza de Código**
- **Eliminación del componente CierreVentas**: Componente no utilizado removido completamente
  - Archivo `CierreVentas.jsx` eliminado
  - Referencias removidas de `App.jsx`
  - Imports y funciones relacionadas limpiadas
  - Menú hamburguesa simplificado
- **Exclusión de archivos de ejemplo y respaldo**: No se incluyen archivos como `.env.example` ni `AdminPanel.jsx.backup` en despliegue ni commits principales.

#### 🔧 **Mejoras Técnicas**
- Mejor organización de componentes
- Validaciones mejoradas en el flujo de trabajo
- Gestión de estado optimizada para el nuevo flujo
- Código más limpio y mantenible
- Nuevos directorios `constants/`, `contexts/` y `services/` para mejor modularidad
