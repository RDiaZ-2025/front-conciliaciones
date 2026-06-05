from pydantic import BaseModel
from datetime import date
from typing import Optional, List

class PresupuestoBase(BaseModel):
    Fecha: date
    Seccion: Optional[str] = None
    Fuente: Optional[str] = None
    Ppto: float = 0.0
    Ejecucion: float = 0.0

class PresupuestoCreate(PresupuestoBase):
    pass

class PresupuestoOut(PresupuestoBase):
    id: int

    class Config:
        from_attributes = True

class ResumenMensual(BaseModel):
    mes: date
    total_ppto: float
    total_ejecucion: float
    diferencia: float
    porcentaje_cumplimiento: float

class ResumenFuente(BaseModel):
    fuente: str
    seccion: str
    total_ppto: float
    total_ejecucion: float
    diferencia: float
    porcentaje_cumplimiento: float

class DashboardResponse(BaseModel):
    resumen_mensual: List[ResumenMensual]
    desglose_fuentes: List[ResumenFuente]
    total_anual_ppto: float
    total_anual_ejecucion: float
    diferencia_anual: float
    porcentaje_anual: float
