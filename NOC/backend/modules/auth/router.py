from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import security, dependencies
from modules.auth import models, schemas

router = APIRouter(tags=["users"])

@router.post("/token")
@security.limiter.limit("5/minute")
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(dependencies.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario está inactivo. Contacte al administrador.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = security.create_access_token(
        data={
            "sub": user.email, 
            "role": user.role,
            "permissions": user.permissions
        }, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users", status_code=201, response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(dependencies.get_db), current_user: models.User = Depends(dependencies.check_admin)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = security.get_password_hash(user.password)
    permissions_string = ",".join(user.modules) 

    new_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        permissions=permissions_string,
        hashed_password=hashed_password,
        is_active=user.is_active
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/users", response_model=list[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(dependencies.get_db), current_user: models.User = Depends(dependencies.check_admin)):
    users = db.query(models.User).order_by(models.User.id).offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(dependencies.get_db), current_user: models.User = Depends(dependencies.check_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user_update.username:
        db_user.username = user_update.username
    if user_update.email:
        db_user.email = user_update.email
    if user_update.full_name:
        db_user.full_name = user_update.full_name
    if user_update.role:
        db_user.role = user_update.role
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    
    if user_update.password:
        db_user.hashed_password = security.get_password_hash(user_update.password)

    if user_update.modules is not None:
        db_user.permissions = ",".join(user_update.modules)

    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(dependencies.get_db), current_user: models.User = Depends(dependencies.check_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(db_user)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}

@router.get("/system-modules")
def get_system_modules(request: Request, db: Session = Depends(dependencies.get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """
    Devuelve la estructura oficial y sincronizada de los módulos disponibles en el sistema,
    incluyendo su estado (mantenimiento, deshabilitado).
    """
    states = {s.code: s for s in db.query(models.ModuleState).all()}
    
    def get_state(code: str, label: str):
        st = states.get(code)
        return {
            "code": code,
            "label": label,
            "is_under_maintenance": st.is_under_maintenance if st else False,
            "maintenance_message": st.maintenance_message if st else "Módulo en mantenimiento",
            "is_disabled": st.is_disabled if st else False
        }

    return [
        {
            "name": "Portal",
            "icon": "🏛️",
            "submodules": [
                get_state("dashboard", "Dashboard"),
                get_state("ingresos", "Ingresos (Beta)"),
                get_state("presupuesto", "Presupuesto (Beta)")
            ]
        },
        {
            "name": "Mensajería",
            "icon": "💬",
            "submodules": [
                get_state("segmentacion", "Segmentación Bases (Beta)"),
                get_state("analisis", "Análisis SMS (Beta)")
            ]
        }
    ]

@router.put("/system-modules/{code}/state", response_model=schemas.ModuleStateResponse)
def update_module_state(code: str, state_update: schemas.ModuleStateUpdate, db: Session = Depends(dependencies.get_db), current_admin: models.User = Depends(dependencies.check_admin)):
    """
    Actualiza el estado de un submódulo (mantenimiento o deshabilitado).
    Solo para administradores.
    """
    st = db.query(models.ModuleState).filter(models.ModuleState.code == code).first()
    if not st:
        st = models.ModuleState(code=code)
        db.add(st)
    
    st.is_under_maintenance = state_update.is_under_maintenance
    st.maintenance_message = state_update.maintenance_message
    st.is_disabled = state_update.is_disabled
    
    db.commit()
    db.refresh(st)
    return st
