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

1. **Paso 0 - Selección de Tipo de Usuario**:
   - El usuario selecciona entre "Cliente" o "Agencia"
   - Tarjetas visuales con iconos representativos
   - Botón "Siguiente" habilitado solo después de la selección

2. **Paso 1 - Carga de Excel**:
   - Carga y validación de archivo de valorización
   - Vista previa de datos procesados
   - Validación de estructura y campos requeridos

3. **Paso 2 - Carga de PDF**:
   - Carga y validación de órdenes de compra
   - Detección automática de firmas digitales
   - Vista previa del documento

4. **Paso 3 - Materiales Adicionales**:
   - Opción de cargar archivos adicionales
   - Resumen completo de todos los archivos
   - Confirmación final antes del envío

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

#### 🎨 **Mejoras de UI/UX**
- Rediseño del proceso de carga con numeración clara de pasos (0-3)
- Tarjetas de selección con diseño horizontal y efectos hover
- Botones "Siguiente" en lugar de "Continuar" para mejor consistencia
- Resumen completo que incluye el tipo de usuario seleccionado

#### 🧹 **Limpieza de Código**
- **Eliminación del componente CierreVentas**: Componente no utilizado removido completamente
  - Archivo `CierreVentas.jsx` eliminado
  - Referencias removidas de `App.jsx` y `HamburgerMenu.jsx`
  - Imports y funciones relacionadas limpiadas
  - Menú hamburguesa simplificado

#### 🔧 **Mejoras Técnicas**
- Mejor organización de componentes
- Validaciones mejoradas en el flujo de trabajo
- Gestión de estado optimizada para el nuevo flujo
- Código más limpio y mantenible
