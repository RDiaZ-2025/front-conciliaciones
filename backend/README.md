# Backend - VOC Sistema de Conciliaciones

API REST desarrollada en Node.js con TypeScript para el sistema de gestión de conciliaciones y documentos.

## Tecnologías Principales

- **Node.js**: Runtime de JavaScript
- **TypeScript**: 5.9.2 - Superset tipado de JavaScript
- **Express.js**: 4.21.2 - Framework web para Node.js
- **SQL Server**: Base de datos relacional (mssql 11.0.1)
- **JWT**: Autenticación con tokens
- **bcrypt**: Encriptación de contraseñas

## Estructura del Proyecto

```
src/
├── config/              # Configuraciones
│   └── database.ts      # Configuración de base de datos
├── controllers/         # Controladores de rutas
│   ├── authController.ts
│   ├── userController.ts
│   └── LoadDocumentsOCbyUserController.ts
├── middleware/          # Middlewares personalizados
│   └── auth.ts          # Middleware de autenticación
├── routes/              # Definición de rutas
│   ├── auth.ts
│   ├── users.ts
│   ├── loadDocumentsOCbyUser.ts
│   └── testData.ts
├── services/            # Lógica de negocio
│   ├── authService.ts
│   └── userService.ts
├── types/               # Definiciones de tipos TypeScript
│   └── index.ts
├── scripts/             # Scripts de utilidad
│   ├── assignAdminPermissions.js
│   ├── createAdminPrincipal.js
│   └── insertPermission.ts
├── app.ts               # Configuración de Express
└── server.ts            # Punto de entrada del servidor
```

## Características Principales

### Sistema de Autenticación
- Login con email y contraseña
- Tokens JWT con expiración
- Encriptación de contraseñas con bcrypt
- Middleware de autenticación
- Gestión de sesiones

### Gestión de Usuarios
- CRUD completo de usuarios
- Sistema de permisos granular
- Roles y asignación de permisos
- Validación de datos de entrada
- Auditoría de accesos

### Gestión de Documentos
- Registro de cargas de documentos
- Seguimiento por usuario
- Estados de documentos
- Metadatos de archivos
- Historial de operaciones

### Seguridad
- Headers de seguridad con Helmet
- Rate limiting para prevenir ataques
- Validación de entrada con express-validator
- CORS configurado
- Compresión de respuestas

## Arquitectura

### Patrón MVC
- **Models**: Definidos en tipos TypeScript
- **Views**: Respuestas JSON estructuradas
- **Controllers**: Lógica de manejo de requests

### Capas de la Aplicación
1. **Rutas**: Definición de endpoints y middlewares
2. **Controladores**: Manejo de requests y responses
3. **Servicios**: Lógica de negocio
4. **Base de Datos**: Capa de acceso a datos

### Base de Datos

#### Tablas Principales

**USERS**
```sql
Id (int, PK, Identity)
Name (varchar(255))
Email (varchar(255), Unique)
PasswordHash (varchar(255))
LastAccess (datetime)
Status (int)
CreatedAt (datetime)
UpdatedAt (datetime)
```

**PERMISSIONS**
```sql
Id (int, PK, Identity)
Name (varchar(255), Unique)
Description (varchar(500))
CreatedAt (datetime)
```

**PERMISSIONS_BY_USER**
```sql
Id (int, PK, Identity)
UserId (int, FK)
PermissionId (int, FK)
AssignedAt (datetime)
```

**LoadDocumentsOCbyUser**
```sql
Id (int, PK, Identity)
IdUser (int, FK)
IdFolder (uniqueidentifier)
Fecha (datetime)
Status (varchar)
FileName (varchar)
```

## Endpoints de la API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token

### Usuarios
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Documentos
- `POST /api/load-documents` - Registrar carga de documento
- `GET /api/load-documents` - Obtener documentos cargados
- `GET /api/load-documents/:id` - Obtener documento específico

### Salud del Sistema
- `GET /health` - Estado del servidor

## Configuración

### Variables de Entorno
```env
# Base de datos
DB_SERVER=your-sql-server
DB_DATABASE=your-database
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Servidor
PORT=8246
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
```

### Scripts Disponibles
```bash
npm run dev      # Servidor de desarrollo con nodemon
npm run build    # Compilar TypeScript
npm run start    # Ejecutar servidor compilado
npm test         # Ejecutar tests (pendiente)
```

## Middlewares Implementados

### Seguridad
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Control de acceso entre dominios
- **Rate Limiting**: Prevención de ataques de fuerza bruta
- **Compression**: Compresión de respuestas

### Utilidad
- **Morgan**: Logging de requests HTTP
- **Cookie Parser**: Manejo de cookies
- **Express Validator**: Validación de datos

### Autenticación
- **Auth Middleware**: Verificación de tokens JWT
- **Permission Middleware**: Verificación de permisos

## Servicios

### AuthService
- Validación de credenciales
- Generación de tokens JWT
- Verificación de tokens
- Gestión de sesiones

### UserService
- CRUD de usuarios
- Gestión de permisos
- Validación de datos
- Auditoría de cambios

## Controladores

### AuthController
- Login de usuarios
- Logout y limpieza de sesión
- Verificación de autenticación
- Renovación de tokens

### UserController
- Gestión completa de usuarios
- Asignación de permisos
- Consultas con filtros
- Validaciones de negocio

### LoadDocumentsOCbyUserController
- Registro de cargas de documentos
- Consulta de historial
- Filtros por usuario y fecha
- Estados de documentos

## Manejo de Errores

### Tipos de Errores
- **400 Bad Request**: Datos inválidos
- **401 Unauthorized**: No autenticado
- **403 Forbidden**: Sin permisos
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error del servidor

### Estructura de Respuesta de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Código de error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Logging

### Niveles de Log
- **Error**: Errores críticos
- **Warn**: Advertencias
- **Info**: Información general
- **Debug**: Información de depuración

### Formato de Logs
- Timestamp
- Nivel de log
- Mensaje
- Contexto adicional

## Validaciones

### Validación de Entrada
- Email válido
- Contraseñas seguras
- Campos requeridos
- Tipos de datos correctos

### Validación de Negocio
- Usuarios únicos por email
- Permisos válidos
- Estados de documentos válidos
- Relaciones de datos consistentes

## Optimizaciones de Rendimiento

### Base de Datos
- Connection pooling
- Índices optimizados
- Consultas preparadas
- Timeouts configurados

### Servidor
- Compresión de respuestas
- Cache de consultas frecuentes
- Paginación de resultados
- Lazy loading de relaciones

## Buenas Prácticas Implementadas

### Código
- Tipado estricto con TypeScript
- Separación de responsabilidades
- Principios SOLID
- Manejo de errores consistente

### Seguridad
- Principio de menor privilegio
- Validación de entrada
- Sanitización de datos
- Auditoría de accesos

### Base de Datos
- Transacciones para operaciones críticas
- Constraints de integridad
- Índices para performance
- Backup y recovery

## Áreas de Mejora

### Testing
- Tests unitarios con Jest
- Tests de integración
- Tests de carga
- Mocking de dependencias

### Documentación
- Swagger/OpenAPI para documentar API
- Documentación de arquitectura
- Guías de desarrollo
- Ejemplos de uso

### Monitoreo
- Métricas de aplicación
- Health checks avanzados
- Alertas automáticas
- Dashboard de monitoreo

### Performance
- Cache con Redis
- Optimización de consultas
- CDN para assets estáticos
- Load balancing

### Escalabilidad
- Microservicios
- Message queues
- Horizontal scaling
- Database sharding

## Instalación y Configuración

### Prerrequisitos
- Node.js 20.x o superior
- SQL Server
- npm o yarn

### Instalación
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Configurar base de datos
npm run setup-db

# Iniciar servidor de desarrollo
npm run dev
```

### Configuración de Base de Datos
```bash
# Ejecutar script de configuración
node setup-db.js

# O ejecutar SQL manualmente
sqlcmd -S server -d database -i database-setup.sql
```

## Scripts de Utilidad

### Configuración Inicial
- `setup-db.js`: Configuración inicial de base de datos
- `create-tables.js`: Creación de tablas
- `insert-users.sql`: Usuarios de prueba

### Administración
- `createAdminPrincipal.js`: Crear usuario administrador
- `assignAdminPermissions.js`: Asignar permisos de admin
- `insertPermission.ts`: Insertar nuevos permisos

## Troubleshooting

### Problemas Comunes
1. **Error de conexión a BD**: Verificar credenciales y conectividad
2. **Token inválido**: Verificar configuración JWT
3. **Permisos insuficientes**: Verificar roles de usuario
4. **CORS errors**: Verificar configuración de dominios

### Debug
- Logs detallados en desarrollo
- SQL Server Profiler para consultas
- Postman para testing de API
- Node.js debugger

## Contribución

### Estándares de Código
- Seguir convenciones de TypeScript
- Usar ESLint y Prettier
- Documentar funciones públicas
- Tests para nuevas funcionalidades

### Workflow
1. Fork del repositorio
2. Crear branch feature
3. Desarrollar con tests
4. Pull request con descripción
5. Code review
6. Merge a main

## Deployment

### Producción
- Build optimizado con TypeScript
- Variables de entorno seguras
- HTTPS obligatorio
- Monitoreo activo

### CI/CD
- GitHub Actions para testing
- Deploy automático a staging
- Deploy manual a producción
- Rollback automático en errores