from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import dependencies
from typing import Optional
from modules.portal.presupuesto.schemas import DashboardResponse
from modules.portal.presupuesto.crud import obtener_resumen_dashboard
from modules.portal.presupuesto.services import importar_presupuesto_excel

router = APIRouter(
    prefix="/portal-presupuesto",
    tags=["Portal Presupuesto"]
)

@router.post("/importar")
def importar_presupuesto(
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("presupuesto"))
):
    try:
        importar_presupuesto_excel(db)
        return {"mensaje": "Presupuesto importado exitosamente desde ppto_2026.xlsx"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_presupuesto(
    year: int = 2026,
    filter_type: str = "TOTAL",
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("presupuesto"))
):
    try:
        resumen = obtener_resumen_dashboard(db, year=year, filter_type=filter_type)
        return resumen
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
