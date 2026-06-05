from pydantic import BaseModel
from typing import Optional, List

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str
    modules: List[str] = []
    is_active: bool = True

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_online: bool
    role: str
    permissions: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    modules: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ModuleStateBase(BaseModel):
    is_under_maintenance: bool = False
    maintenance_message: Optional[str] = None
    is_disabled: bool = False

class ModuleStateResponse(ModuleStateBase):
    code: str

    class Config:
        from_attributes = True

class ModuleStateUpdate(ModuleStateBase):
    pass
