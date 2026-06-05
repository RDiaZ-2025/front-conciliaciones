from pydantic import BaseModel
from typing import Optional
from datetime import date

class DashboardDataBase(BaseModel):
    rank_seccion: Optional[int] = None
    mes: Optional[str] = None
    seccion: Optional[str] = None
    fecha_url: Optional[date] = None
    clean_url: Optional[str] = None
    titulo_url: Optional[str] = None
    autor: Optional[str] = None
    total_users: Optional[int] = None
    screen_page_views: Optional[int] = None
    sessions: Optional[int] = None
    engaged_sessions: Optional[int] = None
    tema_principal: Optional[str] = None
    categoria_entidad: Optional[str] = None
    
    fuente: Optional[str] = "Discover"
    entidad_principal: Optional[str] = None
    semantic_score: Optional[float] = None
    syntactic_score: Optional[float] = None
    
    analisis_gemini_raw: Optional[str] = None

class DashboardDataCreate(DashboardDataBase):
    pass

class DashboardData(DashboardDataBase):
    id: int

    class Config:
        from_attributes = True

class EntityBase(BaseModel):
    name: str
    type: Optional[str] = "Tema"
    is_principal: bool = False
    semantic_score: Optional[float] = None
    syntactic_score: Optional[float] = None

class EntityCreate(EntityBase):
    dashboard_data_id: int

class EntityResponse(EntityBase):
    id: int
    dashboard_data_id: int

    class Config:
        from_attributes = True
