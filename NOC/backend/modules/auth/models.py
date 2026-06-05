from sqlalchemy import Boolean, Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    role = Column(String(255), default="user")
    permissions = Column(String(255), default="")

class ModuleState(Base):
    __tablename__ = "module_states"
    
    code = Column(String(50), primary_key=True, index=True)
    is_under_maintenance = Column(Boolean, default=False)
    maintenance_message = Column(String(255), nullable=True, default="Módulo en mantenimiento")
    is_disabled = Column(Boolean, default=False)
