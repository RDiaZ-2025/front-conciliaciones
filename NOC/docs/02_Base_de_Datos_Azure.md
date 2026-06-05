# Base de Datos y Configuración (Azure SQL)

El proyecto utiliza **Azure SQL Server** en producción como la única fuente de verdad, reemplazando la base de datos SQLite local para proveer escalabilidad y acceso remoto a todos los componentes (Frontend y ETLs).

## Configuración de Conexión

La configuración de conexión se encuentra en `backend/.env`.

```env
# URL de conexión SQLAlchemy usando pymssql
SQLALCHEMY_DATABASE_URL = "mssql+pymssql://redmas_app:[TU_PASSWORD_CODIFICADO]@proyectoredmas.database.windows.net/proyectoredmas"
```

### Detalles de Conexión
- **Driver:** `pymssql` (instalado en `requirements.txt`).
- **Codificación URL:** Los caracteres especiales en la contraseña deben estar codificados en la URL (`@` es `%40`, `#` es `%23`).
- **IP Firewall:** La IP del cliente que se conecte a Azure SQL debe estar permitida en el Firewall de Azure Portal.
- **Autenticación:** SQL Authentication (`Azure Active Directory only authentication` debe estar DESACTIVADO en el portal).

## ORM y Modelos (SQLAlchemy)
Todo el mapeo de tablas está centralizado en los archivos `models.py` de cada submódulo dentro de `backend/modules/`.

**Consideraciones importantes de Tipado:**
Debido a que SQL Server restringe la creación de índices sobre columnas de tamaño ilimitado (`VARCHAR(MAX)`), los modelos han sido ajustados para usar longitudes definidas, ejemplo:
```python
# CORRECTO para indexación en Azure SQL
Column(String(255), index=True)

# INCORRECTO (Crea problemas al crear las tablas)
Column(String, index=True)
```

## Migraciones y Mantenimiento

Para inicializar la base de datos en blanco:
1. `cd backend`
2. `python -c "import main"` (Esto forzará a SQLAlchemy a realizar un `create_all()`)
3. `python init_db.py` (Sembrará el usuario administrador base)
