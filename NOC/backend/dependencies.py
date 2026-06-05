from typing import Generator, Set
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

import database
import security
from modules.auth import models

# 1. Configuración de OAuth2
# Esto le dice a Swagger UI/FastAPI dónde ir a pedir el token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 2. Inyección de base de datos segura
def get_db() -> Generator[Session, None, None]:
    """Generador que asegura el cierre de la conexión a la BD pase lo que pase."""
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 3. Autenticación
def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> models.User:
    """Valida el JWT de forma estricta y recupera el usuario de la base de datos."""
    
    # Excepción predefinida para no repetir código y fallar rápido
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # PyJWT valida automáticamente la firma y la fecha de expiración (exp)
        payload = jwt.decode(
            token, 
            security.SECRET_KEY, 
            algorithms=[security.ALGORITHM]
        )
        email: str = payload.get("sub")
        
        if not email:
            raise credentials_exception
            
    except InvalidTokenError: # Reemplaza a JWTError de python-jose
        raise credentials_exception
        
    # Consultamos la BD usando el email extraído del token
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        raise credentials_exception
        
    if not user.is_active:
        # Prevención de acceso a cuentas baneadas o desactivadas
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Cuenta suspendida o inactiva"
        )
        
    return user

# 4. Autorización por Módulos
def check_permission(required_permission: str):
    """
    Fábrica de dependencias que valida si un usuario tiene un permiso específico.
    Optimizado con Sets para búsqueda en tiempo constante O(1).
    """
    def permission_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        # El administrador tiene un "bypass" global
        if current_user.role == "admin":
            return current_user
            
        # Transformamos el string "ventas,roles" a un Set: {"ventas", "roles"}
        # Esto para reducir el tiempo de búsqueda.
        user_permissions: Set[str] = (
            set(current_user.permissions.split(",")) 
            if current_user.permissions else set()
        )
        
        if required_permission not in user_permissions:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Brecha de seguridad: Acceso denegado al módulo '{required_permission}'"
            )
        return current_user
        
    return permission_checker

# 5. Solo Administradores
def check_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Validador estricto para rutas de impacto crítico."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación bloqueada. Se requiere nivel de autorización 'Admin'."
        )
    return current_user